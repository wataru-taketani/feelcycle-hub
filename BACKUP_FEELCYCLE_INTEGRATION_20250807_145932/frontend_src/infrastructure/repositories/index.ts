/**
 * リポジトリ実装（インフラストラクチャ層）
 * Phase 4.1: アーキテクチャリファクタリング
 */

import { InfrastructureLayer } from '../../architecture';
import { 
  LessonRepository, 
  InstructorRepository, 
  WaitlistRepository, 
  UserPreferencesRepository,
  LessonSearchCriteria,
  InstructorStats,
  WaitlistStats,
  BaseRepository,
  withRepositoryErrorHandling
} from '../../domain/repositories';
import { 
  LessonEntity, 
  InstructorEntity, 
  WaitlistEntity, 
  UserPreferences,
  DomainFactory 
} from '../../domain/models';

// =============================
// API クライアント基盤
// =============================

export class ApiClient implements InfrastructureLayer.ApiClient {
  public baseUrl: string;
  public timeout: number;

  constructor(baseUrl: string, timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    
    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async delete(endpoint: string): Promise<void> {
    const url = new URL(endpoint, this.baseUrl);
    
    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
  }
}

// =============================
// キャッシュプロバイダー
// =============================

export class InMemoryCacheProvider implements InfrastructureLayer.CacheProvider {
  private cache = new Map<string, { value: any; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async set<T>(key: string, value: T, ttl: number = 300000): Promise<void> { // 5分デフォルト
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// =============================
// レッスンリポジトリ実装
// =============================

export class ApiLessonRepository implements LessonRepository {
  constructor(
    private apiClient: ApiClient,
    private cacheProvider: InfrastructureLayer.CacheProvider
  ) {}

  @withRepositoryErrorHandling('findById', 'Lesson')
  async findById(id: string): Promise<LessonEntity | null> {
    const cacheKey = `lesson:${id}`;
    const cached = await this.cacheProvider.get<any>(cacheKey);
    if (cached) {
      return DomainFactory.createLesson(cached);
    }

    try {
      const data = await this.apiClient.get<any>(`/api/lessons/${id}`);
      await this.cacheProvider.set(cacheKey, data, 300000); // 5分キャッシュ
      return DomainFactory.createLesson(data);
    } catch (error) {
      if ((error as any).status === 404) {
        return null;
      }
      throw error;
    }
  }

  @withRepositoryErrorHandling('findAll', 'Lesson')
  async findAll(): Promise<LessonEntity[]> {
    const cacheKey = 'lessons:all';
    const cached = await this.cacheProvider.get<any[]>(cacheKey);
    if (cached) {
      return cached.map(data => DomainFactory.createLesson(data));
    }

    const data = await this.apiClient.get<any[]>('/api/lessons');
    await this.cacheProvider.set(cacheKey, data, 60000); // 1分キャッシュ
    return data.map(item => DomainFactory.createLesson(item));
  }

  @withRepositoryErrorHandling('findByIds', 'Lesson')
  async findByIds(ids: string[]): Promise<LessonEntity[]> {
    const results = await Promise.all(
      ids.map(id => this.findById(id))
    );
    return results.filter((lesson): lesson is LessonEntity => lesson !== null);
  }

  @withRepositoryErrorHandling('save', 'Lesson')
  async save(entity: LessonEntity): Promise<void> {
    await this.apiClient.put(`/api/lessons/${entity.id}`, {
      id: entity.id,
      studioName: entity.studioName,
      studioCode: entity.studioCode,
      programName: entity.programName,
      instructorName: entity.instructorName,
      startTime: entity.startTime.toISOString(),
      endTime: entity.endTime.toISOString(),
      availability: entity.availability,
      difficulty: entity.difficulty,
      description: entity.description
    });
    
    // キャッシュ更新
    await this.cacheProvider.delete(`lesson:${entity.id}`);
    await this.cacheProvider.delete('lessons:all');
  }

  @withRepositoryErrorHandling('delete', 'Lesson')
  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/lessons/${id}`);
    await this.cacheProvider.delete(`lesson:${id}`);
    await this.cacheProvider.delete('lessons:all');
  }

  @withRepositoryErrorHandling('exists', 'Lesson')
  async exists(id: string): Promise<boolean> {
    const lesson = await this.findById(id);
    return lesson !== null;
  }

  @withRepositoryErrorHandling('count', 'Lesson')
  async count(): Promise<number> {
    const lessons = await this.findAll();
    return lessons.length;
  }

  @withRepositoryErrorHandling('findByStudio', 'Lesson')
  async findByStudio(studioCode: string): Promise<LessonEntity[]> {
    const cacheKey = `lessons:studio:${studioCode}`;
    const cached = await this.cacheProvider.get<any[]>(cacheKey);
    if (cached) {
      return cached.map(data => DomainFactory.createLesson(data));
    }

    const data = await this.apiClient.get<any[]>('/api/lessons', { studioCode });
    await this.cacheProvider.set(cacheKey, data, 300000);
    return data.map(item => DomainFactory.createLesson(item));
  }

  @withRepositoryErrorHandling('findByInstructor', 'Lesson')
  async findByInstructor(instructorName: string): Promise<LessonEntity[]> {
    const data = await this.apiClient.get<any[]>('/api/lessons', { instructorName });
    return data.map(item => DomainFactory.createLesson(item));
  }

  @withRepositoryErrorHandling('findByProgram', 'Lesson')
  async findByProgram(programName: string): Promise<LessonEntity[]> {
    const data = await this.apiClient.get<any[]>('/api/lessons', { programName });
    return data.map(item => DomainFactory.createLesson(item));
  }

  @withRepositoryErrorHandling('findByDateRange', 'Lesson')
  async findByDateRange(startDate: Date, endDate: Date): Promise<LessonEntity[]> {
    const data = await this.apiClient.get<any[]>('/api/lessons', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    return data.map(item => DomainFactory.createLesson(item));
  }

  @withRepositoryErrorHandling('findAvailable', 'Lesson')
  async findAvailable(): Promise<LessonEntity[]> {
    const cacheKey = 'lessons:available';
    const cached = await this.cacheProvider.get<any[]>(cacheKey);
    if (cached) {
      return cached.map(data => DomainFactory.createLesson(data));
    }

    const data = await this.apiClient.get<any[]>('/api/lessons', { availability: 'available' });
    await this.cacheProvider.set(cacheKey, data, 60000); // 1分キャッシュ
    return data.map(item => DomainFactory.createLesson(item));
  }

  @withRepositoryErrorHandling('findWithWaitlist', 'Lesson')
  async findWithWaitlist(): Promise<LessonEntity[]> {
    const data = await this.apiClient.get<any[]>('/api/lessons', { availability: 'waitlist' });
    return data.map(item => DomainFactory.createLesson(item));
  }

  @withRepositoryErrorHandling('search', 'Lesson')
  async search(criteria: LessonSearchCriteria): Promise<LessonEntity[]> {
    const params = this.buildSearchParams(criteria);
    const data = await this.apiClient.get<any[]>('/api/lessons/search', params);
    return data.map(item => DomainFactory.createLesson(item));
  }

  @withRepositoryErrorHandling('findRecommended', 'Lesson')
  async findRecommended(userPreferences: UserPreferences): Promise<LessonEntity[]> {
    const data = await this.apiClient.post<any[]>('/api/lessons/recommended', userPreferences);
    return data.map(item => DomainFactory.createLesson(item));
  }

  @withRepositoryErrorHandling('getPopularPrograms', 'Lesson')
  async getPopularPrograms(limit: number): Promise<Array<{ programName: string; count: number }>> {
    return this.apiClient.get<Array<{ programName: string; count: number }>>(
      `/api/lessons/stats/popular-programs`,
      { limit }
    );
  }

  @withRepositoryErrorHandling('getStudioStatistics', 'Lesson')
  async getStudioStatistics(): Promise<Array<{ studioCode: string; lessonsCount: number; availability: number }>> {
    return this.apiClient.get<Array<{ studioCode: string; lessonsCount: number; availability: number }>>(
      '/api/lessons/stats/studios'
    );
  }

  private buildSearchParams(criteria: LessonSearchCriteria): Record<string, any> {
    const params: Record<string, any> = {};
    
    if (criteria.studioCode) params.studioCode = criteria.studioCode;
    if (criteria.programName) params.programName = criteria.programName;
    if (criteria.instructorName) params.instructorName = criteria.instructorName;
    if (criteria.startDate) params.startDate = criteria.startDate.toISOString();
    if (criteria.endDate) params.endDate = criteria.endDate.toISOString();
    if (criteria.availability) params.availability = criteria.availability;
    if (criteria.difficulty) params.difficulty = criteria.difficulty.join(',');
    if (criteria.timeSlots) params.timeSlots = criteria.timeSlots.join(',');
    
    return params;
  }
}

// =============================
// ローカルストレージリポジトリ実装
// =============================

export class LocalStorageUserPreferencesRepository implements UserPreferencesRepository {
  private readonly STORAGE_KEY = 'feelcycle_user_preferences';

  @withRepositoryErrorHandling('findByUserId', 'UserPreferences')
  async findByUserId(userId: string): Promise<UserPreferences | null> {
    try {
      const data = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      return {
        favoriteStudios: parsed.favoriteStudios || [],
        favoriteInstructors: parsed.favoriteInstructors || [],
        interestedLessons: parsed.interestedLessons || [],
        notificationSettings: {
          enableLineNotifications: parsed.notificationSettings?.enableLineNotifications ?? true,
          enableEmailNotifications: parsed.notificationSettings?.enableEmailNotifications ?? false,
          notificationTiming: parsed.notificationSettings?.notificationTiming ?? 30
        }
      };
    } catch (error) {
      console.error('Failed to parse user preferences from localStorage:', error);
      return null;
    }
  }

  @withRepositoryErrorHandling('save', 'UserPreferences')
  async save(userId: string, preferences: UserPreferences): Promise<void> {
    const serialized = JSON.stringify({
      ...preferences,
      updatedAt: new Date().toISOString()
    });
    localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, serialized);
  }

  @withRepositoryErrorHandling('delete', 'UserPreferences')
  async delete(userId: string): Promise<void> {
    localStorage.removeItem(`${this.STORAGE_KEY}_${userId}`);
  }

  @withRepositoryErrorHandling('updateFavoriteStudios', 'UserPreferences')
  async updateFavoriteStudios(userId: string, studioIds: string[]): Promise<void> {
    const preferences = await this.findByUserId(userId);
    if (preferences) {
      preferences.favoriteStudios = studioIds;
      await this.save(userId, preferences);
    }
  }

  @withRepositoryErrorHandling('updateFavoriteInstructors', 'UserPreferences')
  async updateFavoriteInstructors(userId: string, instructorIds: string[]): Promise<void> {
    const preferences = await this.findByUserId(userId);
    if (preferences) {
      preferences.favoriteInstructors = instructorIds;
      await this.save(userId, preferences);
    }
  }

  @withRepositoryErrorHandling('updateInterestedLessons', 'UserPreferences')
  async updateInterestedLessons(userId: string, interestedLessons: any[]): Promise<void> {
    const preferences = await this.findByUserId(userId);
    if (preferences) {
      preferences.interestedLessons = interestedLessons;
      await this.save(userId, preferences);
    }
  }

  @withRepositoryErrorHandling('updateNotificationSettings', 'UserPreferences')
  async updateNotificationSettings(userId: string, settings: any): Promise<void> {
    const preferences = await this.findByUserId(userId);
    if (preferences) {
      preferences.notificationSettings = settings;
      await this.save(userId, preferences);
    }
  }

  @withRepositoryErrorHandling('getPopularStudios', 'UserPreferences')
  async getPopularStudios(): Promise<Array<{ studioCode: string; favoriteCount: number }>> {
    // ローカルストレージから全ユーザーの設定を集計（実際の実装では API 経由が望ましい）
    const studios: Record<string, number> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_KEY)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          data.favoriteStudios?.forEach((studioCode: string) => {
            studios[studioCode] = (studios[studioCode] || 0) + 1;
          });
        } catch (error) {
          console.error('Error parsing localStorage data:', error);
        }
      }
    }
    
    return Object.entries(studios)
      .map(([studioCode, favoriteCount]) => ({ studioCode, favoriteCount }))
      .sort((a, b) => b.favoriteCount - a.favoriteCount);
  }

  @withRepositoryErrorHandling('getPopularInstructors', 'UserPreferences')
  async getPopularInstructors(): Promise<Array<{ instructorName: string; favoriteCount: number }>> {
    const instructors: Record<string, number> = {};
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.STORAGE_KEY)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          data.favoriteInstructors?.forEach((instructorName: string) => {
            instructors[instructorName] = (instructors[instructorName] || 0) + 1;
          });
        } catch (error) {
          console.error('Error parsing localStorage data:', error);
        }
      }
    }
    
    return Object.entries(instructors)
      .map(([instructorName, favoriteCount]) => ({ instructorName, favoriteCount }))
      .sort((a, b) => b.favoriteCount - a.favoriteCount);
  }
}

// =============================
// 依存関係注入コンテナ設定
// =============================

export class RepositoryContainer {
  private static instance: RepositoryContainer;
  private apiClient: ApiClient;
  private cacheProvider: InfrastructureLayer.CacheProvider;
  
  private constructor() {
    this.apiClient = new ApiClient(
      process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    );
    this.cacheProvider = new InMemoryCacheProvider();
  }

  static getInstance(): RepositoryContainer {
    if (!RepositoryContainer.instance) {
      RepositoryContainer.instance = new RepositoryContainer();
    }
    return RepositoryContainer.instance;
  }

  getLessonRepository(): LessonRepository {
    return new ApiLessonRepository(this.apiClient, this.cacheProvider);
  }

  getUserPreferencesRepository(): UserPreferencesRepository {
    return new LocalStorageUserPreferencesRepository();
  }

  getApiClient(): ApiClient {
    return this.apiClient;
  }

  getCacheProvider(): InfrastructureLayer.CacheProvider {
    return this.cacheProvider;
  }
}