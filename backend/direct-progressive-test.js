/**
 * Progressive daily refresh直接実行テスト
 */

// 環境変数設定（完全版）
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';
process.env.STUDIO_BATCH_TABLE_NAME = 'feelcycle-studio-batch-dev';
process.env.USER_LESSONS_TABLE_NAME = 'feelcycle-hub-user-lessons-dev';
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USERS_TABLE_NAME = 'feelcycle-hub-users-dev';
process.env.AWS_LAMBDA_FUNCTION_NAME = 'feelcycle-hub-main-dev';

const { progressiveDailyRefresh } = require('./dist/scripts/progressive-daily-refresh.js');

async function testProgressiveRefresh() {
  console.log('🚀 Progressive Daily Refresh 直接実行テスト');
  console.log('本番環境と同じ仕組みでの完全実行');
  console.log('='.repeat(60));
  
  let iteration = 1;
  let continuousExecution = true;
  
  while (continuousExecution) {
    console.log(`\n🔄 実行回数: ${iteration}`);
    console.log(`開始時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    
    try {
      const startTime = Date.now();
      const result = await progressiveDailyRefresh();
      const duration = (Date.now() - startTime) / 1000;
      
      console.log(`⏱️  実行時間: ${duration.toFixed(2)}秒`);
      console.log('📊 結果:', result);
      
      if (result?.triggerNext) {
        console.log('🔄 次のスタジオ処理を継続...');
        console.log(`進捗: ${result.progress?.completed || 0}/${result.progress?.total || 0}`);
        iteration++;
        
        // 少し待機してから次の実行
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } else {
        console.log('✅ 全スタジオ処理完了!');
        console.log(`最終進捗: ${result?.progress?.completed || 0}/${result?.progress?.total || 0}`);
        continuousExecution = false;
      }
      
    } catch (error) {
      console.error(`❌ 実行${iteration}でエラー:`, error);
      
      // エラーでも継続するかどうか判定
      if (iteration < 5) {
        console.log('⚠️  エラーが発生しましたが継続します...');
        iteration++;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('❌ エラーが多すぎるため終了します');
        continuousExecution = false;
      }
    }
  }
  
  console.log(`\n🏁 テスト完了 - 総実行回数: ${iteration - 1}`);
}

testProgressiveRefresh().catch(error => {
  console.error('❌ テスト実行エラー:', error);
  process.exit(1);
});