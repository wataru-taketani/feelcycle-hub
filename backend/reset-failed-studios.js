/**
 * 失敗スタジオのバッチステータスリセットスクリプト
 * 強化版スクレイパーでの再処理を有効化
 */

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';

const { studiosService } = require('./dist/services/studios-service.js');

async function resetFailedStudios() {
  console.log('🔄 失敗スタジオのバッチステータスリセット開始');
  console.log('='.repeat(50));
  
  try {
    // 現在のバッチ進捗確認
    console.log('\n📍 Step 1: 現在のバッチ状況確認');
    const progress = await studiosService.getBatchProgress();
    console.log(`現在の進捗: ${progress.completed}/${progress.total}`);
    console.log(`完了: ${progress.completed}, 失敗: ${progress.failed}, 残り: ${progress.remaining}, 処理中: ${progress.processing}`);
    
    if (progress.failed === 0) {
      console.log('✅ 失敗状態のスタジオはありません');
      return;
    }
    
    // 全スタジオ取得
    console.log('\n📍 Step 2: 失敗スタジオの特定');
    const allStudios = await studiosService.getAllStudios();
    const failedStudios = allStudios.filter(studio => 
      studio.batchStatus === 'failed' || 
      studio.batchStatus === 'error' || 
      (!studio.batchStatus && !studio.lastScrapedAt) // 未処理状態も含む
    );
    
    console.log(`失敗・未処理スタジオ: ${failedStudios.length}件`);
    failedStudios.forEach(studio => {
      console.log(`  🔧 ${studio.studioCode}: ${studio.studioName} (status: ${studio.batchStatus || 'none'})`);
    });
    
    if (failedStudios.length === 0) {
      console.log('✅ リセット対象のスタジオはありません');
      return;
    }
    
    // 失敗スタジオを pending に戻す
    console.log('\n📍 Step 3: バッチステータスのリセット実行');
    for (const studio of failedStudios) {
      try {
        await studiosService.markStudioAsProcessed(studio.studioCode, 'pending');
        console.log(`  ✅ ${studio.studioCode}: failed → pending`);
      } catch (error) {
        console.error(`  ❌ ${studio.studioCode}: リセット失敗 - ${error.message}`);
      }
    }
    
    // リセット後の状況確認
    console.log('\n📍 Step 4: リセット後の状況確認');
    const afterProgress = await studiosService.getBatchProgress();
    console.log(`リセット後進捗: ${afterProgress.completed}/${afterProgress.total}`);
    console.log(`完了: ${afterProgress.completed}, 失敗: ${afterProgress.failed}, 残り: ${afterProgress.remaining}, 処理中: ${afterProgress.processing}`);
    
    console.log('\n🎯 バッチステータスリセット完了');
    console.log(`${failedStudios.length}件のスタジオを再処理可能状態にしました`);
    console.log('\n💡 次のステップ:');
    console.log('   node manual-daily-batch.js を実行して強化版スクレイパーで再処理');
    
  } catch (error) {
    console.error('❌ バッチステータスリセットエラー:', error);
  }
}

// リセット実行
resetFailedStudios().catch(console.error);