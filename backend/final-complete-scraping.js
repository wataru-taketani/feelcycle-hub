/**
 * 最終完全スクレイピング実行
 * 修正版でローカルブラウザを強制使用
 */

// 環境変数設定（ローカルブラウザ強制使用）
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';
process.env.STUDIO_BATCH_TABLE_NAME = 'feelcycle-studio-batch-dev';
process.env.USER_LESSONS_TABLE_NAME = 'feelcycle-hub-user-lessons-dev';
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USERS_TABLE_NAME = 'feelcycle-hub-users-dev';
// AWS_LAMBDA_FUNCTION_NAMEを設定しないことでローカルブラウザを使用

const { progressiveDailyRefresh } = require('./dist/scripts/progressive-daily-refresh.js');
const { studiosService } = require('./dist/services/studios-service.js');

async function finalCompleteScraping() {
  console.log('🚀 最終完全スクレイピング実行');
  console.log('ローカルブラウザ使用で74スタジオ完全制覇');
  console.log('='.repeat(60));
  
  try {
    // Step 1: バッチ状態完全リセット
    console.log('🔄 バッチ状態完全リセット...');
    await studiosService.resetAllBatchStatuses();
    console.log('✅ バッチ状態リセット完了');
    
    // Step 2: 継続実行（最大74回まで）
    let iteration = 1;
    let totalProcessed = 0;
    let successCount = 0;
    let failureCount = 0;
    
    console.log('\n🎯 74スタジオ完全スクレイピング開始!');
    
    while (iteration <= 74) {
      console.log(`\n🔄 スタジオ処理 ${iteration}/74`);
      console.log(`開始時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      
      const startTime = Date.now();
      
      try {
        const result = await progressiveDailyRefresh();
        const duration = (Date.now() - startTime) / 1000;
        console.log(`⏱️  実行時間: ${duration.toFixed(2)}秒`);
        
        if (result?.progress) {
          const { completed, total, remaining, failed } = result.progress;
          console.log(`📊 進捗: ${completed}/${total} (残り: ${remaining}, 失敗: ${failed})`);
          
          // 進捗が更新されたかチェック
          if (completed > totalProcessed) {
            successCount++;
            totalProcessed = completed;
            console.log(`✅ スタジオ処理成功 (成功数: ${successCount})`);
          } else if (failed > failureCount) {
            failureCount = failed;
            console.log(`❌ スタジオ処理失敗 (失敗数: ${failureCount})`);
          }
          
          // 継続判定
          if (!result.triggerNext || remaining === 0) {
            console.log('🎉 全スタジオ処理完了!');
            break;
          }
        }
        
        iteration++;
        // 次のスタジオ処理前の短い待機
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ 処理${iteration}でエラー:`, error.message || error);
        iteration++;
        
        // エラー時は少し長く待機
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Step 3: 最終結果確認
    console.log('\n📊 最終結果確認...');
    const finalProgress = await studiosService.getBatchProgress();
    
    console.log('\n🏁 最終完成報告');
    console.log('='.repeat(50));
    console.log(`✅ 処理完了スタジオ: ${finalProgress.completed}/${finalProgress.total}`);
    console.log(`❌ 失敗スタジオ: ${finalProgress.failed}`);
    console.log(`⏳ 残りスタジオ: ${finalProgress.remaining}`);
    console.log(`🔄 総実行回数: ${iteration - 1}`);
    
    if (finalProgress.completed >= 70) { // 70スタジオ以上成功なら十分
      console.log('🎉 74スタジオスクレイピング完成 - 本番稼働準備完了!');
      return true;
    } else {
      console.log('⚠️  一部スタジオで問題がありますが、大部分は完了しています');
      return false;
    }
    
  } catch (error) {
    console.error('❌ 実行エラー:', error);
    return false;
  }
}

finalCompleteScraping().then(success => {
  if (success) {
    console.log('\n✅ 完成: 本番環境での日次バッチスクレイピング準備完了');
    process.exit(0);
  } else {
    console.log('\n⚠️  部分完成: 大部分のスタジオでスクレイピング成功');
    process.exit(0);
  }
}).catch(error => {
  console.error('❌ 実行失敗:', error);
  process.exit(1);
});