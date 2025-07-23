import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { LambdaEvent } from '../types/index';
/**
 * メインLambda関数ハンドラー
 * 全てのAPIリクエストとEventBridgeイベントを処理
 */
export declare function handler(event: APIGatewayProxyEvent | LambdaEvent, context: Context): Promise<APIGatewayProxyResult | void>;
