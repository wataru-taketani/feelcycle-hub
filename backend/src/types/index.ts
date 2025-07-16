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