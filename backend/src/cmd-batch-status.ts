#!/usr/bin/env node

import { SplitDailyRefresh } from './scripts/split-daily-refresh';

/**
 * コマンド 4: バッチ状況確認
 * 使用方法: npm run batch-status <batchId>
 */
async function main() {
  const batchId = process.argv[2];
  
  if (!batchId) {
    console.error('❌ バッチIDを指定してください');
    console.log('使用方法: npm run batch-status <batchId>');
    process.exit(1);
  }
  
  const splitRefresh = new SplitDailyRefresh();
  
  try {
    await splitRefresh.showBatchStatus(batchId);
    
  } catch (error: any) {
    console.error('❌ 状況確認失敗:', error);
    process.exit(1);
  } finally {
    await splitRefresh.cleanup();
  }
}

main().catch(console.error);