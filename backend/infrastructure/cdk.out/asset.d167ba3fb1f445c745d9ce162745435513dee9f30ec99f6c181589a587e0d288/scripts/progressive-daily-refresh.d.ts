/**
 * Progressive daily refresh: Process one studio at a time
 * This approach avoids Lambda timeout and provides better error recovery
 */
declare function progressiveDailyRefresh(): Promise<{
    triggerNext: boolean;
    progress: {
        total: number;
        completed: number;
        processing: number;
        failed: number;
        remaining: number;
    };
} | undefined>;
export { progressiveDailyRefresh };
