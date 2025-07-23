"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lineNotificationService = exports.LineNotificationService = void 0;
const line_service_1 = require("./line-service");
const user_service_1 = require("./user-service");
/**
 * LINE通知専用サービス
 * waitlist-monitor.tsから使用される
 */
class LineNotificationService {
    lineService;
    userService;
    constructor() {
        this.lineService = new line_service_1.LineService();
        this.userService = new user_service_1.UserService();
    }
    /**
     * ユーザーIDを使用してLINE通知を送信
     * @param userId ユーザーID
     * @param message 送信するメッセージ
     */
    async sendNotification(userId, message) {
        try {
            console.log(`📱 Sending LINE notification to user: ${userId}`);
            // ユーザー情報を取得してLINE User IDを取得
            const user = await this.userService.findById(userId);
            if (!user) {
                throw new Error(`User not found: ${userId}`);
            }
            if (!user.lineUserId) {
                throw new Error(`User ${userId} has no LINE integration`);
            }
            // LINE通知送信
            await this.lineService.sendPushMessage(user.lineUserId, message);
            console.log(`✅ LINE notification sent successfully to user: ${userId}`);
        }
        catch (error) {
            console.error(`❌ Failed to send LINE notification to user ${userId}:`, error);
            throw error;
        }
    }
    /**
     * キャンセル待ち空席通知の送信
     * @param userId ユーザーID
     * @param lessonInfo レッスン情報
     */
    async sendWaitlistAvailabilityNotification(userId, lessonInfo) {
        const message = `🎉 空きが出ました！

📍 ${lessonInfo.studioName}
📅 ${this.formatDate(lessonInfo.lessonDate)}
⏰ ${lessonInfo.startTime}-${lessonInfo.endTime}
🎵 ${lessonInfo.lessonName}
👤 ${lessonInfo.instructor}

今すぐ予約サイトで確認してください！
https://www.feelcycle.com/`;
        await this.sendNotification(userId, message);
    }
    /**
     * 日付フォーマット
     * @param dateString YYYY-MM-DD形式の日付文字列
     * @returns 日本語形式の日付文字列
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const weekday = weekdays[date.getDay()];
        return `${month}/${day}(${weekday})`;
    }
}
exports.LineNotificationService = LineNotificationService;
exports.lineNotificationService = new LineNotificationService();
