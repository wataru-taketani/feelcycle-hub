"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const waitlist_service_1 = require("../services/waitlist-service");
const real_scraper_1 = require("../services/real-scraper");
const line_notification_service_1 = require("../services/line-notification-service");
/**
 * ウェイトリスト監視用Lambda関数
 * 毎分実行されてアクティブなキャンセル待ちレッスンの空席をチェックし、
 * 空きが出た場合はLINE通知を送信する
 */
const handler = async (event, context) => {
    console.log('🔍 Starting waitlist monitoring...');
    console.log('Event:', JSON.stringify(event, null, 2));
    try {
        // アクティブなキャンセル待ちを取得（今後1時間以内のレッスンのみ）
        const activeWaitlists = await waitlist_service_1.waitlistService.getActiveWaitlistsForMonitoring();
        console.log(`📋 Found ${activeWaitlists.length} active waitlists to monitor`);
        if (activeWaitlists.length === 0) {
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: true,
                    message: 'No active waitlists to monitor',
                    data: { checkedCount: 0, notifiedCount: 0 }
                })
            };
        }
        // スタジオ別にグループ化
        const waitlistsByStudio = groupWaitlistsByStudio(activeWaitlists);
        console.log(`🏢 Grouped waitlists by ${Object.keys(waitlistsByStudio).length} studios`);
        let totalChecked = 0;
        let totalNotified = 0;
        // スタジオごとに処理（効率化のため）
        for (const [studioCode, studioWaitlists] of Object.entries(waitlistsByStudio)) {
            try {
                console.log(`🔍 Checking studio ${studioCode} (${studioWaitlists.length} waitlists)`);
                // 該当日付のレッスンを取得（スタジオの全日程を一度に取得）
                const uniqueDates = [...new Set(studioWaitlists.map(w => w.lessonDate))];
                const studioLessons = [];
                for (const date of uniqueDates) {
                    try {
                        const lessons = await real_scraper_1.RealFeelcycleScraper.searchRealLessons(studioCode, date);
                        studioLessons.push(...lessons);
                        console.log(`📅 Found ${lessons.length} lessons for ${studioCode} on ${date}`);
                    }
                    catch (error) {
                        console.error(`❌ Error fetching lessons for ${studioCode} on ${date}:`, error);
                        // エラーがあっても他の日付の処理を続行
                        continue;
                    }
                }
                // 各キャンセル待ちをチェック
                for (const waitlist of studioWaitlists) {
                    totalChecked++;
                    try {
                        const matchingLesson = findMatchingLesson(waitlist, studioLessons);
                        if (!matchingLesson) {
                            console.log(`⚠️ No matching lesson found for waitlist ${waitlist.waitlistId}`);
                            continue;
                        }
                        // 空席があるかチェック
                        if (matchingLesson.isAvailable === 'true') {
                            console.log(`🎉 Available seats found for ${waitlist.lessonName}!`);
                            // 通知送信
                            await sendAvailabilityNotification(waitlist, matchingLesson);
                            // ウェイトリストステータスを「通知済み」に更新
                            await waitlist_service_1.waitlistService.updateWaitlistStatus(waitlist.userId, waitlist.waitlistId, 'paused', { lastNotifiedAt: new Date().toISOString() });
                            totalNotified++;
                        }
                        else {
                            console.log(`❌ No seats available for ${waitlist.lessonName}`);
                        }
                    }
                    catch (error) {
                        console.error(`❌ Error processing waitlist ${waitlist.waitlistId}:`, error);
                        // エラーがあっても他のキャンセル待ちの処理を続行
                        continue;
                    }
                }
            }
            catch (error) {
                console.error(`❌ Error processing studio ${studioCode}:`, error);
                // エラーがあっても他のスタジオの処理を続行
                continue;
            }
        }
        console.log(`✅ Monitoring completed. Checked: ${totalChecked}, Notified: ${totalNotified}`);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                message: 'Waitlist monitoring completed successfully',
                data: {
                    checkedCount: totalChecked,
                    notifiedCount: totalNotified,
                    studiosCount: Object.keys(waitlistsByStudio).length
                }
            })
        };
    }
    catch (error) {
        console.error('❌ Fatal error in waitlist monitoring:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                message: 'Internal server error during waitlist monitoring',
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
    finally {
        // ブラウザリソースのクリーンアップ
        try {
            await real_scraper_1.RealFeelcycleScraper.cleanup();
        }
        catch (cleanupError) {
            console.error('⚠️ Error during cleanup:', cleanupError);
        }
    }
};
exports.handler = handler;
/**
 * キャンセル待ちをスタジオ別にグループ化
 */
function groupWaitlistsByStudio(waitlists) {
    return waitlists.reduce((groups, waitlist) => {
        const studioCode = waitlist.studioCode.toLowerCase();
        if (!groups[studioCode]) {
            groups[studioCode] = [];
        }
        groups[studioCode].push(waitlist);
        return groups;
    }, {});
}
/**
 * キャンセル待ちに対応するレッスンを検索
 */
function findMatchingLesson(waitlist, lessons) {
    return lessons.find(lesson => lesson.lessonDate === waitlist.lessonDate &&
        lesson.startTime === waitlist.startTime &&
        lesson.lessonName === waitlist.lessonName) || null;
}
/**
 * 空席通知の送信
 */
async function sendAvailabilityNotification(waitlist, lesson) {
    try {
        const message = `🎉 空きが出ました！

📍 ${waitlist.studioName}
📅 ${formatDate(waitlist.lessonDate)}
⏰ ${waitlist.startTime}-${waitlist.endTime}
🎵 ${waitlist.lessonName}
👤 ${waitlist.instructor}

今すぐ予約サイトで確認してください！
https://www.feelcycle.com/`;
        await line_notification_service_1.lineNotificationService.sendNotification(waitlist.userId, message);
        // 通知履歴を記録
        const notificationRecord = {
            notificationId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            sentAt: new Date().toISOString(),
            availableSlots: lesson.availableSlots || 1,
            totalSlots: lesson.totalSlots || null,
            message: message
        };
        await waitlist_service_1.waitlistService.addNotificationRecord(waitlist.userId, waitlist.waitlistId, notificationRecord);
        console.log(`📱 Notification sent for ${waitlist.lessonName} to user ${waitlist.userId}`);
    }
    catch (error) {
        console.error(`❌ Failed to send notification for waitlist ${waitlist.waitlistId}:`, error);
        throw error;
    }
}
/**
 * 日付フォーマット
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
}
