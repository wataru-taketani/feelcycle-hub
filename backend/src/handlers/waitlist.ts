import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { waitlistService } from '../services/waitlist-service';
import { ApiResponse, WaitlistCreateRequest, WaitlistUpdateRequest } from '../types';

/**
 * Waitlist API handler
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { httpMethod, path, body, pathParameters, queryStringParameters } = event;
    
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

    const userId = event.headers['x-user-id']; // Assuming user ID is passed in header

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Unauthorized: User ID required',
        } as ApiResponse),
      };
    }

    switch (httpMethod) {
      case 'POST':
        return await createWaitlist(userId, body);
      
      case 'GET':
        if (path.includes('/user/')) {
          return await getUserWaitlists(userId, queryStringParameters?.status as any);
        }
        break;
      
      case 'PUT':
        if (pathParameters?.waitlistId) {
          return await updateWaitlist(userId, pathParameters.waitlistId, body);
        }
        break;
      
      case 'DELETE':
        if (pathParameters?.waitlistId) {
          return await deleteWaitlist(userId, pathParameters.waitlistId);
        }
        break;
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
    console.error('Waitlist handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
      } as ApiResponse),
    };
  }
}

async function createWaitlist(userId: string, body: string | null): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };

  if (!body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Request body required',
      } as ApiResponse),
    };
  }

  const request: WaitlistCreateRequest = JSON.parse(body);
  
  // Validate request
  if (!request.studioCode || !request.lessonDate || !request.startTime || !request.lessonName || !request.instructor) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        error: 'Missing required fields: studioCode, lessonDate, startTime, lessonName, instructor',
      } as ApiResponse),
    };
  }

  try {
    const waitlist = await waitlistService.createWaitlist(userId, request);
    
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify({
        success: true,
        data: waitlist,
        message: 'Waitlist created successfully',
      } as ApiResponse),
    };
  } catch (error: any) {
    if (error.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: 'Waitlist already exists for this lesson',
        } as ApiResponse),
      };
    }
    throw error;
  }
}

async function getUserWaitlists(userId: string, status?: string): Promise<APIGatewayProxyResult> {
  const waitlists = await waitlistService.getUserWaitlists(userId, status as any);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: true,
      data: waitlists,
    } as ApiResponse),
  };
}

async function updateWaitlist(userId: string, waitlistId: string, body: string | null): Promise<APIGatewayProxyResult> {
  if (!body) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify({
        success: false,
        error: 'Request body required',
      } as ApiResponse),
    };
  }

  const request: WaitlistUpdateRequest = JSON.parse(body);
  
  try {
    switch (request.action) {
      case 'resume':
        await waitlistService.resumeWaitlist(userId, waitlistId);
        break;
      case 'cancel':
        await waitlistService.cancelWaitlist(userId, waitlistId);
        break;
      default:
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: false,
            error: 'Invalid action. Must be "resume" or "cancel"',
          } as ApiResponse),
        };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify({
        success: true,
        message: `Waitlist ${request.action}d successfully`,
      } as ApiResponse),
    };
  } catch (error) {
    console.error('Update waitlist error:', error);
    throw error;
  }
}

async function deleteWaitlist(userId: string, waitlistId: string): Promise<APIGatewayProxyResult> {
  await waitlistService.deleteWaitlist(userId, waitlistId);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      success: true,
      message: 'Waitlist deleted successfully',
    } as ApiResponse),
  };
}