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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealFeelcycleScraper = void 0;
var puppeteer_core_1 = require("puppeteer-core");
var chromium = require('@sparticuz/chromium').default;
var dateUtils_1 = require("../utils/dateUtils");
var RealFeelcycleScraper = /** @class */ (function () {
    function RealFeelcycleScraper() {
    }
    /**
     * Initialize browser instance
     */
    RealFeelcycleScraper.initBrowser = function () {
        return __awaiter(this, void 0, void 0, function () {
            var executablePath, _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this.browser) return [3 /*break*/, 5];
                        console.log('🌐 Initializing browser for Lambda environment...');
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, chromium.executablePath()];
                    case 2:
                        executablePath = _b.sent();
                        console.log('📍 Chromium executable path:', executablePath);
                        // Lambda-optimized browser configuration
                        _a = this;
                        return [4 /*yield*/, puppeteer_core_1.default.launch({
                                args: __spreadArray(__spreadArray([], chromium.args, true), [
                                    '--no-sandbox',
                                    '--disable-setuid-sandbox',
                                    '--disable-dev-shm-usage',
                                    '--disable-accelerated-2d-canvas',
                                    '--no-first-run',
                                    '--no-zygote',
                                    '--single-process',
                                    '--disable-gpu',
                                    '--disable-extensions',
                                    '--disable-background-timer-throttling',
                                    '--disable-backgrounding-occluded-windows',
                                    '--disable-renderer-backgrounding',
                                    '--disable-features=VizDisplayCompositor',
                                    '--disable-ipc-flooding-protection',
                                    '--disable-dev-tools',
                                    '--disable-default-apps',
                                    '--disable-hang-monitor',
                                    '--disable-popup-blocking',
                                    '--disable-prompt-on-repost',
                                    '--disable-sync',
                                    '--disable-web-security',
                                    '--enable-automation',
                                    '--password-store=basic',
                                    '--use-mock-keychain',
                                    '--hide-crash-restore-bubble'
                                ], false),
                                defaultViewport: { width: 1280, height: 720 },
                                executablePath: executablePath,
                                headless: true,
                                timeout: 60000,
                                // Add protocol timeout to prevent Target.setDiscoverTargets error
                                protocolTimeout: 60000,
                                // Disable pipe for Lambda environment stability
                                pipe: false
                            })];
                    case 3:
                        // Lambda-optimized browser configuration
                        _a.browser = _b.sent();
                        console.log('✅ Browser initialized successfully');
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _b.sent();
                        console.error('❌ Browser initialization failed:', error_1);
                        throw new Error("Browser initialization failed: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error'));
                    case 5: return [2 /*return*/, this.browser];
                }
            });
        });
    };
    /**
     * Get all available studios from FEELCYCLE reservation website
     */
    RealFeelcycleScraper.getRealStudios = function () {
        return __awaiter(this, void 0, void 0, function () {
            var browser, page, studios, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initBrowser()];
                    case 1:
                        browser = _a.sent();
                        return [4 /*yield*/, browser.newPage()];
                    case 2:
                        page = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 9, 10, 12]);
                        console.log('Fetching real studio data from FEELCYCLE reservation site...');
                        return [4 /*yield*/, page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, page.goto('https://m.feelcycle.com/reserve', {
                                waitUntil: 'domcontentloaded',
                                timeout: 60000
                            })];
                    case 5:
                        _a.sent();
                        // Wait for the studio list to load
                        return [4 /*yield*/, page.waitForSelector('li.address_item.handle', { timeout: 30000 })];
                    case 6:
                        // Wait for the studio list to load
                        _a.sent();
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, page.evaluate(function () {
                                var studioElements = document.querySelectorAll('li.address_item.handle');
                                var studios = [];
                                studioElements.forEach(function (element) {
                                    var _a, _b;
                                    var nameElement = element.querySelector('.main');
                                    var codeElement = element.querySelector('.sub');
                                    if (nameElement && codeElement) {
                                        var name_1 = (_a = nameElement.textContent) === null || _a === void 0 ? void 0 : _a.trim();
                                        var codeText = (_b = codeElement.textContent) === null || _b === void 0 ? void 0 : _b.trim();
                                        if (name_1 && codeText) {
                                            // Extract code from (CODE) format
                                            var codeMatch = codeText.match(/\(([^)]+)\)/);
                                            if (codeMatch) {
                                                var code = codeMatch[1].toLowerCase();
                                                studios.push({
                                                    code: code,
                                                    name: name_1,
                                                    region: 'unknown' // Will be determined by location
                                                });
                                            }
                                        }
                                    }
                                });
                                return studios;
                            })];
                    case 8:
                        studios = _a.sent();
                        console.log("Found ".concat(studios.length, " studios from reservation site"));
                        return [2 /*return*/, studios];
                    case 9:
                        error_2 = _a.sent();
                        console.error('Error fetching studios from reservation site:', error_2);
                        throw error_2;
                    case 10: return [4 /*yield*/, page.close()];
                    case 11:
                        _a.sent();
                        return [7 /*endfinally*/];
                    case 12: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get all lessons for a specific studio (all dates at once)
     */
    RealFeelcycleScraper.searchAllLessons = function (studioCode) {
        return __awaiter(this, void 0, void 0, function () {
            var retryCount, maxRetries, _loop_1, this_1, state_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        retryCount = 0;
                        maxRetries = 2;
                        _loop_1 = function () {
                            var browser, page, studioSelected, allLessonsData, dateMapping, allLessons, lessonData, error_3, closeError_1, waitTime_1;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        browser = null;
                                        page = null;
                                        _b.label = 1;
                                    case 1:
                                        _b.trys.push([1, 16, , 22]);
                                        console.log("\uD83D\uDD04 Attempt ".concat(retryCount + 1, "/").concat(maxRetries + 1, ": Fetching all lesson data for ").concat(studioCode, " (all dates at once)..."));
                                        if (!(retryCount > 0)) return [3 /*break*/, 3];
                                        console.log('🔄 Retry detected, reinitializing browser...');
                                        return [4 /*yield*/, this_1.cleanup()];
                                    case 2:
                                        _b.sent();
                                        _b.label = 3;
                                    case 3: return [4 /*yield*/, this_1.initBrowser()];
                                    case 4:
                                        browser = _b.sent();
                                        return [4 /*yield*/, browser.newPage()];
                                    case 5:
                                        page = _b.sent();
                                        // Set page configuration
                                        return [4 /*yield*/, page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')];
                                    case 6:
                                        // Set page configuration
                                        _b.sent();
                                        return [4 /*yield*/, page.setDefaultTimeout(30000)];
                                    case 7:
                                        _b.sent();
                                        return [4 /*yield*/, page.setDefaultNavigationTimeout(30000)];
                                    case 8:
                                        _b.sent();
                                        // Step 1: Go to reservation site
                                        return [4 /*yield*/, page.goto('https://m.feelcycle.com/reserve', {
                                                waitUntil: 'networkidle2',
                                                timeout: 60000
                                            })];
                                    case 9:
                                        // Step 1: Go to reservation site
                                        _b.sent();
                                        // Wait for studio list to load
                                        return [4 /*yield*/, page.waitForSelector('li.address_item.handle', { timeout: 30000 })];
                                    case 10:
                                        // Wait for studio list to load
                                        _b.sent();
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                                    case 11:
                                        _b.sent();
                                        // Step 2: Select studio (click on the matching studio)
                                        console.log("Selecting studio ".concat(studioCode, "..."));
                                        return [4 /*yield*/, page.evaluate(function (targetCode) {
                                                var _a;
                                                var studioElements = document.querySelectorAll('li.address_item.handle');
                                                for (var _i = 0, studioElements_1 = studioElements; _i < studioElements_1.length; _i++) {
                                                    var element = studioElements_1[_i];
                                                    var codeElement = element.querySelector('.sub');
                                                    if (codeElement) {
                                                        var codeText = (_a = codeElement.textContent) === null || _a === void 0 ? void 0 : _a.trim();
                                                        if (codeText) {
                                                            var codeMatch = codeText.match(/\(([^)]+)\)/);
                                                            if (codeMatch && codeMatch[1].toLowerCase() === targetCode) {
                                                                element.click();
                                                                return true;
                                                            }
                                                        }
                                                    }
                                                }
                                                return false;
                                            }, studioCode)];
                                    case 12:
                                        studioSelected = _b.sent();
                                        if (!studioSelected) {
                                            throw new Error("Studio ".concat(studioCode, " not found"));
                                        }
                                        // Wait for schedule to load
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 6000); })];
                                    case 13:
                                        // Wait for schedule to load
                                        _b.sent();
                                        return [4 /*yield*/, page.waitForSelector('.header-sc-list .content .days', { timeout: 30000 })];
                                    case 14:
                                        _b.sent();
                                        // Step 3: Get all lessons for all dates at once
                                        console.log("Extracting all lessons for all dates...");
                                        return [4 /*yield*/, page.evaluate(function () {
                                                // 1. Get date mapping for all available dates
                                                var dateElements = document.querySelectorAll('.header-sc-list .content .days');
                                                var dateMapping = Array.from(dateElements).map(function (el, index) {
                                                    var _a;
                                                    return ({
                                                        index: index,
                                                        text: ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''
                                                    });
                                                });
                                                // 2. Get the main lesson container
                                                var scList = document.querySelector('.sc_list.active');
                                                if (!scList) {
                                                    return { dateMapping: dateMapping, allLessons: [] };
                                                }
                                                var contentElements = scList.querySelectorAll(':scope > .content');
                                                var allLessons = [];
                                                // 3. Extract lessons from each date column
                                                contentElements.forEach(function (column, columnIndex) {
                                                    var dateInfo = dateMapping[columnIndex];
                                                    if (!dateInfo)
                                                        return;
                                                    // Parse date text to get actual date
                                                    var dateText = dateInfo.text;
                                                    var actualDate = '';
                                                    // Parse different date formats like "7/18(金)", "7/19(土)" etc.
                                                    var dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})/);
                                                    if (dateMatch) {
                                                        var month = parseInt(dateMatch[1]);
                                                        var day = parseInt(dateMatch[2]);
                                                        // Get current year - assume same year
                                                        var currentYear = new Date().getFullYear();
                                                        actualDate = "".concat(currentYear, "-").concat(String(month).padStart(2, '0'), "-").concat(String(day).padStart(2, '0'));
                                                    }
                                                    var lessonElements = column.querySelectorAll('.lesson.overflow_hidden');
                                                    lessonElements.forEach(function (element) {
                                                        var _a, _b, _c, _d;
                                                        var timeElement = element.querySelector('.time');
                                                        var nameElement = element.querySelector('.lesson_name');
                                                        var instructorElement = element.querySelector('.instructor');
                                                        var statusElement = element.querySelector('.status');
                                                        if (timeElement && nameElement && instructorElement) {
                                                            var timeText = (_a = timeElement.textContent) === null || _a === void 0 ? void 0 : _a.trim();
                                                            var nameText = (_b = nameElement.textContent) === null || _b === void 0 ? void 0 : _b.trim();
                                                            var instructorText = (_c = instructorElement.textContent) === null || _c === void 0 ? void 0 : _c.trim();
                                                            var statusText = (_d = statusElement === null || statusElement === void 0 ? void 0 : statusElement.textContent) === null || _d === void 0 ? void 0 : _d.trim();
                                                            // Extract start and end time
                                                            var timeMatch = timeText === null || timeText === void 0 ? void 0 : timeText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
                                                            if (timeMatch && nameText && instructorText && actualDate) {
                                                                var startTime = timeMatch[1];
                                                                var endTime = timeMatch[2];
                                                                // Check availability
                                                                var isAvailable = !element.classList.contains('seat-disabled');
                                                                // Extract program type from lesson name
                                                                var programMatch = nameText.match(/^(BSL|BB1|BB2|BB3|BSB|BSW|BSWi)/);
                                                                var program = programMatch ? programMatch[1] : 'OTHER';
                                                                allLessons.push({
                                                                    date: actualDate,
                                                                    startTime: startTime,
                                                                    endTime: endTime,
                                                                    lessonName: nameText,
                                                                    instructor: instructorText,
                                                                    isAvailable: isAvailable,
                                                                    program: program,
                                                                    statusText: statusText || null,
                                                                    dateText: dateText,
                                                                    columnIndex: columnIndex
                                                                });
                                                            }
                                                        }
                                                    });
                                                });
                                                return { dateMapping: dateMapping, allLessons: allLessons };
                                            })];
                                    case 15:
                                        allLessonsData = _b.sent();
                                        dateMapping = allLessonsData.dateMapping, allLessons = allLessonsData.allLessons;
                                        console.log("Found ".concat(allLessons.length, " total lessons for ").concat(studioCode, " across ").concat(dateMapping.length, " dates"));
                                        lessonData = allLessons.map(function (lesson) { return ({
                                            studioCode: studioCode,
                                            lessonDateTime: "".concat(lesson.date, "T").concat(lesson.startTime, ":00+09:00"),
                                            lessonDate: lesson.date,
                                            startTime: lesson.startTime,
                                            endTime: lesson.endTime,
                                            lessonName: lesson.lessonName,
                                            instructor: lesson.instructor,
                                            availableSlots: lesson.statusText ? _this.extractAvailableSlots(lesson.statusText) : null,
                                            totalSlots: null,
                                            isAvailable: lesson.isAvailable ? 'true' : 'false',
                                            program: lesson.program,
                                            lastUpdated: (0, dateUtils_1.getJSTISOString)(),
                                            ttl: (0, dateUtils_1.getTTLFromJST)(7), // 7 days from JST
                                        }); });
                                        console.log("\u2705 Successfully fetched ".concat(lessonData.length, " lessons for ").concat(studioCode));
                                        return [2 /*return*/, { value: lessonData }];
                                    case 16:
                                        error_3 = _b.sent();
                                        console.error("\u274C Attempt ".concat(retryCount + 1, " failed for ").concat(studioCode, ":"), error_3);
                                        if (!page) return [3 /*break*/, 20];
                                        _b.label = 17;
                                    case 17:
                                        _b.trys.push([17, 19, , 20]);
                                        return [4 /*yield*/, page.close()];
                                    case 18:
                                        _b.sent();
                                        return [3 /*break*/, 20];
                                    case 19:
                                        closeError_1 = _b.sent();
                                        console.error('Error closing page:', closeError_1);
                                        return [3 /*break*/, 20];
                                    case 20:
                                        retryCount++;
                                        if (retryCount > maxRetries) {
                                            console.error("\u274C All ".concat(maxRetries + 1, " attempts failed for ").concat(studioCode));
                                            throw new Error("Failed to fetch lessons for ".concat(studioCode, " after ").concat(maxRetries + 1, " attempts: ").concat(error_3 instanceof Error ? error_3.message : 'Unknown error'));
                                        }
                                        waitTime_1 = retryCount * 2000;
                                        console.log("\u23F3 Waiting ".concat(waitTime_1, "ms before retry..."));
                                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, waitTime_1); })];
                                    case 21:
                                        _b.sent();
                                        return [3 /*break*/, 22];
                                    case 22: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 1;
                    case 1:
                        if (!(retryCount <= maxRetries)) return [3 /*break*/, 3];
                        return [5 /*yield**/, _loop_1()];
                    case 2:
                        state_1 = _a.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        return [3 /*break*/, 1];
                    case 3: 
                    // This should never be reached due to the throw in the catch block
                    throw new Error("Failed to fetch lessons for ".concat(studioCode, " after retries"));
                }
            });
        });
    };
    /**
     * Search for lesson data for a specific studio and date (compatibility method)
     * This method now uses the optimized approach - gets all lessons and filters by date
     */
    RealFeelcycleScraper.searchRealLessons = function (studioCode, date) {
        return __awaiter(this, void 0, void 0, function () {
            var allLessons, filteredLessons;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Fetching lessons for ".concat(studioCode, " on ").concat(date, " using optimized approach..."));
                        return [4 /*yield*/, this.searchAllLessons(studioCode)];
                    case 1:
                        allLessons = _a.sent();
                        filteredLessons = allLessons.filter(function (lesson) { return lesson.lessonDate === date; });
                        console.log("Found ".concat(filteredLessons.length, " lessons for ").concat(studioCode, " on ").concat(date, " (from ").concat(allLessons.length, " total)"));
                        return [2 /*return*/, filteredLessons];
                }
            });
        });
    };
    /**
     * Search for lessons from all studios for a specific date
     */
    RealFeelcycleScraper.searchAllStudiosRealLessons = function (date) {
        return __awaiter(this, void 0, void 0, function () {
            var studios, allLessons_1, batchSize, i, batch, batchPromises, batchResults, error_4;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("\uD83C\uDF0F Fetching lessons from ALL studios for ".concat(date, "..."));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 8, , 9]);
                        return [4 /*yield*/, this.getRealStudios()];
                    case 2:
                        studios = _a.sent();
                        console.log("Found ".concat(studios.length, " studios to scrape"));
                        allLessons_1 = [];
                        batchSize = 5;
                        i = 0;
                        _a.label = 3;
                    case 3:
                        if (!(i < studios.length)) return [3 /*break*/, 7];
                        batch = studios.slice(i, i + batchSize);
                        console.log("Processing studio batch ".concat(Math.floor(i / batchSize) + 1, "/").concat(Math.ceil(studios.length / batchSize), "..."));
                        batchPromises = batch.map(function (studio) { return __awaiter(_this, void 0, void 0, function () {
                            var lessons, error_5;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, this.searchRealLessons(studio.code, date)];
                                    case 1:
                                        lessons = _a.sent();
                                        console.log("".concat(studio.name, "(").concat(studio.code, "): ").concat(lessons.length, " lessons"));
                                        return [2 /*return*/, lessons];
                                    case 2:
                                        error_5 = _a.sent();
                                        console.error("Error scraping ".concat(studio.name, "(").concat(studio.code, "):"), error_5);
                                        return [2 /*return*/, []];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [4 /*yield*/, Promise.all(batchPromises)];
                    case 4:
                        batchResults = _a.sent();
                        batchResults.forEach(function (lessons) { return allLessons_1.push.apply(allLessons_1, lessons); });
                        if (!(i + batchSize < studios.length)) return [3 /*break*/, 6];
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6:
                        i += batchSize;
                        return [3 /*break*/, 3];
                    case 7:
                        console.log("\u2705 Total lessons found across all studios: ".concat(allLessons_1.length));
                        return [2 /*return*/, allLessons_1];
                    case 8:
                        error_4 = _a.sent();
                        console.error('Error in searchAllStudiosRealLessons:', error_4);
                        throw error_4;
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Extract available slots from status text
     */
    RealFeelcycleScraper.extractAvailableSlots = function (statusText) {
        var match = statusText.match(/残り(\d+)人/);
        return match ? parseInt(match[1]) : 5;
    };
    /**
     * Cleanup browser resources and force garbage collection
     */
    RealFeelcycleScraper.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pages, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.browser) return [3 /*break*/, 8];
                        console.log('🧹 Cleaning up browser resources...');
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, 6, 7]);
                        return [4 /*yield*/, this.browser.pages()];
                    case 2:
                        pages = _a.sent();
                        return [4 /*yield*/, Promise.all(pages.map(function (page) { return page.close().catch(function (e) { return console.log('Page close error:', e); }); }))];
                    case 3:
                        _a.sent();
                        // Close browser
                        return [4 /*yield*/, this.browser.close()];
                    case 4:
                        // Close browser
                        _a.sent();
                        console.log('✅ Browser closed successfully');
                        return [3 /*break*/, 7];
                    case 5:
                        error_6 = _a.sent();
                        console.error('⚠️  Error during browser cleanup:', error_6);
                        // Force process termination if browser is unresponsive
                        try {
                            if (this.browser && this.browser.process) {
                                this.browser.process().kill('SIGKILL');
                            }
                        }
                        catch (killError) {
                            console.error('Error killing browser process:', killError);
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        this.browser = null;
                        return [7 /*endfinally*/];
                    case 7:
                        // Force garbage collection if available
                        if (typeof global !== 'undefined' && global.gc) {
                            console.log('🗑️  Running garbage collection...');
                            global.gc();
                        }
                        _a.label = 8;
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    RealFeelcycleScraper.browser = null;
    return RealFeelcycleScraper;
}());
exports.RealFeelcycleScraper = RealFeelcycleScraper;
