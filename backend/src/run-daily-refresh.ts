#!/usr/bin/env node

import { DailyDataRefresh } from './scripts/daily-data-refresh';

/**
 * 日次データ更新の実行用スクリプト
 * 
 * 使用方法:
 * npm run build && node dist/run-daily-refresh.js
 * 
 * または環境変数付きで:
 * LESSONS_TABLE_NAME=feelcycle-hub-lessons-dev npm run build && node dist/run-daily-refresh.js
 */

console.log('🚀 FEELCYCLE 日次データ更新スクリプト');
console.log('対象テーブル:', process.env.LESSONS_TABLE_NAME || 'feelcycle-hub-lessons-dev');
console.log('実行を開始します...\n');

const refresh = new DailyDataRefresh();

refresh.runDailyRefresh()
  .then(() => {
    console.log('\n✅ 日次データ更新が正常に完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 日次データ更新でエラーが発生しました:', error);
    process.exit(1);
  });