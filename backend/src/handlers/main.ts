import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { LambdaEvent, ApiResponse } from '../types/index';
import { authHandler } from './auth';
import { reservationHandler } from './reservation';
import { lineHandler } from './line';
import { historyHandler } from './history';
import { monitoringHandler } from './monitoring';
import { handler as waitlistHandler } from './waitlist';
import { handler as lessonsHandler } from './lessons';
import { handler as waitlistMonitorHandler } from './waitlist-monitor';
import { handler as userLessonsHandler } from './user-lessons';
import { progressiveDailyRefresh } from '../scripts/progressive-daily-refresh';
import { debugLambdaModules } from '../debug-lambda-modules';
import { simpleTest } from '../simple-test';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { logJSTInfo } from '../utils/dateUtils';

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
    if ('source' in event) {
      if (event.source === 'eventbridge.monitoring' || event.source === 'eventbridge.cleanup') {
        await monitoringHandler(event);
        return;
      } else if (event.source === 'eventbridge.dataRefresh') {
        await handleDataRefresh(event);
        return;
      } else if (event.source === 'eventbridge.scheduler' && 
                 event['detail-type'] === 'Scheduled Event' && 
                 event.detail?.taskType === 'waitlist-monitoring') {
        console.log('🔍 Starting waitlist monitoring...');
        const result = await waitlistMonitorHandler(event as any, context);
        console.log('📊 Waitlist monitoring result:', result);
        return;
      }
    }
    
    // Lambda直接呼び出しかAPI Gatewayかを判定
    if ('action' in event) {
      // Lambda直接呼び出し
      return await lessonsHandler(event as any);
    }
    
    // API Gateway からのHTTPリクエスト
    const apiEvent = event as APIGatewayProxyEvent;
    const { httpMethod, path } = apiEvent;
    
    // CORS ヘッダー
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
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
    } else if (path.startsWith('/user/')) {
      result = await authHandler(apiEvent); // User settings handled in auth handler
    } else if (path.startsWith('/watch')) {
      result = await reservationHandler(apiEvent);
    } else if (path.startsWith('/waitlist')) {
      return await waitlistHandler(apiEvent);
    } else if (path.startsWith('/user-lessons')) {
      return await userLessonsHandler(apiEvent);
    } else if (path.startsWith('/studios') || path.startsWith('/lessons')) {
      return await lessonsHandler(apiEvent);
    } else if (path.startsWith('/line/')) {
      result = await lineHandler(apiEvent);
    } else if (path.startsWith('/history/')) {
      result = await historyHandler(apiEvent);
    } else if (path === '/debug-modules') {
      return await debugLambdaModules(apiEvent);
    } else if (path === '/simple-test') {
      return await simpleTest(apiEvent);
    } else if (path === '/test-line') {
      // LINE通知テスト用エンドポイント
      const { handler: lineTestHandler } = await import('../test-line-lambda');
      return await lineTestHandler(apiEvent, context);
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
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify(errorResponse),
    };
  }
}

/**
 * Progressive daily data refresh - processes one studio at a time
 */
async function handleDataRefresh(event: LambdaEvent): Promise<void> {
  console.log('🔄 Progressive daily lesson data refresh started');
  logJSTInfo('Daily Refresh Start Time');
  
  try {
    const startTime = Date.now();
    const result = await progressiveDailyRefresh();
    const duration = (Date.now() - startTime) / 1000;
    
    if (result?.triggerNext) {
      console.log('🔄 Triggering next studio processing...');
      console.log('INFO: PROGRESSIVE_REFRESH_CONTINUE', {
        duration: `${duration.toFixed(1)} seconds`,
        progress: result.progress,
      });
      logJSTInfo('Continue Next Studio');
      
      // Self-trigger for next studio processing
      await triggerNextExecution();
      
    } else {
      console.log('✅ Progressive daily lesson data refresh completed successfully');
      console.log('INFO: PROGRESSIVE_REFRESH_SUCCESS', {
        duration: `${duration.toFixed(1)} seconds`,
        progress: result?.progress,
        nextScheduled: '3:00 AM JST tomorrow'
      });
      logJSTInfo('Daily Refresh Completed');
    }
  } catch (error) {
    console.error('❌ Progressive daily lesson data refresh failed:', error);
    
    // CloudWatch Logs に ERROR レベルでログを出力（アラート設定で通知可能）
    console.error('ALERT: PROGRESSIVE_REFRESH_FAILED', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    logJSTInfo('Daily Refresh Failed');
    
    throw error;
  }
}

/**
 * Trigger next Lambda execution for continuing progressive batch
 */
async function triggerNextExecution(): Promise<void> {
  try {
    const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
    
    const payload = {
      source: 'eventbridge.dataRefresh',
      trigger: 'auto-continue'
    };
    
    const command = new InvokeCommand({
      FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME || 'feelcycle-hub-main-dev',
      InvocationType: 'Event', // Asynchronous invocation
      Payload: JSON.stringify(payload),
    });
    
    await lambdaClient.send(command);
    console.log('✅ Next execution triggered successfully');
    
    // Add a small delay to prevent rapid successive invocations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error('❌ Failed to trigger next execution:', error);
    // Don't throw - let the current execution complete successfully
    // The EventBridge schedule will eventually trigger the next run
  }
}