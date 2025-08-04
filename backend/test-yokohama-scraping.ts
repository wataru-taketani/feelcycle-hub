import { RealFeelcycleScraper } from './src/services/real-scraper';

/**
 * 横浜スタジオ(ykh)のスクレイピング動作テスト
 */
async function testYokohamaScraping() {
    console.log('=== FEELCYCLE 横浜スタジオ(ykh) スクレイピングテスト開始 ===\n');
    
    let testResults = {
        studioListFetch: false,
        yokohamaStudioFound: false,
        lessonsScrapingSuccess: false,
        lessonsCount: 0,
        errorDetails: null as any
    };

    try {
        // 1. まず全スタジオリストを取得してykh存在確認
        console.log('🏢 ステップ1: スタジオリスト取得と横浜スタジオ確認');
        const allStudios = await RealFeelcycleScraper.getRealStudios();
        testResults.studioListFetch = true;
        
        console.log(`総スタジオ数: ${allStudios.length}`);
        allStudios.forEach(studio => {
            console.log(`- ${studio.name} (${studio.code})`);
        });
        
        // 横浜スタジオ(ykh)の存在確認
        const yokohamaStudio = allStudios.find(studio => studio.code === 'ykh');
        if (yokohamaStudio) {
            testResults.yokohamaStudioFound = true;
            console.log(`✅ 横浜スタジオ発見: ${yokohamaStudio.name} (${yokohamaStudio.code})`);
        } else {
            console.log('❌ 横浜スタジオ(ykh)がスタジオリストに見つかりません');
            console.log('利用可能なスタジオコード:');
            allStudios.forEach(studio => {
                if (studio.code.includes('y') || studio.name.includes('横浜')) {
                    console.log(`  - ${studio.name} (${studio.code})`);
                }
            });
            return testResults;
        }

    } catch (error) {
        console.error('❌ スタジオリスト取得でエラー:', error);
        testResults.errorDetails = error;
        return testResults;
    }

    try {
        // 2. 横浜スタジオのレッスンデータ取得テスト
        console.log('\n🎯 ステップ2: 横浜スタジオのレッスンデータ取得テスト');
        console.log('RealFeelcycleScraper.searchAllLessons("ykh") を実行中...\n');
        
        const startTime = Date.now();
        const lessons = await RealFeelcycleScraper.searchAllLessons('ykh');
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        testResults.lessonsScrapingSuccess = true;
        testResults.lessonsCount = lessons.length;
        
        console.log(`✅ 横浜スタジオのレッスンデータ取得成功!`);
        console.log(`処理時間: ${duration.toFixed(2)}秒`);
        console.log(`取得レッスン数: ${lessons.length}`);
        
        if (lessons.length > 0) {
            console.log('\n📝 レッスンデータサンプル (最初の5件):');
            lessons.slice(0, 5).forEach((lesson, index) => {
                console.log(`${index + 1}. ${lesson.lessonDate} ${lesson.startTime}-${lesson.endTime}`);
                console.log(`   ${lesson.lessonName} (${lesson.program})`);
                console.log(`   インストラクター: ${lesson.instructor}`);
                console.log(`   利用可能: ${lesson.isAvailable}`);
                if (lesson.availableSlots) {
                    console.log(`   空き状況: ${lesson.availableSlots}席`);
                }
                console.log('');
            });

            // 日付別の集計
            const lessonsByDate = lessons.reduce((acc, lesson) => {
                acc[lesson.lessonDate] = (acc[lesson.lessonDate] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            console.log('📊 日付別レッスン数:');
            Object.entries(lessonsByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .forEach(([date, count]) => {
                    console.log(`  ${date}: ${count}レッスン`);
                });

            // プログラム別の集計
            const lessonsByProgram = lessons.reduce((acc, lesson) => {
                acc[lesson.program] = (acc[lesson.program] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            console.log('\n🎯 プログラム別レッスン数:');
            Object.entries(lessonsByProgram)
                .sort(([, a], [, b]) => b - a)
                .forEach(([program, count]) => {
                    console.log(`  ${program}: ${count}レッスン`);
                });
        }

    } catch (error) {
        console.error('❌ 横浜スタジオのレッスンデータ取得でエラー:', error);
        testResults.errorDetails = error;
        
        // エラーの詳細情報
        if (error instanceof Error) {
            console.error('エラーメッセージ:', error.message);
            console.error('スタックトレース:', error.stack);
        }
    }

    // クリーンアップ
    try {
        await RealFeelcycleScraper.cleanup();
        console.log('\n🧹 ブラウザクリーンアップ完了');
    } catch (cleanupError) {
        console.error('⚠️ クリーンアップエラー:', cleanupError);
    }

    console.log('\n=== テスト結果サマリー ===');
    console.log(`スタジオリスト取得: ${testResults.studioListFetch ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`横浜スタジオ発見: ${testResults.yokohamaStudioFound ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`レッスンスクレイピング: ${testResults.lessonsScrapingSuccess ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`取得レッスン数: ${testResults.lessonsCount}`);
    
    if (testResults.errorDetails) {
        console.log(`エラー詳細: ${testResults.errorDetails.message || testResults.errorDetails}`);
    }

    return testResults;
}

// メイン実行
testYokohamaScraping()
    .then((results) => {
        console.log('\n=== テスト完了 ===');
        process.exit(results.lessonsScrapingSuccess ? 0 : 1);
    })
    .catch((error) => {
        console.error('テスト実行中に予期しないエラー:', error);
        process.exit(1);
    });