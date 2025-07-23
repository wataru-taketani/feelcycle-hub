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

    // x-user-idヘッダーからユーザーIDを取得（APIGateway対応）
    const requestHeaders = (event as any).headers || {};
    console.log('🔍 Available headers:', Object.keys(requestHeaders));
    console.log('🔍 x-user-id header:', requestHeaders['x-user-id']);
    let userId: string = requestHeaders['x-user-id'] || requestHeaders['X-User-Id'] || 'test-user-id';
    
    if (body) {
      try {
        const bodyData = JSON.parse(body);
        if (bodyData.userId) {
          userId = bodyData.userId;
        }
        console.log('✅ Using UserID:', userId);
      } catch (e) {
        console.error('❌ JSON parse error, using default userId:', e);
      }
    }

    switch (httpMethod) {
      case 'POST':
        return await createWaitlist(userId, body);
      
      case 'GET':
        // Get userId from query parameter
        const getUserId = queryStringParameters?.userId || 'test-user-id';
        return await getUserWaitlists(getUserId, queryStringParameters?.status as any);
      
      case 'PUT':
        if (pathParameters?.waitlistId) {
          // URL decode the waitlistId from path parameter
          const decodedWaitlistId = decodeURIComponent(pathParameters.waitlistId);
          console.log('🔧 PUT waitlistId - Original:', pathParameters.waitlistId, 'Decoded:', decodedWaitlistId);
          return await updateWaitlist(userId, decodedWaitlistId, body);
        }
        break;
      
      case 'DELETE':
        if (pathParameters?.waitlistId) {
          // URL decode the waitlistId from path parameter
          const decodedWaitlistId = decodeURIComponent(pathParameters.waitlistId);
          console.log('🔧 DELETE waitlistId - Original:', pathParameters.waitlistId, 'Decoded:', decodedWaitlistId);
          return await deleteWaitlist(userId, decodedWaitlistId);
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
    // Handle specific error types with appropriate status codes
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
    
    // Handle validation errors (return 400 instead of 500)
    if (error.message && (
      error.message.includes('過去の日付') ||
      error.message.includes('30日より先') ||
      error.message.includes('必須項目が不足') ||
      error.message.includes('形式が正しくありません') ||
      error.message.includes('スタジオコードが正しくありません') ||
      error.message.includes('長すぎます') ||
      error.message.includes('既にキャンセル待ち登録済み')
    )) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          error: error.message,
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
  
  // ボディからuserIdを取得（フロントエンドから送信される）
  if (request.userId) {
    userId = request.userId;
  }
  
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