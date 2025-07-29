/**
 * バッチ状態リセットして74スタジオ完全実行
 */

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';
process.env.STUDIO_BATCH_TABLE_NAME = 'feelcycle-studio-batch-dev';
process.env.USER_LESSONS_TABLE_NAME = 'feelcycle-hub-user-lessons-dev';
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USERS_TABLE_NAME = 'feelcycle-hub-users-dev';
process.env.AWS_LAMBDA_FUNCTION_NAME = 'feelcycle-hub-main-dev';

const { progressiveDailyRefresh } = require('./dist/scripts/progressive-daily-refresh.js');
const { studiosService } = require('./dist/services/studios-service.js');

async function resetAndRunComplete() {
  console.log('🚀 バッチ状態リセット & 74スタジオ完全実行');
  console.log('='.repeat(60));
  
  try {
    // Step 1: バッチ状態リセット
    console.log('🔄 バッチ状態リセット中...');
    await studiosService.resetAllBatchStatuses();
    console.log('✅ バッチ状態リセット完了');
    
    // Step 2: 進捗確認
    const initialProgress = await studiosService.getBatchProgress();
    console.log(`📊 初期進捗: ${initialProgress.completed}/${initialProgress.total} (残り: ${initialProgress.remaining})`);
    
    // Step 3: 継続実行
    let iteration = 1;
    let totalStudiosProcessed = 0;
    let continuousExecution = true;
    
    while (continuousExecution && iteration <= 80) { // 安全上限設定
      console.log(`\n🔄 実行回数: ${iteration}`);
      console.log(`開始時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      
      const startTime = Date.now();
      const result = await progressiveDailyRefresh();
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`⏱️  実行時間: ${duration.toFixed(2)}秒`);
      
      if (result?.progress) {
        const { completed, total, remaining, failed } = result.progress;
        console.log(`📊 進捗: ${completed}/${total} (残り: ${remaining}, 失敗: ${failed})`);
        totalStudiosProcessed = completed;
        
        if (result.triggerNext && remaining > 0) {
          console.log('🔄 次のスタジオ処理を継続...');
          iteration++;
          // 短い待機時間
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log('✅ 全スタジオ処理完了!');
          continuousExecution = false;
        }
      } else {
        console.log('⚠️  進捗情報が取得できませんでした');
        iteration++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 安全装置
      if (iteration > 80) {
        console.log('⚠️  安全上限に達したため終了します');
        break;
      }
    }
    
    // Step 4: 最終結果確認
    console.log('\n📊 最終結果確認...');
    const finalProgress = await studiosService.getBatchProgress();
    console.log(`✅ 最終進捗: ${finalProgress.completed}/${finalProgress.total}`);
    console.log(`📈 処理済みスタジオ: ${totalStudiosProcessed}件`);
    console.log(`🔄 総実行回数: ${iteration - 1}回`);
    
    if (finalProgress.completed === finalProgress.total) {
      console.log('🎉 74スタジオ全件処理完了!');
    } else {
      console.log(`⚠️  未完了: ${finalProgress.remaining}スタジオ残り`);
    }
    
  } catch (error) {
    console.error('❌ 実行エラー:', error);
    process.exit(1);
  }
}

resetAndRunComplete();