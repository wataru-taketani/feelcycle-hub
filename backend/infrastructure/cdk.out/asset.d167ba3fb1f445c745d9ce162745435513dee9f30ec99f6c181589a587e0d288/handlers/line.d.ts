import { APIGatewayProxyEvent } from 'aws-lambda';
import { ApiResponse } from '../types/index';
/**
 * LINE関連のリクエストハンドラー
 */
export declare function lineHandler(event: APIGatewayProxyEvent): Promise<ApiResponse>;
