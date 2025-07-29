/**
 * Lambda本番実行テスト - EventBridge dataRefreshイベントをシミュレート
 */

const { handler } = require('./dist/handlers/main.js');

// 環境変数設定（本番環境と同様）
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';
process.env.STUDIO_BATCH_TABLE_NAME = 'feelcycle-studio-batch-dev';
process.env.USER_LESSONS_TABLE_NAME = 'feelcycle-hub-user-lessons-dev';
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USERS_TABLE_NAME = 'feelcycle-hub-users-dev';
process.env.AWS_LAMBDA_FUNCTION_NAME = 'feelcycle-hub-main-dev'; // Lambda環境識別用

// LINE関連の必須環境変数（テスト用ダミー）
process.env.LINE_API_SECRET_ARN = 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:line-api-secret';
process.env.LINE_CHANNEL_ACCESS_TOKEN_ARN = 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:line-channel-token';
process.env.USER_CREDENTIALS_SECRET_ARN = 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:user-credentials';

async function testLambdaExecution() {
  console.log('🚀 Lambda本番実行テスト開始');
  console.log('EventBridge dataRefreshイベントをシミュレート');
  console.log('='.repeat(60));
  
  // EventBridge dataRefreshイベントを模擬
  const mockEvent = {
    source: 'eventbridge.dataRefresh',
    'detail-type': 'Scheduled Event',
    detail: {
      taskType: 'daily-data-refresh'
    },
    time: new Date().toISOString(),
    region: 'ap-northeast-1'
  };
  
  const mockContext = {
    functionName: 'feelcycle-hub-main-dev',
    functionVersion: '$LATEST',
    requestId: 'test-request-id',
    getRemainingTimeInMillis: () => 900000 // 15分
  };
  
  try {
    console.log('📨 EventBridge event:', JSON.stringify(mockEvent, null, 2));
    console.log('\n🔄 Lambda handler実行...');
    
    const startTime = Date.now();
    const result = await handler(mockEvent, mockContext);
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`\n✅ Lambda実行完了 (${duration.toFixed(2)}秒)`);
    console.log('Result:', result);
    
  } catch (error) {
    console.error('\n❌ Lambda実行エラー:', error);
    process.exit(1);
  }
}

testLambdaExecution();