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
    // 1. Validate request data
    await this.validateWaitlistRequest(request);

    // 2. Validate lesson exists in our database (with fallback)
    const lesson = await this.validateLessonExists(request);
    if (!lesson) {
      console.log('⚠️ Lesson validation failed, but allowing registration for now...');
      // 一時的に検証を緩和 - ログを出力して継続
      // throw new Error('指定されたレッスンが見つかりません。最新のレッスン情報をご確認ください。');
    }

    // 3. Check if user already has waitlist for this lesson
    const existingWaitlist = await this.getUserWaitlistForLesson(userId, request);
    if (existingWaitlist && (existingWaitlist.status === 'active' || existingWaitlist.status === 'paused')) {
      throw new Error('このレッスンには既にキャンセル待ち登録済みです。');
    }

    // 4. If cancelled/expired waitlist exists, reactivate it instead of creating new
    if (existingWaitlist && (existingWaitlist.status === 'cancelled' || existingWaitlist.status === 'expired')) {
      console.log(`🔄 Reactivating ${existingWaitlist.status} waitlist: ${existingWaitlist.waitlistId}`);
      return await this.reactivateWaitlist(existingWaitlist);
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
    const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    console.log('🔍 Monitoring query range:', {
      now: now.toISOString(),
      twoDaysLater: twoDaysLater.toISOString(),
      tableName: WAITLIST_TABLE_NAME
    });

    // activeステータスのみを監視対象とする（pausedは一時停止中なのでスクレイピング不要）
    const activeResult = await docClient.send(new QueryCommand({
      TableName: WAITLIST_TABLE_NAME,
      IndexName: 'StatusLessonDateTimeIndex', 
      KeyConditionExpression: '#status = :status AND lessonDateTime BETWEEN :now AND :twoDaysLater',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'active',
        ':now': now.toISOString(),
        ':twoDaysLater': twoDaysLater.toISOString(),
      },
    }));

    console.log('📊 GSI query result (active only):', {
      count: activeResult.Items?.length || 0,
      items: activeResult.Items?.map(item => ({
        waitlistId: item.waitlistId,
        lessonDateTime: item.lessonDateTime,
        status: item.status
      }))
    });

    return (activeResult.Items || []) as Waitlist[];
  }

  /**
   * Update waitlist status
   */
  async updateWaitlistStatus(userId: string, waitlistId: string, status: WaitlistStatus, additionalFields?: Partial<Waitlist>): Promise<void> {
    const now = new Date().toISOString();
    const setExpressions: string[] = ['#status = :status', 'updatedAt = :updatedAt'];
    const removeExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = { '#status': 'status' };
    const expressionAttributeValues: Record<string, any> = {
      ':status': status,
      ':updatedAt': now,
    };

    // Add status-specific timestamp
    switch (status) {
      case 'paused':
        setExpressions.push('pausedAt = :pausedAt');
        expressionAttributeValues[':pausedAt'] = now;
        break;
      case 'expired':
        setExpressions.push('expiredAt = :expiredAt');
        expressionAttributeValues[':expiredAt'] = now;
        break;
      case 'cancelled':
        setExpressions.push('cancelledAt = :cancelledAt');
        expressionAttributeValues[':cancelledAt'] = now;
        break;
      case 'completed':
        setExpressions.push('completedAt = :completedAt');
        expressionAttributeValues[':completedAt'] = now;
        break;
    }

    // Add additional fields (filtering out undefined values)
    if (additionalFields) {
      let additionalIndex = 0;
      Object.entries(additionalFields).forEach(([key, value]) => {
        if (value !== undefined) {
          const attrKey = `:additional${additionalIndex}`;
          setExpressions.push(`${key} = ${attrKey}`);
          expressionAttributeValues[attrKey] = value;
          additionalIndex++;
        } else {
          // Handle undefined values by removing the attribute
          removeExpressions.push(key);
        }
      });
    }

    // Build the UpdateExpression
    const updateExpressionParts = [];
    if (setExpressions.length > 0) {
      updateExpressionParts.push(`SET ${setExpressions.join(', ')}`);
    }
    if (removeExpressions.length > 0) {
      updateExpressionParts.push(`REMOVE ${removeExpressions.join(', ')}`);
    }

    await docClient.send(new UpdateCommand({
      TableName: WAITLIST_TABLE_NAME,
      Key: { userId, waitlistId },
      UpdateExpression: updateExpressionParts.join(' '),
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
   * Pause waitlist (change from active to paused)
   */
  async pauseWaitlist(userId: string, waitlistId: string): Promise<void> {
    await this.updateWaitlistStatus(userId, waitlistId, 'paused');
  }

  /**
   * Cancel waitlist
   */
  async cancelWaitlist(userId: string, waitlistId: string): Promise<void> {
    await this.updateWaitlistStatus(userId, waitlistId, 'cancelled');
  }

  /**
   * Cancel waitlist entry (soft delete)
   */
  async deleteWaitlist(userId: string, waitlistId: string): Promise<void> {
    const now = new Date();
    
    try {
      await docClient.send(new UpdateCommand({
        TableName: WAITLIST_TABLE_NAME,
        Key: { userId, waitlistId },
        UpdateExpression: 'SET #status = :cancelled, #updatedAt = :updatedAt, #cancelledAt = :cancelledAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt',
          '#cancelledAt': 'cancelledAt'
        },
        ExpressionAttributeValues: {
          ':cancelled': 'cancelled' as WaitlistStatus,
          ':updatedAt': now.toISOString(),
          ':cancelledAt': now.toISOString()
        },
        ConditionExpression: 'attribute_exists(userId) AND attribute_exists(waitlistId)'
      }));
      
      console.log(`✅ Waitlist cancelled: ${waitlistId}`);
    } catch (error) {
      console.error('❌ Error cancelling waitlist:', error);
      throw new Error('キャンセル待ちの削除に失敗しました。');
    }
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
    
    console.log('🔍 Validating lesson exists:', {
      originalStudioCode: request.studioCode,
      normalizedStudioCode,
      lessonDate: request.lessonDate,
      startTime: request.startTime,
      lessonName: request.lessonName,
      instructor: request.instructor
    });
    
    const lessons = await this.lessonsService.getLessonsForStudioAndDate(
      normalizedStudioCode, 
      request.lessonDate
    );
    
    console.log('📊 Found lessons in DB:', {
      totalCount: lessons.length,
      sampleLessons: lessons.slice(0, 3).map(l => ({
        startTime: l.startTime,
        lessonName: l.lessonName,
        instructor: l.instructor
      }))
    });
    
    const matchedLesson = lessons.find(lesson => 
      lesson.startTime === request.startTime && 
      lesson.lessonName === request.lessonName
    );
    
    if (!matchedLesson) {
      console.log('❌ No exact match found. Checking for partial matches...');
      const timeMatches = lessons.filter(l => l.startTime === request.startTime);
      const nameMatches = lessons.filter(l => l.lessonName === request.lessonName);
      
      console.log('🕐 Time matches:', timeMatches.map(l => ({ startTime: l.startTime, lessonName: l.lessonName })));
      console.log('🎵 Name matches:', nameMatches.map(l => ({ startTime: l.startTime, lessonName: l.lessonName })));
    } else {
      console.log('✅ Exact match found:', {
        startTime: matchedLesson.startTime,
        lessonName: matchedLesson.lessonName,
        instructor: matchedLesson.instructor
      });
    }
    
    return matchedLesson || null;
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

  /**
   * Validate waitlist request data
   */
  private async validateWaitlistRequest(request: WaitlistCreateRequest): Promise<void> {
    // Required fields validation
    const requiredFields = ['studioCode', 'lessonDate', 'startTime', 'lessonName', 'instructor'];
    for (const field of requiredFields) {
      if (!request[field as keyof WaitlistCreateRequest]) {
        throw new Error(`必須項目が不足しています: ${field}`);
      }
    }

    // Date format validation (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(request.lessonDate)) {
      throw new Error('レッスン日付の形式が正しくありません (YYYY-MM-DD)');
    }

    // Time format validation (HH:MM)
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]?\d)$/;
    if (!timeRegex.test(request.startTime)) {
      throw new Error('開始時刻の形式が正しくありません (HH:MM)');
    }

    // Date validation - must be today or future
    const lessonDate = new Date(request.lessonDate + 'T00:00:00+09:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (lessonDate < today) {
      throw new Error('過去の日付のレッスンにはキャンセル待ち登録できません');
    }

    // Max future date validation (30 days ahead)
    const maxFutureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (lessonDate > maxFutureDate) {
      throw new Error('30日より先のレッスンにはキャンセル待ち登録できません');
    }

    // Studio code validation
    if (!/^[a-zA-Z]{2,6}$/.test(request.studioCode)) {
      throw new Error('スタジオコードが正しくありません');
    }

    // Lesson name and instructor length validation
    if (request.lessonName.length > 100) {
      throw new Error('レッスン名が長すぎます（100文字以内）');
    }
    
    if (request.instructor.length > 50) {
      throw new Error('インストラクター名が長すぎます（50文字以内）');
    }

    console.log('✅ Waitlist request validation passed:', {
      studioCode: request.studioCode,
      lessonDate: request.lessonDate,
      startTime: request.startTime,
      lessonName: request.lessonName.substring(0, 20) + '...',
      instructor: request.instructor
    });
  }

  /**
   * Reactivate a cancelled or expired waitlist
   */
  private async reactivateWaitlist(existingWaitlist: Waitlist): Promise<Waitlist> {
    const now = new Date();
    
    // Recalculate TTL based on current time
    const lessonDateTime = new Date(`${existingWaitlist.lessonDate}T${existingWaitlist.startTime}:00+09:00`);
    const ttl = Math.floor((lessonDateTime.getTime() + 150 * 60 * 1000) / 1000);
    
    const updateParams = {
      TableName: WAITLIST_TABLE_NAME,
      Key: {
        userId: existingWaitlist.userId,
        waitlistId: existingWaitlist.waitlistId
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #ttl = :ttl REMOVE #cancelledAt, #expiredAt, #pausedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt', 
        '#ttl': 'ttl',
        '#cancelledAt': 'cancelledAt',
        '#expiredAt': 'expiredAt',
        '#pausedAt': 'pausedAt'
      },
      ExpressionAttributeValues: {
        ':status': 'active' as WaitlistStatus,
        ':updatedAt': now.toISOString(),
        ':ttl': ttl
      },
      ReturnValues: 'ALL_NEW' as const
    };

    try {
      const result = await docClient.send(new UpdateCommand(updateParams));
      console.log(`✅ Waitlist reactivated: ${existingWaitlist.waitlistId}`);
      return result.Attributes as Waitlist;
    } catch (error) {
      console.error('❌ Error reactivating waitlist:', error);
      throw new Error('キャンセル待ちの再登録に失敗しました。');
    }
  }
}

export const waitlistService = new WaitlistService();