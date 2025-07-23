/**
 * LINE通知専用サービス
 * waitlist-monitor.tsから使用される
 */
export declare class LineNotificationService {
    private lineService;
    private userService;
    constructor();
    /**
     * ユーザーIDを使用してLINE通知を送信
     * @param userId ユーザーID
     * @param message 送信するメッセージ
     */
    sendNotification(userId: string, message: string): Promise<void>;
    /**
     * キャンセル待ち空席通知の送信
     * @param userId ユーザーID
     * @param lessonInfo レッスン情報
     */
    sendWaitlistAvailabilityNotification(userId: string, lessonInfo: {
        studioName: string;
        lessonDate: string;
        startTime: string;
        endTime: string;
        lessonName: string;
        instructor: string;
    }): Promise<void>;
    /**
     * 日付フォーマット
     * @param dateString YYYY-MM-DD形式の日付文字列
     * @returns 日本語形式の日付文字列
     */
    private formatDate;
}
export declare const lineNotificationService: LineNotificationService;
