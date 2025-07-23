/**
 * Normalize studio code to lowercase for consistent data storage and querying
 */
export declare const normalizeStudioCode: (studioCode: string) => string;
export interface User {
    userId: string;
    lineUserId?: string;
    email: string;
    planType: 'monthly8' | 'monthly15' | 'monthly30' | 'unlimited';
    displayName?: string;
    pictureUrl?: string;
    createdAt: string;
    updatedAt: string;
}
export interface UserCredentials {
    userId: string;
    encryptedPassword: string;
    salt: string;
}
export interface Reservation {
    userId: string;
    lessonId: string;
    studio: string;
    date: string;
    time: string;
    instructor: string;
    program: string;
    status: 'watching' | 'reserved' | 'attended' | 'cancelled';
    watchStartedAt?: string;
    reservedAt?: string;
    ttl?: number;
}
export interface LessonHistory {
    userId: string;
    timestamp: string;
    lessonId: string;
    studio: string;
    date: string;
    time: string;
    instructor: string;
    program: string;
    attendanceStatus: 'attended' | 'no-show' | 'cancelled';
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface LambdaEvent {
    source?: string;
    action?: string;
    httpMethod?: string;
    path?: string;
    headers?: Record<string, string>;
    body?: string;
    pathParameters?: Record<string, string>;
    queryStringParameters?: Record<string, string>;
    'detail-type'?: string;
    detail?: {
        taskType?: string;
        scheduledTime?: string;
    };
}
export interface LineWebhookEvent {
    type: string;
    message?: {
        type: string;
        text?: string;
    };
    source: {
        type: string;
        userId: string;
    };
    replyToken: string;
}
export interface LessonAvailability {
    lessonId: string;
    studio: string;
    date: string;
    time: string;
    instructor: string;
    program: string;
    availableSlots?: number | null;
    totalSlots?: number | null;
    isAvailable: boolean;
}
export type WaitlistStatus = 'active' | 'paused' | 'expired' | 'cancelled' | 'completed';
export interface Waitlist {
    userId: string;
    waitlistId: string;
    studioCode: string;
    studioName: string;
    lessonDate: string;
    startTime: string;
    endTime: string;
    lessonName: string;
    instructor: string;
    lessonDateTime: string;
    status: WaitlistStatus;
    createdAt: string;
    updatedAt: string;
    pausedAt?: string;
    expiredAt?: string;
    cancelledAt?: string;
    completedAt?: string;
    notificationHistory: NotificationRecord[];
    autoResumeAt?: string;
    lastNotifiedAt?: string;
    ttl: number;
}
export interface NotificationRecord {
    sentAt: string;
    availableSlots?: number | null;
    totalSlots?: number | null;
    notificationId: string;
    message?: string;
}
export interface StudioInfo {
    code: string;
    name: string;
    region: string;
}
export interface LessonData {
    studioCode: string;
    lessonDateTime: string;
    lessonDate: string;
    startTime: string;
    endTime: string;
    lessonName: string;
    instructor: string;
    availableSlots?: number | null;
    totalSlots?: number | null;
    isAvailable: string;
    program: string;
    lastUpdated: string;
    ttl: number;
}
export interface LessonSearchFilters {
    program?: string;
    instructor?: string;
    timeRange?: {
        start: string;
        end: string;
    };
    availableOnly?: boolean;
}
export interface LessonSearchParams {
    studioCode?: string;
    date?: string;
    program?: string;
    instructor?: string;
}
export interface WaitlistCreateRequest {
    studioCode: string;
    lessonDate: string;
    startTime: string;
    lessonName: string;
    instructor: string;
}
export interface WaitlistUpdateRequest {
    action: 'resume' | 'cancel';
    userId?: string;
}
export interface StudioData {
    studioCode: string;
    studioName: string;
    region: string;
    address?: string;
    phoneNumber?: string;
    businessHours?: string;
    lastUpdated: string;
    ttl: number;
}
export interface StudioCreateRequest {
    studioCode: string;
    studioName: string;
    region: string;
    address?: string;
    phoneNumber?: string;
    businessHours?: string;
}
