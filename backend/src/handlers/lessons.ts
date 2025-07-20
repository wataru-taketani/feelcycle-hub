import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FeelcycleScraper } from '../services/feelcycle-scraper';
import { lessonsService } from '../services/lessons-service';
import { studiosService } from '../services/studios-service';
import { ApiResponse, LessonSearchParams, LessonSearchFilters, LessonData, normalizeStudioCode } from '../types';

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
      } else if (path === '/lessons/range') {
        return await searchLessonsRange(queryStringParameters || {});
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
    
    // 公式サイトと同じ地域別グループ化と順番
    const studioGroups = {
      'EAST AREA│関東': [
        { code: 'GKBS', name: '銀座京橋' },
        { code: 'GNZ', name: '銀座' },
        { code: 'GTD', name: '五反田' },
        { code: 'IKB', name: '池袋' },
        { code: 'JYO', name: '自由が丘' },
        { code: 'KCJ', name: '吉祥寺' },
        { code: 'NMG', name: '中目黒' },
        { code: 'MCD', name: '町田' },
        { code: 'TCK', name: '立川' },
        { code: 'SBY', name: '渋谷' },
        { code: 'SDM', name: '汐留' },
        { code: 'SJK', name: '新宿' },
        { code: 'TMC', name: '多摩センター' },
        { code: 'UEN', name: '上野' },
        { code: 'AZN', name: 'あざみ野' },
        { code: 'AZNP', name: 'あざみ野Pilates' },
        { code: 'KOK', name: '上大岡' },
        { code: 'KWS', name: '川崎' },
        { code: 'MKG', name: '武蔵小杉' },
        { code: 'YKH', name: '横浜' },
        { code: 'YSC', name: '横須賀中央' },
        { code: 'KSG', name: '越谷' },
        { code: 'OMY', name: '大宮' },
        { code: 'FNB', name: '船橋' },
        { code: 'KHM', name: '海浜幕張' },
        { code: 'KSW', name: '柏' },
      ],
      'NORTH AREA│北海道': [
        { code: 'SPR', name: '札幌' },
      ],
      'WEST AREA│東海・関西': [
        { code: 'NGY', name: '名古屋' },
        { code: 'SKE', name: '栄' },
        { code: 'GIF', name: '岐阜' },
        { code: 'OKBS', name: '大阪京橋' },
        { code: 'SSB', name: '心斎橋' },
        { code: 'UMDC', name: '梅田茶屋町' },
        { code: 'KTK', name: '京都河原町' },
        { code: 'SMY', name: '三ノ宮' },
      ],
      'SOUTH AREA│中国・四国・九州': [
        { code: 'HSM', name: '広島' },
        { code: 'TKM', name: '高松' },
        { code: 'FTJ', name: '福岡天神' },
      ]
    };
    
    // 実際にDBに存在するスタジオのみをフィルタリング
    const filteredGroups: { [key: string]: { code: string; name: string }[] } = {};
    Object.entries(studioGroups).forEach(([groupName, studios]) => {
      const availableStudios = studios.filter(studio => {
        return studioMap.has(studio.name);
      });
      if (availableStudios.length > 0) {
        filteredGroups[groupName] = availableStudios;
      }
    });
    
    // フラット化したスタジオリストも提供（後方互換性のため）
    const flatStudios = Object.values(filteredGroups).flat();
    
    console.log(`Processed ${flatStudios.length} unique studios in ${Object.keys(filteredGroups).length} groups`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          studioGroups: filteredGroups,
          studios: flatStudios  // 後方互換性のため
        },
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error getting studios from DB:', error);
    
    // フォールバック: 旧スタジオリスト
    const fallbackStudios = FeelcycleScraper.getStudios().map(studio => ({
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
          studioGroups: {}, // 空のグループ
          studios: fallbackStudios
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
  console.log('🔍 searchLessons called with params:', JSON.stringify(params));
  
  // Check if this is a range request
  if (params?.range === 'true' && params?.studioCode) {
    console.log('📊 Detected range request, delegating to searchLessonsRange');
    return await searchLessonsRange(params);
  }
  
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

  // Validate studio exists in actual scraping data (no longer use hardcoded list)
  let studioInfo;
  try {
    const allStudios = await studiosService.getAllStudios();
    const foundStudio = allStudios.find(studio => 
      studio.studioCode === studioCode || 
      studio.studioCode === studioCode.toLowerCase() ||
      studio.studioCode === studioCode.toUpperCase()
    );
    
    if (foundStudio) {
      studioInfo = {
        code: foundStudio.studioCode,
        name: foundStudio.studioName,
        region: 'unknown' // Not needed but kept for compatibility
      };
    } else {
      // Fallback to old validation for compatibility
      studioInfo = FeelcycleScraper.getStudioInfo(studioCode);
    }
  } catch (error) {
    console.log('Failed to validate studio from DB, using fallback:', error);
    studioInfo = FeelcycleScraper.getStudioInfo(studioCode);
  }

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
        message: `Studio code "${studioCode}" not found in available studios`,
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
    // DynamoDB stores studio codes in lowercase, so normalize the query
    const normalizedStudioCode = normalizeStudioCode(studioCode);
    console.log(`Searching for real lesson data: studio=${studioCode} (normalized: ${normalizedStudioCode}), date=${date}`);
    let lessons = await lessonsService.getLessonsForStudioAndDate(normalizedStudioCode, date, filters);
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
 * Search lessons across multiple dates for a studio
 */
async function searchLessonsRange(params: Record<string, string | undefined> | null): Promise<APIGatewayProxyResult> {
  console.log('🔍 searchLessonsRange called with params:', JSON.stringify(params));
  
  if (!params?.studioCode) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Missing required parameter: studioCode',
      } as ApiResponse),
    };
  }

  const { studioCode, startDate, endDate, program, instructor, startTime, endTime } = params;
  
  // Default to 7 days if no date range specified
  const start = startDate || new Date().toISOString().split('T')[0];
  const end = endDate || (() => {
    const date = new Date();
    date.setDate(date.getDate() + 6);
    return date.toISOString().split('T')[0];
  })();

  // Validate studio exists
  const normalizedStudioCode = normalizeStudioCode(studioCode);
  let studioInfo;
  try {
    const allStudios = await studiosService.getAllStudios();
    const foundStudio = allStudios.find(studio => 
      studio.studioCode === normalizedStudioCode
    );
    
    if (foundStudio) {
      studioInfo = {
        code: foundStudio.studioCode,
        name: foundStudio.studioName,
        region: 'unknown'
      };
    } else {
      studioInfo = FeelcycleScraper.getStudioInfo(studioCode);
    }
  } catch (error) {
    console.log('Failed to validate studio from DB, using fallback:', error);
    studioInfo = FeelcycleScraper.getStudioInfo(studioCode);
  }

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
        message: `Studio code "${studioCode}" not found in available studios`,
      } as ApiResponse),
    };
  }

  try {
    console.log(`✅ Studio validation passed: ${studioCode} -> ${normalizedStudioCode}`);
    console.log(`📅 Date range: ${start} to ${end}`);
    
    const filters: LessonSearchFilters = {};
    
    if (program) filters.program = program;
    if (instructor) filters.instructor = instructor;
    if (startTime && endTime) {
      filters.timeRange = { start: startTime, end: endTime };
    }

    console.log(`🔍 Filters applied:`, JSON.stringify(filters));

    // Get lessons for date range
    console.log(`🔎 Calling getLessonsForStudioAndDateRange...`);
    const lessons = await lessonsService.getLessonsForStudioAndDateRange(normalizedStudioCode, start, end, filters);
    console.log(`📊 Database query result: ${lessons.length} lessons found`);
    
    // Group lessons by date
    console.log(`📊 Grouping lessons by date...`);
    const lessonsByDate: { [date: string]: LessonData[] } = {};
    lessons.forEach(lesson => {
      const date = lesson.lessonDate;
      if (!lessonsByDate[date]) {
        lessonsByDate[date] = [];
      }
      lessonsByDate[date].push(lesson);
    });
    
    const dateKeys = Object.keys(lessonsByDate);
    console.log(`📅 Grouped into ${dateKeys.length} dates:`, dateKeys);
    console.log(`💡 Sample lesson structure:`, lessons[0] ? JSON.stringify(lessons[0]) : 'No lessons found');
    
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
          dateRange: { start, end },
          lessonsByDate,
          total: lessons.length,
          available: lessons.filter(l => l.isAvailable === 'true').length,
        },
      } as ApiResponse),
    };
  } catch (error) {
    console.error(`❌ Error in searchLessonsRange:`, error);
    console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack available');
    console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to search lessons',
        details: error instanceof Error ? error.message : 'Unknown error',
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