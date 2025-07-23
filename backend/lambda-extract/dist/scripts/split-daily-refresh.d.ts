/**
 * 分割処理による日次データ更新システム
 */
export declare class SplitDailyRefresh {
    private lessonsService;
    private studioBatchService;
    constructor();
    /**
     * Step 1: スタジオ一覧を取得してバッチを作成
     */
    initializeBatch(): Promise<string>;
    /**
     * Step 2: 既存レッスンデータを削除
     */
    clearLessonsData(): Promise<void>;
    /**
     * Step 3: 次の処理待ちスタジオを1つ処理
     */
    processNextStudio(batchId: string): Promise<boolean>;
    /**
     * Step 4: バッチの処理状況を表示
     */
    showBatchStatus(batchId: string): Promise<void>;
    /**
     * クリーンアップ
     */
    cleanup(): Promise<void>;
}
