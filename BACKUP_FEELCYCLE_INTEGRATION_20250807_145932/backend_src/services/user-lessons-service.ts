import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getJSTISOString, getTTLFromJST } from '../utils/dateUtils';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export interface UserLessonRecord {
  // Primary Keys
  PK: string;                    // USER#{userId}
  SK: string;                    // LESSON#{studioCode}#{lessonDate}#{startTime}#{type}
  
  // Basic Info
  userId: string;                // ユーザーID
  studioCode: string;            // スタジオコード (gnz, sby, etc.)
  lessonDate: string;            // レッスン日 (YYYY-MM-DD)
  startTime: string;             // 開始時間 (HH:MM)
  lessonName: string;            // レッスン名
  instructor: string;            // インストラクター名
  
  // Type & Status
  type: 'favorite' | 'waitlist' | 'booking' | 'history';  // 関係タイプ
  status: 'active' | 'completed' | 'cancelled' | 'expired'; // ステータス
  
  // Metadata
  createdAt: string;             // 登録日時 (ISO string)
  updatedAt: string;             // 更新日時 (ISO string)
  ttl?: number;                  // 自動削除用 (optional)
  
  // GSI attributes (computed)
  lessonDateTime?: string;       // lessonDate + startTime for GSI
  
  // Type-specific data
  waitlistId?: string;           // キャンセル待ちID (waitlist用)
  notificationSent?: boolean;    // 通知送信済み (waitlist用)
  reservationId?: string;        // 予約ID (booking/history用)
  notes?: string;                // メモ (favorite用)
}

export class UserLessonsService {
  private tableName: string;

  constructor() {
    this.tableName = process.env.USER_LESSONS_TABLE_NAME || '';
    if (!this.tableName) {
      throw new Error('USER_LESSONS_TABLE_NAME environment variable not set');
    }
  }

  /**
   * 気になるリストに追加
   */
  async addToFavorites(userId: string, lessonInfo: {
    studioCode: string;
    lessonDate: string;
    startTime: string;
    lessonName: string;
    instructor: string;
    notes?: string;
  }): Promise<UserLessonRecord> {
    const record: UserLessonRecord = {
      PK: `USER#${userId}`,
      SK: `LESSON#${lessonInfo.studioCode}#${lessonInfo.lessonDate}#${lessonInfo.startTime}#favorite`,
      userId,
      studioCode: lessonInfo.studioCode,
      lessonDate: lessonInfo.lessonDate,
      startTime: lessonInfo.startTime,
      lessonName: lessonInfo.lessonName,
      instructor: lessonInfo.instructor,
      type: 'favorite',
      status: 'active',
      createdAt: getJSTISOString(),
      updatedAt: getJSTISOString(),
      lessonDateTime: `${lessonInfo.lessonDate}T${lessonInfo.startTime}:00+09:00`,
      notes: lessonInfo.notes,
    };

    await docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: record,
    }));

    return record;
  }

  /**
   * キャンセル待ちに追加
   */
  async addToWaitlist(userId: string, lessonInfo: {
    studioCode: string;
    lessonDate: string;
    startTime: string;
    lessonName: string;
    instructor: string;
    waitlistId: string;
    ttlDays?: number;
  }): Promise<UserLessonRecord> {
    const record: UserLessonRecord = {
      PK: `USER#${userId}`,
      SK: `LESSON#${lessonInfo.studioCode}#${lessonInfo.lessonDate}#${lessonInfo.startTime}#waitlist`,
      userId,
      studioCode: lessonInfo.studioCode,
      lessonDate: lessonInfo.lessonDate,
      startTime: lessonInfo.startTime,
      lessonName: lessonInfo.lessonName,
      instructor: lessonInfo.instructor,
      type: 'waitlist',
      status: 'active',
      createdAt: getJSTISOString(),
      updatedAt: getJSTISOString(),
      lessonDateTime: `${lessonInfo.lessonDate}T${lessonInfo.startTime}:00+09:00`,
      waitlistId: lessonInfo.waitlistId,
      notificationSent: false,
      ttl: lessonInfo.ttlDays ? getTTLFromJST(lessonInfo.ttlDays) : undefined,
    };

    await docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: record,
    }));

    return record;
  }

  /**
   * ユーザーの特定タイプのレッスン関係を取得
   */
  async getUserLessonsByType(userId: string, type: UserLessonRecord['type']): Promise<UserLessonRecord[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk_prefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk_prefix': `LESSON#`,
        ':type': type,
      },
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
    }));

    return result.Items as UserLessonRecord[];
  }

  /**
   * アクティブなキャンセル待ちを取得（監視用）
   */
  async getActiveWaitlists(): Promise<UserLessonRecord[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'StatusDateTimeIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':status': 'active',
        ':type': 'waitlist',
      },
      FilterExpression: '#type = :type',
    }));

    return result.Items as UserLessonRecord[];
  }

  /**
   * レッスン関係を削除
   */
  async removeUserLesson(userId: string, studioCode: string, lessonDate: string, startTime: string, type: UserLessonRecord['type']): Promise<void> {
    await docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `LESSON#${studioCode}#${lessonDate}#${startTime}#${type}`,
      },
    }));
  }

  /**
   * ステータス更新
   */
  async updateStatus(userId: string, studioCode: string, lessonDate: string, startTime: string, type: UserLessonRecord['type'], status: UserLessonRecord['status']): Promise<void> {
    await docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `LESSON#${studioCode}#${lessonDate}#${startTime}#${type}`,
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': getJSTISOString(),
      },
    }));
  }

  /**
   * 通知送信済みマーク
   */
  async markNotificationSent(userId: string, studioCode: string, lessonDate: string, startTime: string): Promise<void> {
    await docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `LESSON#${studioCode}#${lessonDate}#${startTime}#waitlist`,
      },
      UpdateExpression: 'SET notificationSent = :sent, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':sent': true,
        ':updatedAt': getJSTISOString(),
      },
    }));
  }
}