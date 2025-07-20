import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FeelcycleScraper } from '../services/feelcycle-scraper';
import { lessonsService } from '../services/lessons-service';
import { studiosService } from '../services/studios-service';
import { ApiResponse, LessonSearchParams, LessonSearchFilters } from '../types';

/**
 * Lessons search API handler
 */
export async function handler(event: APIGatewayProxyEvent | any): Promise<APIGatewayProxyResult> {
  try {
    // Lambda直接呼び出しの場合
    if ('action' in event) {
      return await handleDirectInvocation(event);
    }
    
    const { httpMethod, path, queryStringParameters } = event;

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    };

    if (httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    if (httpMethod === 'GET') {
      if (path === '/studios') {
        return await getStudios();
      } else if (path.startsWith('/studios/') && path.endsWith('/dates')) {
        const studioCode = path.split('/')[2];
        return await getStudioDates(studioCode);
      } else if (path === '/lessons') {
        return await searchLessons(queryStringParameters || {});
      } else if (path === '/lessons/sample-data') {
        return await createSampleData(queryStringParameters || {});
      } else if (path === '/lessons/real-scrape') {
        return await executeRealScraping(queryStringParameters || {});
      } else if (path === '/studios/real') {
        return await getRealStudios();
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Endpoint not found',
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Lessons handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
      } as ApiResponse),
    };
  }
}

/**
 * Get all studios (from actual scraping data)
 */
async function getStudios(): Promise<APIGatewayProxyResult> {
  try {
    const allStudios = await studiosService.getAllStudios();
    console.log(`Retrieved ${allStudios.length} studios from DB`);
    
    // 重複除去（大文字版を優先）
    const studioMap = new Map();
    allStudios.forEach(studio => {
      const key = studio.studioName;
      const existing = studioMap.get(key);
      // 大文字のスタジオコードを優先
      if (!existing || studio.studioCode === studio.studioCode.toUpperCase()) {
        studioMap.set(key, {
          code: studio.studioCode,
          name: studio.studioName
        });
      }
    });
    
    const studios = Array.from(studioMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Processed ${studios.length} unique studios`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          studios
        },
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error getting studios from DB:', error);
    
    // フォールバック: 旧スタジオリスト（地域情報も削除）
    const studios = FeelcycleScraper.getStudios().map(studio => ({
      code: studio.code,
      name: studio.name
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          studios
        },
      } as ApiResponse),
    };
  }
}

/**
 * Get available dates for a specific studio
 */
async function getStudioDates(studioCode: string): Promise<APIGatewayProxyResult> {
  const studioInfo = FeelcycleScraper.getStudioInfo(studioCode);
  
  if (!studioInfo) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Studio not found',
      } as ApiResponse),
    };
  }

  try {
    const dates = await FeelcycleScraper.getAvailableDates(studioCode);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          studio: studioInfo,
          availableDates: dates,
        },
      } as ApiResponse),
    };
  } catch (error) {
    console.error(`Error getting dates for studio ${studioCode}:`, error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to get studio dates',
      } as ApiResponse),
    };
  }
}

/**
 * Search lessons with filters
 */
async function searchLessons(params: Record<string, string | undefined> | null): Promise<APIGatewayProxyResult> {
  if (!params?.studioCode || !params?.date) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Missing required parameters: studioCode and date',
      } as ApiResponse),
    };
  }

  const { studioCode, date, program, instructor, startTime, endTime } = params;
  
  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      } as ApiResponse),
    };
  }

  const studioInfo = FeelcycleScraper.getStudioInfo(studioCode);
  if (!studioInfo) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Studio not found',
      } as ApiResponse),
    };
  }

  try {
    const filters: LessonSearchFilters = {};
    
    if (program) filters.program = program;
    if (instructor) filters.instructor = instructor;
    if (startTime && endTime) {
      filters.timeRange = { start: startTime, end: endTime };
    }

    // Try to get real data from database first
    console.log(`Searching for real lesson data: studio=${studioCode}, date=${date}`);
    let lessons = await lessonsService.getLessonsForStudioAndDate(studioCode, date, filters);
    console.log(`Found ${lessons.length} real lessons in database`);
    
    // If no real data exists, use mock data as fallback
    if (lessons.length === 0) {
      console.log('No real lesson data found, using mock data');
      const mockLessons = await FeelcycleScraper.searchLessons(studioCode, date, filters);
      // Convert mock data format to real data format for consistency
      lessons = mockLessons.map(mockLesson => ({
        studioCode: mockLesson.studio,
        lessonDateTime: `${mockLesson.date}T${mockLesson.time}:00+09:00`,
        lessonDate: mockLesson.date,
        startTime: mockLesson.time,
        endTime: calculateEndTime(mockLesson.time),
        lessonName: mockLesson.program,
        instructor: mockLesson.instructor,
        availableSlots: mockLesson.availableSlots,
        totalSlots: mockLesson.totalSlots,
        isAvailable: mockLesson.isAvailable ? 'true' : 'false',
        program: mockLesson.program.split(' ')[0], // Extract program type
        lastUpdated: new Date().toISOString(),
        ttl: Math.floor((new Date().getTime() + 86400000) / 1000),
      }));
    } else {
      console.log('Using real lesson data from database');
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          studio: studioInfo,
          date,
          lessons,
          total: lessons.length,
          available: lessons.filter(l => l.isAvailable === 'true').length,
        },
      } as ApiResponse),
    };
  } catch (error) {
    console.error(`Error searching lessons:`, error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to search lessons',
      } as ApiResponse),
    };
  }
}

/**
 * Create sample lesson data for testing
 */
async function createSampleData(params: Record<string, string | undefined> | null): Promise<APIGatewayProxyResult> {
  const { studioCode, date } = params || {};
  
  if (!studioCode || !date) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Missing required parameters: studioCode and date',
      } as ApiResponse),
    };
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
      } as ApiResponse),
    };
  }

  const studioInfo = FeelcycleScraper.getStudioInfo(studioCode);
  if (!studioInfo) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Studio not found',
      } as ApiResponse),
    };
  }

  try {
    const sampleLessons = await lessonsService.createSampleLessons(studioCode, date);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          studio: studioInfo,
          date,
          lessons: sampleLessons,
          total: sampleLessons.length,
          available: sampleLessons.filter(l => l.isAvailable === 'true').length,
          message: 'Sample lesson data created successfully',
        },
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error creating sample lesson data:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to create sample lesson data',
      } as ApiResponse),
    };
  }
}

/**
 * Execute real scraping for a studio and date
 */
async function executeRealScraping(params: any): Promise<APIGatewayProxyResult> {
  const { studioCode, date, action, all } = params;

  // Special action to get real studio codes
  if (action === 'studios') {
    try {
      console.log('🚴‍♀️ Fetching real studio codes from FEELCYCLE website...');
      
      // Import real scraper
      const { RealFeelcycleScraper } = await import('../services/real-scraper');
      
      // Get real studios from the FEELCYCLE site
      const studios = await RealFeelcycleScraper.getRealStudios();
      
      await RealFeelcycleScraper.cleanup();
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          data: {
            studios,
            total: studios.length,
            message: 'Real studio codes fetched successfully',
          },
        } as ApiResponse),
      };
    } catch (error) {
      console.error('Error fetching real studios:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Failed to fetch real studios',
          details: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse),
      };
    }
  }

  // Handle all studios scraping
  if (all === 'true') {
    try {
      console.log(`🚴‍♀️ Starting real scraping for ALL studios, date: ${date}`);
      const realLessons = await lessonsService.executeRealScraping('all', date);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: true,
          data: {
            date,
            lessons: realLessons,
            total: realLessons.length,
            available: realLessons.filter(l => l.isAvailable === 'true').length,
            studios: [...new Set(realLessons.map(l => l.studioCode))].length,
            message: 'Real scraping executed successfully for all studios',
          },
        } as ApiResponse),
      };
    } catch (error) {
      console.error('Error executing real scraping for all studios:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Failed to execute real scraping for all studios',
          details: error instanceof Error ? error.message : 'Unknown error',
        } as ApiResponse),
      };
    }
  }

  if (!studioCode || !date) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Missing required parameters: studioCode and date (or action=studios)',
      } as ApiResponse),
    };
  }

  // リアルスクレイピングでは古いスタジオ検証をスキップ
  try {
    console.log(`🚴‍♀️ Starting real scraping for studio: ${studioCode}, date: ${date}`);
    const realLessons = await lessonsService.executeRealScraping(studioCode, date);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          studio: { code: studioCode, name: studioCode },
          date,
          lessons: realLessons,
          total: realLessons.length,
          available: realLessons.filter(l => l.isAvailable === 'true').length,
          message: 'Real scraping executed successfully',
        },
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error executing real scraping:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to execute real scraping',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse),
    };
  }
}

/**
 * Get real studios from FEELCYCLE reservation site
 */
async function getRealStudios(): Promise<APIGatewayProxyResult> {
  try {
    console.log('🚴‍♀️ Fetching real studio codes from FEELCYCLE website...');
    
    // Import real scraper
    const { RealFeelcycleScraper } = await import('../services/real-scraper');
    
    // Get real studios from the FEELCYCLE site
    const studios = await RealFeelcycleScraper.getRealStudios();
    
    await RealFeelcycleScraper.cleanup();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          studios,
          total: studios.length,
          message: 'Real studio codes fetched successfully',
        },
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error fetching real studios:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to fetch real studios',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse),
    };
  }
}

/**
 * Calculate end time (assuming 45-minute lessons)
 */
function calculateEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endDate = new Date();
  endDate.setHours(hours, minutes + 45, 0, 0);
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Handle direct Lambda invocation
 */
async function handleDirectInvocation(event: any): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  };

  try {
    const { action, studioCode, date } = event;
    
    if (action === 'get-lessons') {
      if (studioCode === 'all') {
        // 全スタジオのレッスン取得
        return await executeRealScraping({ all: 'true', date });
      } else {
        // 特定スタジオのレッスン取得 - 直接リアルスクレイピングを実行
        return await executeRealScraping({ studioCode, date });
      }
    }
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Invalid action. Supported actions: get-lessons',
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Direct invocation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse),
    };
  }
}