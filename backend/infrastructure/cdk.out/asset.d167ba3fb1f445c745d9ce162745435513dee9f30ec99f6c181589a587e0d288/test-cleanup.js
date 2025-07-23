"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * クリーンアップ機能のテスト実行
 */
const cleanup_old_waitlists_1 = require("./cleanup-old-waitlists");
async function runCleanupTest() {
    console.log('🧪 Starting waitlist cleanup test...');
    try {
        await (0, cleanup_old_waitlists_1.cleanupOldWaitlists)();
        console.log('✅ Cleanup test completed successfully');
    }
    catch (error) {
        console.error('❌ Cleanup test failed:', error);
        process.exit(1);
    }
}
// メイン実行
if (require.main === module) {
    runCleanupTest();
}
