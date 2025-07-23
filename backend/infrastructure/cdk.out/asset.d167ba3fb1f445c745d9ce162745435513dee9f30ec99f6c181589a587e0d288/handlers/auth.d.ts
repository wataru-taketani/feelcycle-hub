import { APIGatewayProxyEvent } from 'aws-lambda';
import { ApiResponse } from '../types/index';
/**
 * 認証関連のリクエストハンドラー
 */
export declare function authHandler(event: APIGatewayProxyEvent): Promise<ApiResponse>;
