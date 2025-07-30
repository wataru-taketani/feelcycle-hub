import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { ProgramData } from '../types/programs';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const PROGRAMS_TABLE_NAME = process.env.PROGRAMS_TABLE_NAME || 'feelcycle-hub-programs-dev';

export class ProgramsService {
  /**
   * Store single program data
   */
  async storeProgramData(programData: ProgramData): Promise<void> {
    await docClient.send(new PutCommand({
      TableName: PROGRAMS_TABLE_NAME,
      Item: programData,
    }));
  }

  /**
   * Store multiple programs using DynamoDB BatchWrite
   */
  async storeProgramsData(programs: ProgramData[]): Promise<void> {
    if (programs.length === 0) return;

    const BATCH_SIZE = 25; // DynamoDB BatchWrite limit
    const batches = [];
    
    for (let i = 0; i < programs.length; i += BATCH_SIZE) {
      batches.push(programs.slice(i, i + BATCH_SIZE));
    }

    console.log(`📝 Writing ${programs.length} programs in ${batches.length} batches...`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      try {
        const putRequests = batch.map(program => ({
          PutRequest: {
            Item: program
          }
        }));

        await docClient.send(new BatchWriteCommand({
          RequestItems: {
            [PROGRAMS_TABLE_NAME]: putRequests
          }
        }));

        console.log(`   ✅ Batch ${batchIndex + 1}/${batches.length} completed (${batch.length} items)`);

      } catch (error) {
        console.error(`❌ Failed to write batch ${batchIndex + 1}:`, error);
        
        // Fallback to individual writes
        console.log(`🔄 Falling back to individual writes for batch ${batchIndex + 1}...`);
        for (const program of batch) {
          try {
            await this.storeProgramData(program);
          } catch (individualError) {
            console.error(`❌ Failed to write individual program:`, individualError);
            throw individualError;
          }
        }
      }
    }
  }

  /**
   * Get all programs
   */
  async getAllPrograms(): Promise<ProgramData[]> {
    const result = await docClient.send(new ScanCommand({
      TableName: PROGRAMS_TABLE_NAME,
    }));

    return result.Items as ProgramData[] || [];
  }

  /**
   * Get program by program code
   */
  async getProgramByCode(programCode: string): Promise<ProgramData | null> {
    const result = await docClient.send(new QueryCommand({
      TableName: PROGRAMS_TABLE_NAME,
      KeyConditionExpression: 'programCode = :programCode',
      ExpressionAttributeValues: {
        ':programCode': programCode
      }
    }));

    const items = result.Items as ProgramData[] || [];
    return items.length > 0 ? items[0] : null;
  }

  /**
   * Get programs by genre
   */
  async getProgramsByGenre(genre: string): Promise<ProgramData[]> {
    const result = await docClient.send(new QueryCommand({
      TableName: PROGRAMS_TABLE_NAME,
      IndexName: 'GenreIndex', // GSI for genre queries
      KeyConditionExpression: 'genre = :genre',
      ExpressionAttributeValues: {
        ':genre': genre
      }
    }));

    return result.Items as ProgramData[] || [];
  }
}