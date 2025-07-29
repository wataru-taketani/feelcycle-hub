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
        const studioLessons = await RealFeelcycleScraper.searchAllLessons(studio.code);
        console.log(`  ✅ ${studioLessons.length}件のレッスン取得`);
        
        if (studioLessons.length > 0) {
          const saveResult = await lessonService.saveLessonsBatch(studioLessons);
          console.log(`  💾 ${saveResult.created}件新規作成, ${saveResult.updated}件更新`);
          totalLessons += studioLessons.length;
        }
        
        processedStudios++;
        
        // スタジオ間で少し待機（負荷軽減）
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`  ❌ ${studio.name}の処理でエラー:`, error);
        failedStudios++;
        continue;
      }
    }
    
    // Step 4: 結果確認
    console.log('\n📍 Step 4: 最終結果確認...');
    const finalStats = await lessonService.getLessonStats();
    console.log('📊 最終データ統計:', finalStats);
    
    const duration = (Date.now() - startTime) / 1000;
    console.log('\n✅ 手動スクレイピング完了!');
    console.log(`📈 処理結果:`);
    console.log(`  - 処理時間: ${duration.toFixed(1)}秒`);
    console.log(`  - 成功スタジオ: ${processedStudios}/${studios.length}`);
    console.log(`  - 失敗スタジオ: ${failedStudios}`);
    console.log(`  - 取得レッスン数: ${totalLessons}件`);
    
    logJSTInfo('Manual Scraping Completed Successfully');
    
  } catch (error) {
    console.error('❌ 手動スクレイピングでエラーが発生:', error);
    logJSTInfo('Manual Scraping Failed');
    throw error;
  } finally {
    // クリーンアップ
    await RealFeelcycleScraper.cleanup();
    console.log('🧹 リソースクリーンアップ完了');
  }
}

// 実行
executeManualScraping().catch(error => {
  console.error('手動スクレイピング実行エラー:', error);
  process.exit(1);
});