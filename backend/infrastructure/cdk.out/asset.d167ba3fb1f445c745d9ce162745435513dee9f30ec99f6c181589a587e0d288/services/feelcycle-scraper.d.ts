import { LessonAvailability, StudioInfo } from '../types';
/**
 * FEELCYCLE scraping service
 * 37 studios across Japan support
 */
export declare class FeelcycleScraper {
    /**
     * Get all FEELCYCLE studios (37 studios)
     */
    static getStudios(): StudioInfo[];
    /**
     * Get available dates for a studio (next 14 days)
     */
    static getAvailableDates(studioCode: string): Promise<string[]>;
    /**
     * Search lessons for a specific studio and date
     */
    static searchLessons(studioCode: string, date: string, filters?: {
        program?: string;
        instructor?: string;
        timeRange?: {
            start: string;
            end: string;
        };
    }): Promise<LessonAvailability[]>;
    /**
     * Check specific lesson availability (for monitoring)
     */
    static checkLessonAvailability(studioCode: string, date: string, time: string, lessonName: string, instructor: string): Promise<LessonAvailability | null>;
    /**
     * Get studio information by code
     */
    static getStudioInfo(studioCode: string): StudioInfo | null;
    /**
     * Get studios by region
     */
    static getStudiosByRegion(region: string): StudioInfo[];
    /**
     * Get all available regions
     */
    static getRegions(): string[];
}
export declare const feelcycleScraper: FeelcycleScraper;
