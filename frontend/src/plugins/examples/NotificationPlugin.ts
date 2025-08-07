/**
 * サンプルプラグイン: 通知システム
 * Phase 4.4: プラグイン機能の実装例
 */

import type { JsonObject } from '../../types/global';
import { BasePlugin, type PluginManifest } from '../index';

/**
 * 通知プラグイン
 * 待機リストやレッスン開始の通知を管理
 */
export class NotificationPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    name: 'notification-plugin',
    version: '1.2.0',
    description: 'Smart notification system for lessons and waitlist updates',
    author: 'FEELCYCLE Hub Team',
    permissions: ['notification.send', 'storage.read', 'storage.write'],
    hooks: ['waitlist:join', 'waitlist:leave', 'user:preferences:update'],
    config: {
      enablePushNotifications: true,
      enableLineNotifications: false,
      defaultTiming: 30, // minutes before lesson
      quietHours: {
        start: '22:00',
        end: '07:00'
      },
      maxNotificationsPerDay: 10
    }
  };

  private notificationQueue: ScheduledNotification[] = [];
  private sentNotifications: NotificationLog[] = [];

  async onActivate(): Promise<void> {
    await super.onActivate();
    
    // プッシュ通知の許可を要求
    if (this.getConfig<boolean>('enablePushNotifications')) {
      await this.requestNotificationPermission();
    }

    // 既存の通知スケジュールを復元
    await this.restoreNotificationSchedule();
    
    // 定期チェック開始
    this.startNotificationChecker();
    
    console.log('Notification plugin activated');
  }

  async onDeactivate(): Promise<void> {
    // 全ての予定された通知をキャンセル
    this.clearAllNotifications();
    
    await super.onDeactivate();
  }

  /**
   * 待機リスト参加時の通知設定
   */
  async onWaitlistJoin(lessonId: string, userId: string): Promise<void> {
    try {
      // レッスン情報を取得
      const lessonInfo = await this.getLessonInfo(lessonId);
      if (!lessonInfo) return;

      // 通知をスケジュール
      await this.scheduleWaitlistNotification(lessonInfo, userId);
      
      // 即座に確認通知を送信
      await this.sendImmediateNotification({
        title: '待機リスト登録完了',
        message: `${lessonInfo.programName} (${lessonInfo.studioName}) の待機リストに登録しました`,
        type: 'waitlist_confirmation',
        data: { lessonId, userId }
      });
      
      console.log(`Notification scheduled for waitlist join: ${lessonId}`);
    } catch (error) {
      console.error('Failed to handle waitlist join notification:', error);
    }
  }

  /**
   * 待機リスト離脱時の通知キャンセル
   */
  async onWaitlistLeave(lessonId: string, userId: string): Promise<void> {
    // 該当する通知をキャンセル
    this.cancelNotificationsForLesson(lessonId, userId);
    
    // 離脱確認通知
    const lessonInfo = await this.getLessonInfo(lessonId);
    if (lessonInfo) {
      await this.sendImmediateNotification({
        title: '待機リスト登録解除',
        message: `${lessonInfo.programName} (${lessonInfo.studioName}) の待機リストから削除されました`,
        type: 'waitlist_cancellation',
        data: { lessonId, userId }
      });
    }
  }

  /**
   * ユーザー設定更新時の通知設定調整
   */
  async onUserPreferencesUpdate(preferences: JsonObject): Promise<void> {
    const notificationSettings = preferences.notificationSettings as any;
    if (!notificationSettings) return;

    // 通知タイミングが変更された場合、既存の通知を再スケジュール
    if (notificationSettings.notificationTiming !== undefined) {
      await this.rescheduleAllNotifications(notificationSettings.notificationTiming);
    }

    // LINE通知設定が変更された場合
    if (notificationSettings.enableLineNotifications !== undefined) {
      this.updateConfig('enableLineNotifications', notificationSettings.enableLineNotifications);
    }
  }

  /**
   * プッシュ通知の許可を要求
   */
  private async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * 待機リスト通知をスケジュール
   */
  private async scheduleWaitlistNotification(
    lessonInfo: LessonInfo, 
    userId: string
  ): Promise<void> {
    const timing = this.getConfig<number>('defaultTiming') || 30;
    const notificationTime = new Date(lessonInfo.startTime.getTime() - timing * 60 * 1000);

    // 過去の時刻の場合はスケジュールしない
    if (notificationTime <= new Date()) {
      return;
    }

    const notification: ScheduledNotification = {
      id: this.generateNotificationId(),
      lessonId: lessonInfo.id,
      userId,
      scheduledTime: notificationTime,
      type: 'lesson_reminder',
      title: `${lessonInfo.programName} まもなく開始`,
      message: `${timing}分後に ${lessonInfo.studioName} で ${lessonInfo.programName} が開始されます`,
      data: {
        lessonId: lessonInfo.id,
        studioName: lessonInfo.studioName,
        programName: lessonInfo.programName,
        startTime: lessonInfo.startTime.toISOString()
      }
    };

    this.notificationQueue.push(notification);
    this.saveNotificationQueue();
  }

  /**
   * 即座に通知を送信
   */
  private async sendImmediateNotification(notification: NotificationContent): Promise<void> {
    // 日次制限チェック
    if (!this.canSendNotification()) {
      console.log('Daily notification limit reached');
      return;
    }

    // 静寂時間チェック
    if (this.isQuietHours()) {
      console.log('Notification blocked during quiet hours');
      return;
    }

    // プッシュ通知
    if (this.getConfig<boolean>('enablePushNotifications')) {
      await this.sendPushNotification(notification);
    }

    // LINE通知
    if (this.getConfig<boolean>('enableLineNotifications')) {
      await this.sendLineNotification(notification);
    }

    // 送信ログを記録
    this.logNotification(notification);
  }

  /**
   * プッシュ通知を送信
   */
  private async sendPushNotification(notification: NotificationContent): Promise<void> {
    if (Notification.permission !== 'granted') return;

    const pushNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge.png',
      data: notification.data,
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'レッスンを確認'
        },
        {
          action: 'dismiss',
          title: '閉じる'
        }
      ]
    });

    pushNotification.onclick = () => {
      window.focus();
      if (notification.data?.lessonId) {
        // レッスン詳細ページに遷移
        window.location.href = `/lessons/${notification.data.lessonId}`;
      }
      pushNotification.close();
    };

    // 自動で閉じる（10秒後）
    setTimeout(() => {
      pushNotification.close();
    }, 10000);
  }

  /**
   * LINE通知を送信
   */
  private async sendLineNotification(notification: NotificationContent): Promise<void> {
    try {
      // LIFF APIを使用してLINEメッセージを送信
      if (typeof window !== 'undefined' && (window as any).liff) {
        await (window as any).liff.sendMessages([{
          type: 'text',
          text: `${notification.title}\n${notification.message}`
        }]);
      }
    } catch (error) {
      console.error('Failed to send LINE notification:', error);
    }
  }

  /**
   * 通知スケジュールチェッカーを開始
   */
  private startNotificationChecker(): void {
    // 1分ごとにチェック
    setInterval(() => {
      this.checkAndSendScheduledNotifications();
    }, 60000);
  }

  /**
   * スケジュールされた通知をチェックして送信
   */
  private async checkAndSendScheduledNotifications(): Promise<void> {
    const now = new Date();
    const dueNotifications = this.notificationQueue.filter(
      notification => notification.scheduledTime <= now
    );

    for (const notification of dueNotifications) {
      try {
        await this.sendImmediateNotification({
          title: notification.title,
          message: notification.message,
          type: notification.type,
          data: notification.data
        });
      } catch (error) {
        console.error('Failed to send scheduled notification:', error);
      }
    }

    // 送信した通知をキューから削除
    this.notificationQueue = this.notificationQueue.filter(
      notification => !dueNotifications.includes(notification)
    );

    if (dueNotifications.length > 0) {
      this.saveNotificationQueue();
    }
  }

  /**
   * レッスンに関連する通知をキャンセル
   */
  private cancelNotificationsForLesson(lessonId: string, userId: string): void {
    const originalLength = this.notificationQueue.length;
    
    this.notificationQueue = this.notificationQueue.filter(
      notification => !(notification.lessonId === lessonId && notification.userId === userId)
    );

    if (this.notificationQueue.length !== originalLength) {
      this.saveNotificationQueue();
      console.log(`Cancelled notifications for lesson ${lessonId}`);
    }
  }

  /**
   * 全ての通知を再スケジュール
   */
  private async rescheduleAllNotifications(newTiming: number): Promise<void> {
    const updatedNotifications = this.notificationQueue.map(notification => {
      if (notification.type === 'lesson_reminder') {
        // 元のレッスン開始時刻から新しいタイミングで再計算
        const lessonStartTime = new Date(notification.data?.startTime as string);
        const newScheduledTime = new Date(lessonStartTime.getTime() - newTiming * 60 * 1000);
        
        return {
          ...notification,
          scheduledTime: newScheduledTime
        };
      }
      return notification;
    });

    this.notificationQueue = updatedNotifications;
    this.saveNotificationQueue();
  }

  /**
   * 通知可能かチェック（日次制限）
   */
  private canSendNotification(): boolean {
    const maxPerDay = this.getConfig<number>('maxNotificationsPerDay') || 10;
    const today = new Date().toDateString();
    
    const todayNotifications = this.sentNotifications.filter(
      log => new Date(log.sentAt).toDateString() === today
    );

    return todayNotifications.length < maxPerDay;
  }

  /**
   * 静寂時間かチェック
   */
  private isQuietHours(): boolean {
    const quietHours = this.getConfig<{ start: string; end: string }>('quietHours');
    if (!quietHours) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = this.parseTime(quietHours.start);
    const endTime = this.parseTime(quietHours.end);

    if (startTime > endTime) {
      // 日をまたぐ場合（例: 22:00 - 07:00）
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * 時刻文字列を数値に変換（HHMM形式）
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * 通知送信をログに記録
   */
  private logNotification(notification: NotificationContent): void {
    const log: NotificationLog = {
      id: this.generateNotificationId(),
      type: notification.type,
      title: notification.title,
      sentAt: new Date().toISOString()
    };

    this.sentNotifications.push(log);
    
    // 最新100件のみ保持
    if (this.sentNotifications.length > 100) {
      this.sentNotifications = this.sentNotifications.slice(-100);
    }

    this.setStoredConfig('notification_logs', this.sentNotifications);
  }

  /**
   * レッスン情報を取得
   */
  private async getLessonInfo(lessonId: string): Promise<LessonInfo | null> {
    try {
      // APIからレッスン情報を取得（実装例）
      const response = await fetch(`/api/lessons/${lessonId}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return {
        id: data.data.id,
        programName: data.data.programName,
        studioName: data.data.studioName,
        instructorName: data.data.instructorName,
        startTime: new Date(data.data.startTime)
      };
    } catch (error) {
      console.error('Failed to fetch lesson info:', error);
      return null;
    }
  }

  /**
   * 通知キューを保存
   */
  private saveNotificationQueue(): void {
    this.setStoredConfig('notification_queue', this.notificationQueue);
  }

  /**
   * 通知スケジュールを復元
   */
  private async restoreNotificationSchedule(): Promise<void> {
    const savedQueue = this.getStoredConfig<ScheduledNotification[]>('notification_queue');
    if (savedQueue) {
      // 過去の通知は除外
      const now = new Date();
      this.notificationQueue = savedQueue.filter(
        notification => new Date(notification.scheduledTime) > now
      );
    }

    const savedLogs = this.getStoredConfig<NotificationLog[]>('notification_logs');
    if (savedLogs) {
      this.sentNotifications = savedLogs;
    }
  }

  /**
   * 全ての通知をクリア
   */
  private clearAllNotifications(): void {
    this.notificationQueue = [];
    this.saveNotificationQueue();
  }

  /**
   * 通知IDを生成
   */
  private generateNotificationId(): string {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 設定を更新（プラグイン内設定）
   */
  private updateConfig(key: string, value: any): void {
    const currentConfig = { ...this.manifest.config };
    currentConfig[key] = value;
    (this.manifest as any).config = currentConfig;
  }

  /**
   * 通知統計を取得
   */
  getNotificationStats(): NotificationStats {
    const today = new Date().toDateString();
    const thisWeek = this.getWeekStart(new Date()).toDateString();

    const todayCount = this.sentNotifications.filter(
      log => new Date(log.sentAt).toDateString() === today
    ).length;

    const weekCount = this.sentNotifications.filter(
      log => new Date(log.sentAt) >= this.getWeekStart(new Date())
    ).length;

    return {
      totalSent: this.sentNotifications.length,
      todayCount,
      weekCount,
      queuedCount: this.notificationQueue.length,
      isQuietHours: this.isQuietHours(),
      canSendMore: this.canSendNotification()
    };
  }

  private getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day;
    return new Date(date.setDate(diff));
  }
}

// =============================
// 型定義
// =============================

interface ScheduledNotification {
  id: string;
  lessonId: string;
  userId: string;
  scheduledTime: Date;
  type: string;
  title: string;
  message: string;
  data?: JsonObject;
}

interface NotificationContent {
  title: string;
  message: string;
  type: string;
  data?: JsonObject;
}

interface NotificationLog {
  id: string;
  type: string;
  title: string;
  sentAt: string;
}

interface LessonInfo {
  id: string;
  programName: string;
  studioName: string;
  instructorName: string;
  startTime: Date;
}

interface NotificationStats {
  totalSent: number;
  todayCount: number;
  weekCount: number;
  queuedCount: number;
  isQuietHours: boolean;
  canSendMore: boolean;
}