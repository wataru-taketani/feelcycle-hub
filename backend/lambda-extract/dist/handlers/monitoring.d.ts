import { LambdaEvent } from '../types/index';
/**
 * 定期監視処理ハンドラー（ハイブリッド方式）
 */
export declare function monitoringHandler(event: LambdaEvent): Promise<void>;
