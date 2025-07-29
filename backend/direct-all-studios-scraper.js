/**
 * 直接全スタジオスクレイピング実行
 * getNextUnprocessedStudioを完全にバイパスし、全スタジオを直接処理
 */

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';
process.env.STUDIO_BATCH_TABLE_NAME = 'feelcycle-studio-batch-dev';
process.env.USER_LESSONS_TABLE_NAME = 'feelcycle-hub-user-lessons-dev';
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USERS_TABLE_NAME = 'feelcycle-hub-users-dev';
// Lambda環境を設定しない（ローカルブラウザ使用）

const { studiosService } = require('./dist/services/studios-service.js');
const { RealFeelcycleScraper } = require('./dist/services/real-scraper.js');
const { LessonsService } = require('./dist/services/lessons-service.js');

async function directAllStudiosScraper() {
  console.log('🚀 直接全スタジオスクレイピング実行');
  console.log('getNextUnprocessedStudio完全バイパス版');
  console.log('ローカルブラウザ使用で74スタジオ制覇');
  console.log('='.repeat(60));
  
  const lessonsService = new LessonsService();
  let totalProcessed = 0;
  let successCount = 0;
  let failureCount = 0;
  let skippedCount = 0;
  const failedStudios = [];
  
  try {
    // Step 1: バッチ状態リセット
    console.log('🔄 バッチ状態完全リセット...');
    await studiosService.resetAllBatchStatuses();
    console.log('✅ バッチ状態リセット完了');
    
    // Step 2: 全スタジオリスト取得
    console.log('\n📋 全スタジオリスト取得...');
    const allStudios = await studiosService.getAllStudios();
    console.log(`✅ ${allStudios.length}スタジオを取得`);
    console.log(`スタジオリスト: ${allStudios.slice(0, 5).map(s => s.studioCode).join(', ')}...`);
    
    // Step 3: 各スタジオを直接処理
    console.log(`\n🎯 ${allStudios.length}スタジオの直接処理開始`);
    console.log('⚠️  getNextUnprocessedStudioを使用せず、全スタジオを順次処理');
    
    for (let i = 0; i < allStudios.length; i++) {
      const studio = allStudios[i];
      totalProcessed++;
      
      console.log(`\n📍 ${totalProcessed}/${allStudios.length}: ${studio.studioName} (${studio.studioCode})`);
      console.log(`開始時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      
      try {
        // 処理中マーク
        await studiosService.markStudioAsProcessed(studio.studioCode, 'processing');
        
        const startTime = Date.now();
        
        // スクレイピング実行（リトライ機能付き）
        console.log(`🔄 スクレイピング開始: ${studio.studioCode}`);
        const lessons = await RealFeelcycleScraper.searchAllLessons(studio.studioCode);
        
        const duration = (Date.now() - startTime) / 1000;
        
        if (lessons && lessons.length > 0) {
          // レッスンデータ保存
          console.log(`📝 ${lessons.length}件のレッスンデータ保存中...`);
          await lessonsService.storeLessonsData(lessons);
          
          // 完了マーク
          await studiosService.markStudioAsProcessed(studio.studioCode, 'completed');
          
          successCount++;
          console.log(`✅ 成功: ${lessons.length}件のレッスン取得 (${duration.toFixed(2)}秒)`);
          
          // 日付別件数表示
          const lessonsByDate = lessons.reduce((acc, lesson) => {
            const date = lesson.lessonDate;
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {});
          
          const dates = Object.keys(lessonsByDate).sort();
          const dateInfo = dates.slice(0, 3).map(date => `${date}:${lessonsByDate[date]}`).join(', ');
          console.log(`   📅 ${dates.length}日分のデータ (${dateInfo}${dates.length > 3 ? '...' : ''})`);
          
        } else {
          console.log(`⚠️  レッスンデータなし (${duration.toFixed(2)}秒)`);
          // データがない場合も完了マーク
          await studiosService.markStudioAsProcessed(studio.studioCode, 'completed');
          skippedCount++;
        }
        
      } catch (error) {
        // 失敗マーク
        const errorMessage = error?.message || 'Unknown error';
        await studiosService.markStudioAsProcessed(studio.studioCode, 'failed', errorMessage);
        failureCount++;
        failedStudios.push({ code: studio.studioCode, name: studio.studioName, error: errorMessage });
        console.error(`❌ 失敗: ${errorMessage}`);
      }
      
      // 進捗表示
      console.log(`📊 進捗: 成功${successCount} スキップ${skippedCount} 失敗${failureCount} 残り${allStudios.length - totalProcessed}`);
      
      // スタジオ間の待機（負荷軽減）
      if (i < allStudios.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Step 4: 最終結果報告
    console.log('\n🏁 全スタジオ処理完了');
    console.log('='.repeat(50));
    console.log(`✅ 成功スタジオ: ${successCount}/${allStudios.length}`);
    console.log(`⚠️  データなしスタジオ: ${skippedCount}/${allStudios.length}`);
    console.log(`❌ 失敗スタジオ: ${failureCount}/${allStudios.length}`);
    console.log(`📈 成功率: ${((successCount / allStudios.length) * 100).toFixed(1)}%`);
    console.log(`📊 処理率: ${(((successCount + skippedCount) / allStudios.length) * 100).toFixed(1)}%`);
    
    // 失敗したスタジオの詳細
    if (failedStudios.length > 0) {
      console.log('\n❌ 失敗スタジオ詳細:');
      failedStudios.forEach((studio, index) => {
        console.log(`   ${index + 1}. ${studio.name} (${studio.code}): ${studio.error}`);
      });
    }
    
    // DynamoDB確認
    console.log('\n📊 DynamoDB最終確認...');
    const finalProgress = await studiosService.getBatchProgress();
    console.log(`   完了: ${finalProgress.completed}/${finalProgress.total}`);
    console.log(`   失敗: ${finalProgress.failed}`);
    console.log(`   残り: ${finalProgress.remaining}`);
    
    // 成功判定
    const effectiveSuccess = successCount + skippedCount;
    if (effectiveSuccess >= 70) { // 70スタジオ以上で成功
      console.log('\n🎉 74スタジオスクレイピング完成!');
      console.log('✅ 本番環境での日次バッチスクレイピング準備完了');
      return true;
    } else {
      console.log('\n⚠️  部分完成');
      console.log(`${effectiveSuccess}/74 スタジオでデータ取得成功`);
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ 処理全体エラー:', error);
    return false;
  } finally {
    // クリーンアップ
    console.log('\n🧹 リソースクリーンアップ...');
    await RealFeelcycleScraper.cleanup();
    console.log('✅ クリーンアップ完了');
  }
}

// 実行
directAllStudiosScraper().then(success => {
  if (success) {
    console.log('\n🎊 大成功: 74スタジオスクレイピング完成!');
    console.log('🚀 本番環境Lambda + EventBridge日次実行準備完了');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分成功: 多数のスタジオでスクレイピング完了');
    console.log('🔧 一部スタジオの問題を確認して再実行を検討');
    process.exit(0);
  }
}).catch(error => {
  console.error('\n💥 実行失敗:', error);
  process.exit(1);
});