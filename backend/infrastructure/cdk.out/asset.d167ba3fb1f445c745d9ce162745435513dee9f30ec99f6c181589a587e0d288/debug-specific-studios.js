"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const real_scraper_1 = require("./services/real-scraper");
const lessons_service_1 = require("./services/lessons-service");
/**
 * 特定のスタジオでの処理をデバッグ
 */
async function debugSpecificStudios() {
    console.log('🔍 特定スタジオでの処理デバッグ');
    console.log('='.repeat(50));
    const lessonsService = new lessons_service_1.LessonsService();
    const targetDate = '2025-07-19';
    // テスト対象スタジオ（札幌の次に処理されるはずのスタジオ）
    const testStudios = [
        { code: 'spr', name: '札幌' },
        { code: 'omy', name: '大宮' },
        { code: 'ksg', name: '越谷' },
        { code: 'sjk', name: '新宿' }
    ];
    for (const studio of testStudios) {
        console.log(`\n🏢 ${studio.name} (${studio.code}) の処理テスト`);
        try {
            // データ取得
            console.log(`  📅 ${targetDate} のデータ取得中...`);
            const lessons = await real_scraper_1.RealFeelcycleScraper.searchRealLessons(studio.code, targetDate);
            console.log(`  ✅ ${lessons.length}件のレッスンを取得`);
            if (lessons.length > 0) {
                console.log(`  💾 DynamoDBへの保存テスト...`);
                // 最初の1件だけ保存テスト
                const testLesson = lessons[0];
                await lessonsService.storeLessonData(testLesson);
                console.log(`  ✅ 保存成功: ${testLesson.startTime} ${testLesson.lessonName}`);
                // 保存確認
                const savedLessons = await lessonsService.getLessonsForStudioAndDate(studio.code, targetDate);
                console.log(`  📋 保存確認: ${savedLessons.length}件`);
            }
            else {
                console.log(`  ℹ️  レッスンなし`);
            }
            // 待機時間（実際の処理と同じ）
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (error) {
            console.error(`  ❌ エラー: ${error.message}`);
            // 詳細なエラー情報
            if (error.stack) {
                console.log(`  📋 スタックトレース:\n${error.stack}`);
            }
            // Puppeteerのエラーの場合
            if (error.name === 'TimeoutError') {
                console.log(`  ⏱️  タイムアウトエラー: サイトの応答が遅い可能性があります`);
            }
            // エラーでも処理を継続
            console.log(`  ➡️  次のスタジオの処理を継続...`);
        }
    }
    console.log('\n🎯 デバッグ完了');
    await real_scraper_1.RealFeelcycleScraper.cleanup();
}
if (require.main === module) {
    debugSpecificStudios().catch(console.error);
}
