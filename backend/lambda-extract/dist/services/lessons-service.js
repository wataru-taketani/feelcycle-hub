"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.lessonsService = exports.LessonsService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const LESSONS_TABLE_NAME = process.env.LESSONS_TABLE_NAME;
class LessonsService {
    /**
     * Store lesson data in DynamoDB
     */
    async storeLessonData(lessonData) {
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: LESSONS_TABLE_NAME,
            Item: lessonData,
        }));
    }
    /**
     * Store multiple lessons in batch
     */
    async storeLessonsData(lessons) {
        const promises = lessons.map(lesson => this.storeLessonData(lesson));
        await Promise.all(promises);
    }
    /**
     * Get lessons for a specific studio and date
     */
    async getLessonsForStudioAndDate(studioCode, date, filters) {
        const startDateTime = `${date}T00:00:00+09:00`;
        const endDateTime = `${date}T23:59:59+09:00`;
        const params = {
            TableName: LESSONS_TABLE_NAME,
            KeyConditionExpression: 'studioCode = :studioCode AND lessonDateTime BETWEEN :startDateTime AND :endDateTime',
            ExpressionAttributeValues: {
                ':studioCode': studioCode,
                ':startDateTime': startDateTime,
                ':endDateTime': endDateTime,
            },
        };
        // Add filters
        if (filters) {
            const filterExpressions = [];
            if (filters.program) {
                filterExpressions.push('#program = :program');
                params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
                params.ExpressionAttributeNames['#program'] = 'program';
                params.ExpressionAttributeValues[':program'] = filters.program;
            }
            if (filters.instructor) {
                filterExpressions.push('instructor = :instructor');
                params.ExpressionAttributeValues[':instructor'] = filters.instructor;
            }
            if (filters.availableOnly) {
                filterExpressions.push('isAvailable = :isAvailable');
                params.ExpressionAttributeValues[':isAvailable'] = 'true';
            }
            if (filters.timeRange) {
                filterExpressions.push('startTime BETWEEN :startTime AND :endTime');
                params.ExpressionAttributeValues[':startTime'] = filters.timeRange.start;
                params.ExpressionAttributeValues[':endTime'] = filters.timeRange.end;
            }
            if (filterExpressions.length > 0) {
                params.FilterExpression = filterExpressions.join(' AND ');
            }
        }
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand(params));
        return (result.Items || []);
    }
    /**
     * Get lessons for all studios on a specific date
     */
    async getLessonsForDate(date, filters) {
        const params = {
            TableName: LESSONS_TABLE_NAME,
            IndexName: 'DateStudioIndex',
            KeyConditionExpression: 'lessonDate = :lessonDate',
            ExpressionAttributeValues: {
                ':lessonDate': date,
            },
        };
        // Add filters
        if (filters) {
            const filterExpressions = [];
            if (filters.program) {
                filterExpressions.push('#program = :program');
                params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
                params.ExpressionAttributeNames['#program'] = 'program';
                params.ExpressionAttributeValues[':program'] = filters.program;
            }
            if (filters.instructor) {
                filterExpressions.push('instructor = :instructor');
                params.ExpressionAttributeValues[':instructor'] = filters.instructor;
            }
            if (filters.availableOnly) {
                filterExpressions.push('isAvailable = :isAvailable');
                params.ExpressionAttributeValues[':isAvailable'] = 'true';
            }
            if (filters.timeRange) {
                filterExpressions.push('startTime BETWEEN :startTime AND :endTime');
                params.ExpressionAttributeValues[':startTime'] = filters.timeRange.start;
                params.ExpressionAttributeValues[':endTime'] = filters.timeRange.end;
            }
            if (filterExpressions.length > 0) {
                params.FilterExpression = filterExpressions.join(' AND ');
            }
        }
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand(params));
        return (result.Items || []);
    }
    /**
     * Get available lessons (for monitoring)
     */
    async getAvailableLessons(limit) {
        const params = {
            TableName: LESSONS_TABLE_NAME,
            IndexName: 'DateStudioIndex',
            KeyConditionExpression: 'isAvailable = :isAvailable',
            ExpressionAttributeValues: {
                ':isAvailable': 'true',
            },
            ScanIndexForward: true, // Sort by lessonDateTime ascending
        };
        if (limit) {
            params.Limit = limit;
        }
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand(params));
        return (result.Items || []);
    }
    /**
     * Update lesson availability
     */
    async updateLessonAvailability(studioCode, lessonDateTime, availableSlots, totalSlots) {
        const isAvailable = availableSlots > 0 ? 'true' : 'false';
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: LESSONS_TABLE_NAME,
            Key: {
                studioCode,
                lessonDateTime,
            },
            UpdateExpression: 'SET availableSlots = :availableSlots, isAvailable = :isAvailable, lastUpdated = :lastUpdated',
            ExpressionAttributeValues: {
                ':availableSlots': availableSlots,
                ':isAvailable': isAvailable,
                ':lastUpdated': new Date().toISOString(),
            },
        }));
    }
    /**
     * Clean up old lesson data
     */
    async cleanupOldLessons() {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        const cutoffDate = twoDaysAgo.toISOString().split('T')[0];
        // Scan for old lessons (this is not the most efficient way, but works for cleanup)
        const result = await docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: LESSONS_TABLE_NAME,
            FilterExpression: 'lessonDate < :cutoffDate',
            ExpressionAttributeValues: {
                ':cutoffDate': cutoffDate,
            },
            ProjectionExpression: 'studioCode, lessonDateTime',
        }));
        const oldLessons = result.Items || [];
        // Delete old lessons
        const deletePromises = oldLessons.map(lesson => docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: LESSONS_TABLE_NAME,
            Key: {
                studioCode: lesson.studioCode,
                lessonDateTime: lesson.lessonDateTime,
            },
        })));
        await Promise.all(deletePromises);
        return { deletedCount: oldLessons.length };
    }
    /**
     * Create sample lesson data (for testing without scraping)
     */
    async createSampleLessons(studioCode, date) {
        const sampleLessons = [
            {
                studioCode,
                lessonDateTime: `${date}T07:00:00+09:00`,
                lessonDate: date,
                startTime: '07:00',
                endTime: '07:45',
                lessonName: 'BSL House 1',
                instructor: 'YUKI',
                availableSlots: 0,
                totalSlots: 20,
                isAvailable: 'false',
                program: 'BSL',
                lastUpdated: new Date().toISOString(),
                ttl: Math.floor((new Date(date + 'T08:00:00+09:00').getTime()) / 1000) + 86400, // 1 day after lesson
            },
            {
                studioCode,
                lessonDateTime: `${date}T10:30:00+09:00`,
                lessonDate: date,
                startTime: '10:30',
                endTime: '11:15',
                lessonName: 'BB1 Beat',
                instructor: 'MIKI',
                availableSlots: 3,
                totalSlots: 22,
                isAvailable: 'true',
                program: 'BB1',
                lastUpdated: new Date().toISOString(),
                ttl: Math.floor((new Date(date + 'T11:30:00+09:00').getTime()) / 1000) + 86400,
            },
            {
                studioCode,
                lessonDateTime: `${date}T12:00:00+09:00`,
                lessonDate: date,
                startTime: '12:00',
                endTime: '12:45',
                lessonName: 'BSB Beats',
                instructor: 'NANA',
                availableSlots: 0,
                totalSlots: 20,
                isAvailable: 'false',
                program: 'BSB',
                lastUpdated: new Date().toISOString(),
                ttl: Math.floor((new Date(date + 'T13:00:00+09:00').getTime()) / 1000) + 86400,
            },
            {
                studioCode,
                lessonDateTime: `${date}T19:30:00+09:00`,
                lessonDate: date,
                startTime: '19:30',
                endTime: '20:15',
                lessonName: 'BSL House 1',
                instructor: 'Shiori.I',
                availableSlots: 6,
                totalSlots: 20,
                isAvailable: 'true',
                program: 'BSL',
                lastUpdated: new Date().toISOString(),
                ttl: Math.floor((new Date(date + 'T20:30:00+09:00').getTime()) / 1000) + 86400,
            },
            {
                studioCode,
                lessonDateTime: `${date}T21:00:00+09:00`,
                lessonDate: date,
                startTime: '21:00',
                endTime: '21:45',
                lessonName: 'BSW Hip Hop',
                instructor: 'RYO',
                availableSlots: 2,
                totalSlots: 24,
                isAvailable: 'true',
                program: 'BSW',
                lastUpdated: new Date().toISOString(),
                ttl: Math.floor((new Date(date + 'T22:00:00+09:00').getTime()) / 1000) + 86400,
            },
        ];
        await this.storeLessonsData(sampleLessons);
        return sampleLessons;
    }
    /**
     * Execute real scraping and store data
     */
    async executeRealScraping(studioCode, date) {
        console.log(`🚴‍♀️ Starting real scraping for ${studioCode} on ${date}`);
        try {
            // Import real scraper
            const { RealFeelcycleScraper } = await Promise.resolve().then(() => __importStar(require('./real-scraper')));
            let lessons = [];
            if (studioCode === 'all') {
                // All studios scraping
                console.log('🌏 Scraping ALL studios...');
                lessons = await RealFeelcycleScraper.searchAllStudiosRealLessons(date);
                console.log(`✅ Found ${lessons.length} real lessons from ALL studios`);
            }
            else {
                // Single studio scraping
                console.log(`🏢 Scraping studio: ${studioCode}`);
                lessons = await RealFeelcycleScraper.searchRealLessons(studioCode, date);
                console.log(`✅ Found ${lessons.length} real lessons from ${studioCode}`);
            }
            if (lessons.length > 0) {
                // Store lessons in DynamoDB
                await this.storeLessonsData(lessons);
                console.log(`💾 Stored ${lessons.length} lessons in DynamoDB`);
            }
            return lessons;
        }
        catch (error) {
            console.error('Real scraping failed:', error);
            throw error;
        }
    }
    /**
     * Clear all lessons from the table
     */
    async clearAllLessons() {
        console.log('🗑️  全レッスンデータのクリア開始...');
        // スキャンして全アイテムを取得
        const scanResult = await docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: LESSONS_TABLE_NAME,
            ProjectionExpression: 'studioCode, lessonDateTime'
        }));
        const items = scanResult.Items || [];
        console.log(`削除対象: ${items.length}件`);
        if (items.length === 0) {
            console.log('削除対象のデータがありません');
            return { deletedCount: 0 };
        }
        // バッチ削除
        const deletePromises = items.map(item => docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: LESSONS_TABLE_NAME,
            Key: {
                studioCode: item.studioCode,
                lessonDateTime: item.lessonDateTime
            }
        })));
        // 25件ずつバッチ処理
        const batchSize = 25;
        let deletedCount = 0;
        for (let i = 0; i < deletePromises.length; i += batchSize) {
            const batch = deletePromises.slice(i, i + batchSize);
            await Promise.all(batch);
            deletedCount += batch.length;
            console.log(`進捗: ${deletedCount}/${items.length} 削除完了`);
        }
        console.log(`✅ 全${deletedCount}件のレッスンデータを削除しました`);
        return { deletedCount };
    }
}
exports.LessonsService = LessonsService;
exports.lessonsService = new LessonsService();
