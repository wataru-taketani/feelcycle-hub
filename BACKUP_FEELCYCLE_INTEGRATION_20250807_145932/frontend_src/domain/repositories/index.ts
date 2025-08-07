/**
 * リポジトリインターフェース定義
 * Phase 4.1: アーキテクチャリファクタリング
 */

import { LessonEntity, InstructorEntity, WaitlistEntity, UserPreferences } from '../models';
import { DomainLayer } from '../../architecture';

// =============================
// 基本リポジトリインターフェース
// =============================

export interface BaseRepository<T extends DomainLayer.Entity> extends DomainLayer.Repository<T> {
  findAll(): Promise<T[]>;
  findByIds(ids: string[]): Promise<T[]>;
  exists(id: string): Promise<boolean>;
  count(): Promise<number>;
}

// =============================
// レッスンリポジトリ
// =============================

export interface LessonRepository extends BaseRepository<LessonEntity> {
  findByStudio(studioCode: string): Promise<LessonEntity[]>;
  findByInstructor(instructorName: string): Promise<LessonEntity[]>;
  findByProgram(programName: string): Promise<LessonEntity[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<LessonEntity[]>;
  findAvailable(): Promise<LessonEntity[]>;
  findWithWaitlist(): Promise<LessonEntity[]>;
  
  // 検索・フィルタリング
  search(criteria: LessonSearchCriteria): Promise<LessonEntity[]>;
  findRecommended(userPreferences: UserPreferences): Promise<LessonEntity[]>;
  
  // 統計・分析
  getPopularPrograms(limit: number): Promise<Array<{ programName: string; count: number }>>;
  getStudioStatistics(): Promise<Array<{ studioCode: string; lessonsCount: number; availability: number }>>;
}

export interface LessonSearchCriteria {
  studioCode?: string;
  programName?: string;
  instructorName?: string;
  startDate?: Date;
  endDate?: Date;
  availability?: 'available' | 'waitlist' | 'full';
  difficulty?: number[];
  timeSlots?: string[]; // 'morning', 'midday', 'afternoon', 'evening'
}

// =============================
// インストラクターリポジトリ
// =============================

export interface InstructorRepository extends BaseRepository<InstructorEntity> {
  findByStudio(studioCode: string): Promise<InstructorEntity[]>;
  findBySpecialty(specialty: string): Promise<InstructorEntity[]>;
  findByRatingRange(minRating: number, maxRating: number): Promise<InstructorEntity[]>;
  findPopular(limit: number): Promise<InstructorEntity[]>;
  
  // 統計・分析
  getTopRated(limit: number): Promise<InstructorEntity[]>;
  getSpecialtyDistribution(): Promise<Array<{ specialty: string; count: number }>>;
  getInstructorStats(instructorId: string): Promise<InstructorStats>;
}

export interface InstructorStats {
  totalLessons: number;
  averageRating: number;
  specialties: string[];
  studiosTeaching: string[];
  popularPrograms: Array<{ programName: string; frequency: number }>;
}

// =============================
// 待機リストリポジトリ
// =============================

export interface WaitlistRepository extends BaseRepository<WaitlistEntity> {
  findByUser(userId: string): Promise<WaitlistEntity[]>;
  findByLesson(lessonId: string): Promise<WaitlistEntity[]>;
  findActiveEntries(): Promise<WaitlistEntity[]>;
  findByStatus(status: WaitlistEntity['status']): Promise<WaitlistEntity[]>;
  
  // 待機リスト操作
  addToWaitlist(lessonId: string, userId: string): Promise<WaitlistEntity>;
  removeFromWaitlist(entryId: string): Promise<void>;
  updatePosition(entryId: string, position: number): Promise<void>;
  
  // 統計・分析
  getWaitlistStats(lessonId: string): Promise<WaitlistStats>;
  getUserWaitlistHistory(userId: string): Promise<WaitlistEntity[]>;
}

export interface WaitlistStats {
  totalEntries: number;
  averageWaitTime: number; // minutes
  fulfillmentRate: number; // percentage
  currentPositions: Array<{ userId: string; position: number }>;
}

// =============================
// ユーザー設定リポジトリ
// =============================

export interface UserPreferencesRepository {
  findByUserId(userId: string): Promise<UserPreferences | null>;
  save(userId: string, preferences: UserPreferences): Promise<void>;
  delete(userId: string): Promise<void>;
  
  // 設定管理
  updateFavoriteStudios(userId: string, studioIds: string[]): Promise<void>;
  updateFavoriteInstructors(userId: string, instructorIds: string[]): Promise<void>;
  updateInterestedLessons(userId: string, interestedLessons: any[]): Promise<void>;
  updateNotificationSettings(userId: string, settings: any): Promise<void>;
  
  // 統計・分析
  getPopularStudios(): Promise<Array<{ studioCode: string; favoriteCount: number }>>;
  getPopularInstructors(): Promise<Array<{ instructorName: string; favoriteCount: number }>>;
}

// =============================
// 集約ルートリポジトリ
// =============================

export interface UnitOfWork {
  lessonRepository: LessonRepository;
  instructorRepository: InstructorRepository;
  waitlistRepository: WaitlistRepository;
  userPreferencesRepository: UserPreferencesRepository;
  
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  dispose(): Promise<void>;
}

// =============================
// キャッシュ対応リポジトリ
// =============================

export interface CachedRepository<T> {
  clearCache(key?: string): Promise<void>;
  getCacheStats(): Promise<{
    hitRate: number;
    missRate: number;
    size: number;
    keys: string[];
  }>;
  prefetch(criteria: any): Promise<void>;
}

// =============================
// 検索・フィルタリング拡張
// =============================

export interface SearchableRepository<T, TCriteria> {
  search(criteria: TCriteria): Promise<T[]>;
  suggest(query: string, limit: number): Promise<string[]>;
  facetedSearch(criteria: TCriteria): Promise<{
    results: T[];
    facets: Record<string, Array<{ value: string; count: number }>>;
  }>;
}

// =============================
// 統計・分析拡張
// =============================

export interface AnalyticsRepository<T> {
  getTrends(period: 'day' | 'week' | 'month'): Promise<Array<{
    date: string;
    count: number;
    metrics: Record<string, number>;
  }>>;
  
  getDistribution<K extends keyof T>(field: K): Promise<Array<{
    value: T[K];
    count: number;
    percentage: number;
  }>>;
  
  getCorrelations(): Promise<Array<{
    field1: keyof T;
    field2: keyof T;
    correlation: number;
  }>>;
}

// =============================
// エラーハンドリング
// =============================

export class RepositoryError extends Error {
  constructor(
    public operation: string,
    public entityType: string,
    message: string,
    public originalError?: Error
  ) {
    super(`Repository Error [${entityType}.${operation}]: ${message}`);
    this.name = 'RepositoryError';
  }
}

export const withRepositoryErrorHandling = <T extends (...args: any[]) => any>(
  fn: T,
  operation: string,
  entityType: string
): T => {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw new RepositoryError(
        operation,
        entityType,
        (error as Error).message,
        error as Error
      );
    }
  }) as T;
};