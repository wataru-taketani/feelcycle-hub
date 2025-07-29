/**
 * Simple manual scraping using compiled JS files
 */

const { progressiveDailyRefresh } = require('./dist/scripts/progressive-daily-refresh.js');
const { logJSTInfo } = require('./dist/utils/dateUtils.js');

async function runManualScraping() {
  console.log('🚀 手動スクレイピング開始');
  logJSTInfo('Manual Scraping Start');
  
  try {
    const result = await progressiveDailyRefresh();
    console.log('✅ スクレイピング完了');
    console.log('結果:', result);
    logJSTInfo('Manual Scraping Completed');
  } catch (error) {
    console.error('❌ スクレイピング失敗:', error);
    logJSTInfo('Manual Scraping Failed');
    throw error;
  }
}

runManualScraping().catch(error => {
  console.error('実行エラー:', error);
  process.exit(1);
});