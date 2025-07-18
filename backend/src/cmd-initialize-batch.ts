#!/usr/bin/env node

import { SplitDailyRefresh } from './scripts/split-daily-refresh';

/**
 * コマンド 1: バッチ初期化
 * 使用方法: npm run init-batch
 */
async function main() {
  console.log('🎬 FEELCYCLEデータ更新: バッチ初期化');
  console.log('='.repeat(60));
  
  const splitRefresh = new SplitDailyRefresh();
  
  try {
    const batchId = await splitRefresh.initializeBatch();
    
    console.log(`\n✅ バッチ初期化完了`);
    console.log(`\n📋 次のステップ:`);
    console.log(`  1. データ削除: npm run clear-lessons`);
    console.log(`  2. 処理開始: npm run process-studio ${batchId}`);
    console.log(`  3. 進捗確認: npm run batch-status ${batchId}`);
    
  } catch (error: any) {
    console.error('❌ バッチ初期化失敗:', error);
    process.exit(1);
  } finally {
    await splitRefresh.cleanup();
  }
}

main().catch(console.error);