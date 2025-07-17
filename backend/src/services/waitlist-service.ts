import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Waitlist, WaitlistStatus, WaitlistCreateRequest, NotificationRecord } from '../types';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const WAITLIST_TABLE_NAME = process.env.WAITLIST_TABLE_NAME!;

export class WaitlistService {
  /**
   * Create a new waitlist entry
   */
  async createWaitlist(userId: string, request: WaitlistCreateRequest): Promise<Waitlist> {
    const now = new Date();
    const waitlistId = `${request.studioCode}#${request.lessonDate}#${request.startTime}#${request.lessonName}`;
    
    // Calculate lesson datetime for comparison
    const lessonDateTime = `${request.lessonDate}T${request.startTime}:00+09:00`;
    const lessonDate = new Date(lessonDateTime);
    
    // Set TTL to 1 hour after lesson end time (assuming 45min lessons)
    const ttl = Math.floor((lessonDate.getTime() + 105 * 60 * 1000) / 1000); // 1h45m after start
    
    const waitlist: Waitlist = {
      userId,
      waitlistId,
      studioCode: request.studioCode,
      studioName: this.getStudioName(request.studioCode),
      lessonDate: request.lessonDate,
      startTime: request.startTime,
      endTime: this.calculateEndTime(request.startTime),
      lessonName: request.lessonName,
      instructor: request.instructor,
      lessonDateTime,
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
      ExpressionAttributeNames,
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
   * Get studio name from code
   */
  private getStudioName(studioCode: string): string {
    const studioMap: Record<string, string> = {
      'omotesando': '表参道',
      'ginza': '銀座',
      'roppongi': '六本木',
      'shibuya': '渋谷',
      'shinjuku': '新宿',
      // Add all 37 studios...
    };
    return studioMap[studioCode] || studioCode;
  }

  /**
   * Calculate end time (assuming 45-minute lessons)
   */
  private calculateEndTime(startTime: string): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + 45, 0, 0);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  }
}

export const waitlistService = new WaitlistService();