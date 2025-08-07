/**
 * ユースケース実装
 * Phase 4.1: アーキテクチャリファクタリング
 */

import { ApplicationLayer } from '../../architecture';
import { 
  LessonRepository, 
  InstructorRepository, 
  WaitlistRepository, 
  UserPreferencesRepository,
  UnitOfWork 
} from '../../domain/repositories';
import { LessonEntity, InstructorEntity, WaitlistEntity, UserPreferences } from '../../domain/models';
import { 
  LessonDomainService, 
  WaitlistDomainService, 
  UserPreferencesDomainService 
} from '../../domain/services';

// =============================
// 基本ユースケース
// =============================

export abstract class BaseUseCase<TInput, TOutput> implements ApplicationLayer.UseCase<TInput, TOutput> {
  abstract execute(input: TInput): Promise<TOutput>;
  
  protected handleError(error: Error, context: string): never {
    throw new UseCaseError(context, error.message, error);
  }
}

export class UseCaseError extends Error {
  constructor(
    public context: string,
    message: string,
    public originalError?: Error
  ) {
    super(`UseCase Error [${context}]: ${message}`);
    this.name = 'UseCaseError';
  }
}

// =============================
// レッスン関連ユースケース
// =============================

export class GetLessonsUseCase extends BaseUseCase<GetLessonsInput, GetLessonsOutput> {
  constructor(private lessonRepository: LessonRepository) {
    super();
  }

  async execute(input: GetLessonsInput): Promise<GetLessonsOutput> {
    try {
      const lessons = await this.lessonRepository.search(input.criteria);
      
      return {
        lessons: lessons.map(lesson => ({
          id: lesson.id,
          studioName: lesson.studioName,
          studioCode: lesson.studioCode,
          programName: lesson.programName,
          instructorName: lesson.instructorName,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          availability: lesson.availability,
          difficulty: lesson.difficulty,
          description: lesson.description,
          canBook: LessonDomainService.canBook(lesson),
          difficultyCategory: LessonDomainService.getDifficultyCategory(lesson.difficulty)
        })),
        totalCount: lessons.length
      };
    } catch (error) {
      this.handleError(error as Error, 'GetLessons');
    }
  }
}

export interface GetLessonsInput {
  criteria: {
    studioCode?: string;
    programName?: string;
    instructorName?: string;
    startDate?: Date;
    endDate?: Date;
    availability?: 'available' | 'waitlist' | 'full';
    difficulty?: number[];
  };
}

export interface GetLessonsOutput {
  lessons: Array<{
    id: string;
    studioName: string;
    studioCode: string;
    programName: string;
    instructorName: string;
    startTime: Date;
    endTime: Date;
    availability: 'available' | 'waitlist' | 'full';
    difficulty: number;
    description?: string;
    canBook: boolean;
    difficultyCategory: 'beginner' | 'intermediate' | 'advanced';
  }>;
  totalCount: number;
}

export class GetRecommendedLessonsUseCase extends BaseUseCase<GetRecommendedLessonsInput, GetRecommendedLessonsOutput> {
  constructor(
    private lessonRepository: LessonRepository,
    private userPreferencesRepository: UserPreferencesRepository
  ) {
    super();
  }

  async execute(input: GetRecommendedLessonsInput): Promise<GetRecommendedLessonsOutput> {
    try {
      const userPreferences = await this.userPreferencesRepository.findByUserId(input.userId);
      if (!userPreferences) {
        return { recommendations: [], totalCount: 0 };
      }

      const allLessons = await this.lessonRepository.findAvailable();
      
      const recommendations = allLessons
        .map(lesson => ({
          lesson,
          score: UserPreferencesDomainService.calculateRecommendationScore(lesson, userPreferences)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, input.limit || 10)
        .map(({ lesson, score }) => ({
          id: lesson.id,
          studioName: lesson.studioName,
          studioCode: lesson.studioCode,
          programName: lesson.programName,
          instructorName: lesson.instructorName,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          availability: lesson.availability,
          difficulty: lesson.difficulty,
          recommendationScore: score,
          reasons: this.generateRecommendationReasons(lesson, userPreferences, score)
        }));

      return {
        recommendations,
        totalCount: recommendations.length
      };
    } catch (error) {
      this.handleError(error as Error, 'GetRecommendedLessons');
    }
  }

  private generateRecommendationReasons(
    lesson: LessonEntity, 
    preferences: UserPreferences, 
    score: number
  ): string[] {
    const reasons: string[] = [];
    
    if (preferences.favoriteStudios.includes(lesson.studioCode)) {
      reasons.push(`Favorite studio: ${lesson.studioName}`);
    }
    
    if (preferences.favoriteInstructors.includes(lesson.instructorName)) {
      reasons.push(`Favorite instructor: ${lesson.instructorName}`);
    }
    
    const interestedProgram = preferences.interestedLessons
      .find(p => p.programName === lesson.programName);
    if (interestedProgram) {
      reasons.push(`Interested in ${lesson.programName}`);
    }
    
    return reasons;
  }
}

export interface GetRecommendedLessonsInput {
  userId: string;
  limit?: number;
}

export interface GetRecommendedLessonsOutput {
  recommendations: Array<{
    id: string;
    studioName: string;
    studioCode: string;
    programName: string;
    instructorName: string;
    startTime: Date;
    endTime: Date;
    availability: 'available' | 'waitlist' | 'full';
    difficulty: number;
    recommendationScore: number;
    reasons: string[];
  }>;
  totalCount: number;
}

// =============================
// 待機リスト関連ユースケース
// =============================

export class JoinWaitlistUseCase extends BaseUseCase<JoinWaitlistInput, JoinWaitlistOutput> {
  constructor(private unitOfWork: UnitOfWork) {
    super();
  }

  async execute(input: JoinWaitlistInput): Promise<JoinWaitlistOutput> {
    try {
      await this.unitOfWork.begin();

      // レッスンの存在確認
      const lesson = await this.unitOfWork.lessonRepository.findById(input.lessonId);
      if (!lesson) {
        throw new Error('Lesson not found');
      }

      // 既に待機リストに登録済みかチェック
      const existingEntries = await this.unitOfWork.waitlistRepository.findByLesson(input.lessonId);
      const userAlreadyInWaitlist = existingEntries.some(
        entry => entry.userId === input.userId && entry.status === 'active'
      );

      if (userAlreadyInWaitlist) {
        throw new Error('User already in waitlist for this lesson');
      }

      // 待機リストに登録
      const waitlistEntry = await this.unitOfWork.waitlistRepository.addToWaitlist(
        input.lessonId,
        input.userId
      );

      // 位置の計算と更新
      const allEntries = await this.unitOfWork.waitlistRepository.findByLesson(input.lessonId);
      const position = WaitlistDomainService.calculatePosition(waitlistEntry, allEntries);
      await this.unitOfWork.waitlistRepository.updatePosition(waitlistEntry.id, position);

      await this.unitOfWork.commit();

      return {
        success: true,
        waitlistEntry: {
          id: waitlistEntry.id,
          lessonId: waitlistEntry.lessonId,
          position,
          registeredAt: waitlistEntry.registeredAt,
          estimatedWaitTime: this.estimateWaitTime(position, lesson)
        }
      };
    } catch (error) {
      await this.unitOfWork.rollback();
      this.handleError(error as Error, 'JoinWaitlist');
    } finally {
      await this.unitOfWork.dispose();
    }
  }

  private estimateWaitTime(position: number, lesson: LessonEntity): number {
    // 簡単な待機時間推定（実際にはより複雑な計算が必要）
    const avgDropoutRate = 0.3; // 30%の人がキャンセル
    const effectivePosition = Math.ceil(position * (1 - avgDropoutRate));
    const hoursUntilLesson = (lesson.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    
    return Math.max(effectivePosition * 2, hoursUntilLesson * 60); // 分単位
  }
}

export interface JoinWaitlistInput {
  lessonId: string;
  userId: string;
}

export interface JoinWaitlistOutput {
  success: boolean;
  waitlistEntry: {
    id: string;
    lessonId: string;
    position: number;
    registeredAt: Date;
    estimatedWaitTime: number; // minutes
  };
}

export class GetWaitlistStatusUseCase extends BaseUseCase<GetWaitlistStatusInput, GetWaitlistStatusOutput> {
  constructor(private waitlistRepository: WaitlistRepository) {
    super();
  }

  async execute(input: GetWaitlistStatusInput): Promise<GetWaitlistStatusOutput> {
    try {
      const entries = await this.waitlistRepository.findByUser(input.userId);
      const activeEntries = entries.filter(entry => entry.status === 'active');

      return {
        entries: activeEntries.map(entry => ({
          id: entry.id,
          lessonId: entry.lessonId,
          position: entry.position || 0,
          registeredAt: entry.registeredAt,
          status: entry.status
        })),
        totalActiveEntries: activeEntries.length
      };
    } catch (error) {
      this.handleError(error as Error, 'GetWaitlistStatus');
    }
  }
}

export interface GetWaitlistStatusInput {
  userId: string;
}

export interface GetWaitlistStatusOutput {
  entries: Array<{
    id: string;
    lessonId: string;
    position: number;
    registeredAt: Date;
    status: string;
  }>;
  totalActiveEntries: number;
}

// =============================
// ユーザー設定関連ユースケース
// =============================

export class UpdateUserPreferencesUseCase extends BaseUseCase<UpdateUserPreferencesInput, UpdateUserPreferencesOutput> {
  constructor(private userPreferencesRepository: UserPreferencesRepository) {
    super();
  }

  async execute(input: UpdateUserPreferencesInput): Promise<UpdateUserPreferencesOutput> {
    try {
      const currentPreferences = await this.userPreferencesRepository.findByUserId(input.userId) || {
        favoriteStudios: [],
        favoriteInstructors: [],
        interestedLessons: [],
        notificationSettings: {
          enableLineNotifications: true,
          enableEmailNotifications: false,
          notificationTiming: 30
        }
      };

      const updatedPreferences: UserPreferences = {
        ...currentPreferences,
        ...input.preferences
      };

      // 設定の妥当性チェック
      if (input.preferences.notificationSettings) {
        const validation = UserPreferencesDomainService.validateNotificationSettings(
          input.preferences.notificationSettings
        );
        
        if (!validation.isValid) {
          throw new Error(`Invalid notification settings: ${validation.errors.join(', ')}`);
        }
      }

      await this.userPreferencesRepository.save(input.userId, updatedPreferences);

      return {
        success: true,
        preferences: updatedPreferences
      };
    } catch (error) {
      this.handleError(error as Error, 'UpdateUserPreferences');
    }
  }
}

export interface UpdateUserPreferencesInput {
  userId: string;
  preferences: Partial<UserPreferences>;
}

export interface UpdateUserPreferencesOutput {
  success: boolean;
  preferences: UserPreferences;
}

// =============================
// 統計・分析ユースケース
// =============================

export class GetDashboardStatsUseCase extends BaseUseCase<GetDashboardStatsInput, GetDashboardStatsOutput> {
  constructor(
    private lessonRepository: LessonRepository,
    private waitlistRepository: WaitlistRepository,
    private userPreferencesRepository: UserPreferencesRepository
  ) {
    super();
  }

  async execute(input: GetDashboardStatsInput): Promise<GetDashboardStatsOutput> {
    try {
      const [
        availableLessons,
        userWaitlist,
        userPreferences,
        popularPrograms,
        studioStats
      ] = await Promise.all([
        this.lessonRepository.findAvailable(),
        this.waitlistRepository.findByUser(input.userId),
        this.userPreferencesRepository.findByUserId(input.userId),
        this.lessonRepository.getPopularPrograms(5),
        this.lessonRepository.getStudioStatistics()
      ]);

      const activeWaitlist = userWaitlist.filter(entry => entry.status === 'active');

      return {
        stats: {
          totalAvailableLessons: availableLessons.length,
          totalWaitlistEntries: activeWaitlist.length,
          favoriteStudiosCount: userPreferences?.favoriteStudios.length || 0,
          favoriteInstructorsCount: userPreferences?.favoriteInstructors.length || 0
        },
        insights: {
          popularPrograms,
          studioAvailability: studioStats.map(stat => ({
            studioCode: stat.studioCode,
            availabilityPercentage: stat.availability
          }))
        },
        recommendations: {
          suggestedStudios: this.getSuggestedStudios(studioStats, userPreferences),
          upcomingNotifications: this.getUpcomingNotifications(activeWaitlist)
        }
      };
    } catch (error) {
      this.handleError(error as Error, 'GetDashboardStats');
    }
  }

  private getSuggestedStudios(
    studioStats: Array<{ studioCode: string; lessonsCount: number; availability: number }>,
    userPreferences?: UserPreferences
  ): string[] {
    return studioStats
      .filter(stat => !userPreferences?.favoriteStudios.includes(stat.studioCode))
      .sort((a, b) => b.availability - a.availability)
      .slice(0, 3)
      .map(stat => stat.studioCode);
  }

  private getUpcomingNotifications(waitlistEntries: WaitlistEntity[]): number {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return waitlistEntries.filter(entry => {
      const registeredTime = entry.registeredAt;
      return registeredTime >= now && registeredTime <= next24Hours;
    }).length;
  }
}

export interface GetDashboardStatsInput {
  userId: string;
}

export interface GetDashboardStatsOutput {
  stats: {
    totalAvailableLessons: number;
    totalWaitlistEntries: number;
    favoriteStudiosCount: number;
    favoriteInstructorsCount: number;
  };
  insights: {
    popularPrograms: Array<{ programName: string; count: number }>;
    studioAvailability: Array<{ studioCode: string; availabilityPercentage: number }>;
  };
  recommendations: {
    suggestedStudios: string[];
    upcomingNotifications: number;
  };
}