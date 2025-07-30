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
var real_scraper_1 = require("./src/services/real-scraper");
function testColorScraping() {
    return __awaiter(this, void 0, void 0, function () {
        var lessons, lessonsWithColors, error_1, cleanupError_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🧪 Testing color scraping functionality...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 8]);
                    // Test with Shibuya studio (usually has good data)
                    console.log('Testing with Shibuya studio...');
                    return [4 /*yield*/, real_scraper_1.RealFeelcycleScraper.searchAllLessons('shibuya')];
                case 2:
                    lessons = _a.sent();
                    console.log("Found ".concat(lessons.length, " lessons"));
                    lessonsWithColors = lessons.filter(function (lesson) {
                        return lesson.backgroundColor || lesson.textColor;
                    });
                    console.log("Lessons with color information: ".concat(lessonsWithColors.length, "/").concat(lessons.length));
                    if (lessonsWithColors.length > 0) {
                        console.log('\n📊 Sample lessons with color data:');
                        lessonsWithColors.slice(0, 5).forEach(function (lesson, index) {
                            console.log("".concat(index + 1, ". ").concat(lesson.lessonName, " (").concat(lesson.program, ")"));
                            console.log("   Background: ".concat(lesson.backgroundColor || 'none'));
                            console.log("   Text Color: ".concat(lesson.textColor || 'none'));
                            console.log("   Date/Time: ".concat(lesson.lessonDate, " ").concat(lesson.startTime));
                            console.log('');
                        });
                    }
                    else {
                        console.log('❌ No color information found in scraped data');
                    }
                    // Test with a smaller sample if too many lessons
                    if (lessons.length > 10) {
                        console.log('\n📝 Sample of first 10 lessons:');
                        lessons.slice(0, 10).forEach(function (lesson, index) {
                            console.log("".concat(index + 1, ". ").concat(lesson.lessonName, " - BG: ").concat(lesson.backgroundColor || 'none', ", Text: ").concat(lesson.textColor || 'none'));
                        });
                    }
                    return [3 /*break*/, 8];
                case 3:
                    error_1 = _a.sent();
                    console.error('❌ Test failed:', error_1);
                    return [3 /*break*/, 8];
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, real_scraper_1.RealFeelcycleScraper.cleanup()];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    cleanupError_1 = _a.sent();
                    console.error('Cleanup error:', cleanupError_1);
                    return [3 /*break*/, 7];
                case 7: return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
// Run the test
testColorScraping().then(function () {
    console.log('🏁 Test completed');
    process.exit(0);
}).catch(function (error) {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
});
