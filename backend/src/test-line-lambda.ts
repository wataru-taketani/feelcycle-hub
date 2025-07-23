/**
 * Lambda環境でのLINE通知テスト用エントリーポイント
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { testLineDirect } from './test-line-direct';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('🧪 Lambda LINE test handler started');
  console.log('📝 Event:', JSON.stringify(event, null, 2));
  
  try {
    await testLineDirect();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        message: 'LINE test completed successfully'
      })
    };
    
  } catch (error) {
    console.error('❌ Lambda LINE test failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      })
    };
  }
};