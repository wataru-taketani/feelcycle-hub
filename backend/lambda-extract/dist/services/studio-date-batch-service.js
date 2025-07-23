"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudioDateBatchService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const STUDIO_DATE_BATCH_TABLE_NAME = process.env.STUDIO_DATE_BATCH_TABLE_NAME || 'feelcycle-studio-date-batch-dev';
/**
 * スタジオ×日付バッチ処理管理サービス
 */
class StudioDateBatchService {
    /**
     * 新しいバッチを作成してスタジオ×日付の組み合わせを格納
     */
    async createBatch(studios, targetDays = 14) {
        const batchId = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式
        const currentTime = new Date().toISOString();
        const ttl = Math.floor((Date.now() + 7 * 24 * 60 * 60 * 1000) / 1000); // 7日後
        // 対象日付を生成
        const dates = Array.from({ length: targetDays }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        });
        console.log(`📦 バッチ作成: ${batchId} (${studios.length}スタジオ × ${dates.length}日 = ${studios.length * dates.length}タスク)`);
        // 既存のバッチがあれば削除
        await this.clearBatch(batchId);
        // 各スタジオ×日付の組み合わせをバッチアイテムとして保存
        const putPromises = [];
        for (const studio of studios) {
            for (const date of dates) {
                const item = {
                    batchId,
                    studioDate: `${studio.code}#${date}`,
                    studioCode: studio.code,
                    studioName: studio.name,
                    targetDate: date,
                    status: 'pending',
                    createdAt: currentTime,
                    updatedAt: currentTime,
                    ttl
                };
                putPromises.push(docClient.send(new lib_dynamodb_1.PutCommand({
                    TableName: STUDIO_DATE_BATCH_TABLE_NAME,
                    Item: item
                })));
            }
        }
        // バッチ処理で保存
        const batchSize = 25; // DynamoDBの制限
        for (let i = 0; i < putPromises.length; i += batchSize) {
            const batch = putPromises.slice(i, i + batchSize);
            await Promise.all(batch);
            console.log(`  進捗: ${Math.min(i + batchSize, putPromises.length)}/${putPromises.length} 保存完了`);
        }
        console.log(`✅ バッチ作成完了: ${batchId}`);
        return batchId;
    }
    /**
     * 指定バッチの全アイテムを削除
     */
    async clearBatch(batchId) {
        const existingItems = await this.getBatchItems(batchId);
        if (existingItems.length > 0) {
            console.log(`🗑️  既存バッチ削除: ${batchId} (${existingItems.length}件)`);
            const deletePromises = existingItems.map(item => docClient.send(new lib_dynamodb_1.DeleteCommand({
                TableName: STUDIO_DATE_BATCH_TABLE_NAME,
                Key: {
                    batchId: item.batchId,
                    studioDate: item.studioDate
                }
            })));
            // バッチ処理で削除
            const batchSize = 25;
            for (let i = 0; i < deletePromises.length; i += batchSize) {
                const batch = deletePromises.slice(i, i + batchSize);
                await Promise.all(batch);
            }
        }
    }
    /**
     * バッチ内の全アイテムを取得
     */
    async getBatchItems(batchId) {
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: STUDIO_DATE_BATCH_TABLE_NAME,
            KeyConditionExpression: 'batchId = :batchId',
            ExpressionAttributeValues: {
                ':batchId': batchId
            }
        }));
        return (result.Items || []);
    }
    /**
     * 次の処理待ちタスクを取得
     */
    async getNextPendingTask(batchId) {
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: STUDIO_DATE_BATCH_TABLE_NAME,
            KeyConditionExpression: 'batchId = :batchId',
            FilterExpression: '#status = :status',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':batchId': batchId,
                ':status': 'pending'
            },
            Limit: 1
        }));
        return result.Items?.[0] || null;
    }
    /**
     * タスクの処理状態を更新
     */
    async updateTaskStatus(batchId, studioDate, status, options = {}) {
        const updateExpression = [
            '#status = :status',
            'updatedAt = :updatedAt'
        ];
        const expressionAttributeNames = {
            '#status': 'status'
        };
        const expressionAttributeValues = {
            ':status': status,
            ':updatedAt': new Date().toISOString()
        };
        if (status === 'completed') {
            updateExpression.push('processedAt = :processedAt');
            expressionAttributeValues[':processedAt'] = new Date().toISOString();
        }
        if (options.errorMessage) {
            updateExpression.push('errorMessage = :errorMessage');
            expressionAttributeValues[':errorMessage'] = options.errorMessage;
        }
        if (options.lessonCount !== undefined) {
            updateExpression.push('lessonCount = :lessonCount');
            expressionAttributeValues[':lessonCount'] = options.lessonCount;
        }
        if (options.processingDuration !== undefined) {
            updateExpression.push('processingDuration = :processingDuration');
            expressionAttributeValues[':processingDuration'] = options.processingDuration;
        }
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: STUDIO_DATE_BATCH_TABLE_NAME,
            Key: {
                batchId,
                studioDate
            },
            UpdateExpression: `SET ${updateExpression.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        }));
    }
    /**
     * バッチの処理状況を取得
     */
    async getBatchStatus(batchId) {
        const items = await this.getBatchItems(batchId);
        const statusCounts = items.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {});
        const total = items.length;
        const pending = statusCounts.pending || 0;
        const processing = statusCounts.processing || 0;
        const completed = statusCounts.completed || 0;
        const failed = statusCounts.failed || 0;
        const progress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;
        return {
            total,
            pending,
            processing,
            completed,
            failed,
            progress,
            completedStudioDays: completed
        };
    }
    /**
     * バッチ処理の詳細サマリーを取得
     */
    async getBatchSummary(batchId) {
        const items = await this.getBatchItems(batchId);
        const status = await this.getBatchStatus(batchId);
        const totalLessons = items.reduce((sum, item) => sum + (item.lessonCount || 0), 0);
        const totalDuration = items.reduce((sum, item) => sum + (item.processingDuration || 0), 0);
        // スタジオ別の進捗
        const studioProgress = {};
        items.forEach(item => {
            if (!studioProgress[item.studioCode]) {
                studioProgress[item.studioCode] = { completed: 0, total: 0 };
            }
            studioProgress[item.studioCode].total++;
            if (item.status === 'completed') {
                studioProgress[item.studioCode].completed++;
            }
        });
        const errors = items
            .filter(item => item.status === 'failed' && item.errorMessage)
            .map(item => `${item.studioCode}#${item.targetDate}: ${item.errorMessage}`);
        return {
            batchId,
            status,
            totalLessons,
            totalDuration,
            studioProgress,
            errors
        };
    }
}
exports.StudioDateBatchService = StudioDateBatchService;
