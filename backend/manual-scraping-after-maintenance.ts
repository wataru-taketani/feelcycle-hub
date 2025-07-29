/**
 * メンテナンス後の手動スクレイピング実行スクリプト
 * 4:00以降にメンテナンスが終了したら実行する
 */

import { RealFeelcycleScraper } from './dist/services/real-scraper.js';
import { LessonsService } from './dist/services/lessons-service.js';
import { studiosService } from './dist/services/studios-service.js';
import { logJSTInfo } from './dist/utils/dateUtils.js';

async function executeManualScraping() {
  console.log('🚀 メンテナンス後の手動スクレイピング開始');
  logJSTInfo('Manual Scraping Start');
  
  const lessonService = new LessonsService();
  const startTime = Date.now();
  
  try {
    // Step 1: メンテナンス状況確認
    console.log('\n📍 Step 1: メンテナンス終了確認...');
    
    // まず1つのスタジオで動作テスト
    console.log('🧪 銀座スタジオで動作テスト...');
    const testLessons = await RealFeelcycleScraper.searchAllLessons('gnz');
    console.log(`✅ テスト成功: ${testLessons.length}件のレッスンデータ取得`);
    
    if (testLessons.length === 0) {
      throw new Error('まだメンテナンス中の可能性があります');
    }
    
    // Step 2: 全データクリア & スタジオ情報更新
    console.log('\n📍 Step 2: 既存データクリア...');
    const clearResult = await lessonService.clearAllLessons();
    console.log(`✅ ${clearResult.deletedCount}件のデータを削除`);
    
    console.log('📍 Step 2.1: スタジオ情報更新...');
    const studios = await RealFeelcycleScraper.getRealStudios();
    const studioUpdateResult = await studiosService.refreshStudiosFromScraping(studios);
    console.log(`✅ スタジオ更新: ${studioUpdateResult.created}作成, ${studioUpdateResult.updated}更新`);
    
    // Step 3: 全スタジオのスクレイピング実行
    console.log('\n📍 Step 3: 全スタジオのレッスンデータ取得開始...');
    console.log(`対象スタジオ数: ${studios.length}`);
    
    let totalLessons = 0;
    let processedStudios = 0;
    let failedStudios = 0;
    
    for (const studio of studios) {
      console.log(`\n🏢 ${studio.name} (${studio.code}) 処理中...`);
      
      try {
        const studioStartTime = Date.now();
        const allLessons = await RealFeelcycleScraper.searchAllLessons(studio.code);
        
        if (allLessons.length > 0) {
          await lessonService.storeLessonsData(allLessons);
          
          const studioEndTime = Date.now();
          const studioDuration = (studioEndTime - studioStartTime) / 1000;
          
          // 日付別集計
          const lessonsByDate = allLessons.reduce((acc, lesson) => {
            acc[lesson.lessonDate] = (acc[lesson.lessonDate] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          console.log(`✅ ${studio.name}: ${allLessons.length}件保存 (${studioDuration.toFixed(1)}s)`);
          console.log(`   日付数: ${Object.keys(lessonsByDate).length}`);
          console.log(`   範囲: ${Object.keys(lessonsByDate).sort()[0]} ～ ${Object.keys(lessonsByDate).sort().pop()}`);
          
          totalLessons += allLessons.length;
          processedStudios++;
        } else {
          console.log(`⚠️ ${studio.name}: データなし`);
          processedStudios++;
        }
        
        // 負荷軽減のため1秒待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ ${studio.name} エラー:`, error);
        failedStudios++;
      }
    }
    
    // Step 4: 結果レポート
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;
    
    console.log('\n🎉 手動スクレイピング完了！');
    logJSTInfo('Manual Scraping Completed');
    
    console.log(`\n📊 実行結果:`);
    console.log(`• 実行時間: ${(totalDuration / 60).toFixed(1)}分`);
    console.log(`• 対象スタジオ: ${studios.length}件`);
    console.log(`• 成功: ${processedStudios}件`);
    console.log(`• 失敗: ${failedStudios}件`);
    console.log(`• 取得レッスン総数: ${totalLessons}件`);
    
    // Step 5: 動作確認
    console.log('\n📍 Step 5: 動作確認...');
    
    // 今日のデータ確認
    const today = new Date().toISOString().split('T')[0];
    const todayLessons = await lessonService.getLessonsForStudioAndDate('gnz', today, {});
    console.log(`✅ 今日(${today})の銀座レッスン: ${todayLessons.length}件`);
    
    // 1週間後のデータ確認
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = nextWeek.toISOString().split('T')[0];
    const nextWeekLessons = await lessonService.getLessonsForStudioAndDate('gnz', nextWeekDate, {});
    console.log(`✅ 1週間後(${nextWeekDate})の銀座レッスン: ${nextWeekLessons.length}件`);
    
    if (nextWeekLessons.length > 0) {
      console.log('🎊 SUCCESS: 未来のレッスンデータが正常に取得されています！');
    } else {
      console.log('⚠️ WARNING: 未来のレッスンデータが不足している可能性があります');
    }
    
  } catch (error) {
    console.error('❌ 手動スクレイピング失敗:', error);
    logJSTInfo('Manual Scraping Failed');
    
    throw error;
  } finally {
    // クリーンアップ
    await RealFeelcycleScraper.cleanup();
    
    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n⏱️ 総実行時間: ${(totalTime / 60).toFixed(1)}分`);
  }
}

// 実行
if (require.main === module) {
  executeManualScraping()
    .then(() => {
      console.log('✅ 手動スクレイピング正常終了');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 手動スクレイピング異常終了:', error);
      process.exit(1);
    });
}

export { executeManualScraping };