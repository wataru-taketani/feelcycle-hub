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
 * Get all studios grouped by region
 */
async function getStudios() {
    const studios = feelcycle_scraper_1.FeelcycleScraper.getStudios();
    const regions = feelcycle_scraper_1.FeelcycleScraper.getRegions();
    const studiosByRegion = regions.reduce((acc, region) => {
        acc[region] = feelcycle_scraper_1.FeelcycleScraper.getStudiosByRegion(region);
        return acc;
    }, {});
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
                regions,
                studiosByRegion,
            },
        }),
    };
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
        const filters = {};
        if (program)
            filters.program = program;
        if (instructor)
            filters.instructor = instructor;
        if (startTime && endTime) {
            filters.timeRange = { start: startTime, end: endTime };
        }
        // Try to get real data from database first
        console.log(`Searching for real lesson data: studio=${studioCode}, date=${date}`);
        let lessons = await lessons_service_1.lessonsService.getLessonsForStudioAndDate(studioCode, date, filters);
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
