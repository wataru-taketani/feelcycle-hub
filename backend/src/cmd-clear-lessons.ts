#!/usr/bin/env node

import { SplitDailyRefresh } from './scripts/split-daily-refresh';

/**
 * コマンド 2: レッスンデータ削除
 * 使用方法: npm run clear-lessons
 */
async function main() {
  console.log('🗑️  FEELCYCLEデータ更新: レッスンデータ削除');
  console.log('='.repeat(60));
  
  const splitRefresh = new SplitDailyRefresh();
  
  try {
    await splitRefresh.clearLessonsData();
    
    console.log(`\n✅ レッスンデータ削除完了`);
    console.log(`\n📋 次のステップ:`);
    console.log(`  npm run process-studio <batchId>`);
    
  } catch (error: any) {
    console.error('❌ レッスンデータ削除失敗:', error);
    process.exit(1);
  } finally {
    await splitRefresh.cleanup();
  }
}

main().catch(console.error);