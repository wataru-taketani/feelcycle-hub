"use strict";
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
exports.lessonsService = exports.LessonsService = void 0;
var client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
var lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
var client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
var docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
var LESSONS_TABLE_NAME = process.env.LESSONS_TABLE_NAME;
var LessonsService = /** @class */ (function () {
    function LessonsService() {
    }
    /**
     * Store lesson data in DynamoDB
     */
    LessonsService.prototype.storeLessonData = function (lessonData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, docClient.send(new lib_dynamodb_1.PutCommand({
                            TableName: LESSONS_TABLE_NAME,
                            Item: lessonData,
                        }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Store multiple lessons using DynamoDB BatchWrite (much more efficient)
     */
    LessonsService.prototype.storeLessonsData = function (lessons) {
        return __awaiter(this, void 0, void 0, function () {
            var BATCH_SIZE, batches, i, _i, _a, _b, batchIndex, batch, putRequests, error_1, _c, batch_1, lesson, individualError_1;
            var _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        if (lessons.length === 0)
                            return [2 /*return*/];
                        BATCH_SIZE = 25;
                        batches = [];
                        for (i = 0; i < lessons.length; i += BATCH_SIZE) {
                            batches.push(lessons.slice(i, i + BATCH_SIZE));
                        }
                        console.log("\uD83D\uDCDD Writing ".concat(lessons.length, " lessons in ").concat(batches.length, " batches..."));
                        _i = 0, _a = batches.entries();
                        _e.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 14];
                        _b = _a[_i], batchIndex = _b[0], batch = _b[1];
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 6, , 13]);
                        putRequests = batch.map(function (lesson) { return ({
                            PutRequest: {
                                Item: lesson
                            }
                        }); });
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.BatchWriteCommand({
                                RequestItems: (_d = {},
                                    _d[LESSONS_TABLE_NAME] = putRequests,
                                    _d)
                            }))];
                    case 3:
                        _e.sent();
                        console.log("   \u2705 Batch ".concat(batchIndex + 1, "/").concat(batches.length, " completed (").concat(batch.length, " items)"));
                        // Clear batch from memory immediately after processing
                        batch.length = 0;
                        if (!(batchIndex < batches.length - 1)) return [3 /*break*/, 5];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                    case 4:
                        _e.sent();
                        _e.label = 5;
                    case 5: return [3 /*break*/, 13];
                    case 6:
                        error_1 = _e.sent();
                        console.error("\u274C Failed to write batch ".concat(batchIndex + 1, ":"), error_1);
                        // Fallback to individual writes for this batch
                        console.log("\uD83D\uDD04 Falling back to individual writes for batch ".concat(batchIndex + 1, "..."));
                        _c = 0, batch_1 = batch;
                        _e.label = 7;
                    case 7:
                        if (!(_c < batch_1.length)) return [3 /*break*/, 12];
                        lesson = batch_1[_c];
                        _e.label = 8;
                    case 8:
                        _e.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, this.storeLessonData(lesson)];
                    case 9:
                        _e.sent();
                        return [3 /*break*/, 11];
                    case 10:
                        individualError_1 = _e.sent();
                        console.error("\u274C Failed to write individual lesson:", individualError_1);
                        return [3 /*break*/, 11];
                    case 11:
                        _c++;
                        return [3 /*break*/, 7];
                    case 12: return [3 /*break*/, 13];
                    case 13:
                        _i++;
                        return [3 /*break*/, 1];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get lessons for a specific studio and date
     */
    LessonsService.prototype.getLessonsForStudioAndDate = function (studioCode, date, filters) {
        return __awaiter(this, void 0, void 0, function () {
            var startDateTime, endDateTime, params, filterExpressions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startDateTime = "".concat(date, "T00:00:00+09:00");
                        endDateTime = "".concat(date, "T23:59:59+09:00");
                        params = {
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
                            filterExpressions = [];
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
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.QueryCommand(params))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, (result.Items || [])];
                }
            });
        });
    };
    /**
     * Get lessons for a specific studio across multiple dates
     */
    LessonsService.prototype.getLessonsForStudioAndDateRange = function (studioCode, startDate, endDate, filters) {
        return __awaiter(this, void 0, void 0, function () {
            var startDateTime, endDateTime, params, filterExpressions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startDateTime = "".concat(startDate, "T00:00:00+09:00");
                        endDateTime = "".concat(endDate, "T23:59:59+09:00");
                        params = {
                            TableName: LESSONS_TABLE_NAME,
                            KeyConditionExpression: 'studioCode = :studioCode AND lessonDateTime BETWEEN :startDateTime AND :endDateTime',
                            ExpressionAttributeValues: {
                                ':studioCode': studioCode,
                                ':startDateTime': startDateTime,
                                ':endDateTime': endDateTime,
                            },
                        };
                        // Add filters (same as single date function)
                        if (filters) {
                            filterExpressions = [];
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
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.QueryCommand(params))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, (result.Items || [])];
                }
            });
        });
    };
    /**
     * Get lessons for all studios on a specific date
     */
    LessonsService.prototype.getLessonsForDate = function (date, filters) {
        return __awaiter(this, void 0, void 0, function () {
            var params, filterExpressions, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = {
                            TableName: LESSONS_TABLE_NAME,
                            IndexName: 'DateStudioIndex',
                            KeyConditionExpression: 'lessonDate = :lessonDate',
                            ExpressionAttributeValues: {
                                ':lessonDate': date,
                            },
                        };
                        // Add filters
                        if (filters) {
                            filterExpressions = [];
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
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.QueryCommand(params))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, (result.Items || [])];
                }
            });
        });
    };
    /**
     * Get available lessons (for monitoring)
     */
    LessonsService.prototype.getAvailableLessons = function (limit) {
        return __awaiter(this, void 0, void 0, function () {
            var params, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = {
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
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.QueryCommand(params))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, (result.Items || [])];
                }
            });
        });
    };
    /**
     * Update lesson availability
     */
    LessonsService.prototype.updateLessonAvailability = function (studioCode, lessonDateTime, availableSlots, totalSlots) {
        return __awaiter(this, void 0, void 0, function () {
            var isAvailable;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        isAvailable = availableSlots > 0 ? 'true' : 'false';
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.UpdateCommand({
                                TableName: LESSONS_TABLE_NAME,
                                Key: {
                                    studioCode: studioCode,
                                    lessonDateTime: lessonDateTime,
                                },
                                UpdateExpression: 'SET availableSlots = :availableSlots, isAvailable = :isAvailable, lastUpdated = :lastUpdated',
                                ExpressionAttributeValues: {
                                    ':availableSlots': availableSlots,
                                    ':isAvailable': isAvailable,
                                    ':lastUpdated': new Date().toISOString(),
                                },
                            }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clean up old lesson data
     */
    LessonsService.prototype.cleanupOldLessons = function () {
        return __awaiter(this, void 0, void 0, function () {
            var twoDaysAgo, cutoffDate, result, oldLessons, deletePromises;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        twoDaysAgo = new Date();
                        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                        cutoffDate = twoDaysAgo.toISOString().split('T')[0];
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.ScanCommand({
                                TableName: LESSONS_TABLE_NAME,
                                FilterExpression: 'lessonDate < :cutoffDate',
                                ExpressionAttributeValues: {
                                    ':cutoffDate': cutoffDate,
                                },
                                ProjectionExpression: 'studioCode, lessonDateTime',
                            }))];
                    case 1:
                        result = _a.sent();
                        oldLessons = result.Items || [];
                        deletePromises = oldLessons.map(function (lesson) {
                            return docClient.send(new lib_dynamodb_1.DeleteCommand({
                                TableName: LESSONS_TABLE_NAME,
                                Key: {
                                    studioCode: lesson.studioCode,
                                    lessonDateTime: lesson.lessonDateTime,
                                },
                            }));
                        });
                        return [4 /*yield*/, Promise.all(deletePromises)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, { deletedCount: oldLessons.length }];
                }
            });
        });
    };
    /**
     * Create sample lesson data (for testing without scraping)
     */
    LessonsService.prototype.createSampleLessons = function (studioCode, date) {
        return __awaiter(this, void 0, void 0, function () {
            var sampleLessons;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sampleLessons = [
                            {
                                studioCode: studioCode,
                                lessonDateTime: "".concat(date, "T07:00:00+09:00"),
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
                                studioCode: studioCode,
                                lessonDateTime: "".concat(date, "T10:30:00+09:00"),
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
                                studioCode: studioCode,
                                lessonDateTime: "".concat(date, "T12:00:00+09:00"),
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
                                studioCode: studioCode,
                                lessonDateTime: "".concat(date, "T19:30:00+09:00"),
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
                                studioCode: studioCode,
                                lessonDateTime: "".concat(date, "T21:00:00+09:00"),
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
                        return [4 /*yield*/, this.storeLessonsData(sampleLessons)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, sampleLessons];
                }
            });
        });
    };
    /**
     * Execute real scraping and store data
     */
    LessonsService.prototype.executeRealScraping = function (studioCode, date) {
        return __awaiter(this, void 0, void 0, function () {
            var RealFeelcycleScraper, lessons, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\uD83D\uDEB4\u200D\u2640\uFE0F Starting real scraping for ".concat(studioCode, " on ").concat(date));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        return [4 /*yield*/, Promise.resolve().then(function () { return require('./real-scraper'); })];
                    case 2:
                        RealFeelcycleScraper = (_a.sent()).RealFeelcycleScraper;
                        lessons = [];
                        if (!(studioCode === 'all')) return [3 /*break*/, 4];
                        // All studios scraping
                        console.log('🌏 Scraping ALL studios...');
                        return [4 /*yield*/, RealFeelcycleScraper.searchAllStudiosRealLessons(date)];
                    case 3:
                        lessons = _a.sent();
                        console.log("\u2705 Found ".concat(lessons.length, " real lessons from ALL studios"));
                        return [3 /*break*/, 6];
                    case 4:
                        // Single studio scraping
                        console.log("\uD83C\uDFE2 Scraping studio: ".concat(studioCode));
                        return [4 /*yield*/, RealFeelcycleScraper.searchRealLessons(studioCode, date)];
                    case 5:
                        lessons = _a.sent();
                        console.log("\u2705 Found ".concat(lessons.length, " real lessons from ").concat(studioCode));
                        _a.label = 6;
                    case 6:
                        if (!(lessons.length > 0)) return [3 /*break*/, 8];
                        // Store lessons in DynamoDB
                        return [4 /*yield*/, this.storeLessonsData(lessons)];
                    case 7:
                        // Store lessons in DynamoDB
                        _a.sent();
                        console.log("\uD83D\uDCBE Stored ".concat(lessons.length, " lessons in DynamoDB"));
                        _a.label = 8;
                    case 8: return [2 /*return*/, lessons];
                    case 9:
                        error_2 = _a.sent();
                        console.error('Real scraping failed:', error_2);
                        throw error_2;
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Clear all lessons from the table
     */
    LessonsService.prototype.clearAllLessons = function () {
        return __awaiter(this, void 0, void 0, function () {
            var scanResult, items, deletePromises, batchSize, deletedCount, i, batch;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('🗑️  全レッスンデータのクリア開始...');
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.ScanCommand({
                                TableName: LESSONS_TABLE_NAME,
                                ProjectionExpression: 'studioCode, lessonDateTime'
                            }))];
                    case 1:
                        scanResult = _a.sent();
                        items = scanResult.Items || [];
                        console.log("\u524A\u9664\u5BFE\u8C61: ".concat(items.length, "\u4EF6"));
                        if (items.length === 0) {
                            console.log('削除対象のデータがありません');
                            return [2 /*return*/, { deletedCount: 0 }];
                        }
                        deletePromises = items.map(function (item) {
                            return docClient.send(new lib_dynamodb_1.DeleteCommand({
                                TableName: LESSONS_TABLE_NAME,
                                Key: {
                                    studioCode: item.studioCode,
                                    lessonDateTime: item.lessonDateTime
                                }
                            }));
                        });
                        batchSize = 25;
                        deletedCount = 0;
                        i = 0;
                        _a.label = 2;
                    case 2:
                        if (!(i < deletePromises.length)) return [3 /*break*/, 5];
                        batch = deletePromises.slice(i, i + batchSize);
                        return [4 /*yield*/, Promise.all(batch)];
                    case 3:
                        _a.sent();
                        deletedCount += batch.length;
                        console.log("\u9032\u6357: ".concat(deletedCount, "/").concat(items.length, " \u524A\u9664\u5B8C\u4E86"));
                        _a.label = 4;
                    case 4:
                        i += batchSize;
                        return [3 /*break*/, 2];
                    case 5:
                        console.log("\u2705 \u5168".concat(deletedCount, "\u4EF6\u306E\u30EC\u30C3\u30B9\u30F3\u30C7\u30FC\u30BF\u3092\u524A\u9664\u3057\u307E\u3057\u305F"));
                        return [2 /*return*/, { deletedCount: deletedCount }];
                }
            });
        });
    };
    return LessonsService;
}());
exports.LessonsService = LessonsService;
exports.lessonsService = new LessonsService();
