const AWS = require('@aws-sdk/client-lambda');

async function testDailyBatch() {
  const lambda = new AWS.LambdaClient({ region: 'ap-northeast-1' });
  
  console.log('🧪 Testing daily batch execution...');
  
  try {
    // 日次バッチ用の正しいペイロード
    const payload = {
      source: 'eventbridge.dataRefresh'
    };
    
    console.log('📤 Invoking Lambda with daily refresh payload...');
    
    const response = await lambda.send(new AWS.InvokeCommand({
      FunctionName: 'feelcycle-hub-main-dev',
      Payload: new TextEncoder().encode(JSON.stringify(payload)),
    }));
    
    const result = new TextDecoder().decode(response.Payload);
    console.log('📥 Lambda response:', result);
    
    if (response.FunctionError) {
      console.log('❌ Function error detected:', response.FunctionError);
    } else {
      console.log('✅ Daily batch test completed successfully');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDailyBatch().catch(console.error);