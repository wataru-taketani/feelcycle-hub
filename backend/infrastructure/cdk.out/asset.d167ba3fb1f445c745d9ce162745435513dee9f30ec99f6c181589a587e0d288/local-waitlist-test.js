"use strict";
/**
 * ローカル環境でのウェイトリスト監視システムのテスト
 * 実際のスクレイピングは行わず、ロジック部分のみテスト
 */
Object.defineProperty(exports, "__esModule", { value: true });
// 環境変数を最初に設定
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USER_TABLE_NAME = 'feelcycle-hub-users-dev';
process.env.AWS_REGION = 'ap-northeast-1';
const waitlist_service_1 = require("./services/waitlist-service");
async function testWaitlistLogic() {
    console.log('🧪 Testing waitlist logic locally...');
    try {
        // 1. アクティブなキャンセル待ちを取得するテスト
        console.log('📋 Testing getActiveWaitlistsForMonitoring...');
        const activeWaitlists = await waitlist_service_1.waitlistService.getActiveWaitlistsForMonitoring();
        console.log(`Found ${activeWaitlists.length} active waitlists for monitoring`);
        if (activeWaitlists.length > 0) {
            console.log('Sample waitlist:', {
                waitlistId: activeWaitlists[0].waitlistId,
                studioCode: activeWaitlists[0].studioCode,
                lessonName: activeWaitlists[0].lessonName,
                lessonDate: activeWaitlists[0].lessonDate,
                status: activeWaitlists[0].status
            });
        }
        // 2. スタジオ別グループ化のテスト
        console.log('🏢 Testing studio grouping logic...');
        const waitlistsByStudio = activeWaitlists.reduce((groups, waitlist) => {
            const studioCode = waitlist.studioCode.toLowerCase();
            if (!groups[studioCode]) {
                groups[studioCode] = [];
            }
            groups[studioCode].push(waitlist);
            return groups;
        }, {});
        console.log(`Grouped into ${Object.keys(waitlistsByStudio).length} studios:`);
        Object.entries(waitlistsByStudio).forEach(([studio, lists]) => {
            console.log(`  - ${studio}: ${lists.length} waitlists`);
        });
        // 3. 通知メッセージフォーマットのテスト
        console.log('📱 Testing notification message format...');
        if (activeWaitlists.length > 0) {
            const sampleWaitlist = activeWaitlists[0];
            const testMessage = `🎉 空きが出ました！

📍 ${sampleWaitlist.studioName}
📅 ${formatDate(sampleWaitlist.lessonDate)}
⏰ ${sampleWaitlist.startTime}-${sampleWaitlist.endTime}
🎵 ${sampleWaitlist.lessonName}
👤 ${sampleWaitlist.instructor}

今すぐ予約サイトで確認してください！
https://www.feelcycle.com/`;
            console.log('Sample notification message:');
            console.log('---');
            console.log(testMessage);
            console.log('---');
        }
        console.log('✅ Local logic test completed successfully');
    }
    catch (error) {
        console.error('❌ Local test failed:', error);
        throw error;
    }
}
function formatDate(dateString) {
    const date = new Date(dateString);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
}
// 環境変数は既に上部で設定済み
// メイン実行
if (require.main === module) {
    testWaitlistLogic()
        .then(() => {
        console.log('🎉 Local test passed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Local test failed!', error);
        process.exit(1);
    });
}
