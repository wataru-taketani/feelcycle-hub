import { LessonsService } from '../services/lessons-service';
/**
 * 全データの日次更新処理
 */
export declare class DailyDataRefresh {
    protected lessonsService: LessonsService;
    constructor();
    /**
     * 全スタジオのデータを取得
     */
    getAllStudios(): Promise<Array<{
        code: string;
        name: string;
    }>>;
    /**
     * 既存の全レッスンデータを削除
     */
    clearAllLessons(): Promise<void>;
    /**
     * 指定された日付の文字列を生成（YYYY-MM-DD形式）
     */
    private generateDateString;
    /**
     * 全スタジオの全日程データを取得・保存
     */
    refreshAllData(): Promise<void>;
    /**
     * 完全な日次更新処理を実行
     */
    runDailyRefresh(): Promise<void>;
}
