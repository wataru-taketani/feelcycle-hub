import { LambdaEvent } from '../types/index';
import { waitlistService } from '../services/waitlist-service';

/**
 * 定期監視処理ハンドラー（ハイブリッド方式）
 */
export async function monitoringHandler(event: LambdaEvent): Promise<void> {
  console.log('Monitoring event received:', JSON.stringify(event, null, 2));
  
  try {
    if (event.action === 'checkAvailability') {
      await checkLessonAvailability();
    } else if (event.action === 'cleanupExpired') {
      await cleanupExpiredWaitlists();
    } else {
      console.log(`Unknown monitoring action: ${event.action}`);
    }
    
  } catch (error) {
    console.error('Monitoring handler error:', error);
    throw error;
  }
}

/**
 * レッスン空き状況チェック（効率化版）
 */
async function checkLessonAvailability(): Promise<void> {
  try {
    console.log('Checking lesson availability...');
    
    // 1. 効率的な監視対象抽出（1時間以内のactiveなキャンセル待ちのみ）
    const activeWaitlists = await waitlistService.getActiveWaitlistsForMonitoring();
    
    if (activeWaitlists.length === 0) {
      console.log('No active waitlists to monitor. Skipping.');
      return;
    }
    
    console.log(`Found ${activeWaitlists.length} active waitlists to monitor`);
    
    // 2. 各キャンセル待ちについて空き状況をチェック
    const checkPromises = activeWaitlists.map(async (waitlist) => {
      try {
        console.log(`Checking availability for: ${waitlist.studioName} ${waitlist.lessonDate} ${waitlist.startTime} ${waitlist.lessonName}`);
        
        // TODO: 実際のスクレイピング処理を実装
        // const availability = await scrapeFeelcycleAvailability(waitlist);
        
        // スタブ: ランダムに空きありと判定（実装時は削除）
        const hasAvailability = Math.random() > 0.8;
        
        if (hasAvailability) {
          console.log(`🎉 Availability found for waitlist: ${waitlist.waitlistId}`);
          await handleAvailabilityFound(waitlist);
        }
        
      } catch (error) {
        console.error(`Error checking waitlist ${waitlist.waitlistId}:`, error);
      }
    });
    
    await Promise.all(checkPromises);
    
    console.log('Lesson availability check completed');
    
  } catch (error) {
    console.error('Check lesson availability error:', error);
    throw error;
  }
}

/**
 * 空きが見つかった時の処理（スマート通知システム）
 */
async function handleAvailabilityFound(waitlist: any): Promise<void> {
  try {
    // 1. 通知記録を追加
    const notificationId = `notif_${Date.now()}`;
    const notification = {
      sentAt: new Date().toISOString(),
      availableSlots: 2, // TODO: 実際の空き数を取得
      totalSlots: 20,    // TODO: 実際の定員を取得
      notificationId,
    };
    
    await waitlistService.addNotificationRecord(
      waitlist.userId,
      waitlist.waitlistId,
      notification
    );
    
    // 2. キャンセル待ちを一時停止状態に変更
    await waitlistService.updateWaitlistStatus(
      waitlist.userId,
      waitlist.waitlistId,
      'paused'
    );
    
    // 3. LINE通知送信
    await sendAvailabilityNotification(waitlist, notification);
    
    console.log(`Notification sent and waitlist paused: ${waitlist.waitlistId}`);
    
  } catch (error) {
    console.error('Error handling availability found:', error);
    throw error;
  }
}

/**
 * LINE通知送信（スマート通知UI）
 */
async function sendAvailabilityNotification(waitlist: any, notification: any): Promise<void> {
  try {
    // TODO: LINE Bot API実装
    const message = `🚴‍♀️ 空席が出ました！

📍 ${waitlist.studioName}
📅 ${formatDate(waitlist.lessonDate)} ${waitlist.startTime}-${waitlist.endTime}
🎵 ${waitlist.lessonName}
👤 ${waitlist.instructor}
💺 残り${notification.availableSlots}席

📱 予約サイトを開く
🔄 キャンセル待ち再開
❌ キャンセル待ち解除`;

    console.log('Sending LINE notification:', message);
    
    // TODO: 実際のLINE Bot API呼び出し
    // await lineService.sendMessage(waitlist.userId, message);
    
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

/**
 * 期限切れキャンセル待ちのクリーンアップ（バッチ処理）
 */
async function cleanupExpiredWaitlists(): Promise<void> {
  try {
    console.log('Starting expired waitlists cleanup...');
    
    const result = await waitlistService.expireOldWaitlists();
    
    console.log(`Expired waitlists cleanup completed. Updated ${result.expiredCount} items.`);
    
  } catch (error) {
    console.error('Cleanup expired waitlists error:', error);
    throw error;
  }
}

/**
 * 日付フォーマット用ヘルパー
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  
  return `${month}/${day}(${weekday})`;
}