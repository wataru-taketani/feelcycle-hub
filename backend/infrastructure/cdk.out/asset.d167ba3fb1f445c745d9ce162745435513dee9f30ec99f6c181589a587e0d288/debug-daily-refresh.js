"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const real_scraper_1 = require("./services/real-scraper");
/**
 * 日次更新処理のデバッグ
 */
async function debugDailyRefresh() {
    console.log('🔍 日次更新処理のデバッグ開始');
    console.log('='.repeat(50));
    try {
        // Step 1: スタジオ一覧の取得をテスト
        console.log('\n📍 Step 1: スタジオ一覧の取得テスト');
        const studios = await real_scraper_1.RealFeelcycleScraper.getRealStudios();
        console.log(`✅ ${studios.length}件のスタジオを取得`);
        // 最初の5スタジオのみ表示
        console.log('\n最初の5スタジオ:');
        studios.slice(0, 5).forEach((studio, index) => {
            console.log(`  ${index + 1}. ${studio.name} (${studio.code})`);
        });
        // Step 2: 札幌以外のスタジオでのデータ取得をテスト
        console.log('\n📍 Step 2: 大宮スタジオでのデータ取得テスト');
        const omiyaCode = 'omy';
        const testDate = '2025-07-19';
        console.log(`対象: ${omiyaCode} - ${testDate}`);
        const lessons = await real_scraper_1.RealFeelcycleScraper.searchRealLessons(omiyaCode, testDate);
        console.log(`✅ ${lessons.length}件のレッスンを取得`);
        if (lessons.length > 0) {
            console.log('\n取得されたレッスン:');
            lessons.slice(0, 3).forEach((lesson, index) => {
                console.log(`  ${index + 1}. ${lesson.startTime}-${lesson.endTime} ${lesson.lessonName} (${lesson.instructor})`);
            });
        }
        // Step 3: 新宿スタジオでのデータ取得をテスト
        console.log('\n📍 Step 3: 新宿スタジオでのデータ取得テスト');
        const shinjukuCode = 'sjk';
        console.log(`対象: ${shinjukuCode} - ${testDate}`);
        const shinjukuLessons = await real_scraper_1.RealFeelcycleScraper.searchRealLessons(shinjukuCode, testDate);
        console.log(`✅ ${shinjukuLessons.length}件のレッスンを取得`);
        if (shinjukuLessons.length > 0) {
            console.log('\n取得されたレッスン:');
            shinjukuLessons.slice(0, 3).forEach((lesson, index) => {
                console.log(`  ${index + 1}. ${lesson.startTime}-${lesson.endTime} ${lesson.lessonName} (${lesson.instructor})`);
            });
        }
        // Step 4: エラーハンドリングのテスト
        console.log('\n📍 Step 4: 存在しないスタジオコードでのエラーテスト');
        try {
            const invalidLessons = await real_scraper_1.RealFeelcycleScraper.searchRealLessons('invalid', testDate);
            console.log(`予期しない成功: ${invalidLessons.length}件`);
        }
        catch (error) {
            console.log(`✅ 期待通りのエラー: ${error.message}`);
        }
    }
    catch (error) {
        console.error('❌ デバッグエラー:', error);
        // スタックトレースを詳細に表示
        if (error.stack) {
            console.log('\n📋 スタックトレース:');
            console.log(error.stack);
        }
    }
    finally {
        await real_scraper_1.RealFeelcycleScraper.cleanup();
    }
}
if (require.main === module) {
    debugDailyRefresh().catch(console.error);
}
