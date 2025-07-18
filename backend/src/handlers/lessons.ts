import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FeelcycleScraper } from '../services/feelcycle-scraper';
import { lessonsService } from '../services/lessons-service';
import { ApiResponse, LessonSearchParams, LessonSearchFilters } from '../types';

/**
 * Lessons search API handler
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
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
 * Get all studios grouped by region
 */
async function getStudios(): Promise<APIGatewayProxyResult> {
  const studios = FeelcycleScraper.getStudios();
  const regions = FeelcycleScraper.getRegions();
  
  const studiosByRegion = regions.reduce((acc, region) => {
    acc[region] = FeelcycleScraper.getStudiosByRegion(region);
    return acc;
  }, {} as Record<string, any>);

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
        regions,
        studiosByRegion,
      },
    } as ApiResponse),
  };
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
 * Calculate end time (assuming 45-minute lessons)
 */
function calculateEndTime(startTime: string): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const endDate = new Date();
  endDate.setHours(hours, minutes + 45, 0, 0);
  return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
}