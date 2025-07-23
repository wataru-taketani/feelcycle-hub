"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const real_scraper_1 = require("./services/real-scraper");
async function testRealScraper() {
    console.log('🔍 リアルスクレイパーのテスト - 7/24新宿');
    console.log('='.repeat(50));
    try {
        // 新宿スタジオのコードを使用
        const studioCode = 'sjk';
        const date = '2025-07-24';
        console.log(`テスト対象: ${studioCode} - ${date}`);
        const lessons = await real_scraper_1.RealFeelcycleScraper.searchRealLessons(studioCode, date);
        console.log(`\n📋 取得結果: ${lessons.length}件`);
        if (lessons.length > 0) {
            console.log('\n📝 レッスン詳細:');
            lessons.forEach((lesson, index) => {
                console.log(`  ${index + 1}. ${lesson.startTime}-${lesson.endTime} | ${lesson.lessonName} (${lesson.instructor})`);
            });
            // 期待値チェック
            const expectedLesson = lessons.find(l => l.startTime === '07:00' &&
                l.lessonName.includes('BB2 NOW 1') &&
                l.instructor.includes('Fuka'));
            if (expectedLesson) {
                console.log('\n✅ 期待値と一致するレッスンが見つかりました！');
                console.log(`詳細: ${expectedLesson.startTime}-${expectedLesson.endTime} ${expectedLesson.lessonName} (${expectedLesson.instructor})`);
            }
            else {
                console.log('\n❌ 期待値と一致するレッスンが見つかりませんでした');
            }
        }
        else {
            console.log('\n❌ レッスンが取得できませんでした');
        }
    }
    catch (error) {
        console.error('❌ エラー:', error);
    }
    finally {
        await real_scraper_1.RealFeelcycleScraper.cleanup();
    }
}
testRealScraper().catch(console.error);
