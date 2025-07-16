import { APIGatewayProxyEvent } from 'aws-lambda';
import { ApiResponse } from '../types/index';

/**
 * 履歴関連のリクエストハンドラー（スタブ実装）
 */
export async function historyHandler(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  const { httpMethod, path } = event;
  
  try {
    // GET /history/summary - 受講履歴サマリー取得
    if (httpMethod === 'GET' && path === '/history/summary') {
      return await getHistorySummary(event);
    }
    
    return {
      success: false,
      error: 'Not Found',
      message: `History endpoint ${httpMethod} ${path} not found`,
    };
    
  } catch (error) {
    console.error('History handler error:', error);
    return {
      success: false,
      error: 'History Error',
      message: error instanceof Error ? error.message : 'Unknown history error',
    };
  }
}

/**
 * 受講履歴サマリーの取得（スタブ実装）
 */
async function getHistorySummary(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  try {
    const period = event.queryStringParameters?.period || 'month';
    
    // TODO: 実際の履歴データ取得処理を実装
    const mockSummary = {
      period,
      totalLessons: 12,
      remainingLessons: 8,
      favoriteInstructors: [
        { name: 'YUKI', count: 5 },
        { name: 'MIKI', count: 4 },
        { name: 'NANA', count: 3 },
      ],
      favoritePrograms: [
        { name: 'BB1', count: 6 },
        { name: 'BSL', count: 4 },
        { name: 'BSB', count: 2 },
      ],
      studioBreakdown: [
        { studio: '表参道', count: 8 },
        { studio: '銀座', count: 4 },
      ],
    };
    
    return {
      success: true,
      data: mockSummary,
      message: 'History summary retrieved successfully',
    };
    
  } catch (error) {
    console.error('Get history summary error:', error);
    throw error;
  }
}