import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { LessonData, LessonSearchFilters } from '../types';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const LESSONS_TABLE_NAME = process.env.LESSONS_TABLE_NAME!;

export class LessonsService {
  /**
   * Store lesson data in DynamoDB
   */
  async storeLessonData(lessonData: LessonData): Promise<void> {
    await docClient.send(new PutCommand({
      TableName: LESSONS_TABLE_NAME,
      Item: lessonData,
    }));
  }

  /**
   * Store multiple lessons in batch
   */
  async storeLessonsData(lessons: LessonData[]): Promise<void> {
    const promises = lessons.map(lesson => this.storeLessonData(lesson));
    await Promise.all(promises);
  }

  /**
   * Get lessons for a specific studio and date
   */
  async getLessonsForStudioAndDate(studioCode: string, date: string, filters?: LessonSearchFilters): Promise<LessonData[]> {
    const startDateTime = `${date}T00:00:00+09:00`;
    const endDateTime = `${date}T23:59:59+09:00`;

    const params: any = {
      TableName: LESSONS_TABLE_NAME,
      KeyConditionExpression: 'studioCode = :studioCode AND lessonDateTime BETWEEN :startDateTime AND :endDateTime',
      ExpressionAttributeValues: {
        ':studioCode': studioCode,
        ':startDateTime': startDateTime,
        ':endDateTime': endDateTime,
      },
    };

    // Add filters
    if (filters) {
      const filterExpressions: string[] = [];
      
      if (filters.program) {
        filterExpressions.push('#program = :program');
        params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
        params.ExpressionAttributeNames['#program'] = 'program';
        params.ExpressionAttributeValues[':program'] = filters.program;
      }

      if (filters.instructor) {
        filterExpressions.push('instructor = :instructor');
        params.ExpressionAttributeValues[':instructor'] = filters.instructor;
      }

      if (filters.availableOnly) {
        filterExpressions.push('isAvailable = :isAvailable');
        params.ExpressionAttributeValues[':isAvailable'] = 'true';
      }

      if (filters.timeRange) {
        filterExpressions.push('startTime BETWEEN :startTime AND :endTime');
        params.ExpressionAttributeValues[':startTime'] = filters.timeRange.start;
        params.ExpressionAttributeValues[':endTime'] = filters.timeRange.end;
      }

      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
      }
    }

    const result = await docClient.send(new QueryCommand(params));
    return (result.Items || []) as LessonData[];
  }

  /**
   * Get lessons for all studios on a specific date
   */
  async getLessonsForDate(date: string, filters?: LessonSearchFilters): Promise<LessonData[]> {
    const params: any = {
      TableName: LESSONS_TABLE_NAME,
      IndexName: 'DateStudioIndex',
      KeyConditionExpression: 'lessonDate = :lessonDate',
      ExpressionAttributeValues: {
        ':lessonDate': date,
      },
    };

    // Add filters
    if (filters) {
      const filterExpressions: string[] = [];
      
      if (filters.program) {
        filterExpressions.push('#program = :program');
        params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
        params.ExpressionAttributeNames['#program'] = 'program';
        params.ExpressionAttributeValues[':program'] = filters.program;
      }

      if (filters.instructor) {
        filterExpressions.push('instructor = :instructor');
        params.ExpressionAttributeValues[':instructor'] = filters.instructor;
      }

      if (filters.availableOnly) {
        filterExpressions.push('isAvailable = :isAvailable');
        params.ExpressionAttributeValues[':isAvailable'] = 'true';
      }

      if (filters.timeRange) {
        filterExpressions.push('startTime BETWEEN :startTime AND :endTime');
        params.ExpressionAttributeValues[':startTime'] = filters.timeRange.start;
        params.ExpressionAttributeValues[':endTime'] = filters.timeRange.end;
      }

      if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
      }
    }

    const result = await docClient.send(new QueryCommand(params));
    return (result.Items || []) as LessonData[];
  }

  /**
   * Get available lessons (for monitoring)
   */
  async getAvailableLessons(limit?: number): Promise<LessonData[]> {
    const params: any = {
      TableName: LESSONS_TABLE_NAME,
      IndexName: 'DateStudioIndex',
      KeyConditionExpression: 'isAvailable = :isAvailable',
      ExpressionAttributeValues: {
        ':isAvailable': 'true',
      },
      ScanIndexForward: true, // Sort by lessonDateTime ascending
    };

    if (limit) {
      params.Limit = limit;
    }

    const result = await docClient.send(new QueryCommand(params));
    return (result.Items || []) as LessonData[];
  }

  /**
   * Update lesson availability
   */
  async updateLessonAvailability(studioCode: string, lessonDateTime: string, availableSlots: number, totalSlots: number): Promise<void> {
    const isAvailable = availableSlots > 0 ? 'true' : 'false';
    
    await docClient.send(new UpdateCommand({
      TableName: LESSONS_TABLE_NAME,
      Key: {
        studioCode,
        lessonDateTime,
      },
      UpdateExpression: 'SET availableSlots = :availableSlots, isAvailable = :isAvailable, lastUpdated = :lastUpdated',
      ExpressionAttributeValues: {
        ':availableSlots': availableSlots,
        ':isAvailable': isAvailable,
        ':lastUpdated': new Date().toISOString(),
      },
    }));
  }

  /**
   * Clean up old lesson data
   */
  async cleanupOldLessons(): Promise<{ deletedCount: number }> {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const cutoffDate = twoDaysAgo.toISOString().split('T')[0];

    // Scan for old lessons (this is not the most efficient way, but works for cleanup)
    const result = await docClient.send(new ScanCommand({
      TableName: LESSONS_TABLE_NAME,
      FilterExpression: 'lessonDate < :cutoffDate',
      ExpressionAttributeValues: {
        ':cutoffDate': cutoffDate,
      },
      ProjectionExpression: 'studioCode, lessonDateTime',
    }));

    const oldLessons = result.Items || [];
    
    // Delete old lessons
    const deletePromises = oldLessons.map(lesson => 
      docClient.send(new DeleteCommand({
        TableName: LESSONS_TABLE_NAME,
        Key: {
          studioCode: lesson.studioCode,
          lessonDateTime: lesson.lessonDateTime,
        },
      }))
    );

    await Promise.all(deletePromises);

    return { deletedCount: oldLessons.length };
  }

  /**
   * Create sample lesson data (for testing without scraping)
   */
  async createSampleLessons(studioCode: string, date: string): Promise<LessonData[]> {
    const sampleLessons: LessonData[] = [
      {
        studioCode,
        lessonDateTime: `${date}T07:00:00+09:00`,
        lessonDate: date,
        startTime: '07:00',
        endTime: '07:45',
        lessonName: 'BSL House 1',
        instructor: 'YUKI',
        availableSlots: null,
        totalSlots: null,
        isAvailable: 'false',
        program: 'BSL',
        lastUpdated: new Date().toISOString(),
        ttl: Math.floor((new Date(date + 'T08:00:00+09:00').getTime()) / 1000) + 86400, // 1 day after lesson
      },
      {
        studioCode,
        lessonDateTime: `${date}T10:30:00+09:00`,
        lessonDate: date,
        startTime: '10:30',
        endTime: '11:15',
        lessonName: 'BB1 Beat',
        instructor: 'MIKI',
        availableSlots: null,
        totalSlots: null,
        isAvailable: 'true',
        program: 'BB1',
        lastUpdated: new Date().toISOString(),
        ttl: Math.floor((new Date(date + 'T11:30:00+09:00').getTime()) / 1000) + 86400,
      },
      {
        studioCode,
        lessonDateTime: `${date}T12:00:00+09:00`,
        lessonDate: date,
        startTime: '12:00',
        endTime: '12:45',
        lessonName: 'BSB Beats',
        instructor: 'NANA',
        availableSlots: null,
        totalSlots: null,
        isAvailable: 'false',
        program: 'BSB',
        lastUpdated: new Date().toISOString(),
        ttl: Math.floor((new Date(date + 'T13:00:00+09:00').getTime()) / 1000) + 86400,
      },
      {
        studioCode,
        lessonDateTime: `${date}T19:30:00+09:00`,
        lessonDate: date,
        startTime: '19:30',
        endTime: '20:15',
        lessonName: 'BSL House 1',
        instructor: 'Shiori.I',
        availableSlots: null,
        totalSlots: null,
        isAvailable: 'true',
        program: 'BSL',
        lastUpdated: new Date().toISOString(),
        ttl: Math.floor((new Date(date + 'T20:30:00+09:00').getTime()) / 1000) + 86400,
      },
      {
        studioCode,
        lessonDateTime: `${date}T21:00:00+09:00`,
        lessonDate: date,
        startTime: '21:00',
        endTime: '21:45',
        lessonName: 'BSW Hip Hop',
        instructor: 'RYO',
        availableSlots: null,
        totalSlots: null,
        isAvailable: 'true',
        program: 'BSW',
        lastUpdated: new Date().toISOString(),
        ttl: Math.floor((new Date(date + 'T22:00:00+09:00').getTime()) / 1000) + 86400,
      },
    ];

    await this.storeLessonsData(sampleLessons);
    return sampleLessons;
  }

  /**
   * Clear all lessons from the table
   */
  async clearAllLessons(): Promise<{ deletedCount: number }> {
    console.log('🗑️  全レッスンデータのクリア開始...');
    
    // スキャンして全アイテムを取得
    const scanResult = await docClient.send(new ScanCommand({
      TableName: LESSONS_TABLE_NAME,
      ProjectionExpression: 'studioCode, lessonDateTime'
    }));
    
    const items = scanResult.Items || [];
    console.log(`削除対象: ${items.length}件`);
    
    if (items.length === 0) {
      console.log('削除対象のデータがありません');
      return { deletedCount: 0 };
    }
    
    // バッチ削除
    const deletePromises = items.map(item => 
      docClient.send(new DeleteCommand({
        TableName: LESSONS_TABLE_NAME,
        Key: {
          studioCode: item.studioCode,
          lessonDateTime: item.lessonDateTime
        }
      }))
    );
    
    // 25件ずつバッチ処理
    const batchSize = 25;
    let deletedCount = 0;
    
    for (let i = 0; i < deletePromises.length; i += batchSize) {
      const batch = deletePromises.slice(i, i + batchSize);
      await Promise.all(batch);
      deletedCount += batch.length;
      console.log(`進捗: ${deletedCount}/${items.length} 削除完了`);
    }
    
    console.log(`✅ 全${deletedCount}件のレッスンデータを削除しました`);
    return { deletedCount };
  }
}

export const lessonsService = new LessonsService();