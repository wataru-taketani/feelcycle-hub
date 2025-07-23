import { LessonData } from '../types';
export declare class RealFeelcycleScraper {
    private static browser;
    /**
     * Initialize browser instance
     */
    static initBrowser(): Promise<any>;
    /**
     * Get all available studios from FEELCYCLE reservation website
     */
    static getRealStudios(): Promise<Array<{
        code: string;
        name: string;
        region: string;
    }>>;
    /**
     * Get all lessons for a specific studio (all dates at once)
     */
    static searchAllLessons(studioCode: string): Promise<LessonData[]>;
    /**
     * Search for lesson data for a specific studio and date (compatibility method)
     * This method now uses the optimized approach - gets all lessons and filters by date
     */
    static searchRealLessons(studioCode: string, date: string): Promise<LessonData[]>;
    /**
     * Search for lessons from all studios for a specific date
     */
    static searchAllStudiosRealLessons(date: string): Promise<LessonData[]>;
    /**
     * Extract available slots from status text
     */
    private static extractAvailableSlots;
    /**
     * Cleanup browser resources and force garbage collection
     */
    static cleanup(): Promise<void>;
}
