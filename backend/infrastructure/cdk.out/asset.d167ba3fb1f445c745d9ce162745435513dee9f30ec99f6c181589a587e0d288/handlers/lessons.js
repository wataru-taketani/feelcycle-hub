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
exports.handler = handler;
const feelcycle_scraper_1 = require("../services/feelcycle-scraper");
const lessons_service_1 = require("../services/lessons-service");
const studios_service_1 = require("../services/studios-service");
const types_1 = require("../types");
/**
 * Lessons search API handler
 */
async function handler(event) {
    try {
        // Lambda直接呼び出しの場合
        if ('action' in event) {
            return await handleDirectInvocation(event);
        }
        const { httpMethod, path, queryStringParameters } = event;
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,OPTIONS',
        };
        if (httpMethod === 'OPTIONS') {
            return { statusCode: 200, headers, body: '' };
        }
        if (httpMethod === 'GET') {
            if (path === '/studios') {
                return await getStudios();
            }
            else if (path.startsWith('/studios/') && path.endsWith('/dates')) {
                const studioCode = path.split('/')[2];
                return await getStudioDates(studioCode);
            }
            else if (path === '/lessons') {
                return await searchLessons(queryStringParameters || {});
            }
            else if (path === '/lessons/range') {
                return await searchLessonsRange(queryStringParameters || {});
            }
            else if (path === '/lessons/sample-data') {
                return await createSampleData(queryStringParameters || {});
            }
            else if (path === '/lessons/real-scrape') {
                return await executeRealScraping(queryStringParameters || {});
            }
            else if (path === '/studios/real') {
                return await getRealStudios();
            }
        }
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Endpoint not found',
            }),
        };
    }
    catch (error) {
        console.error('Lessons handler error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
            }),
        };
    }
}
/**
 * Get all studios (from actual scraping data)
 */
async function getStudios() {
    try {
        const allStudios = await studios_service_1.studiosService.getAllStudios();
        console.log(`Retrieved ${allStudios.length} studios from DB`);
        // 重複除去（大文字版を優先）
        const studioMap = new Map();
        allStudios.forEach(studio => {
            const key = studio.studioName;
            const existing = studioMap.get(key);
            // 大文字のスタジオコードを優先
            if (!existing || studio.studioCode === studio.studioCode.toUpperCase()) {
                studioMap.set(key, {
                    code: studio.studioCode,
                    name: studio.studioName
                });
            }
        });
        // 公式サイトと同じ地域別グループ化と順番
        const studioGroups = {
            'EAST AREA│関東': [
                { code: 'GKBS', name: '銀座京橋' },
                { code: 'GNZ', name: '銀座' },
                { code: 'GTD', name: '五反田' },
                { code: 'IKB', name: '池袋' },
                { code: 'JYO', name: '自由が丘' },
                { code: 'KCJ', name: '吉祥寺' },
                { code: 'NMG', name: '中目黒' },
                { code: 'MCD', name: '町田' },
                { code: 'TCK', name: '立川' },
                { code: 'SBY', name: '渋谷' },
                { code: 'SDM', name: '汐留' },
                { code: 'SJK', name: '新宿' },
                { code: 'TMC', name: '多摩センター' },
                { code: 'UEN', name: '上野' },
                { code: 'AZN', name: 'あざみ野' },
                { code: 'AZNP', name: 'あざみ野Pilates' },
                { code: 'KOK', name: '上大岡' },
                { code: 'KWS', name: '川崎' },
                { code: 'MKG', name: '武蔵小杉' },
                { code: 'YKH', name: '横浜' },
                { code: 'YSC', name: '横須賀中央' },
                { code: 'KSG', name: '越谷' },
                { code: 'OMY', name: '大宮' },
                { code: 'FNB', name: '船橋' },
                { code: 'KHM', name: '海浜幕張' },
                { code: 'KSW', name: '柏' },
            ],
            'NORTH AREA│北海道': [
                { code: 'SPR', name: '札幌' },
            ],
            'WEST AREA│東海・関西': [
                { code: 'NGY', name: '名古屋' },
                { code: 'SKE', name: '栄' },
                { code: 'GIF', name: '岐阜' },
                { code: 'OKBS', name: '大阪京橋' },
                { code: 'SSB', name: '心斎橋' },
                { code: 'UMDC', name: '梅田茶屋町' },
                { code: 'KTK', name: '京都河原町' },
                { code: 'SMY', name: '三ノ宮' },
            ],
            'SOUTH AREA│中国・四国・九州': [
                { code: 'HSM', name: '広島' },
                { code: 'TKM', name: '高松' },
                { code: 'FTJ', name: '福岡天神' },
            ]
        };
        // 実際にDBに存在するスタジオのみをフィルタリング
        const filteredGroups = {};
        Object.entries(studioGroups).forEach(([groupName, studios]) => {
            const availableStudios = studios.filter(studio => {
                return studioMap.has(studio.name);
            });
            if (availableStudios.length > 0) {
                filteredGroups[groupName] = availableStudios;
            }
        });
        // フラット化したスタジオリストも提供（後方互換性のため）
        const flatStudios = Object.values(filteredGroups).flat();
        console.log(`Processed ${flatStudios.length} unique studios in ${Object.keys(filteredGroups).length} groups`);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                data: {
                    studioGroups: filteredGroups,
                    studios: flatStudios // 後方互換性のため
                },
            }),
        };
    }
    catch (error) {
        console.error('Error getting studios from DB:', error);
        // フォールバック: 旧スタジオリスト
        const fallbackStudios = feelcycle_scraper_1.FeelcycleScraper.getStudios().map(studio => ({
            code: studio.code,
            name: studio.name
        }));
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                data: {
                    studioGroups: {}, // 空のグループ
                    studios: fallbackStudios
                },
            }),
        };
    }
}
/**
 * Get available dates for a specific studio
 */
async function getStudioDates(studioCode) {
    const studioInfo = feelcycle_scraper_1.FeelcycleScraper.getStudioInfo(studioCode);
    if (!studioInfo) {
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Studio not found',
            }),
        };
    }
    try {
        const dates = await feelcycle_scraper_1.FeelcycleScraper.getAvailableDates(studioCode);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                data: {
                    studio: studioInfo,
                    availableDates: dates,
                },
            }),
        };
    }
    catch (error) {
        console.error(`Error getting dates for studio ${studioCode}:`, error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to get studio dates',
            }),
        };
    }
}
/**
 * Search lessons with filters
 */
async function searchLessons(params) {
    console.log('🔍 searchLessons called with params:', JSON.stringify(params));
    // Check if this is a range request
    if (params?.range === 'true' && params?.studioCode) {
        console.log('📊 Detected range request, delegating to searchLessonsRange');
        return await searchLessonsRange(params);
    }
    if (!params?.studioCode || !params?.date) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Missing required parameters: studioCode and date',
            }),
        };
    }
    const { studioCode, date, program, instructor, startTime, endTime } = params;
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD',
            }),
        };
    }
    // Validate studio exists in actual scraping data (no longer use hardcoded list)
    let studioInfo;
    try {
        const allStudios = await studios_service_1.studiosService.getAllStudios();
        const foundStudio = allStudios.find(studio => studio.studioCode === studioCode ||
            studio.studioCode === studioCode.toLowerCase() ||
            studio.studioCode === studioCode.toUpperCase());
        if (foundStudio) {
            studioInfo = {
                code: foundStudio.studioCode,
                name: foundStudio.studioName,
                region: 'unknown' // Not needed but kept for compatibility
            };
        }
        else {
            // Fallback to old validation for compatibility
            studioInfo = feelcycle_scraper_1.FeelcycleScraper.getStudioInfo(studioCode);
        }
    }
    catch (error) {
        console.log('Failed to validate studio from DB, using fallback:', error);
        studioInfo = feelcycle_scraper_1.FeelcycleScraper.getStudioInfo(studioCode);
    }
    if (!studioInfo) {
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Studio not found',
                message: `Studio code "${studioCode}" not found in available studios`,
            }),
        };
    }
    try {
        const filters = {};
        if (program)
            filters.program = program;
        if (instructor)
            filters.instructor = instructor;
        if (startTime && endTime) {
            filters.timeRange = { start: startTime, end: endTime };
        }
        // Try to get real data from database first
        // DynamoDB stores studio codes in lowercase, so normalize the query
        const normalizedStudioCode = (0, types_1.normalizeStudioCode)(studioCode);
        console.log(`Searching for real lesson data: studio=${studioCode} (normalized: ${normalizedStudioCode}), date=${date}`);
        let lessons = await lessons_service_1.lessonsService.getLessonsForStudioAndDate(normalizedStudioCode, date, filters);
        console.log(`Found ${lessons.length} real lessons in database`);
        // If no real data exists, use mock data as fallback
        if (lessons.length === 0) {
            console.log('No real lesson data found, using mock data');
            const mockLessons = await feelcycle_scraper_1.FeelcycleScraper.searchLessons(studioCode, date, filters);
            // Convert mock data format to real data format for consistency
            lessons = mockLessons.map(mockLesson => ({
                studioCode: mockLesson.studio,
                lessonDateTime: `${mockLesson.date}T${mockLesson.time}:00+09:00`,
                lessonDate: mockLesson.date,
                startTime: mockLesson.time,
                endTime: calculateEndTime(mockLesson.time),
                lessonName: mockLesson.program,
                instructor: mockLesson.instructor,
                availableSlots: mockLesson.availableSlots,
                totalSlots: mockLesson.totalSlots,
                isAvailable: mockLesson.isAvailable ? 'true' : 'false',
                program: mockLesson.program.split(' ')[0], // Extract program type
                lastUpdated: new Date().toISOString(),
                ttl: Math.floor((new Date().getTime() + 86400000) / 1000),
            }));
        }
        else {
            console.log('Using real lesson data from database');
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                data: {
                    studio: studioInfo,
                    date,
                    lessons,
                    total: lessons.length,
                    available: lessons.filter(l => l.isAvailable === 'true').length,
                },
            }),
        };
    }
    catch (error) {
        console.error(`Error searching lessons:`, error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to search lessons',
            }),
        };
    }
}
/**
 * Search lessons across multiple dates for a studio
 */
async function searchLessonsRange(params) {
    console.log('🔍 searchLessonsRange called with params:', JSON.stringify(params));
    if (!params?.studioCode) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Missing required parameter: studioCode',
            }),
        };
    }
    const { studioCode, startDate, endDate, program, instructor, startTime, endTime } = params;
    // Default to 7 days if no date range specified
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = endDate || (() => {
        const date = new Date();
        date.setDate(date.getDate() + 6);
        return date.toISOString().split('T')[0];
    })();
    // Validate studio exists
    const normalizedStudioCode = (0, types_1.normalizeStudioCode)(studioCode);
    let studioInfo;
    try {
        const allStudios = await studios_service_1.studiosService.getAllStudios();
        const foundStudio = allStudios.find(studio => studio.studioCode === normalizedStudioCode);
        if (foundStudio) {
            studioInfo = {
                code: foundStudio.studioCode,
                name: foundStudio.studioName,
                region: 'unknown'
            };
        }
        else {
            studioInfo = feelcycle_scraper_1.FeelcycleScraper.getStudioInfo(studioCode);
        }
    }
    catch (error) {
        console.log('Failed to validate studio from DB, using fallback:', error);
        studioInfo = feelcycle_scraper_1.FeelcycleScraper.getStudioInfo(studioCode);
    }
    if (!studioInfo) {
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Studio not found',
                message: `Studio code "${studioCode}" not found in available studios`,
            }),
        };
    }
    try {
        console.log(`✅ Studio validation passed: ${studioCode} -> ${normalizedStudioCode}`);
        console.log(`📅 Date range: ${start} to ${end}`);
        const filters = {};
        if (program)
            filters.program = program;
        if (instructor)
            filters.instructor = instructor;
        if (startTime && endTime) {
            filters.timeRange = { start: startTime, end: endTime };
        }
        console.log(`🔍 Filters applied:`, JSON.stringify(filters));
        // Get lessons for date range
        console.log(`🔎 Calling getLessonsForStudioAndDateRange...`);
        const lessons = await lessons_service_1.lessonsService.getLessonsForStudioAndDateRange(normalizedStudioCode, start, end, filters);
        console.log(`📊 Database query result: ${lessons.length} lessons found`);
        // Group lessons by date
        console.log(`📊 Grouping lessons by date...`);
        const lessonsByDate = {};
        lessons.forEach(lesson => {
            const date = lesson.lessonDate;
            if (!lessonsByDate[date]) {
                lessonsByDate[date] = [];
            }
            lessonsByDate[date].push(lesson);
        });
        const dateKeys = Object.keys(lessonsByDate);
        console.log(`📅 Grouped into ${dateKeys.length} dates:`, dateKeys);
        console.log(`💡 Sample lesson structure:`, lessons[0] ? JSON.stringify(lessons[0]) : 'No lessons found');
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                data: {
                    studio: studioInfo,
                    dateRange: { start, end },
                    lessonsByDate,
                    total: lessons.length,
                    available: lessons.filter(l => l.isAvailable === 'true').length,
                },
            }),
        };
    }
    catch (error) {
        console.error(`❌ Error in searchLessonsRange:`, error);
        console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack available');
        console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to search lessons',
                details: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
}
/**
 * Create sample lesson data for testing
 */
async function createSampleData(params) {
    const { studioCode, date } = params || {};
    if (!studioCode || !date) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Missing required parameters: studioCode and date',
            }),
        };
    }
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Invalid date format. Use YYYY-MM-DD',
            }),
        };
    }
    const studioInfo = feelcycle_scraper_1.FeelcycleScraper.getStudioInfo(studioCode);
    if (!studioInfo) {
        return {
            statusCode: 404,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Studio not found',
            }),
        };
    }
    try {
        const sampleLessons = await lessons_service_1.lessonsService.createSampleLessons(studioCode, date);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                data: {
                    studio: studioInfo,
                    date,
                    lessons: sampleLessons,
                    total: sampleLessons.length,
                    available: sampleLessons.filter(l => l.isAvailable === 'true').length,
                    message: 'Sample lesson data created successfully',
                },
            }),
        };
    }
    catch (error) {
        console.error('Error creating sample lesson data:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to create sample lesson data',
            }),
        };
    }
}
/**
 * Execute real scraping for a studio and date
 */
async function executeRealScraping(params) {
    const { studioCode, date, action, all } = params;
    // Special action to get real studio codes
    if (action === 'studios') {
        try {
            console.log('🚴‍♀️ Fetching real studio codes from FEELCYCLE website...');
            // Import real scraper
            const { RealFeelcycleScraper } = await Promise.resolve().then(() => __importStar(require('../services/real-scraper')));
            // Get real studios from the FEELCYCLE site
            const studios = await RealFeelcycleScraper.getRealStudios();
            await RealFeelcycleScraper.cleanup();
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: true,
                    data: {
                        studios,
                        total: studios.length,
                        message: 'Real studio codes fetched successfully',
                    },
                }),
            };
        }
        catch (error) {
            console.error('Error fetching real studios:', error);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to fetch real studios',
                    details: error instanceof Error ? error.message : 'Unknown error',
                }),
            };
        }
    }
    // Handle all studios scraping
    if (all === 'true') {
        try {
            console.log(`🚴‍♀️ Starting real scraping for ALL studios, date: ${date}`);
            const realLessons = await lessons_service_1.lessonsService.executeRealScraping('all', date);
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: true,
                    data: {
                        date,
                        lessons: realLessons,
                        total: realLessons.length,
                        available: realLessons.filter(l => l.isAvailable === 'true').length,
                        studios: [...new Set(realLessons.map(l => l.studioCode))].length,
                        message: 'Real scraping executed successfully for all studios',
                    },
                }),
            };
        }
        catch (error) {
            console.error('Error executing real scraping for all studios:', error);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    error: 'Failed to execute real scraping for all studios',
                    details: error instanceof Error ? error.message : 'Unknown error',
                }),
            };
        }
    }
    if (!studioCode || !date) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Missing required parameters: studioCode and date (or action=studios)',
            }),
        };
    }
    // リアルスクレイピングでは古いスタジオ検証をスキップ
    try {
        console.log(`🚴‍♀️ Starting real scraping for studio: ${studioCode}, date: ${date}`);
        const realLessons = await lessons_service_1.lessonsService.executeRealScraping(studioCode, date);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                data: {
                    studio: { code: studioCode, name: studioCode },
                    date,
                    lessons: realLessons,
                    total: realLessons.length,
                    available: realLessons.filter(l => l.isAvailable === 'true').length,
                    message: 'Real scraping executed successfully',
                },
            }),
        };
    }
    catch (error) {
        console.error('Error executing real scraping:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to execute real scraping',
                details: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
}
/**
 * Get real studios from FEELCYCLE reservation site
 */
async function getRealStudios() {
    try {
        console.log('🚴‍♀️ Fetching real studio codes from FEELCYCLE website...');
        // Import real scraper
        const { RealFeelcycleScraper } = await Promise.resolve().then(() => __importStar(require('../services/real-scraper')));
        // Get real studios from the FEELCYCLE site
        const studios = await RealFeelcycleScraper.getRealStudios();
        await RealFeelcycleScraper.cleanup();
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                data: {
                    studios,
                    total: studios.length,
                    message: 'Real studio codes fetched successfully',
                },
            }),
        };
    }
    catch (error) {
        console.error('Error fetching real studios:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                error: 'Failed to fetch real studios',
                details: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
}
/**
 * Calculate end time (assuming 45-minute lessons)
 */
function calculateEndTime(startTime) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + 45, 0, 0);
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
}
/**
 * Handle direct Lambda invocation
 */
async function handleDirectInvocation(event) {
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
    };
    try {
        const { action, studioCode, date } = event;
        if (action === 'get-lessons') {
            if (studioCode === 'all') {
                // 全スタジオのレッスン取得
                return await executeRealScraping({ all: 'true', date });
            }
            else {
                // 特定スタジオのレッスン取得 - 直接リアルスクレイピングを実行
                return await executeRealScraping({ studioCode, date });
            }
        }
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Invalid action. Supported actions: get-lessons',
            }),
        };
    }
    catch (error) {
        console.error('Direct invocation error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
}
