import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const USER_SETTINGS_TABLE = process.env.USER_SETTINGS_TABLE || 'feelcycle-hub-user-settings-dev';

// インストラクター・スタジオお気に入り特化のデータ構造
interface UserFavorites {
  userId: string;
  favoriteInstructors: string[];
  favoriteStudios: string[];
  updatedAt: string;
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * ユーザーお気に入り管理ハンドラー (/user/preferences/favorites)
 */
export async function userSettingsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };

  try {
    console.log('User settings event received:', JSON.stringify(event, null, 2));

    // CORS preflight request
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'CORS preflight' }),
      };
    }

    // ユーザーIDを取得（既存パターンに統一: queryStringParameters優先）
    const { queryStringParameters } = event;
    let userId = queryStringParameters?.userId;
    
    // フォールバック: リクエストボディから取得
    if (!userId && event.body) {
      try {
        const bodyData = JSON.parse(event.body);
        userId = bodyData.userId;
      } catch (error) {
        console.log('Failed to parse body for userId');
      }
    }
    
    if (!userId) {
      return createErrorResponse(400, 'userId parameter is required');
    }

    const { httpMethod } = event;

    switch (httpMethod) {
      case 'GET':
        return await getUserSettings(userId);
      
      case 'PUT':
        if (!event.body) {
          return createErrorResponse(400, 'Request body required');
        }
        return await updateUserSettings(userId, JSON.parse(event.body));
      
      default:
        return createErrorResponse(405, `Method ${httpMethod} not allowed`);
    }

  } catch (error: any) {
    console.error('User settings handler error:', error);
    return createErrorResponse(500, 'Internal server error');
  }
}

/**
 * ユーザーお気に入りを取得
 */
async function getUserSettings(userId: string): Promise<APIGatewayProxyResult> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: USER_SETTINGS_TABLE,
      Key: { userId }
    }));

    // デフォルトお気に入り設定
    const defaultFavorites: Omit<UserFavorites, 'userId'> = {
      favoriteInstructors: [],
      favoriteStudios: [],
      updatedAt: new Date().toISOString()
    };

    const favorites = result.Item ? {
      favoriteInstructors: result.Item.favoriteInstructors || [],
      favoriteStudios: result.Item.favoriteStudios || [],
      updatedAt: result.Item.updatedAt || new Date().toISOString()
    } : defaultFavorites;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      },
      body: JSON.stringify({
        success: true,
        data: favorites,
        message: 'User favorites retrieved successfully'
      } as ApiResponse),
    };

  } catch (error: any) {
    console.error('Get user favorites error:', error);
    return createErrorResponse(500, 'Failed to get user favorites');
  }
}

/**
 * ユーザーお気に入りを更新
 */
async function updateUserSettings(userId: string, favoritesData: Partial<UserFavorites>): Promise<APIGatewayProxyResult> {
  try {
    const now = new Date().toISOString();
    
    const userFavorites: UserFavorites = {
      userId,
      favoriteInstructors: favoritesData.favoriteInstructors || [],
      favoriteStudios: favoritesData.favoriteStudios || [],
      updatedAt: now
    };

    await docClient.send(new PutCommand({
      TableName: USER_SETTINGS_TABLE,
      Item: userFavorites
    }));

    console.log(`✅ User favorites updated for user: ${userId}`, {
      instructors: userFavorites.favoriteInstructors.length,
      studios: userFavorites.favoriteStudios.length
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      },
      body: JSON.stringify({
        success: true,
        data: userFavorites,
        message: 'User favorites updated successfully'
      } as ApiResponse),
    };

  } catch (error: any) {
    console.error('Update user favorites error:', error);
    return createErrorResponse(500, 'Failed to update user favorites');
  }
}

/**
 * エラーレスポンスを作成
 */
function createErrorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-user-id',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify({
      success: false,
      error: message
    } as ApiResponse),
  };
}