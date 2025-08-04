import { RealFeelcycleScraper } from './src/services/real-scraper';

/**
 * Lambda環境でのスクレイピング動作をシミュレートするテスト
 */
async function simulateLambdaEnvironment() {
    console.log('=== Lambda環境シミュレーション - 横浜スタジオテスト ===\n');
    
    // Lambda環境変数を設定
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'feelcycle-scraper-test';
    process.env.AWS_REGION = 'ap-northeast-1';
    
    console.log('🔧 Lambda環境変数設定:');
    console.log(`  AWS_LAMBDA_FUNCTION_NAME: ${process.env.AWS_LAMBDA_FUNCTION_NAME}`);
    console.log(`  AWS_REGION: ${process.env.AWS_REGION}`);
    console.log('');
    
    let testResults = {
        lambdaBrowserInit: false,
        yokohamaScrapingSuccess: false,
        lessonsCount: 0,
        errorDetails: null as any,
        executionTime: 0
    };

    try {
        console.log('⚡ Step 1: Lambda環境でのブラウザ初期化テスト');
        const startTime = Date.now();
        
        // Lambda環境を模擬してブラウザ初期化
        await RealFeelcycleScraper.initBrowser();
        testResults.lambdaBrowserInit = true;
        console.log('✅ Lambda環境でのブラウザ初期化成功');
        
        console.log('\n🎯 Step 2: 横浜スタジオ - Lambda環境でのスクレイピングテスト');
        const lessons = await RealFeelcycleScraper.searchAllLessons('ykh');
        
        const endTime = Date.now();
        testResults.executionTime = (endTime - startTime) / 1000;
        testResults.yokohamaScrapingSuccess = true;
        testResults.lessonsCount = lessons.length;
        
        console.log(`✅ Lambda環境でのスクレイピング成功!`);
        console.log(`実行時間: ${testResults.executionTime.toFixed(2)}秒`);
        console.log(`取得レッスン数: ${lessons.length}`);
        
        // メモリ使用量確認
        const memUsage = process.memoryUsage();
        console.log(`💾 メモリ使用量:`);
        console.log(`  使用中: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        console.log(`  総計: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
        console.log(`  外部: ${Math.round(memUsage.external / 1024 / 1024)}MB`);
        
        // Lambda制限チェック
        console.log('\n📊 Lambda制限に対するチェック:');
        console.log(`実行時間: ${testResults.executionTime.toFixed(2)}s / 900s (Lambda最大)`);
        const memoryUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        console.log(`メモリ使用: ${memoryUsedMB}MB / 3008MB (Lambda最大)`);
        
        if (testResults.executionTime > 300) {
            console.log('⚠️  実行時間が5分を超過 - タイムアウトリスクあり');
        }
        
        if (memoryUsedMB > 1000) {
            console.log('⚠️  メモリ使用量が1GBを超過 - メモリ不足リスクあり');
        }
        
        // いくつかのレッスンデータサンプル表示
        if (lessons.length > 0) {
            console.log('\n📝 レッスンデータサンプル:');
            lessons.slice(0, 3).forEach((lesson, index) => {
                console.log(`${index + 1}. ${lesson.lessonDate} ${lesson.startTime}-${lesson.endTime} ${lesson.lessonName}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Lambda環境シミュレーションでエラー:', error);
        testResults.errorDetails = error;
        
        // エラーの詳細分析
        if (error instanceof Error) {
            console.error(`エラータイプ: ${error.constructor.name}`);
            console.error(`メッセージ: ${error.message}`);
            
            // よくあるエラーパターンの確認
            if (error.message.includes('Protocol error')) {
                console.error('🔍 分析: Chromiumプロトコルエラー - WebSocket接続の問題');
            } else if (error.message.includes('Navigation timeout')) {
                console.error('🔍 分析: ナビゲーションタイムアウト - ネットワーク遅延の可能性');
            } else if (error.message.includes('Target closed')) {
                console.error('🔍 分析: ターゲット終了エラー - ブラウザプロセスの異常終了');
            } else if (error.message.includes('Waiting for selector')) {
                console.error('🔍 分析: セレクター待機タイムアウト - ページ構造変更の可能性');
            }
        }
    }

    // クリーンアップ
    try {
        await RealFeelcycleScraper.cleanup();
        console.log('\n🧹 ブラウザクリーンアップ完了');
    } catch (cleanupError) {
        console.error('⚠️ クリーンアップエラー:', cleanupError);
    }

    console.log('\n=== Lambda環境シミュレーション結果 ===');
    console.log(`ブラウザ初期化: ${testResults.lambdaBrowserInit ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`スクレイピング: ${testResults.yokohamaScrapingSuccess ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`取得レッスン数: ${testResults.lessonsCount}`);
    console.log(`実行時間: ${testResults.executionTime.toFixed(2)}秒`);
    
    if (testResults.errorDetails) {
        console.log(`エラー: ${testResults.errorDetails.message || testResults.errorDetails}`);
    }

    // Lambda環境変数をリセット
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    return testResults;
}

// メイン実行
simulateLambdaEnvironment()
    .then((results) => {
        console.log('\n=== シミュレーション完了 ===');
        process.exit(results.yokohamaScrapingSuccess ? 0 : 1);
    })
    .catch((error) => {
        console.error('シミュレーション実行中に予期しないエラー:', error);
        process.exit(1);
    });