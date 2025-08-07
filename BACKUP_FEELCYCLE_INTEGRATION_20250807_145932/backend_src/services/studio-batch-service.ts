import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STUDIO_BATCH_TABLE_NAME = process.env.STUDIO_BATCH_TABLE_NAME || 'feelcycle-studio-batch-dev';

export interface StudioBatchItem {
  batchId: string;        // バッチID（日付ベース: YYYY-MM-DD）
  studioCode: string;     // スタジオコード
  studioName: string;     // スタジオ名
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;      // 作成日時
  updatedAt: string;      // 更新日時
  processedAt?: string;   // 処理完了日時
  errorMessage?: string;  // エラーメッセージ
  lessonCount?: number;   // 取得レッスン数
  processingDuration?: number; // 処理時間（秒）
  ttl: number;           // TTL（7日後に自動削除）
}

/**
 * スタジオバッチ処理管理サービス
 */
export class StudioBatchService {
  
  /**
   * 新しいバッチを作成してスタジオ一覧を格納
   */
  async createBatch(studios: Array<{code: string, name: string}>): Promise<string> {
    const batchId = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
    const currentTime = new Date().toISOString();
    const ttl = Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000); // 7日後
    
    console.log(`📦 バッチ作成: ${batchId} (${studios.length}スタジオ)`);
    
    // 既存のバッチがあれば削除
    await this.clearBatch(batchId);
    
    // 各スタジオをバッチアイテムとして保存
    const putPromises = studios.map(studio => {
      const item: StudioBatchItem = {
        batchId,
        studioCode: studio.code,
        studioName: studio.name,
        status: 'pending',
        createdAt: currentTime,
        updatedAt: currentTime,
        ttl
      };
      
      return docClient.send(new PutCommand({
        TableName: STUDIO_BATCH_TABLE_NAME,
        Item: item
      }));
    });
    
    await Promise.all(putPromises);
    console.log(`✅ バッチ作成完了: ${batchId}`);
    
    return batchId;
  }
  
  /**
   * 指定バッチの全アイテムを削除
   */
  async clearBatch(batchId: string): Promise<void> {
    const existingItems = await this.getBatchItems(batchId);
    
    if (existingItems.length > 0) {
      console.log(`🗑️  既存バッチ削除: ${batchId} (${existingItems.length}件)`);
      
      const deletePromises = existingItems.map(item => 
        docClient.send(new DeleteCommand({
          TableName: STUDIO_BATCH_TABLE_NAME,
          Key: {
            batchId: item.batchId,
            studioCode: item.studioCode
          }
        }))
      );
      
      await Promise.all(deletePromises);
    }
  }
  
  /**
   * バッチ内の全アイテムを取得
   */
  async getBatchItems(batchId: string): Promise<StudioBatchItem[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: STUDIO_BATCH_TABLE_NAME,
      KeyConditionExpression: 'batchId = :batchId',
      ExpressionAttributeValues: {
        ':batchId': batchId
      }
    }));
    
    return (result.Items || []) as StudioBatchItem[];
  }
  
  /**
   * 次の処理待ちスタジオを取得
   */
  async getNextPendingStudio(batchId: string): Promise<StudioBatchItem | null> {
    const result = await docClient.send(new QueryCommand({
      TableName: STUDIO_BATCH_TABLE_NAME,
      KeyConditionExpression: 'batchId = :batchId',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':batchId': batchId,
        ':status': 'pending'
      },
      Limit: 1
    }));
    
    return result.Items?.[0] as StudioBatchItem || null;
  }
  
  /**
   * スタジオの処理状態を更新
   */
  async updateStudioStatus(
    batchId: string, 
    studioCode: string, 
    status: StudioBatchItem['status'],
    options: {
      errorMessage?: string;
      lessonCount?: number;
      processingDuration?: number;
    } = {}
  ): Promise<void> {
    const updateExpression = [
      '#status = :status',
      'updatedAt = :updatedAt'
    ];
    
    const expressionAttributeNames: Record<string, string> = {
      '#status': 'status'
    };
    
    const expressionAttributeValues: Record<string, any> = {
      ':status': status,
      ':updatedAt': new Date().toISOString()
    };
    
    if (status === 'completed') {
      updateExpression.push('processedAt = :processedAt');
      expressionAttributeValues[':processedAt'] = new Date().toISOString();
    }
    
    if (options.errorMessage) {
      updateExpression.push('errorMessage = :errorMessage');
      expressionAttributeValues[':errorMessage'] = options.errorMessage;
    }
    
    if (options.lessonCount !== undefined) {
      updateExpression.push('lessonCount = :lessonCount');
      expressionAttributeValues[':lessonCount'] = options.lessonCount;
    }
    
    if (options.processingDuration !== undefined) {
      updateExpression.push('processingDuration = :processingDuration');
      expressionAttributeValues[':processingDuration'] = options.processingDuration;
    }
    
    await docClient.send(new UpdateCommand({
      TableName: STUDIO_BATCH_TABLE_NAME,
      Key: {
        batchId,
        studioCode
      },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    }));
  }
  
  /**
   * バッチの処理状況を取得
   */
  async getBatchStatus(batchId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    progress: number;
  }> {
    const items = await this.getBatchItems(batchId);
    
    const statusCounts = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = items.length;
    const pending = statusCounts.pending || 0;
    const processing = statusCounts.processing || 0;
    const completed = statusCounts.completed || 0;
    const failed = statusCounts.failed || 0;
    const progress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;
    
    return {
      total,
      pending,
      processing,
      completed,
      failed,
      progress
    };
  }
  
  /**
   * バッチ処理の詳細サマリーを取得
   */
  async getBatchSummary(batchId: string): Promise<{
    batchId: string;
    status: any;
    items: StudioBatchItem[];
    totalLessons: number;
    totalDuration: number;
    errors: string[];
  }> {
    const items = await this.getBatchItems(batchId);
    const status = await this.getBatchStatus(batchId);
    
    const totalLessons = items.reduce((sum, item) => sum + (item.lessonCount || 0), 0);
    const totalDuration = items.reduce((sum, item) => sum + (item.processingDuration || 0), 0);
    
    const errors = items
      .filter(item => item.status === 'failed' && item.errorMessage)
      .map(item => `${item.studioCode}: ${item.errorMessage}`);
    
    return {
      batchId,
      status,
      items,
      totalLessons,
      totalDuration,
      errors
    };
  }
}