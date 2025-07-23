import { LineService } from './line-service';
import { UserService } from './user-service';

/**
 * LINE通知専用サービス
 * waitlist-monitor.tsから使用される
 */
export class LineNotificationService {
  private lineService: LineService;
  private userService: UserService;

  constructor() {
    this.lineService = new LineService();
    this.userService = new UserService();
  }

  /**
   * ユーザーIDを使用してLINE通知を送信
   * @param userId ユーザーID
   * @param message 送信するメッセージ
   */
  async sendNotification(userId: string, message: string): Promise<void> {
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
      
    } catch (error) {
      console.error(`❌ Failed to send LINE notification to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * キャンセル待ち空席通知の送信
   * @param userId ユーザーID
   * @param lessonInfo レッスン情報
   */
  async sendWaitlistAvailabilityNotification(
    userId: string, 
    lessonInfo: {
      studioName: string;
      lessonDate: string;
      startTime: string;
      endTime: string;
      lessonName: string;
      instructor: string;
    }
  ): Promise<void> {
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
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  }
}

export const lineNotificationService = new LineNotificationService();