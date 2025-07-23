import { Waitlist, WaitlistStatus, WaitlistCreateRequest, NotificationRecord } from '../types';
export declare class WaitlistService {
    private lessonsService;
    /**
     * Create a new waitlist entry with lesson data validation
     */
    createWaitlist(userId: string, request: WaitlistCreateRequest): Promise<Waitlist>;
    /**
     * Get user's waitlists by status
     */
    getUserWaitlists(userId: string, status?: WaitlistStatus): Promise<Waitlist[]>;
    /**
     * Get active waitlists for monitoring (efficient extraction)
     */
    getActiveWaitlistsForMonitoring(): Promise<Waitlist[]>;
    /**
     * Update waitlist status
     */
    updateWaitlistStatus(userId: string, waitlistId: string, status: WaitlistStatus, additionalFields?: Partial<Waitlist>): Promise<void>;
    /**
     * Add notification record to waitlist
     */
    addNotificationRecord(userId: string, waitlistId: string, notification: NotificationRecord): Promise<void>;
    /**
     * Resume waitlist (change from paused to active)
     */
    resumeWaitlist(userId: string, waitlistId: string): Promise<void>;
    /**
     * Cancel waitlist
     */
    cancelWaitlist(userId: string, waitlistId: string): Promise<void>;
    /**
     * Delete waitlist (hard delete)
     */
    deleteWaitlist(userId: string, waitlistId: string): Promise<void>;
    /**
     * Expire old waitlists (batch cleanup)
     */
    expireOldWaitlists(): Promise<{
        expiredCount: number;
    }>;
    /**
     * Validate that the lesson exists in our database
     */
    private validateLessonExists;
    /**
     * Check if user already has waitlist for this specific lesson
     */
    private getUserWaitlistForLesson;
    /**
     * Get studio name from studios service
     */
    private getStudioName;
    /**
     * Calculate end time based on start time (assuming 45min lessons)
     */
    private calculateEndTime;
    /**
     * Validate waitlist request data
     */
    private validateWaitlistRequest;
}
export declare const waitlistService: WaitlistService;
