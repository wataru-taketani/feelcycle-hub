import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserLessonsService } from '../services/user-lessons-service';
import { ApiResponse } from '../types';

const userLessonsService = new UserLessonsService();

/**
 * User lessons API handler
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { httpMethod, path, queryStringParameters } = event;
    console.log(`${httpMethod} ${path}`, queryStringParameters);

    if (httpMethod === 'GET' && path === '/user-lessons/favorites') {
      return await getFavorites(queryStringParameters);
    }
    
    if (httpMethod === 'POST' && path === '/user-lessons/favorites') {
      return await addToFavorites(JSON.parse(event.body || '{}'));
    }
    
    if (httpMethod === 'DELETE' && path.startsWith('/user-lessons/favorites/')) {
      const lessonId = path.split('/').pop();
      return await removeFromFavorites(lessonId, queryStringParameters);
    }
    
    if (httpMethod === 'GET' && path === '/user-lessons/waitlist') {
      return await getWaitlist(queryStringParameters);
    }
    
    if (httpMethod === 'POST' && path === '/user-lessons/waitlist') {
      return await addToWaitlist(JSON.parse(event.body || '{}'));
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
    console.error('User lessons handler error:', error);
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

/**
 * Get user's favorites
 */
async function getFavorites(params: Record<string, string | undefined> | null): Promise<APIGatewayProxyResult> {
  const { userId } = params || {};
  
  if (!userId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Missing userId parameter',
      } as ApiResponse),
    };
  }

  try {
    const favorites = await userLessonsService.getUserLessonsByType(userId, 'favorite');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: favorites,
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error getting favorites:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to get favorites',
      } as ApiResponse),
    };
  }
}

/**
 * Add lesson to favorites
 */
async function addToFavorites(data: any): Promise<APIGatewayProxyResult> {
  const { userId, studioCode, lessonDate, startTime, lessonName, instructor, notes } = data;
  
  if (!userId || !studioCode || !lessonDate || !startTime || !lessonName || !instructor) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Missing required fields',
      } as ApiResponse),
    };
  }

  try {
    const result = await userLessonsService.addToFavorites(userId, {
      studioCode,
      lessonDate,
      startTime,
      lessonName,
      instructor,
      notes,
    });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: result,
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to add to favorites',
      } as ApiResponse),
    };
  }
}

/**
 * Remove lesson from favorites
 */
async function removeFromFavorites(lessonId: string | undefined, params: Record<string, string | undefined> | null): Promise<APIGatewayProxyResult> {
  const { userId } = params || {};
  
  if (!userId || !lessonId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Missing userId or lessonId parameter',
      } as ApiResponse),
    };
  }

  try {
    // lessonId format: studioCode-lessonDate-startTime
    const [studioCode, lessonDate, startTime] = lessonId.split('-');
    
    if (!studioCode || !lessonDate || !startTime) {
      throw new Error('Invalid lessonId format');
    }
    
    await userLessonsService.removeUserLesson(userId, studioCode, lessonDate, startTime, 'favorite');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        message: 'Removed from favorites',
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to remove from favorites',
      } as ApiResponse),
    };
  }
}

/**
 * Get user's waitlist
 */
async function getWaitlist(params: Record<string, string | undefined> | null): Promise<APIGatewayProxyResult> {
  const { userId } = params || {};
  
  if (!userId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Missing userId parameter',
      } as ApiResponse),
    };
  }

  try {
    const waitlist = await userLessonsService.getUserLessonsByType(userId, 'waitlist');
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: waitlist,
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error getting waitlist:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to get waitlist',
      } as ApiResponse),
    };
  }
}

/**
 * Add lesson to waitlist
 */
async function addToWaitlist(data: any): Promise<APIGatewayProxyResult> {
  const { userId, studioCode, lessonDate, startTime, lessonName, instructor } = data;
  
  if (!userId || !studioCode || !lessonDate || !startTime || !lessonName || !instructor) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Missing required fields',
      } as ApiResponse),
    };
  }

  try {
    // Generate waitlist ID
    const waitlistId = `wl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await userLessonsService.addToWaitlist(userId, {
      studioCode,
      lessonDate,
      startTime,
      lessonName,
      instructor,
      waitlistId,
      ttlDays: 30, // 30 days TTL for waitlist entries
    });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: result,
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Failed to add to waitlist',
      } as ApiResponse),
    };
  }
}