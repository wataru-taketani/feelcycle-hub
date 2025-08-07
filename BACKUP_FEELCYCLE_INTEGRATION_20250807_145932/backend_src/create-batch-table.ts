#!/usr/bin/env node

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CreateTableCommand, DescribeTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

const TABLE_NAME = process.env.STUDIO_BATCH_TABLE_NAME || 'feelcycle-studio-batch-dev';

/**
 * スタジオバッチテーブルを作成
 */
async function createBatchTable() {
  console.log('📋 スタジオバッチテーブルの作成');
  console.log('='.repeat(50));
  console.log(`テーブル名: ${TABLE_NAME}`);
  
  try {
    // 既存テーブルの確認
    try {
      await client.send(new DescribeTableCommand({
        TableName: TABLE_NAME
      }));
      
      console.log('⚠️  既存テーブルが存在します');
      console.log('削除してから再作成しますか？ (y/N)');
      
      // 本番環境では削除しない
      const shouldDelete = process.env.NODE_ENV !== 'production';
      
      if (shouldDelete) {
        console.log('🗑️  既存テーブルを削除中...');
        await client.send(new DeleteTableCommand({
          TableName: TABLE_NAME
        }));
        
        // 削除完了を待機
        console.log('⏳ 削除完了を待機中...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        console.log('✅ 既存テーブルをそのまま使用します');
        return;
      }
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
      console.log('📝 新規テーブルを作成します');
    }
    
    // テーブル作成
    const createTableParams = {
      TableName: TABLE_NAME,
      KeySchema: [
        {
          AttributeName: 'batchId',
          KeyType: 'HASH' as const
        },
        {
          AttributeName: 'studioCode',
          KeyType: 'RANGE' as const
        }
      ],
      AttributeDefinitions: [
        {
          AttributeName: 'batchId',
          AttributeType: 'S' as const
        },
        {
          AttributeName: 'studioCode',
          AttributeType: 'S' as const
        }
      ],
      BillingMode: 'PAY_PER_REQUEST' as const,
      TimeToLiveSpecification: {
        AttributeName: 'ttl',
        Enabled: true
      },
      Tags: [
        {
          Key: 'Environment',
          Value: process.env.NODE_ENV || 'development'
        },
        {
          Key: 'Purpose',
          Value: 'StudioBatchProcessing'
        }
      ]
    };
    
    console.log('🔨 テーブル作成中...');
    await client.send(new CreateTableCommand(createTableParams));
    
    console.log('⏳ テーブル作成完了を待機中...');
    
    // テーブル作成完了を待機
    let tableReady = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!tableReady && attempts < maxAttempts) {
      try {
        const describeResult = await client.send(new DescribeTableCommand({
          TableName: TABLE_NAME
        }));
        
        if (describeResult.Table?.TableStatus === 'ACTIVE') {
          tableReady = true;
        } else {
          console.log(`  状態: ${describeResult.Table?.TableStatus}`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.log(`  確認中... (${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      attempts++;
    }
    
    if (tableReady) {
      console.log('✅ テーブル作成完了!');
      console.log(`\n📋 テーブル情報:`);
      console.log(`  テーブル名: ${TABLE_NAME}`);
      console.log(`  パーティションキー: batchId (String)`);
      console.log(`  ソートキー: studioCode (String)`);
      console.log(`  TTL: 7日間で自動削除`);
      console.log(`\n🚀 使用方法:`);
      console.log(`  STUDIO_BATCH_TABLE_NAME=${TABLE_NAME} npm run init-batch`);
    } else {
      console.error('❌ テーブル作成がタイムアウトしました');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('❌ テーブル作成エラー:', error);
    process.exit(1);
  }
}

createBatchTable().catch(console.error);