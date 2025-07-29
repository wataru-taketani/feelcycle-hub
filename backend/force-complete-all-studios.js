/**
 * 強制的に全74スタジオを処理する
 * getNextUnprocessedStudioをバイパスして全スタジオリストから直接処理
 */

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';
process.env.STUDIO_BATCH_TABLE_NAME = 'feelcycle-studio-batch-dev';
process.env.USER_LESSONS_TABLE_NAME = 'feelcycle-hub-user-lessons-dev';
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USERS_TABLE_NAME = 'feelcycle-hub-users-dev';

const { studiosService } = require('./dist/services/studios-service.js');
const { RealFeelcycleScraper } = require('./dist/services/real-scraper.js');
const { LessonsService } = require('./dist/services/lessons-service.js');

async function forceCompleteAllStudios() {
  console.log('🚀 全74スタジオ強制完全処理');
  console.log('getNextUnprocessedStudioをバイパスして直接処理');
  console.log('='.repeat(60));
  
  const lessonsService = new LessonsService();
  let processedCount = 0;
  let successCount = 0;
  let failureCount = 0;
  
  try {
    // Step 1: 全スタジオリスト取得
    console.log('📋 全スタジオリスト取得中...');
    const allStudios = await studiosService.getAllStudios();
    console.log(`✅ ${allStudios.length}スタジオを取得`);
    
    // Step 2: バッチステータスリセット
    console.log('🔄 バッチステータスリセット...');
    await studiosService.resetAllBatchStatuses();
    
    // Step 3: 各スタジオを順次処理
    console.log(`\n🎯 ${allStudios.length}スタジオの順次処理開始`);
    
    for (let i = 0; i < allStudios.length; i++) {
      const studio = allStudios[i];
      processedCount++;
      
      console.log(`\n📍 ${processedCount}/${allStudios.length}: ${studio.studioName} (${studio.studioCode})`);
      console.log(`開始時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      
      try {
        // 処理中マーク
        await studiosService.markStudioAsProcessed(studio.studioCode, 'processing');
        
        const startTime = Date.now();
        
        // スクレイピング実行
        const lessons = await RealFeelcycleScraper.searchAllLessons(studio.studioCode);
        
        const duration = (Date.now() - startTime) / 1000;
        
        if (lessons.length > 0) {
          // レッスンデータ保存
          await lessonsService.storeLessonsData(lessons);
          
          // 完了マーク
          await studiosService.markStudioAsProcessed(studio.studioCode, 'completed');
          
          successCount++;
          console.log(`✅ 成功: ${lessons.length}件のレッスン取得 (${duration.toFixed(2)}秒)`);
          
          // 日付別件数表示
          const lessonsByDate = lessons.reduce((acc, lesson) => {
            acc[lesson.lessonDate] = (acc[lesson.lessonDate] || 0) + 1;
            return acc;
          }, {});
          console.log(`   日付: ${Object.keys(lessonsByDate).length}日分 (${Object.entries(lessonsByDate).slice(0, 3).map(([date, count]) => `${date}:${count}`).join(', ')}${Object.keys(lessonsByDate).length > 3 ? '...' : ''})`);
          
        } else {
          console.log(`⚠️  レッスンデータなし (${duration.toFixed(2)}秒)`);
          await studiosService.markStudioAsProcessed(studio.studioCode, 'completed');
          successCount++;
        }
        
      } catch (error) {
        // 失敗マーク
        await studiosService.markStudioAsProcessed(studio.studioCode, 'failed', error.message);
        failureCount++;
        console.error(`❌ 失敗: ${error.message}`);
      }
      
      // 進捗表示
      console.log(`📊 進捗: 成功${successCount} 失敗${failureCount} 残り${allStudios.length - processedCount}`);
      
      // スタジオ間の待機（負荷軽減）
      if (i < allStudios.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Step 4: 最終結果
    console.log('\n🏁 全スタジオ処理完了');
    console.log('='.repeat(50));
    console.log(`✅ 成功スタジオ: ${successCount}/${allStudios.length}`);
    console.log(`❌ 失敗スタジオ: ${failureCount}/${allStudios.length}`);
    console.log(`📈 成功率: ${((successCount / allStudios.length) * 100).toFixed(1)}%`);
    
    // 最終確認
    const finalProgress = await studiosService.getBatchProgress();
    console.log(`\n📊 DynamoDB確認: ${finalProgress.completed}/${finalProgress.total}完了`);
    
    if (successCount >= 70) {
      console.log('🎉 74スタジオスクレイピング完成 - 本番稼働準備完了!');
      return true;
    } else {
      console.log('⚠️  一部失敗がありますが、大部分は成功しています');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 処理エラー:', error);
    return false;
  } finally {
    // クリーンアップ
    await RealFeelcycleScraper.cleanup();
  }
}

forceCompleteAllStudios().then(success => {
  console.log(success ? '\n✅ 完成!' : '\n⚠️  部分完成');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ 実行失敗:', error);
  process.exit(1);
});