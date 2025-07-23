import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
/**
 * ウェイトリスト監視用Lambda関数
 * 毎分実行されてアクティブなキャンセル待ちレッスンの空席をチェックし、
 * 空きが出た場合はLINE通知を送信する
 */
export declare const handler: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>;
