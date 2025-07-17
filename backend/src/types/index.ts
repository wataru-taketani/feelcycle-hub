// Common types for FEELCYCLE Hub

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
  availableSlots: number;
  totalSlots: number;
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
  ttl: number; // Unix timestamp for DynamoDB TTL
}

export interface NotificationRecord {
  sentAt: string; // ISO 8601 format
  availableSlots: number;
  totalSlots: number;
  notificationId: string;
}

export interface StudioInfo {
  code: string;
  name: string;
  region: string;
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
  action: 'resume' | 'cancel';
}