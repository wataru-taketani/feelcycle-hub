import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { LambdaEvent, ApiResponse } from '../types/index';
import { authHandler } from './auth';
import { reservationHandler } from './reservation';
import { lineHandler } from './line';
import { historyHandler } from './history';
import { monitoringHandler } from './monitoring';
import { handler as waitlistHandler } from './waitlist';
import { handler as lessonsHandler } from './lessons';

/**
 * メインLambda関数ハンドラー
 * 全てのAPIリクエストとEventBridgeイベントを処理
 */
export async function handler(
  event: APIGatewayProxyEvent | LambdaEvent,
  context: Context
): Promise<APIGatewayProxyResult | void> {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // EventBridge からの定期実行
    if ('source' in event && (event.source === 'eventbridge.monitoring' || event.source === 'eventbridge.cleanup')) {
      await monitoringHandler(event);
      return;
    }
    
    // API Gateway からのHTTPリクエスト
    const apiEvent = event as APIGatewayProxyEvent;
    const { httpMethod, path } = apiEvent;
    
    // CORS ヘッダー
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    };
    
    // OPTIONS リクエスト（CORS プリフライト）
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }
    
    let result: ApiResponse;
    
    // ルーティング
    if (path.startsWith('/auth/')) {
      result = await authHandler(apiEvent);
    } else if (path.startsWith('/watch')) {
      result = await reservationHandler(apiEvent);
    } else if (path.startsWith('/waitlist')) {
      return await waitlistHandler(apiEvent);
    } else if (path.startsWith('/studios') || path.startsWith('/lessons')) {
      return await lessonsHandler(apiEvent);
    } else if (path.startsWith('/line/')) {
      result = await lineHandler(apiEvent);
    } else if (path.startsWith('/history/')) {
      result = await historyHandler(apiEvent);
    } else {
      result = {
        success: false,
        error: 'Not Found',
        message: `Path ${path} not found`,
      };
    }
    
    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify(result),
    };
    
  } catch (error) {
    console.error('Handler error:', error);
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(errorResponse),
    };
  }
}