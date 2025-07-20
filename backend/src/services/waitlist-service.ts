import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Waitlist, WaitlistStatus, WaitlistCreateRequest, NotificationRecord, LessonData, normalizeStudioCode } from '../types';
import { LessonsService } from './lessons-service';
import { studiosService } from './studios-service';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const WAITLIST_TABLE_NAME = process.env.WAITLIST_TABLE_NAME!;

export class WaitlistService {
  private lessonsService = new LessonsService();

  /**
   * Create a new waitlist entry with lesson data validation
   */
  async createWaitlist(userId: string, request: WaitlistCreateRequest): Promise<Waitlist> {
    // 1. Validate lesson exists in our database
    const lesson = await this.validateLessonExists(request);
    if (!lesson) {
      throw new Error('指定されたレッスンが見つかりません。最新のレッスン情報をご確認ください。');
    }

    // 2. Check if user already has waitlist for this lesson
    const existingWaitlist = await this.getUserWaitlistForLesson(userId, request);
    if (existingWaitlist) {
      throw new Error('このレッスンには既にキャンセル待ち登録済みです。');
    }

    const now = new Date();
    const normalizedStudioCode = normalizeStudioCode(request.studioCode);
    const waitlistId = `${normalizedStudioCode}#${request.lessonDate}#${request.startTime}#${request.lessonName}`;
    
    // Calculate lesson datetime for TTL
    const lessonDateTime = new Date(`${request.lessonDate}T${request.startTime}:00+09:00`);
    
    // Set TTL to 2 hours after lesson end time (safety buffer)
    const ttl = Math.floor((lessonDateTime.getTime() + 150 * 60 * 1000) / 1000);
    
    const waitlist: Waitlist = {
      userId,
      waitlistId,
      studioCode: request.studioCode,
      studioName: await this.getStudioName(request.studioCode),
      lessonDate: request.lessonDate,
      startTime: request.startTime,
      endTime: this.calculateEndTime(request.startTime),
      lessonName: request.lessonName,
      instructor: request.instructor,
      lessonDateTime: lessonDateTime.toISOString(),
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      notificationHistory: [],
      ttl,
    };

    await docClient.send(new PutCommand({
      TableName: WAITLIST_TABLE_NAME,
      Item: waitlist,
      ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(waitlistId)',
    }));

    return waitlist;
  }

  /**
   * Get user's waitlists by status
   */
  async getUserWaitlists(userId: string, status?: WaitlistStatus): Promise<Waitlist[]> {
    const params: any = {
      TableName: WAITLIST_TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    };

    if (status) {
      params.FilterExpression = '#status = :status';
      params.ExpressionAttributeNames = { '#status': 'status' };
      params.ExpressionAttributeValues[':status'] = status;
    }

    const result = await docClient.send(new QueryCommand(params));
    return (result.Items || []) as Waitlist[];
  }

  /**
   * Get active waitlists for monitoring (efficient extraction)
   */
  async getActiveWaitlistsForMonitoring(): Promise<Waitlist[]> {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const result = await docClient.send(new QueryCommand({
      TableName: WAITLIST_TABLE_NAME,
      IndexName: 'StatusLessonDateTimeIndex',
      KeyConditionExpression: '#status = :status AND lessonDateTime BETWEEN :now AND :oneHourLater',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'active',
        ':now': now.toISOString(),
        ':oneHourLater': oneHourLater.toISOString(),
      },
    }));

    return (result.Items || []) as Waitlist[];
  }

  /**
   * Update waitlist status
   */
  async updateWaitlistStatus(userId: string, waitlistId: string, status: WaitlistStatus, additionalFields?: Partial<Waitlist>): Promise<void> {
    const now = new Date().toISOString();
    const updateExpressions: string[] = ['#status = :status', 'updatedAt = :updatedAt'];
    const expressionAttributeNames: Record<string, string> = { '#status': 'status' };
    const expressionAttributeValues: Record<string, any> = {
      ':status': status,
      ':updatedAt': now,
    };

    // Add status-specific timestamp
    switch (status) {
      case 'paused':
        updateExpressions.push('pausedAt = :pausedAt');
        expressionAttributeValues[':pausedAt'] = now;
        break;
      case 'expired':
        updateExpressions.push('expiredAt = :expiredAt');
        expressionAttributeValues[':expiredAt'] = now;
        break;
      case 'cancelled':
        updateExpressions.push('cancelledAt = :cancelledAt');
        expressionAttributeValues[':cancelledAt'] = now;
        break;
      case 'completed':
        updateExpressions.push('completedAt = :completedAt');
        expressionAttributeValues[':completedAt'] = now;
        break;
    }

    // Add additional fields
    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value], index) => {
        const attrKey = `:additional${index}`;
        updateExpressions.push(`${key} = ${attrKey}`);
        expressionAttributeValues[attrKey] = value;
      });
    }

    await docClient.send(new UpdateCommand({
      TableName: WAITLIST_TABLE_NAME,
      Key: { userId, waitlistId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  /**
   * Add notification record to waitlist
   */
  async addNotificationRecord(userId: string, waitlistId: string, notification: NotificationRecord): Promise<void> {
    await docClient.send(new UpdateCommand({
      TableName: WAITLIST_TABLE_NAME,
      Key: { userId, waitlistId },
      UpdateExpression: 'SET notificationHistory = list_append(if_not_exists(notificationHistory, :emptyList), :newNotification), updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':emptyList': [],
        ':newNotification': [notification],
        ':updatedAt': new Date().toISOString(),
      },
    }));
  }

  /**
   * Resume waitlist (change from paused to active)
   */
  async resumeWaitlist(userId: string, waitlistId: string): Promise<void> {
    await this.updateWaitlistStatus(userId, waitlistId, 'active', {
      autoResumeAt: undefined,
    });
  }

  /**
   * Cancel waitlist
   */
  async cancelWaitlist(userId: string, waitlistId: string): Promise<void> {
    await this.updateWaitlistStatus(userId, waitlistId, 'cancelled');
  }

  /**
   * Delete waitlist (hard delete)
   */
  async deleteWaitlist(userId: string, waitlistId: string): Promise<void> {
    await docClient.send(new DeleteCommand({
      TableName: WAITLIST_TABLE_NAME,
      Key: { userId, waitlistId },
    }));
  }

  /**
   * Expire old waitlists (batch cleanup)
   */
  async expireOldWaitlists(): Promise<{ expiredCount: number }> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get active/paused waitlists with past lesson dates
    const result = await docClient.send(new ScanCommand({
      TableName: WAITLIST_TABLE_NAME,
      FilterExpression: '(#status = :active OR #status = :paused) AND lessonDateTime < :yesterday',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':active': 'active',
        ':paused': 'paused',
        ':yesterday': yesterday.toISOString(),
      },
      ProjectionExpression: 'userId, waitlistId',
    }));

    const expiredItems = result.Items || [];
    
    // Batch update to expired status
    const updatePromises = expiredItems.map(item => 
      this.updateWaitlistStatus(item.userId, item.waitlistId, 'expired')
    );

    await Promise.all(updatePromises);

    return { expiredCount: expiredItems.length };
  }

  /**
   * Validate that the lesson exists in our database
   */
  private async validateLessonExists(request: WaitlistCreateRequest): Promise<LessonData | null> {
    const lessonDateTime = `${request.startTime} - ${this.calculateEndTime(request.startTime)}`;
    const normalizedStudioCode = normalizeStudioCode(request.studioCode);
    const lessons = await this.lessonsService.getLessonsForStudioAndDate(
      normalizedStudioCode, 
      request.lessonDate
    );
    
    return lessons.find(lesson => 
      lesson.startTime === request.startTime && 
      lesson.lessonName === request.lessonName
    ) || null;
  }

  /**
   * Check if user already has waitlist for this specific lesson
   */
  private async getUserWaitlistForLesson(userId: string, request: WaitlistCreateRequest): Promise<Waitlist | null> {
    const normalizedStudioCode = normalizeStudioCode(request.studioCode);
    const waitlistId = `${normalizedStudioCode}#${request.lessonDate}#${request.startTime}#${request.lessonName}`;
    
    try {
      const result = await docClient.send(new GetCommand({
        TableName: WAITLIST_TABLE_NAME,
        Key: { userId, waitlistId }
      }));
      
      return result.Item as Waitlist || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get studio name from studios service
   */
  private async getStudioName(studioCode: string): Promise<string> {
    const normalizedStudioCode = normalizeStudioCode(studioCode);
    const studio = await studiosService.getStudioByCode(normalizedStudioCode);
    return studio?.studioName || studioCode;
  }

  /**
   * Calculate end time based on start time (assuming 45min lessons)
   */
  private calculateEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + 45, 0, 0);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }
}

export const waitlistService = new WaitlistService();