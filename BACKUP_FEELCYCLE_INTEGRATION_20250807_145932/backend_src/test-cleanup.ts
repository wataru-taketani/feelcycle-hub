/**
 * クリーンアップ機能のテスト実行
 */
import { cleanupOldWaitlists } from './cleanup-old-waitlists';

async function runCleanupTest() {
  console.log('🧪 Starting waitlist cleanup test...');
  
  try {
    await cleanupOldWaitlists();
    console.log('✅ Cleanup test completed successfully');
  } catch (error) {
    console.error('❌ Cleanup test failed:', error);
    process.exit(1);
  }
}

// メイン実行
if (require.main === module) {
  runCleanupTest();
}