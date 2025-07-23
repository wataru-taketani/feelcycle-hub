export interface StudioBatchItem {
    batchId: string;
    studioCode: string;
    studioName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
    processedAt?: string;
    errorMessage?: string;
    lessonCount?: number;
    processingDuration?: number;
    ttl: number;
}
/**
 * スタジオバッチ処理管理サービス
 */
export declare class StudioBatchService {
    /**
     * 新しいバッチを作成してスタジオ一覧を格納
     */
    createBatch(studios: Array<{
        code: string;
        name: string;
    }>): Promise<string>;
    /**
     * 指定バッチの全アイテムを削除
     */
    clearBatch(batchId: string): Promise<void>;
    /**
     * バッチ内の全アイテムを取得
     */
    getBatchItems(batchId: string): Promise<StudioBatchItem[]>;
    /**
     * 次の処理待ちスタジオを取得
     */
    getNextPendingStudio(batchId: string): Promise<StudioBatchItem | null>;
    /**
     * スタジオの処理状態を更新
     */
    updateStudioStatus(batchId: string, studioCode: string, status: StudioBatchItem['status'], options?: {
        errorMessage?: string;
        lessonCount?: number;
        processingDuration?: number;
    }): Promise<void>;
    /**
     * バッチの処理状況を取得
     */
    getBatchStatus(batchId: string): Promise<{
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        progress: number;
    }>;
    /**
     * バッチ処理の詳細サマリーを取得
     */
    getBatchSummary(batchId: string): Promise<{
        batchId: string;
        status: any;
        items: StudioBatchItem[];
        totalLessons: number;
        totalDuration: number;
        errors: string[];
    }>;
}
