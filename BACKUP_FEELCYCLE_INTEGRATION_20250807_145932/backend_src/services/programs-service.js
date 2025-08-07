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
exports.ProgramsService = void 0;
var client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
var lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
var client = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
var docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
var PROGRAMS_TABLE_NAME = process.env.PROGRAMS_TABLE_NAME || 'feelcycle-hub-programs-dev';
var ProgramsService = /** @class */ (function () {
    function ProgramsService() {
    }
    /**
     * Store single program data
     */
    ProgramsService.prototype.storeProgramData = function (programData) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, docClient.send(new lib_dynamodb_1.PutCommand({
                            TableName: PROGRAMS_TABLE_NAME,
                            Item: programData,
                        }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Store multiple programs using DynamoDB BatchWrite
     */
    ProgramsService.prototype.storeProgramsData = function (programs) {
        return __awaiter(this, void 0, void 0, function () {
            var BATCH_SIZE, batches, i, batchIndex, batch, putRequests, error_1, _i, batch_1, program, individualError_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (programs.length === 0)
                            return [2 /*return*/];
                        BATCH_SIZE = 25;
                        batches = [];
                        for (i = 0; i < programs.length; i += BATCH_SIZE) {
                            batches.push(programs.slice(i, i + BATCH_SIZE));
                        }
                        console.log("\uD83D\uDCDD Writing ".concat(programs.length, " programs in ").concat(batches.length, " batches..."));
                        batchIndex = 0;
                        _b.label = 1;
                    case 1:
                        if (!(batchIndex < batches.length)) return [3 /*break*/, 12];
                        batch = batches[batchIndex];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 11]);
                        putRequests = batch.map(function (program) { return ({
                            PutRequest: {
                                Item: program
                            }
                        }); });
                        return [4 /*yield*/, docClient.send(new lib_dynamodb_1.BatchWriteCommand({
                                RequestItems: (_a = {},
                                    _a[PROGRAMS_TABLE_NAME] = putRequests,
                                    _a)
                            }))];
                    case 3:
                        _b.sent();
                        console.log("   \u2705 Batch ".concat(batchIndex + 1, "/").concat(batches.length, " completed (").concat(batch.length, " items)"));
                        return [3 /*break*/, 11];
                    case 4:
                        error_1 = _b.sent();
                        console.error("\u274C Failed to write batch ".concat(batchIndex + 1, ":"), error_1);
                        // Fallback to individual writes
                        console.log("\uD83D\uDD04 Falling back to individual writes for batch ".concat(batchIndex + 1, "..."));
                        _i = 0, batch_1 = batch;
                        _b.label = 5;
                    case 5:
                        if (!(_i < batch_1.length)) return [3 /*break*/, 10];
                        program = batch_1[_i];
                        _b.label = 6;
                    case 6:
                        _b.trys.push([6, 8, , 9]);
                        return [4 /*yield*/, this.storeProgramData(program)];
                    case 7:
                        _b.sent();
                        return [3 /*break*/, 9];
                    case 8:
                        individualError_1 = _b.sent();
                        console.error("\u274C Failed to write individual program:", individualError_1);
                        throw individualError_1;
                    case 9:
                        _i++;
                        return [3 /*break*/, 5];
                    case 10: return [3 /*break*/, 11];
                    case 11:
                        batchIndex++;
                        return [3 /*break*/, 1];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all programs
     */
    ProgramsService.prototype.getAllPrograms = function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, docClient.send(new lib_dynamodb_1.ScanCommand({
                            TableName: PROGRAMS_TABLE_NAME,
                        }))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.Items || []];
                }
            });
        });
    };
    /**
     * Get programs by program code
     */
    ProgramsService.prototype.getProgramsByCode = function (programCode) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, docClient.send(new lib_dynamodb_1.QueryCommand({
                            TableName: PROGRAMS_TABLE_NAME,
                            IndexName: 'ProgramCodeIndex', // GSI needed
                            KeyConditionExpression: 'programCode = :programCode',
                            ExpressionAttributeValues: {
                                ':programCode': programCode
                            }
                        }))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.Items || []];
                }
            });
        });
    };
    /**
     * Get program by exact name
     */
    ProgramsService.prototype.getProgramByName = function (programName) {
        return __awaiter(this, void 0, void 0, function () {
            var result, items;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, docClient.send(new lib_dynamodb_1.QueryCommand({
                            TableName: PROGRAMS_TABLE_NAME,
                            KeyConditionExpression: 'programName = :programName',
                            ExpressionAttributeValues: {
                                ':programName': programName
                            }
                        }))];
                    case 1:
                        result = _a.sent();
                        items = result.Items || [];
                        return [2 /*return*/, items.length > 0 ? items[0] : null];
                }
            });
        });
    };
    return ProgramsService;
}());
exports.ProgramsService = ProgramsService;
