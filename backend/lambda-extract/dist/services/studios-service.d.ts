import { StudioData, StudioCreateRequest } from '../types';
export declare class StudiosService {
    /**
     * Store studio data in DynamoDB
     */
    storeStudioData(studioData: StudioData): Promise<void>;
    /**
     * Store multiple studios in batch
     */
    storeStudiosData(studios: StudioData[]): Promise<void>;
    /**
     * Get studio by code
     */
    getStudioByCode(studioCode: string): Promise<StudioData | null>;
    /**
     * Get all studios
     */
    getAllStudios(): Promise<StudioData[]>;
    /**
     * Get studios by region
     */
    getStudiosByRegion(region: string): Promise<StudioData[]>;
    /**
     * Create studio from request
     */
    createStudioData(request: StudioCreateRequest): StudioData;
    /**
     * Update existing studio data
     */
    updateStudioData(studioCode: string, updates: Partial<StudioCreateRequest>): Promise<void>;
    /**
     * Delete studio
     */
    deleteStudio(studioCode: string): Promise<void>;
    /**
     * Refresh all studios from scraping data
     */
    refreshStudiosFromScraping(scrapedStudios: Array<{
        code: string;
        name: string;
        region: string;
    }>): Promise<{
        created: number;
        updated: number;
        total: number;
    }>;
}
export declare const studiosService: StudiosService;
