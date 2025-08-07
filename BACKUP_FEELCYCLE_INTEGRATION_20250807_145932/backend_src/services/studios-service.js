"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studiosService = exports.StudiosService = void 0;
var client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
var lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
var types_1 = require("../types");
var client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
var docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
var STUDIOS_TABLE_NAME = process.env.STUDIOS_TABLE_NAME;
var StudiosService = /** @class */ (function () {
    function StudiosService() {
    }
    /**
     * Store studio data in DynamoDB
     */
    StudiosService.prototype.storeStudioData = function (studioData) {
        return __awaiter(this, void 0, void 0, function () {
            var normalizedData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        normalizedData = __assign(__assign({}, studioData), { studioCode: (0, types_1.normalizeStudioCode)(studioData.studioCode) });
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.PutCommand({
                                TableName: STUDIOS_TABLE_NAME,
                                Item: normalizedData,
                            }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Store multiple studios in batch
     */
    StudiosService.prototype.storeStudiosData = function (studios) {
        return __awaiter(this, void 0, void 0, function () {
            var promises;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = studios.map(function (studio) { return _this.storeStudioData(studio); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get studio by code
     */
    StudiosService.prototype.getStudioByCode = function (studioCode) {
        return __awaiter(this, void 0, void 0, function () {
            var normalizedStudioCode, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        normalizedStudioCode = (0, types_1.normalizeStudioCode)(studioCode);
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.GetCommand({
                                TableName: STUDIOS_TABLE_NAME,
                                Key: { studioCode: normalizedStudioCode },
                            }))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.Item || null];
                }
            });
        });
    };
    /**
     * Get all studios
     */
    StudiosService.prototype.getAllStudios = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, docClient.send(new lib_dynamodb_1.ScanCommand({
                            TableName: STUDIOS_TABLE_NAME,
                        }))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.Items || []];
                }
            });
        });
    };
    /**
     * Get next unprocessed studio for batch processing (with retry support)
     */
    StudiosService.prototype.getNextUnprocessedStudio = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, docClient.send(new lib_dynamodb_1.ScanCommand({
                            TableName: STUDIOS_TABLE_NAME,
                            FilterExpression: 'attribute_not_exists(lastProcessed) OR lastProcessed < :yesterday',
                            ExpressionAttributeValues: {
                                ':yesterday': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                            },
                            Limit: 1,
                        }))];
                    case 1:
                        result = _b.sent();
                        if (result.Items && result.Items.length > 0) {
                            return [2 /*return*/, result.Items[0]];
                        }
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.ScanCommand({
                                TableName: STUDIOS_TABLE_NAME,
                                FilterExpression: 'batchStatus = :failed AND (attribute_not_exists(retryCount) OR retryCount < :maxRetries)',
                                ExpressionAttributeValues: {
                                    ':failed': 'failed',
                                    ':maxRetries': 3, // Max 3 retry attempts
                                },
                                Limit: 1,
                            }))];
                    case 2:
                        // If no unprocessed studios, try to get failed studios for retry
                        result = _b.sent();
                        return [2 /*return*/, ((_a = result.Items) === null || _a === void 0 ? void 0 : _a[0]) || null];
                }
            });
        });
    };
    /**
     * Mark studio as processed (with retry count management)
     */
    StudiosService.prototype.markStudioAsProcessed = function (studioCode, status, errorMessage) {
        return __awaiter(this, void 0, void 0, function () {
            var updateExpression, expressionAttributeValues;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateExpression = ['SET lastProcessed = :now, batchStatus = :status'];
                        expressionAttributeValues = {
                            ':now': new Date().toISOString(),
                            ':status': status,
                        };
                        if (status === 'failed') {
                            // Increment retry count for failed studios
                            updateExpression.push('ADD retryCount :inc');
                            expressionAttributeValues[':inc'] = 1;
                            if (errorMessage) {
                                updateExpression.push('SET lastError = :error');
                                expressionAttributeValues[':error'] = errorMessage;
                            }
                        }
                        else if (status === 'completed') {
                            // Reset retry count on successful completion
                            updateExpression.push('REMOVE retryCount, lastError');
                        }
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.UpdateCommand({
                                TableName: STUDIOS_TABLE_NAME,
                                Key: { studioCode: studioCode },
                                UpdateExpression: updateExpression.join(' '),
                                ExpressionAttributeValues: expressionAttributeValues,
                            }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Reset all studio batch statuses for new daily run
     */
    StudiosService.prototype.resetAllBatchStatuses = function () {
        return __awaiter(this, void 0, void 0, function () {
            var studios, _i, studios_1, studio;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllStudios()];
                    case 1:
                        studios = _a.sent();
                        _i = 0, studios_1 = studios;
                        _a.label = 2;
                    case 2:
                        if (!(_i < studios_1.length)) return [3 /*break*/, 5];
                        studio = studios_1[_i];
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.UpdateCommand({
                                TableName: STUDIOS_TABLE_NAME,
                                Key: { studioCode: studio.studioCode },
                                UpdateExpression: 'REMOVE lastProcessed, batchStatus',
                            }))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get batch processing progress
     */
    StudiosService.prototype.getBatchProgress = function () {
        return __awaiter(this, void 0, void 0, function () {
            var studios, total, completed, processing, failed, _i, studios_2, studio, status_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getAllStudios()];
                    case 1:
                        studios = _a.sent();
                        total = studios.length;
                        completed = 0;
                        processing = 0;
                        failed = 0;
                        for (_i = 0, studios_2 = studios; _i < studios_2.length; _i++) {
                            studio = studios_2[_i];
                            status_1 = studio.batchStatus;
                            if (status_1 === 'completed')
                                completed++;
                            else if (status_1 === 'processing')
                                processing++;
                            else if (status_1 === 'failed')
                                failed++;
                        }
                        return [2 /*return*/, {
                                total: total,
                                completed: completed,
                                processing: processing,
                                failed: failed,
                                remaining: total - completed - processing - failed,
                            }];
                }
            });
        });
    };
    /**
     * Get studios by region
     */
    StudiosService.prototype.getStudiosByRegion = function (region) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, docClient.send(new lib_dynamodb_1.QueryCommand({
                            TableName: STUDIOS_TABLE_NAME,
                            IndexName: 'RegionIndex',
                            KeyConditionExpression: 'region = :region',
                            ExpressionAttributeValues: {
                                ':region': region,
                            },
                        }))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.Items || []];
                }
            });
        });
    };
    /**
     * Create studio from request
     */
    StudiosService.prototype.createStudioData = function (request) {
        var now = new Date().toISOString();
        var ttl = Math.floor((new Date().getTime() + 30 * 24 * 60 * 60 * 1000) / 1000); // 30 days TTL
        return {
            studioCode: request.studioCode,
            studioName: request.studioName,
            region: request.region,
            address: request.address,
            phoneNumber: request.phoneNumber,
            businessHours: request.businessHours,
            lastUpdated: now,
            ttl: ttl,
        };
    };
    /**
     * Update existing studio data
     */
    StudiosService.prototype.updateStudioData = function (studioCode, updates) {
        return __awaiter(this, void 0, void 0, function () {
            var updateExpressions, expressionAttributeNames, expressionAttributeValues;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updateExpressions = [];
                        expressionAttributeNames = {};
                        expressionAttributeValues = {};
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
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.UpdateCommand({
                                TableName: STUDIOS_TABLE_NAME,
                                Key: { studioCode: studioCode },
                                UpdateExpression: "SET ".concat(updateExpressions.join(', ')),
                                ExpressionAttributeNames: expressionAttributeNames,
                                ExpressionAttributeValues: expressionAttributeValues,
                            }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete studio
     */
    StudiosService.prototype.deleteStudio = function (studioCode) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, docClient.send(new lib_dynamodb_1.DeleteCommand({
                            TableName: STUDIOS_TABLE_NAME,
                            Key: { studioCode: studioCode },
                        }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Refresh all studios from scraping data
     */
    StudiosService.prototype.refreshStudiosFromScraping = function (scrapedStudios) {
        return __awaiter(this, void 0, void 0, function () {
            var created, updated, _i, scrapedStudios_1, scrapedStudio, existing, studioData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        created = 0;
                        updated = 0;
                        _i = 0, scrapedStudios_1 = scrapedStudios;
                        _a.label = 1;
                    case 1:
                        if (!(_i < scrapedStudios_1.length)) return [3 /*break*/, 8];
                        scrapedStudio = scrapedStudios_1[_i];
                        return [4 /*yield*/, this.getStudioByCode(scrapedStudio.code)];
                    case 2:
                        existing = _a.sent();
                        if (!existing) return [3 /*break*/, 5];
                        if (!(existing.studioName !== scrapedStudio.name || existing.region !== scrapedStudio.region)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.updateStudioData(scrapedStudio.code, {
                                studioName: scrapedStudio.name,
                                region: scrapedStudio.region,
                            })];
                    case 3:
                        _a.sent();
                        updated++;
                        _a.label = 4;
                    case 4: return [3 /*break*/, 7];
                    case 5:
                        studioData = this.createStudioData({
                            studioCode: scrapedStudio.code,
                            studioName: scrapedStudio.name,
                            region: scrapedStudio.region,
                        });
                        return [4 /*yield*/, this.storeStudioData(studioData)];
                    case 6:
                        _a.sent();
                        created++;
                        _a.label = 7;
                    case 7:
                        _i++;
                        return [3 /*break*/, 1];
                    case 8: return [2 /*return*/, {
                            created: created,
                            updated: updated,
                            total: scrapedStudios.length,
                        }];
                }
            });
        });
    };
    return StudiosService;
}());
exports.StudiosService = StudiosService;
exports.studiosService = new StudiosService();
