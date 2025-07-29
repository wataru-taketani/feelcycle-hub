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
    
    // GET /history - 受講履歴一覧取得
    if (httpMethod === 'GET' && path === '/history') {
      return await getHistoryList(event);
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
      monthlyLessons: 8,
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
      favoriteStudios: [
        { name: '銀座', count: 8 },
        { name: '渋谷', count: 4 },
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

/**
 * 受講履歴一覧の取得（スタブ実装）
 */
async function getHistoryList(event: APIGatewayProxyEvent): Promise<ApiResponse> {
  try {
    const userId = event.queryStringParameters?.userId;
    const startDate = event.queryStringParameters?.startDate;
    const endDate = event.queryStringParameters?.endDate;
    
    if (!userId) {
      return {
        success: false,
        error: 'Bad Request',
        message: 'userId is required',
      };
    }
    
    // TODO: 実際の履歴データ取得処理を実装
    const mockHistory = [
      {
        lessonId: 'mock-1',
        studioCode: 'gnz',
        studioName: '銀座',
        lessonDate: '2025-07-28',
        startTime: '19:00',
        lessonName: 'BB1 House 1',
        instructor: 'YUKI',
        program: 'BB1',
        attendanceStatus: 'attended',
        timestamp: '2025-07-28T19:00:00Z'
      },
      {
        lessonId: 'mock-2',
        studioCode: 'sby',
        studioName: '渋谷',
        lessonDate: '2025-07-26',
        startTime: '10:30',
        lessonName: 'BSL Deep 2',
        instructor: 'MIKI',
        program: 'BSL',
        attendanceStatus: 'attended',
        timestamp: '2025-07-26T10:30:00Z'
      },
      {
        lessonId: 'mock-3',
        studioCode: 'sjk',
        studioName: '新宿',
        lessonDate: '2025-07-24',
        startTime: '18:30',
        lessonName: 'BSB Beats',
        instructor: 'NANA',
        program: 'BSB',
        attendanceStatus: 'cancelled',
        timestamp: '2025-07-24T18:30:00Z'
      }
    ];
    
    return {
      success: true,
      data: mockHistory,
      message: 'History retrieved successfully',
    };
    
  } catch (error) {
    console.error('Get history list error:', error);
    throw error;
  }
}