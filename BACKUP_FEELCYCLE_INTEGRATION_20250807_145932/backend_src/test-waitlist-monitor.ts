/**
 * Waitlist Monitor システムのテスト
 * 実際の環境でのテスト実行用
 */
import { handler } from './handlers/waitlist-monitor';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';

async function testWaitlistMonitor() {
  console.log('🧪 Starting waitlist monitor test...');
  
  // モックイベントを作成
  const mockEvent: APIGatewayProxyEvent = {
    httpMethod: 'POST',
    path: '/monitor',
    headers: {},
    multiValueHeaders: {},
    pathParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: 'test-request-id',
      stage: 'test',
      resourceId: 'test-resource',
      httpMethod: 'POST',
      resourcePath: '/monitor',
      path: '/test/monitor',
      accountId: 'test-account',
      apiId: 'test-api',
      protocol: 'HTTP/1.1',
      requestTime: new Date().toISOString(),
      requestTimeEpoch: Date.now(),
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
        clientCert: null
      },
      authorizer: null
    },
    body: JSON.stringify({
      source: 'eventbridge.scheduler',
      'detail-type': 'Scheduled Event',
      detail: {
        taskType: 'waitlist-monitoring',
        scheduledTime: 'rate(1 minute)'
      }
    }),
    isBase64Encoded: false,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    resource: '/monitor'
  };

  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-waitlist-monitor',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:ap-northeast-1:123456789012:function:test-waitlist-monitor',
    memoryLimitInMB: '1024',
    awsRequestId: 'test-aws-request-id',
    logGroupName: '/aws/lambda/test-waitlist-monitor',
    logStreamName: '2025/07/22/[$LATEST]test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {}
  };

  try {
    console.log('📝 Test event:', JSON.stringify(mockEvent, null, 2));
    
    const result = await handler(mockEvent, mockContext);
    
    console.log('✅ Test completed successfully');
    console.log('📊 Result:', JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// 環境変数をテスト用に設定（本番では実際の値を使用）
process.env.WAITLIST_TABLE_NAME = 'feelcycle-waitlist';
process.env.USER_TABLE_NAME = 'feelcycle-users';
process.env.LINE_API_SECRET_ARN = 'arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:line-api-credentials-XXXXX';
process.env.AWS_REGION = 'ap-northeast-1';

// メイン実行
if (require.main === module) {
  testWaitlistMonitor()
    .then((result) => {
      console.log('🎉 Test passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed!', error);
      process.exit(1);
    });
}