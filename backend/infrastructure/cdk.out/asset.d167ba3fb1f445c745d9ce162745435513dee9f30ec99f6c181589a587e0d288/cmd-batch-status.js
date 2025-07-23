#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const split_daily_refresh_1 = require("./scripts/split-daily-refresh");
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
    const splitRefresh = new split_daily_refresh_1.SplitDailyRefresh();
    try {
        await splitRefresh.showBatchStatus(batchId);
    }
    catch (error) {
        console.error('❌ 状況確認失敗:', error);
        process.exit(1);
    }
    finally {
        await splitRefresh.cleanup();
    }
}
main().catch(console.error);
