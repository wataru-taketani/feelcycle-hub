import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { StudioData, StudioCreateRequest, normalizeStudioCode } from '../types';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STUDIOS_TABLE_NAME = process.env.STUDIOS_TABLE_NAME!;

export class StudiosService {
  /**
   * Store studio data in DynamoDB
   */
  async storeStudioData(studioData: StudioData): Promise<void> {
    const normalizedData = {
      ...studioData,
      studioCode: normalizeStudioCode(studioData.studioCode)
    };
    await docClient.send(new PutCommand({
      TableName: STUDIOS_TABLE_NAME,
      Item: normalizedData,
    }));
  }

  /**
   * Store multiple studios in batch
   */
  async storeStudiosData(studios: StudioData[]): Promise<void> {
    const promises = studios.map(studio => this.storeStudioData(studio));
    await Promise.all(promises);
  }

  /**
   * Get studio by code
   */
  async getStudioByCode(studioCode: string): Promise<StudioData | null> {
    const normalizedStudioCode = normalizeStudioCode(studioCode);
    const result = await docClient.send(new GetCommand({
      TableName: STUDIOS_TABLE_NAME,
      Key: { studioCode: normalizedStudioCode },
    }));

    return result.Item as StudioData || null;
  }

  /**
   * Get all studios
   */
  async getAllStudios(): Promise<StudioData[]> {
    const result = await docClient.send(new ScanCommand({
      TableName: STUDIOS_TABLE_NAME,
    }));

    return result.Items as StudioData[] || [];
  }

  /**
   * Get next unprocessed studio for batch processing (with retry support)
   */
  async getNextUnprocessedStudio(): Promise<StudioData | null> {
    // First try to get unprocessed studios
    let result = await docClient.send(new ScanCommand({
      TableName: STUDIOS_TABLE_NAME,
      FilterExpression: 'attribute_not_exists(lastProcessed) OR lastProcessed < :yesterday',
      ExpressionAttributeValues: {
        ':yesterday': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      Limit: 1,
    }));

    if (result.Items && result.Items.length > 0) {
      return result.Items[0] as StudioData;
    }

    // If no unprocessed studios, try to get failed studios for retry
    result = await docClient.send(new ScanCommand({
      TableName: STUDIOS_TABLE_NAME,
      FilterExpression: 'batchStatus = :failed AND (attribute_not_exists(retryCount) OR retryCount < :maxRetries)',
      ExpressionAttributeValues: {
        ':failed': 'failed',
        ':maxRetries': 3, // Max 3 retry attempts
      },
      Limit: 1,
    }));

    return result.Items?.[0] as StudioData || null;
  }

  /**
   * Mark studio as processed (with retry count management)
   */
  async markStudioAsProcessed(studioCode: string, status: 'processing' | 'completed' | 'failed', errorMessage?: string): Promise<void> {
    const updateExpression = ['SET lastProcessed = :now, batchStatus = :status'];
    const expressionAttributeValues: Record<string, any> = {
      ':now': new Date().toISOString(),
      ':status': status,
    };

    if (status === 'failed') {
      // Increment retry count for failed studios
      updateExpression.push('ADD retryCount :inc');
      expressionAttributeValues[':inc'] = 1;
      
      if (errorMessage) {
        updateExpression.push('SET lastError = :error');
        expressionAttributeValues[':error'] = errorMessage;
      }
    } else if (status === 'completed') {
      // Reset retry count on successful completion
      updateExpression.push('REMOVE retryCount, lastError');
    }

    await docClient.send(new UpdateCommand({
      TableName: STUDIOS_TABLE_NAME,
      Key: { studioCode },
      UpdateExpression: updateExpression.join(' '),
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  /**
   * Reset all studio batch statuses for new daily run
   */
  async resetAllBatchStatuses(): Promise<void> {
    const studios = await this.getAllStudios();
    
    for (const studio of studios) {
      await docClient.send(new UpdateCommand({
        TableName: STUDIOS_TABLE_NAME,
        Key: { studioCode: studio.studioCode },
        UpdateExpression: 'REMOVE lastProcessed, batchStatus',
      }));
    }
  }

  /**
   * Get batch processing progress
   */
  async getBatchProgress(): Promise<{
    total: number;
    completed: number;
    processing: number;
    failed: number;
    remaining: number;
  }> {
    const studios = await this.getAllStudios();
    const total = studios.length;
    let completed = 0;
    let processing = 0;
    let failed = 0;

    for (const studio of studios) {
      const status = (studio as any).batchStatus;
      if (status === 'completed') completed++;
      else if (status === 'processing') processing++;
      else if (status === 'failed') failed++;
    }

    return {
      total,
      completed,
      processing,
      failed,
      remaining: total - completed - processing - failed,
    };
  }

  /**
   * Get studios by region
   */
  async getStudiosByRegion(region: string): Promise<StudioData[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: STUDIOS_TABLE_NAME,
      IndexName: 'RegionIndex',
      KeyConditionExpression: 'region = :region',
      ExpressionAttributeValues: {
        ':region': region,
      },
    }));

    return result.Items as StudioData[] || [];
  }

  /**
   * Create studio from request
   */
  createStudioData(request: StudioCreateRequest): StudioData {
    const now = new Date().toISOString();
    const ttl = Math.floor((new Date().getTime() + 30 * 24 * 60 * 60 * 1000) / 1000); // 30 days TTL

    return {
      studioCode: request.studioCode,
      studioName: request.studioName,
      region: request.region,
      address: request.address,
      phoneNumber: request.phoneNumber,
      businessHours: request.businessHours,
      lastUpdated: now,
      ttl,
    };
  }

  /**
   * Update existing studio data
   */
  async updateStudioData(studioCode: string, updates: Partial<StudioCreateRequest>): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (updates.studioName) {
      updateExpressions.push('#studioName = :studioName');
      expressionAttributeNames['#studioName'] = 'studioName';
      expressionAttributeValues[':studioName'] = updates.studioName;
    }

    if (updates.region) {
      updateExpressions.push('#region = :region');
      expressionAttributeNames['#region'] = 'region';
      expressionAttributeValues[':region'] = updates.region;
    }

    if (updates.address !== undefined) {
      updateExpressions.push('#address = :address');
      expressionAttributeNames['#address'] = 'address';
      expressionAttributeValues[':address'] = updates.address;
    }

    if (updates.phoneNumber !== undefined) {
      updateExpressions.push('#phoneNumber = :phoneNumber');
      expressionAttributeNames['#phoneNumber'] = 'phoneNumber';
      expressionAttributeValues[':phoneNumber'] = updates.phoneNumber;
    }

    if (updates.businessHours !== undefined) {
      updateExpressions.push('#businessHours = :businessHours');
      expressionAttributeNames['#businessHours'] = 'businessHours';
      expressionAttributeValues[':businessHours'] = updates.businessHours;
    }

    // Always update lastUpdated
    updateExpressions.push('#lastUpdated = :lastUpdated');
    expressionAttributeNames['#lastUpdated'] = 'lastUpdated';
    expressionAttributeValues[':lastUpdated'] = new Date().toISOString();

    if (updateExpressions.length === 1) { // Only lastUpdated
      return;
    }

    await docClient.send(new UpdateCommand({
      TableName: STUDIOS_TABLE_NAME,
      Key: { studioCode },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));
  }

  /**
   * Delete studio
   */
  async deleteStudio(studioCode: string): Promise<void> {
    await docClient.send(new DeleteCommand({
      TableName: STUDIOS_TABLE_NAME,
      Key: { studioCode },
    }));
  }

  /**
   * Refresh all studios from scraping data
   */
  async refreshStudiosFromScraping(scrapedStudios: Array<{code: string, name: string, region: string}>): Promise<{
    created: number;
    updated: number;
    total: number;
  }> {
    let created = 0;
    let updated = 0;

    for (const scrapedStudio of scrapedStudios) {
      const existing = await this.getStudioByCode(scrapedStudio.code);
      
      if (existing) {
        // Update existing studio if name or region changed
        if (existing.studioName !== scrapedStudio.name || existing.region !== scrapedStudio.region) {
          await this.updateStudioData(scrapedStudio.code, {
            studioName: scrapedStudio.name,
            region: scrapedStudio.region,
          });
          updated++;
        }
      } else {
        // Create new studio
        const studioData = this.createStudioData({
          studioCode: scrapedStudio.code,
          studioName: scrapedStudio.name,
          region: scrapedStudio.region,
        });
        await this.storeStudioData(studioData);
        created++;
      }
    }

    return {
      created,
      updated,
      total: scrapedStudios.length,
    };
  }
}

export const studiosService = new StudiosService();