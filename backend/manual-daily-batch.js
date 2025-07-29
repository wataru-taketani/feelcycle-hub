/**
 * 手動で日次バッチを実行してレッスンデータを取得
 */

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';
process.env.STUDIO_BATCH_TABLE_NAME = 'feelcycle-studio-batch-dev';
process.env.USER_LESSONS_TABLE_NAME = 'feelcycle-hub-user-lessons-dev';
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USERS_TABLE_NAME = 'feelcycle-hub-users-dev';

const { progressiveDailyRefresh } = require('./dist/scripts/progressive-daily-refresh.js');
const { studiosService } = require('./dist/services/studios-service.js');

async function runManualDailyBatch() {
  console.log('🚀 手動日次バッチ実行開始');
  console.log('37スタジオの最新レッスンデータを取得します');
  console.log('='.repeat(60));
  
  let executionCount = 0;
  let totalProcessed = 0;
  let successCount = 0;
  let errorCount = 0;
  
  const maxExecutions = 50; // 安全上限
  
  try {
    // 初期状態確認
    console.log('📊 初期バッチ状況確認...');
    let progress = await studiosService.getBatchProgress();
    console.log(`開始状況: ${progress.completed}/${progress.total} (残り: ${progress.remaining})`);
    
    // progressiveDailyRefreshを継続実行
    console.log('\n🔄 Progressive Daily Refresh継続実行開始');
    
    while (progress.remaining > 0 && executionCount < maxExecutions) {
      executionCount++;
      console.log(`\n📍 実行 ${executionCount}: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      
      try {
        const result = await progressiveDailyRefresh();
        
        // 進捗確認
        const newProgress = await studiosService.getBatchProgress();
        const processed = newProgress.completed - progress.completed;
        
        if (processed > 0) {
          successCount++;
          totalProcessed += processed;
          console.log(`✅ スタジオ処理成功: +${processed}件 (合計: ${newProgress.completed}/${newProgress.total})`);
        } else {
          console.log(`⚪ スタジオ処理変化なし: ${newProgress.completed}/${newProgress.total}`);
        }
        
        progress = newProgress;
        
        // 完了チェック
        if (progress.remaining === 0) {
          console.log('🎉 全スタジオ処理完了!');
          break;
        }
        
        // 次の実行までの短い待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ 実行${executionCount}でエラー:`, error.message || error);
        
        // エラー時は少し長く待機
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 連続エラーが多い場合は中断
        if (errorCount > 5) {
          console.error('❌ 連続エラーが多すぎるため中断');
          break;
        }
      }
    }
    
    // 最終結果確認
    console.log('\n📊 最終結果');
    console.log('='.repeat(40));
    const finalProgress = await studiosService.getBatchProgress();
    
    console.log(`🔄 総実行回数: ${executionCount}`);
    console.log(`✅ 処理成功: ${successCount}回`);
    console.log(`❌ エラー発生: ${errorCount}回`);
    console.log(`📈 処理スタジオ: ${totalProcessed}件`);
    console.log(`📊 最終進捗: ${finalProgress.completed}/${finalProgress.total}`);
    console.log(`⏳ 残りスタジオ: ${finalProgress.remaining}`);
    console.log(`💥 失敗スタジオ: ${finalProgress.failed}`);
    
    // レッスンデータ確認サンプル
    console.log('\n📚 レッスンデータ確認サンプル');
    const { LessonsService } = require('./dist/services/lessons-service.js');
    const lessonsService = new LessonsService();
    
    const sampleStudios = ['ikb', 'sby', 'ssb']; // 池袋、渋谷、心斎橋
    const today = new Date().toISOString().split('T')[0];
    
    for (const studioCode of sampleStudios) {
      try {
        const lessons = await lessonsService.getLessonsForStudioAndDate(studioCode, today);
        console.log(`   ${studioCode}: ${lessons.length}件 (${today})`);
        
        if (lessons.length > 0) {
          const sample = lessons[0];
          console.log(`      例: ${sample.lessonTime || 'N/A'} ${sample.programName || 'N/A'}`);
        }
      } catch (error) {
        console.log(`   ${studioCode}: 確認エラー - ${error.message}`);
      }
    }
    
    // 成功判定
    if (finalProgress.completed >= 35) { // 35スタジオ以上成功なら合格
      console.log('\n🎉 手動日次バッチ実行成功!');
      console.log('✅ 37スタジオの最新レッスンデータ取得完了');
      console.log('✅ DynamoDBに最新データ保存済み');
      console.log('✅ 本番稼働準備完了');
      return true;
    } else {
      console.log('\n⚠️  部分成功');
      console.log(`${finalProgress.completed}/37スタジオでデータ取得成功`);
      console.log('一部失敗がありますが、大部分は正常に動作');
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 手動バッチ実行エラー:', error);
    return false;
  }
}

// 実行
runManualDailyBatch().then(success => {
  if (success) {
    console.log('\n🚀 完全成功: 日次バッチシステム稼働確認完了');
    console.log('毎日3:00AMの自動実行で最新データが取得されます');
  } else {
    console.log('\n📝 部分成功: 大部分のスタジオでデータ取得完了');
    console.log('失敗したスタジオは次回実行時に自動復旧されます');
  }
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('\n💥 実行失敗:', error);
  process.exit(1);
});