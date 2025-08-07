import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
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
   * Store multiple lessons using DynamoDB BatchWrite (much more efficient)
   */
  async storeLessonsData(lessons: LessonData[]): Promise<void> {
    if (lessons.length === 0) return;

    const BATCH_SIZE = 25; // DynamoDB BatchWrite limit
    const batches = [];
    
    for (let i = 0; i < lessons.length; i += BATCH_SIZE) {
      batches.push(lessons.slice(i, i + BATCH_SIZE));
    }

    console.log(`📝 Writing ${lessons.length} lessons in ${batches.length} batches...`);

    for (const [batchIndex, batch] of batches.entries()) {
      try {
        const putRequests = batch.map(lesson => ({
          PutRequest: {
            Item: lesson
          }
        }));

        await docClient.send(new BatchWriteCommand({
          RequestItems: {
            [LESSONS_TABLE_NAME]: putRequests
          }
        }));

        console.log(`   ✅ Batch ${batchIndex + 1}/${batches.length} completed (${batch.length} items)`);
        
        // Clear batch from memory immediately after processing
        batch.length = 0;
        
        // Small delay between batches to respect DynamoDB limits
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`❌ Failed to write batch ${batchIndex + 1}:`, error);
        
        // Fallback to individual writes for this batch
        console.log(`🔄 Falling back to individual writes for batch ${batchIndex + 1}...`);
        for (const lesson of batch) {
          try {
            await this.storeLessonData(lesson);
          } catch (individualError) {
            console.error(`❌ Failed to write individual lesson:`, individualError);
          }
        }
      }
    }
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
   * Get lessons for a specific studio across multiple dates
   */
  async getLessonsForStudioAndDateRange(studioCode: string, startDate: string, endDate: string, filters?: LessonSearchFilters): Promise<LessonData[]> {
    const startDateTime = `${startDate}T00:00:00+09:00`;
    const endDateTime = `${endDate}T23:59:59+09:00`;

    const params: any = {
      TableName: LESSONS_TABLE_NAME,
      KeyConditionExpression: 'studioCode = :studioCode AND lessonDateTime BETWEEN :startDateTime AND :endDateTime',
      ExpressionAttributeValues: {
        ':studioCode': studioCode,
        ':startDateTime': startDateTime,
        ':endDateTime': endDateTime,
      },
    };

    // Add filters (same as single date function)
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
        availableSlots: 0,
        totalSlots: 20,
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
        availableSlots: 3,
        totalSlots: 22,
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
        availableSlots: 0,
        totalSlots: 20,
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
        availableSlots: 6,
        totalSlots: 20,
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
        availableSlots: 2,
        totalSlots: 24,
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
   * Execute real scraping and store data
   */
  async executeRealScraping(studioCode: string, date: string): Promise<any[]> {
    console.log(`🚴‍♀️ Starting real scraping for ${studioCode} on ${date}`);
    
    try {
      // Import real scraper
      const { RealFeelcycleScraper } = await import('./real-scraper');
      
      let lessons: any[] = [];
      
      if (studioCode === 'all') {
        // All studios scraping
        console.log('🌏 Scraping ALL studios...');
        lessons = await RealFeelcycleScraper.searchAllStudiosRealLessons(date);
        console.log(`✅ Found ${lessons.length} real lessons from ALL studios`);
      } else {
        // Single studio scraping
        console.log(`🏢 Scraping studio: ${studioCode}`);
        lessons = await RealFeelcycleScraper.searchRealLessons(studioCode, date);
        console.log(`✅ Found ${lessons.length} real lessons from ${studioCode}`);
      }
      
      if (lessons.length > 0) {
        // Store lessons in DynamoDB
        await this.storeLessonsData(lessons);
        console.log(`💾 Stored ${lessons.length} lessons in DynamoDB`);
      }
      
      return lessons;
    } catch (error) {
      console.error('Real scraping failed:', error);
      throw error;
    }
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