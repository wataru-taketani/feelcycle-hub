#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const split_daily_refresh_1 = require("./scripts/split-daily-refresh");
/**
 * コマンド 3: スタジオ処理
 * 使用方法: npm run process-studio <batchId>
 */
async function main() {
    const batchId = process.argv[2];
    if (!batchId) {
        console.error('❌ バッチIDを指定してください');
        console.log('使用方法: npm run process-studio <batchId>');
        process.exit(1);
    }
    console.log('🏢 FEELCYCLEデータ更新: スタジオ処理');
    console.log('='.repeat(60));
    console.log(`バッチID: ${batchId}`);
    const splitRefresh = new split_daily_refresh_1.SplitDailyRefresh();
    try {
        const hasMore = await splitRefresh.processNextStudio(batchId);
        if (hasMore) {
            console.log(`\n📋 次のステップ:`);
            console.log(`  続行: npm run process-studio ${batchId}`);
            console.log(`  進捗: npm run batch-status ${batchId}`);
        }
        else {
            console.log(`\n🎉 全スタジオの処理が完了しました！`);
            console.log(`\n📋 最終確認:`);
            console.log(`  npm run batch-status ${batchId}`);
        }
    }
    catch (error) {
        console.error('❌ スタジオ処理失敗:', error);
        process.exit(1);
    }
    finally {
        await splitRefresh.cleanup();
    }
}
main().catch(console.error);
