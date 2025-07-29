"use strict";
/**
 * メンテナンス後の手動スクレイピング実行スクリプト
 * 4:00以降にメンテナンスが終了したら実行する
 */
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
exports.executeManualScraping = executeManualScraping;
var real_scraper_1 = require("./src/services/real-scraper");
var lessons_service_1 = require("./src/services/lessons-service");
var studios_service_1 = require("./src/services/studios-service");
var dateUtils_1 = require("./src/utils/dateUtils");
function executeManualScraping() {
    return __awaiter(this, void 0, void 0, function () {
        var lessonService, startTime, testLessons, clearResult, studios, studioUpdateResult, totalLessons, processedStudios, failedStudios, _i, studios_1, studio, studioStartTime, allLessons, studioEndTime, studioDuration, lessonsByDate, error_1, endTime, totalDuration, today, todayLessons, nextWeek, nextWeekDate, nextWeekLessons, error_2, totalTime;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🚀 メンテナンス後の手動スクレイピング開始');
                    (0, dateUtils_1.logJSTInfo)('Manual Scraping Start');
                    lessonService = new lessons_service_1.LessonsService();
                    startTime = Date.now();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 18, 19, 21]);
                    // Step 1: メンテナンス状況確認
                    console.log('\n📍 Step 1: メンテナンス終了確認...');
                    // まず1つのスタジオで動作テスト
                    console.log('🧪 銀座スタジオで動作テスト...');
                    return [4 /*yield*/, real_scraper_1.RealFeelcycleScraper.searchAllLessons('gnz')];
                case 2:
                    testLessons = _a.sent();
                    console.log("\u2705 \u30C6\u30B9\u30C8\u6210\u529F: ".concat(testLessons.length, "\u4EF6\u306E\u30EC\u30C3\u30B9\u30F3\u30C7\u30FC\u30BF\u53D6\u5F97"));
                    if (testLessons.length === 0) {
                        throw new Error('まだメンテナンス中の可能性があります');
                    }
                    // Step 2: 全データクリア & スタジオ情報更新
                    console.log('\n📍 Step 2: 既存データクリア...');
                    return [4 /*yield*/, lessonService.clearAllLessons()];
                case 3:
                    clearResult = _a.sent();
                    console.log("\u2705 ".concat(clearResult.deletedCount, "\u4EF6\u306E\u30C7\u30FC\u30BF\u3092\u524A\u9664"));
                    console.log('📍 Step 2.1: スタジオ情報更新...');
                    return [4 /*yield*/, real_scraper_1.RealFeelcycleScraper.getRealStudios()];
                case 4:
                    studios = _a.sent();
                    return [4 /*yield*/, studios_service_1.studiosService.refreshStudiosFromScraping(studios)];
                case 5:
                    studioUpdateResult = _a.sent();
                    console.log("\u2705 \u30B9\u30BF\u30B8\u30AA\u66F4\u65B0: ".concat(studioUpdateResult.created, "\u4F5C\u6210, ").concat(studioUpdateResult.updated, "\u66F4\u65B0"));
                    // Step 3: 全スタジオのスクレイピング実行
                    console.log('\n📍 Step 3: 全スタジオのレッスンデータ取得開始...');
                    console.log("\u5BFE\u8C61\u30B9\u30BF\u30B8\u30AA\u6570: ".concat(studios.length));
                    totalLessons = 0;
                    processedStudios = 0;
                    failedStudios = 0;
                    _i = 0, studios_1 = studios;
                    _a.label = 6;
                case 6:
                    if (!(_i < studios_1.length)) return [3 /*break*/, 15];
                    studio = studios_1[_i];
                    console.log("\n\uD83C\uDFE2 ".concat(studio.name, " (").concat(studio.code, ") \u51E6\u7406\u4E2D..."));
                    _a.label = 7;
                case 7:
                    _a.trys.push([7, 13, , 14]);
                    studioStartTime = Date.now();
                    return [4 /*yield*/, real_scraper_1.RealFeelcycleScraper.searchAllLessons(studio.code)];
                case 8:
                    allLessons = _a.sent();
                    if (!(allLessons.length > 0)) return [3 /*break*/, 10];
                    return [4 /*yield*/, lessonService.storeLessonsData(allLessons)];
                case 9:
                    _a.sent();
                    studioEndTime = Date.now();
                    studioDuration = (studioEndTime - studioStartTime) / 1000;
                    lessonsByDate = allLessons.reduce(function (acc, lesson) {
                        acc[lesson.lessonDate] = (acc[lesson.lessonDate] || 0) + 1;
                        return acc;
                    }, {});
                    console.log("\u2705 ".concat(studio.name, ": ").concat(allLessons.length, "\u4EF6\u4FDD\u5B58 (").concat(studioDuration.toFixed(1), "s)"));
                    console.log("   \u65E5\u4ED8\u6570: ".concat(Object.keys(lessonsByDate).length));
                    console.log("   \u7BC4\u56F2: ".concat(Object.keys(lessonsByDate).sort()[0], " \uFF5E ").concat(Object.keys(lessonsByDate).sort().pop()));
                    totalLessons += allLessons.length;
                    processedStudios++;
                    return [3 /*break*/, 11];
                case 10:
                    console.log("\u26A0\uFE0F ".concat(studio.name, ": \u30C7\u30FC\u30BF\u306A\u3057"));
                    processedStudios++;
                    _a.label = 11;
                case 11: 
                // 負荷軽減のため1秒待機
                return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 12:
                    // 負荷軽減のため1秒待機
                    _a.sent();
                    return [3 /*break*/, 14];
                case 13:
                    error_1 = _a.sent();
                    console.error("\u274C ".concat(studio.name, " \u30A8\u30E9\u30FC:"), error_1);
                    failedStudios++;
                    return [3 /*break*/, 14];
                case 14:
                    _i++;
                    return [3 /*break*/, 6];
                case 15:
                    endTime = Date.now();
                    totalDuration = (endTime - startTime) / 1000;
                    console.log('\n🎉 手動スクレイピング完了！');
                    (0, dateUtils_1.logJSTInfo)('Manual Scraping Completed');
                    console.log("\n\uD83D\uDCCA \u5B9F\u884C\u7D50\u679C:");
                    console.log("\u2022 \u5B9F\u884C\u6642\u9593: ".concat((totalDuration / 60).toFixed(1), "\u5206"));
                    console.log("\u2022 \u5BFE\u8C61\u30B9\u30BF\u30B8\u30AA: ".concat(studios.length, "\u4EF6"));
                    console.log("\u2022 \u6210\u529F: ".concat(processedStudios, "\u4EF6"));
                    console.log("\u2022 \u5931\u6557: ".concat(failedStudios, "\u4EF6"));
                    console.log("\u2022 \u53D6\u5F97\u30EC\u30C3\u30B9\u30F3\u7DCF\u6570: ".concat(totalLessons, "\u4EF6"));
                    // Step 5: 動作確認
                    console.log('\n📍 Step 5: 動作確認...');
                    today = new Date().toISOString().split('T')[0];
                    return [4 /*yield*/, lessonService.getLessonsForStudioAndDate('gnz', today, {})];
                case 16:
                    todayLessons = _a.sent();
                    console.log("\u2705 \u4ECA\u65E5(".concat(today, ")\u306E\u9280\u5EA7\u30EC\u30C3\u30B9\u30F3: ").concat(todayLessons.length, "\u4EF6"));
                    nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    nextWeekDate = nextWeek.toISOString().split('T')[0];
                    return [4 /*yield*/, lessonService.getLessonsForStudioAndDate('gnz', nextWeekDate, {})];
                case 17:
                    nextWeekLessons = _a.sent();
                    console.log("\u2705 1\u9031\u9593\u5F8C(".concat(nextWeekDate, ")\u306E\u9280\u5EA7\u30EC\u30C3\u30B9\u30F3: ").concat(nextWeekLessons.length, "\u4EF6"));
                    if (nextWeekLessons.length > 0) {
                        console.log('🎊 SUCCESS: 未来のレッスンデータが正常に取得されています！');
                    }
                    else {
                        console.log('⚠️ WARNING: 未来のレッスンデータが不足している可能性があります');
                    }
                    return [3 /*break*/, 21];
                case 18:
                    error_2 = _a.sent();
                    console.error('❌ 手動スクレイピング失敗:', error_2);
                    (0, dateUtils_1.logJSTInfo)('Manual Scraping Failed');
                    throw error_2;
                case 19: 
                // クリーンアップ
                return [4 /*yield*/, real_scraper_1.RealFeelcycleScraper.cleanup()];
                case 20:
                    // クリーンアップ
                    _a.sent();
                    totalTime = (Date.now() - startTime) / 1000;
                    console.log("\n\u23F1\uFE0F \u7DCF\u5B9F\u884C\u6642\u9593: ".concat((totalTime / 60).toFixed(1), "\u5206"));
                    return [7 /*endfinally*/];
                case 21: return [2 /*return*/];
            }
        });
    });
}
// 実行
if (require.main === module) {
    executeManualScraping()
        .then(function () {
        console.log('✅ 手動スクレイピング正常終了');
        process.exit(0);
    })
        .catch(function (error) {
        console.error('❌ 手動スクレイピング異常終了:', error);
        process.exit(1);
    });
}
