"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studiosService = exports.StudiosService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const STUDIOS_TABLE_NAME = process.env.STUDIOS_TABLE_NAME;
class StudiosService {
    /**
     * Store studio data in DynamoDB
     */
    async storeStudioData(studioData) {
        await docClient.send(new lib_dynamodb_1.PutCommand({
            TableName: STUDIOS_TABLE_NAME,
            Item: studioData,
        }));
    }
    /**
     * Store multiple studios in batch
     */
    async storeStudiosData(studios) {
        const promises = studios.map(studio => this.storeStudioData(studio));
        await Promise.all(promises);
    }
    /**
     * Get studio by code
     */
    async getStudioByCode(studioCode) {
        const result = await docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: STUDIOS_TABLE_NAME,
            Key: { studioCode },
        }));
        return result.Item || null;
    }
    /**
     * Get all studios
     */
    async getAllStudios() {
        const result = await docClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: STUDIOS_TABLE_NAME,
        }));
        return result.Items || [];
    }
    /**
     * Get studios by region
     */
    async getStudiosByRegion(region) {
        const result = await docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: STUDIOS_TABLE_NAME,
            IndexName: 'RegionIndex',
            KeyConditionExpression: 'region = :region',
            ExpressionAttributeValues: {
                ':region': region,
            },
        }));
        return result.Items || [];
    }
    /**
     * Create studio from request
     */
    createStudioData(request) {
        const now = new Date().toISOString();
        const ttl = Math.floor((new Date().getTime() + 30 * 24 * 60 * 60 * 1000) / 1000); // 30 days TTL
        return {
            studioCode: request.studioCode,
            studioName: request.studioName,
            region: request.region,
            address: request.address,
            phoneNumber: request.phoneNumber,
            businessHours: request.businessHours,
            lastUpdated: now,
            ttl,
        };
    }
    /**
     * Update existing studio data
     */
    async updateStudioData(studioCode, updates) {
        const updateExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        if (updates.studioName) {
            updateExpressions.push('#studioName = :studioName');
            expressionAttributeNames['#studioName'] = 'studioName';
            expressionAttributeValues[':studioName'] = updates.studioName;
        }
        if (updates.region) {
            updateExpressions.push('#region = :region');
            expressionAttributeNames['#region'] = 'region';
            expressionAttributeValues[':region'] = updates.region;
        }
        if (updates.address !== undefined) {
            updateExpressions.push('#address = :address');
            expressionAttributeNames['#address'] = 'address';
            expressionAttributeValues[':address'] = updates.address;
        }
        if (updates.phoneNumber !== undefined) {
            updateExpressions.push('#phoneNumber = :phoneNumber');
            expressionAttributeNames['#phoneNumber'] = 'phoneNumber';
            expressionAttributeValues[':phoneNumber'] = updates.phoneNumber;
        }
        if (updates.businessHours !== undefined) {
            updateExpressions.push('#businessHours = :businessHours');
            expressionAttributeNames['#businessHours'] = 'businessHours';
            expressionAttributeValues[':businessHours'] = updates.businessHours;
        }
        // Always update lastUpdated
        updateExpressions.push('#lastUpdated = :lastUpdated');
        expressionAttributeNames['#lastUpdated'] = 'lastUpdated';
        expressionAttributeValues[':lastUpdated'] = new Date().toISOString();
        if (updateExpressions.length === 1) { // Only lastUpdated
            return;
        }
        await docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: STUDIOS_TABLE_NAME,
            Key: { studioCode },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
        }));
    }
    /**
     * Delete studio
     */
    async deleteStudio(studioCode) {
        await docClient.send(new lib_dynamodb_1.DeleteCommand({
            TableName: STUDIOS_TABLE_NAME,
            Key: { studioCode },
        }));
    }
    /**
     * Refresh all studios from scraping data
     */
    async refreshStudiosFromScraping(scrapedStudios) {
        let created = 0;
        let updated = 0;
        for (const scrapedStudio of scrapedStudios) {
            const existing = await this.getStudioByCode(scrapedStudio.code);
            if (existing) {
                // Update existing studio if name or region changed
                if (existing.studioName !== scrapedStudio.name || existing.region !== scrapedStudio.region) {
                    await this.updateStudioData(scrapedStudio.code, {
                        studioName: scrapedStudio.name,
                        region: scrapedStudio.region,
                    });
                    updated++;
                }
            }
            else {
                // Create new studio
                const studioData = this.createStudioData({
                    studioCode: scrapedStudio.code,
                    studioName: scrapedStudio.name,
                    region: scrapedStudio.region,
                });
                await this.storeStudioData(studioData);
                created++;
            }
        }
        return {
            created,
            updated,
            total: scrapedStudios.length,
        };
    }
}
exports.StudiosService = StudiosService;
exports.studiosService = new StudiosService();
