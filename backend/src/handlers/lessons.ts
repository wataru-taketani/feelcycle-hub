import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FeelcycleScraper } from '../services/feelcycle-scraper';
import { ApiResponse, LessonSearchParams } from '../types';

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
        return await searchLessons(queryStringParameters);
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
async function searchLessons(params: Record<string, string> | null): Promise<APIGatewayProxyResult> {
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
    const filters: any = {};
    
    if (program) filters.program = program;
    if (instructor) filters.instructor = instructor;
    if (startTime && endTime) {
      filters.timeRange = { start: startTime, end: endTime };
    }

    const lessons = await FeelcycleScraper.searchLessons(studioCode, date, filters);
    
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
          available: lessons.filter(l => l.isAvailable).length,
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