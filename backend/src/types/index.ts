// Common types for FEELCYCLE Hub

/**
 * Normalize studio code to lowercase for consistent data storage and querying
 */
export const normalizeStudioCode = (studioCode: string): string => {
  return studioCode.toLowerCase();
};

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
  ttl?: number; // TTL for DynamoDB
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

// Waitlist types for cancellation waitlist feature
export type WaitlistStatus = 'active' | 'paused' | 'expired' | 'cancelled' | 'completed';

export interface Waitlist {
  userId: string;
  waitlistId: string; // format: studioCode#date#startTime#lessonName
  studioCode: string;
  studioName: string;
  lessonDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  lessonName: string;
  instructor: string;
  lessonDateTime: string; // ISO 8601 format for comparison
  status: WaitlistStatus;
  createdAt: string;
  updatedAt: string;
  pausedAt?: string;
  expiredAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  notificationHistory: NotificationRecord[];
  autoResumeAt?: string; // ISO 8601 format
  lastNotifiedAt?: string; // ISO 8601 format - 最後の通知送信時刻
  ttl: number; // Unix timestamp for DynamoDB TTL
}

export interface NotificationRecord {
  sentAt: string; // ISO 8601 format
  availableSlots?: number | null;
  totalSlots?: number | null;
  notificationId: string;
  message?: string; // 送信されたメッセージ内容
}

export interface StudioInfo {
  code: string;
  name: string;
  region: string;
}

// Real lesson data structure
export interface LessonData {
  studioCode: string;
  lessonDateTime: string; // ISO string: "2025-07-17T10:30:00+09:00"
  lessonDate: string; // "2025-07-17"
  startTime: string; // "10:30"
  endTime: string; // "11:15"
  lessonName: string; // "BSL House 1"
  instructor: string; // "YUKI"
  availableSlots?: number | null; // Only if available from site
  totalSlots?: number | null; // Only if available from site
  isAvailable: string; // "true" or "false" (string for GSI)
  program: string; // "BSL", "BB1", "BSB", etc.
  backgroundColor?: string; // Program background color from site (e.g., "rgb(255, 51, 51)")
  textColor?: string; // Program text color from site (e.g., "rgb(0, 18, 28)")
  lastUpdated: string; // ISO timestamp
  ttl: number; // Unix timestamp for TTL
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
  date?: string; // YYYY-MM-DD
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
  action: 'resume' | 'cancel' | 'pause';
  userId?: string; // フロントエンドから送信されるユーザーID
}

// Studio types for studio information management
export interface StudioData {
  studioCode: string;
  studioName: string;
  region: string;
  address?: string;
  phoneNumber?: string;
  businessHours?: string;
  lastUpdated: string;
  ttl: number; // Unix timestamp for DynamoDB TTL
}

export interface StudioCreateRequest {
  studioCode: string;
  studioName: string;
  region: string;
  address?: string;
  phoneNumber?: string;
  businessHours?: string;
}