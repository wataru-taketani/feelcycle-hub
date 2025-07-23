import { LessonData, LessonSearchFilters } from '../types';
export declare class LessonsService {
    /**
     * Store lesson data in DynamoDB
     */
    storeLessonData(lessonData: LessonData): Promise<void>;
    /**
     * Store multiple lessons using DynamoDB BatchWrite (much more efficient)
     */
    storeLessonsData(lessons: LessonData[]): Promise<void>;
    /**
     * Get lessons for a specific studio and date
     */
    getLessonsForStudioAndDate(studioCode: string, date: string, filters?: LessonSearchFilters): Promise<LessonData[]>;
    /**
     * Get lessons for a specific studio across multiple dates
     */
    getLessonsForStudioAndDateRange(studioCode: string, startDate: string, endDate: string, filters?: LessonSearchFilters): Promise<LessonData[]>;
    /**
     * Get lessons for all studios on a specific date
     */
    getLessonsForDate(date: string, filters?: LessonSearchFilters): Promise<LessonData[]>;
    /**
     * Get available lessons (for monitoring)
     */
    getAvailableLessons(limit?: number): Promise<LessonData[]>;
    /**
     * Update lesson availability
     */
    updateLessonAvailability(studioCode: string, lessonDateTime: string, availableSlots: number, totalSlots: number): Promise<void>;
    /**
     * Clean up old lesson data
     */
    cleanupOldLessons(): Promise<{
        deletedCount: number;
    }>;
    /**
     * Create sample lesson data (for testing without scraping)
     */
    createSampleLessons(studioCode: string, date: string): Promise<LessonData[]>;
    /**
     * Execute real scraping and store data
     */
    executeRealScraping(studioCode: string, date: string): Promise<any[]>;
    /**
     * Clear all lessons from the table
     */
    clearAllLessons(): Promise<{
        deletedCount: number;
    }>;
}
export declare const lessonsService: LessonsService;
