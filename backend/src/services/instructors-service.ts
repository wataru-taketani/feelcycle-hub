import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, BatchWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getJSTISOString, getTTLFromJST } from '../utils/dateUtils';

export interface InstructorData {
  instructorId: string;
  name: string;
  category: string;
  studioCode?: string;
  createdAt?: string;
  updatedAt?: string;
  ttl?: number;
}

export class InstructorsService {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'ap-northeast-1',
    });
    
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.INSTRUCTORS_TABLE || 'feelcycle-hub-instructors-dev';
  }

  /**
   * Save instructor data to DynamoDB
   */
  async saveInstructor(instructorData: InstructorData): Promise<InstructorData> {
    const currentTime = getJSTISOString();
    const ttl = getTTLFromJST(90); // 90 days TTL

    const instructor: InstructorData = {
      ...instructorData,
      createdAt: currentTime,
      updatedAt: currentTime,
      ttl,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: instructor,
    });

    await this.dynamoClient.send(command);
    console.log(`✅ Saved instructor: ${instructor.name} (${instructor.instructorId})`);
    
    return instructor;
  }

  /**
   * Get instructor by ID
   */
  async getInstructor(instructorId: string): Promise<InstructorData | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { instructorId },
    });

    const result = await this.dynamoClient.send(command);
    return result.Item as InstructorData || null;
  }

  /**
   * Get all instructors
   */
  async getAllInstructors(): Promise<InstructorData[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
    });

    const result = await this.dynamoClient.send(command);
    return result.Items as InstructorData[] || [];
  }

  /**
   * Get instructors by category (A-Z)
   */
  async getInstructorsByCategory(category: string): Promise<InstructorData[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'category = :category',
      ExpressionAttributeValues: {
        ':category': category,
      },
    });

    const result = await this.dynamoClient.send(command);
    return result.Items as InstructorData[] || [];
  }

  /**
   * Batch save multiple instructors (used for scraping results)
   */
  async batchSaveInstructors(instructors: InstructorData[]): Promise<void> {
    const batchSize = 25; // DynamoDB batch write limit
    
    for (let i = 0; i < instructors.length; i += batchSize) {
      const batch = instructors.slice(i, i + batchSize);
      
      const putRequests = batch.map(instructor => ({
        PutRequest: {
          Item: instructor,
        },
      }));

      const command = new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: putRequests,
        },
      });

      await this.dynamoClient.send(command);
      console.log(`✅ Batch saved ${batch.length} instructors (${i + 1}-${i + batch.length})`);
    }
  }

  /**
   * Update instructor data
   */
  async updateInstructor(instructorId: string, updates: Partial<InstructorData>): Promise<InstructorData | null> {
    const existingInstructor = await this.getInstructor(instructorId);
    if (!existingInstructor) {
      return null;
    }

    const currentTime = getJSTISOString();
    const updatedInstructor = {
      ...existingInstructor,
      ...updates,
      updatedAt: currentTime,
    };

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { instructorId },
      UpdateExpression: 'SET #name = :name, category = :category, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':name': updatedInstructor.name,
        ':category': updatedInstructor.category,
        ':updatedAt': currentTime,
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await this.dynamoClient.send(command);
    return result.Attributes as InstructorData;
  }
}