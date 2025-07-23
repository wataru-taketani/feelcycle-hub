"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldWaitlists = cleanupOldWaitlists;
/**
 * 古いキャンセル待ちデータのクリーンアップ
 * 過去の日付のwaitlistエントリを削除
 */
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
const WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
async function cleanupOldWaitlists() {
    console.log('🧹 Starting cleanup of old waitlist entries...');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    console.log('📅 Today:', today);
    try {
        // 全てのwaitlistエントリをスキャン
        const scanResult = await docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: WAITLIST_TABLE_NAME,
        }));
        if (!scanResult.Items) {
            console.log('📭 No items found in waitlist table');
            return;
        }
        console.log(`📊 Total waitlist entries found: ${scanResult.Items.length}`);
        const oldEntries = [];
        const currentEntries = [];
        // 日付でエントリを分類
        scanResult.Items.forEach(item => {
            if (!item.lessonDate) {
                console.log('⚠️ Entry without lessonDate:', item.waitlistId);
                oldEntries.push(item);
                return;
            }
            if (item.lessonDate < today) {
                oldEntries.push(item);
            }
            else {
                currentEntries.push(item);
            }
        });
        console.log(`🗑️ Old entries to delete: ${oldEntries.length}`);
        console.log(`✅ Current entries to keep: ${currentEntries.length}`);
        // 古いエントリを削除
        let deletedCount = 0;
        for (const entry of oldEntries) {
            try {
                console.log(`🗑️ Deleting: ${entry.waitlistId} (${entry.lessonDate || 'no date'})`);
                await docClient.send(new lib_dynamodb_1.DeleteCommand({
                    TableName: WAITLIST_TABLE_NAME,
                    Key: {
                        userId: entry.userId,
                        waitlistId: entry.waitlistId,
                    },
                }));
                deletedCount++;
            }
            catch (error) {
                console.error(`❌ Failed to delete ${entry.waitlistId}:`, error);
            }
        }
        console.log(`✅ Cleanup completed. Deleted ${deletedCount}/${oldEntries.length} old entries`);
        console.log(`📊 Remaining current entries: ${currentEntries.length}`);
        // 残りのエントリをサマリー表示
        const remainingSummary = currentEntries.reduce((acc, entry) => {
            const date = entry.lessonDate || 'no-date';
            const status = entry.status || 'unknown';
            const key = `${date}-${status}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        console.log('📈 Remaining entries summary:');
        Object.entries(remainingSummary).forEach(([key, count]) => {
            console.log(`  ${key}: ${count}`);
        });
    }
    catch (error) {
        console.error('❌ Cleanup failed:', error);
        throw error;
    }
}
