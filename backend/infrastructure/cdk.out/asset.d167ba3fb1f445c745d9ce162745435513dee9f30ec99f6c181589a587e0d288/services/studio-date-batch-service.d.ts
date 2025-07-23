export interface StudioDateBatchItem {
    batchId: string;
    studioDate: string;
    studioCode: string;
    studioName: string;
    targetDate: string;
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
 * スタジオ×日付バッチ処理管理サービス
 */
export declare class StudioDateBatchService {
    /**
     * 新しいバッチを作成してスタジオ×日付の組み合わせを格納
     */
    createBatch(studios: Array<{
        code: string;
        name: string;
    }>, targetDays?: number): Promise<string>;
    /**
     * 指定バッチの全アイテムを削除
     */
    clearBatch(batchId: string): Promise<void>;
    /**
     * バッチ内の全アイテムを取得
     */
    getBatchItems(batchId: string): Promise<StudioDateBatchItem[]>;
    /**
     * 次の処理待ちタスクを取得
     */
    getNextPendingTask(batchId: string): Promise<StudioDateBatchItem | null>;
    /**
     * タスクの処理状態を更新
     */
    updateTaskStatus(batchId: string, studioDate: string, status: StudioDateBatchItem['status'], options?: {
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
        completedStudioDays: number;
    }>;
    /**
     * バッチ処理の詳細サマリーを取得
     */
    getBatchSummary(batchId: string): Promise<{
        batchId: string;
        status: any;
        totalLessons: number;
        totalDuration: number;
        studioProgress: Record<string, {
            completed: number;
            total: number;
        }>;
        errors: string[];
    }>;
}
