const AWS = require('@aws-sdk/client-lambda');

async function testLessonsRetrieval() {
  const lambda = new AWS.LambdaClient({ region: 'ap-northeast-1' });
  
  console.log('🚀 Testing lessons retrieval system...');
  console.log('==================================================');
  
  try {
    // Test 1: Studios API
    console.log('\n📍 Test 1: Studios API');
    const studiosResponse = await lambda.send(new AWS.InvokeCommand({
      FunctionName: 'feelcycle-hub-main-dev',
      Payload: JSON.stringify({
        httpMethod: 'GET',
        path: '/studios',
        headers: { 'Content-Type': 'application/json' },
        queryStringParameters: null,
      }),
    }));
    
    const payload = new TextDecoder().decode(studiosResponse.Payload);
    console.log('Raw payload:', payload);
    const studiosResult = JSON.parse(payload);
    const studiosBody = JSON.parse(studiosResult.body);
    console.log(`✅ Studios API Response: ${studiosResult.statusCode}`);
    console.log(`   Found ${studiosBody.data?.studios?.length || 0} studios`);
    
    // Test 2: Trigger data refresh
    console.log('\n🔄 Test 2: Triggering daily data refresh');
    const refreshResponse = await lambda.send(new AWS.InvokeCommand({
      FunctionName: 'feelcycle-hub-main-dev',
      Payload: JSON.stringify({
        source: 'eventbridge.dataRefresh',
        action: 'refreshData',
      }),
    }));
    
    console.log('✅ Data refresh triggered successfully');
    console.log('   Check CloudWatch logs for detailed progress');
    
    // Test 3: Lessons API
    console.log('\n📚 Test 3: Lessons API (after refresh)');
    setTimeout(async () => {
      try {
        const lessonsResponse = await lambda.send(new AWS.InvokeCommand({
          FunctionName: 'feelcycle-hub-main-dev',
          Payload: JSON.stringify({
            httpMethod: 'GET',
            path: '/lessons',
            headers: { 'Content-Type': 'application/json' },
            queryStringParameters: {
              studioCode: 'shibuya',
              date: '2025-07-20',
            },
          }),
        }));
        
        const lessonsResult = JSON.parse(new TextDecoder().decode(lessonsResponse.Payload));
        const lessonsBody = JSON.parse(lessonsResult.body);
        console.log(`✅ Lessons API Response: ${lessonsResult.statusCode}`);
        console.log(`   Found ${lessonsBody.data?.lessons?.length || 0} lessons for Shibuya on 2025-07-20`);
        
      } catch (error) {
        console.error('❌ Lessons API test failed:', error);
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLessonsRetrieval().catch(console.error);