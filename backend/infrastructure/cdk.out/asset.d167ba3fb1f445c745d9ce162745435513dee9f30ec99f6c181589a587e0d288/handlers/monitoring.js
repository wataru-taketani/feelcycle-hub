"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringHandler = monitoringHandler;
const waitlist_service_1 = require("../services/waitlist-service");
/**
 * 定期監視処理ハンドラー（ハイブリッド方式）
 */
async function monitoringHandler(event) {
    console.log('Monitoring event received:', JSON.stringify(event, null, 2));
    try {
        if (event.action === 'checkAvailability') {
            await checkLessonAvailability();
        }
        else if (event.action === 'cleanupExpired') {
            await cleanupExpiredWaitlists();
        }
        else {
            console.log(`Unknown monitoring action: ${event.action}`);
        }
    }
    catch (error) {
        console.error('Monitoring handler error:', error);
        throw error;
    }
}
/**
 * レッスン空き状況チェック（効率化版）
 */
async function checkLessonAvailability() {
    try {
        console.log('Checking lesson availability...');
        // 1. 効率的な監視対象抽出（1時間以内のactiveなキャンセル待ちのみ）
        const activeWaitlists = await waitlist_service_1.waitlistService.getActiveWaitlistsForMonitoring();
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
            }
            catch (error) {
                console.error(`Error checking waitlist ${waitlist.waitlistId}:`, error);
            }
        });
        await Promise.all(checkPromises);
        console.log('Lesson availability check completed');
    }
    catch (error) {
        console.error('Check lesson availability error:', error);
        throw error;
    }
}
/**
 * 空きが見つかった時の処理（スマート通知システム）
 */
async function handleAvailabilityFound(waitlist) {
    try {
        // 1. 通知記録を追加
        const notificationId = `notif_${Date.now()}`;
        const notification = {
            sentAt: new Date().toISOString(),
            availableSlots: null, // Seat data not available from scraping
            totalSlots: null, // Seat data not available from scraping
            notificationId,
        };
        await waitlist_service_1.waitlistService.addNotificationRecord(waitlist.userId, waitlist.waitlistId, notification);
        // 2. キャンセル待ちを一時停止状態に変更
        await waitlist_service_1.waitlistService.updateWaitlistStatus(waitlist.userId, waitlist.waitlistId, 'paused');
        // 3. LINE通知送信
        await sendAvailabilityNotification(waitlist, notification);
        console.log(`Notification sent and waitlist paused: ${waitlist.waitlistId}`);
    }
    catch (error) {
        console.error('Error handling availability found:', error);
        throw error;
    }
}
/**
 * LINE通知送信（スマート通知UI）
 */
async function sendAvailabilityNotification(waitlist, notification) {
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
    }
    catch (error) {
        console.error('Error sending notification:', error);
        throw error;
    }
}
/**
 * 期限切れキャンセル待ちのクリーンアップ（バッチ処理）
 */
async function cleanupExpiredWaitlists() {
    try {
        console.log('Starting expired waitlists cleanup...');
        const result = await waitlist_service_1.waitlistService.expireOldWaitlists();
        console.log(`Expired waitlists cleanup completed. Updated ${result.expiredCount} items.`);
    }
    catch (error) {
        console.error('Cleanup expired waitlists error:', error);
        throw error;
    }
}
/**
 * 日付フォーマット用ヘルパー
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
}
