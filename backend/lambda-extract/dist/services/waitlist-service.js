"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitlistService = exports.WaitlistService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const WAITLIST_TABLE_NAME = process.env.WAITLIST_TABLE_NAME;
class WaitlistService {
    /**
     * Create a new waitlist entry
     */
    async createWaitlist(userId, request) {
        const now = new Date();
        const waitlistId = `${request.studioCode}#${request.lessonDate}#${request.startTime}#${request.lessonName}`;
        // Calculate lesson datetime for comparison
        const lessonDateTime = `${request.lessonDate}T${request.startTime}:00+09:00`;
        const lessonDate = new Date(lessonDateTime);
        // Set TTL to 1 hour after lesson end time (assuming 45min lessons)
        const ttl = Math.floor((lessonDate.getTime() + 105 * 60 * 1000) / 1000); // 1h45m after start
        const waitlist = {
            userId,
            waitlistId,
            studioCode: request.studioCode,
            studioName: this.getStudioName(request.studioCode),
            lessonDate: request.lessonDate,
            startTime: request.startTime,
            endTime: this.calculateEndTime(request.startTime),
            lessonName: request.lessonName,
            instructor: request.instructor,
            lessonDateTime,
            status: 'active',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            notificationHistory: [],
            ttl,
        };
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: WAITLIST_TABLE_NAME,
            Item: waitlist,
            ConditionExpression: 'attribute_not_exists(userId) AND attribute_not_exists(waitlistId)',
        }));
        return waitlist;
    }
    /**
     * Get user's waitlists by status
     */
    async getUserWaitlists(userId, status) {
        const params = {
            TableName: WAITLIST_TABLE_NAME,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId,
            },
        };
        if (status) {
            params.FilterExpression = '#status = :status';
            params.ExpressionAttributeNames = { '#status': 'status' };
            params.ExpressionAttributeValues[':status'] = status;
        }
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand(params));
        return (result.Items || []);
    }
    /**
     * Get active waitlists for monitoring (efficient extraction)
     */
    async getActiveWaitlistsForMonitoring() {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: WAITLIST_TABLE_NAME,
            IndexName: 'StatusLessonDateTimeIndex',
            KeyConditionExpression: '#status = :status AND lessonDateTime BETWEEN :now AND :oneHourLater',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':status': 'active',
                ':now': now.toISOString(),
                ':oneHourLater': oneHourLater.toISOString(),
            },
        }));
        return (result.Items || []);
    }
    /**
     * Update waitlist status
     */
    async updateWaitlistStatus(userId, waitlistId, status, additionalFields) {
        const now = new Date().toISOString();
        const updateExpressions = ['#status = :status', 'updatedAt = :updatedAt'];
        const expressionAttributeNames = { '#status': 'status' };
        const expressionAttributeValues = {
            ':status': status,
            ':updatedAt': now,
        };
        // Add status-specific timestamp
        switch (status) {
            case 'paused':
                updateExpressions.push('pausedAt = :pausedAt');
                expressionAttributeValues[':pausedAt'] = now;
                break;
            case 'expired':
                updateExpressions.push('expiredAt = :expiredAt');
                expressionAttributeValues[':expiredAt'] = now;
                break;
            case 'cancelled':
                updateExpressions.push('cancelledAt = :cancelledAt');
                expressionAttributeValues[':cancelledAt'] = now;
                break;
            case 'completed':
                updateExpressions.push('completedAt = :completedAt');
                expressionAttributeValues[':completedAt'] = now;
                break;
        }
        // Add additional fields
        if (additionalFields) {
            Object.entries(additionalFields).forEach(([key, value], index) => {
                const attrKey = `:additional${index}`;
                updateExpressions.push(`${key} = ${attrKey}`);
                expressionAttributeValues[attrKey] = value;
            });
        }
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: WAITLIST_TABLE_NAME,
            Key: { userId, waitlistId },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
        }));
    }
    /**
     * Add notification record to waitlist
     */
    async addNotificationRecord(userId, waitlistId, notification) {
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: WAITLIST_TABLE_NAME,
            Key: { userId, waitlistId },
            UpdateExpression: 'SET notificationHistory = list_append(if_not_exists(notificationHistory, :emptyList), :newNotification), updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':emptyList': [],
                ':newNotification': [notification],
                ':updatedAt': new Date().toISOString(),
            },
        }));
    }
    /**
     * Resume waitlist (change from paused to active)
     */
    async resumeWaitlist(userId, waitlistId) {
        await this.updateWaitlistStatus(userId, waitlistId, 'active', {
            autoResumeAt: undefined,
        });
    }
    /**
     * Cancel waitlist
     */
    async cancelWaitlist(userId, waitlistId) {
        await this.updateWaitlistStatus(userId, waitlistId, 'cancelled');
    }
    /**
     * Delete waitlist (hard delete)
     */
    async deleteWaitlist(userId, waitlistId) {
        await docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: WAITLIST_TABLE_NAME,
            Key: { userId, waitlistId },
        }));
    }
    /**
     * Expire old waitlists (batch cleanup)
     */
    async expireOldWaitlists() {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // Get active/paused waitlists with past lesson dates
        const result = await docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: WAITLIST_TABLE_NAME,
            FilterExpression: '(#status = :active OR #status = :paused) AND lessonDateTime < :yesterday',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':active': 'active',
                ':paused': 'paused',
                ':yesterday': yesterday.toISOString(),
            },
            ProjectionExpression: 'userId, waitlistId',
        }));
        const expiredItems = result.Items || [];
        // Batch update to expired status
        const updatePromises = expiredItems.map(item => this.updateWaitlistStatus(item.userId, item.waitlistId, 'expired'));
        await Promise.all(updatePromises);
        return { expiredCount: expiredItems.length };
    }
    /**
     * Get studio name from code
     */
    getStudioName(studioCode) {
        const studioMap = {
            'omotesando': '表参道',
            'ginza': '銀座',
            'roppongi': '六本木',
            'shibuya': '渋谷',
            'shinjuku': '新宿',
            // Add all 37 studios...
        };
        return studioMap[studioCode] || studioCode;
    }
    /**
     * Calculate end time (assuming 45-minute lessons)
     */
    calculateEndTime(startTime) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hours, minutes + 45, 0, 0);
        return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    }
}
exports.WaitlistService = WaitlistService;
exports.waitlistService = new WaitlistService();
