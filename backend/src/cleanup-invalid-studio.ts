/**
 * Clean up invalid studio code "0" from the studios table
 * This script removes the duplicate invalid entry for 自由が丘 (Jiyugaoka) studio
 */

// Set environment variables for local execution
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.AWS_REGION = 'ap-northeast-1';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { studiosService } from './services/studios-service';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STUDIOS_TABLE_NAME = process.env.STUDIOS_TABLE_NAME || 'feelcycle-hub-studios-dev';

async function cleanupInvalidStudio() {
  console.log('🧹 Starting cleanup of invalid studio code "0"...');
  console.log(`📋 Target table: ${STUDIOS_TABLE_NAME}`);
  
  try {
    // First, check if the invalid studio "0" exists
    console.log('🔍 Checking for invalid studio code "0"...');
    const invalidStudio = await docClient.send(new GetCommand({
      TableName: STUDIOS_TABLE_NAME,
      Key: { studioCode: '0' },
    }));

    if (!invalidStudio.Item) {
      console.log('✅ No invalid studio code "0" found. Nothing to clean up.');
      return;
    }

    console.log('🚨 Found invalid studio entry:');
    console.log(`   Studio Name: ${invalidStudio.Item.studioName}`);
    console.log(`   Studio Code: ${invalidStudio.Item.studioCode}`);
    console.log(`   Region: ${invalidStudio.Item.region}`);
    console.log(`   Batch Status: ${(invalidStudio.Item as any).batchStatus || 'none'}`);
    console.log(`   Last Processed: ${(invalidStudio.Item as any).lastProcessed || 'never'}`);

    // Check if there's a valid duplicate with proper studio code
    console.log('🔍 Checking for valid duplicate studio...');
    const allStudios = await studiosService.getAllStudios();
    const duplicates = allStudios.filter(studio => 
      studio.studioName === invalidStudio.Item!.studioName && 
      studio.studioCode !== '0'
    );

    if (duplicates.length > 0) {
      console.log(`✅ Found ${duplicates.length} valid duplicate(s):`);
      duplicates.forEach(dup => {
        console.log(`   - ${dup.studioName} (${dup.studioCode}) in ${dup.region}`);
      });
    } else {
      console.log('⚠️  No valid duplicate found. This might be the only record for this studio.');
      console.log('🛑 Stopping cleanup to prevent data loss. Please investigate manually.');
      return;
    }

    // Verify studio count before deletion
    const currentStudios = await studiosService.getAllStudios();
    console.log(`📊 Current studio count: ${currentStudios.length}`);

    // Create backup of the invalid record before deletion
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    console.log('💾 Creating backup of invalid record...');
    console.log('📄 Invalid studio backup:', JSON.stringify(invalidStudio.Item, null, 2));

    // Delete the invalid studio record
    console.log('🗑️ Deleting invalid studio code "0"...');
    await docClient.send(new DeleteCommand({
      TableName: STUDIOS_TABLE_NAME,
      Key: { studioCode: '0' },
    }));

    console.log('✅ Invalid studio record deleted successfully!');

    // Verify deletion and final count
    const finalStudios = await studiosService.getAllStudios();
    console.log(`📊 Final studio count: ${finalStudios.length} (expected: ${currentStudios.length - 1})`);

    // Verify the valid studio still exists
    const validStudio = duplicates[0];
    const stillExists = await studiosService.getStudioByCode(validStudio.studioCode);
    if (stillExists) {
      console.log(`✅ Valid studio "${stillExists.studioName}" (${stillExists.studioCode}) still exists.`);
    } else {
      console.log('⚠️  Valid studio check failed - please verify manually.');
    }

    // Get batch progress to verify fix
    console.log('📈 Checking batch processing status...');
    const batchProgress = await studiosService.getBatchProgress();
    console.log('📊 Batch Progress Summary:');
    console.log(`   Total: ${batchProgress.total}`);
    console.log(`   Completed: ${batchProgress.completed}`);
    console.log(`   Processing: ${batchProgress.processing}`);
    console.log(`   Failed: ${batchProgress.failed}`);
    console.log(`   Remaining: ${batchProgress.remaining}`);

    console.log('🎉 Cleanup completed successfully!');
    console.log(`💡 Expected result: Studio count should be 37 valid studios (was ${currentStudios.length}, now ${finalStudios.length})`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

// Export for potential use as a module
export { cleanupInvalidStudio };

// Run directly if called as script
if (require.main === module) {
  cleanupInvalidStudio().catch(console.error);
}