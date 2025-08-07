/**
 * ドメインサービス
 * Phase 4.1: アーキテクチャリファクタリング
 */

import { LessonEntity, InstructorEntity, WaitlistEntity, TimeSlot, StudioCode } from '../models';
import { DomainLayer } from '../../architecture';

// =============================
// レッスン関連ドメインサービス
// =============================

export class LessonDomainService {
  /**
   * レッスンの競合チェック
   */
  static hasConflict(lesson1: LessonEntity, lesson2: LessonEntity): boolean {
    const timeSlot1 = new TimeSlot(lesson1.startTime, lesson1.endTime);
    const timeSlot2 = new TimeSlot(lesson2.startTime, lesson2.endTime);
    
    return timeSlot1.overlaps(timeSlot2) && 
           lesson1.studioCode === lesson2.studioCode;
  }

  /**
   * レッスンの予約可能性判定
   */
  static canBook(lesson: LessonEntity): boolean {
    const now = new Date();
    const bookingDeadline = new Date(lesson.startTime.getTime() - 30 * 60 * 1000); // 30分前
    
    return lesson.isBookable() && now <= bookingDeadline;
  }

  /**
   * レッスンの難易度カテゴリ取得
   */
  static getDifficultyCategory(difficulty: number): 'beginner' | 'intermediate' | 'advanced' {
    if (difficulty <= 2) return 'beginner';
    if (difficulty <= 4) return 'intermediate';
    return 'advanced';
  }

  /**
   * インストラクターとレッスンの相性スコア計算
   */
  static calculateInstructorCompatibilityScore(
    lesson: LessonEntity,
    instructor: InstructorEntity
  ): number {
    let score = 0;
    
    // 専門プログラム一致度
    if (instructor.specialties.includes(lesson.programName)) {
      score += 50;
    }
    
    // 評価による加点
    if (instructor.rating) {
      score += instructor.rating * 10;
    }
    
    // スタジオ一致度
    if (instructor.studioCode === lesson.studioCode) {
      score += 20;
    }
    
    return Math.min(score, 100);
  }
}

// =============================
// 待機リスト関連ドメインサービス
// =============================

export class WaitlistDomainService {
  /**
   * 待機リストの位置計算
   */
  static calculatePosition(
    entry: WaitlistEntity,
    allEntries: WaitlistEntity[]
  ): number {
    const sameLesson = allEntries
      .filter(e => e.lessonId === entry.lessonId && e.status === 'active')
      .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());
    
    return sameLesson.findIndex(e => e.id === entry.id) + 1;
  }

  /**
   * 待機リストの通知タイミング判定
   */
  static shouldNotify(entry: WaitlistEntity, lesson: LessonEntity): boolean {
    const now = new Date();
    const lessonTime = lesson.startTime;
    const timeDiff = lessonTime.getTime() - now.getTime();
    const hoursUntilLesson = timeDiff / (1000 * 60 * 60);
    
    // レッスン開始24時間以内で、まだ通知していない場合
    return hoursUntilLesson <= 24 && hoursUntilLesson > 0 && entry.status === 'active';
  }

  /**
   * 待機リストの優先度計算
   */
  static calculatePriority(
    entry: WaitlistEntry,
    userPreferences: { favoriteInstructors: string[]; favoriteStudios: string[] },
    lesson: LessonEntity
  ): number {
    let priority = 0;
    
    // 登録順による基本優先度
    priority += 100 - (entry.position || 99);
    
    // お気に入りインストラクターによる加点
    if (userPreferences.favoriteInstructors.includes(lesson.instructorName)) {
      priority += 20;
    }
    
    // お気に入りスタジオによる加点
    if (userPreferences.favoriteStudios.includes(lesson.studioCode)) {
      priority += 10;
    }
    
    return priority;
  }
}

// =============================
// ユーザー設定関連ドメインサービス
// =============================

export class UserPreferencesDomainService {
  /**
   * レッスン推奨度スコア計算
   */
  static calculateRecommendationScore(
    lesson: LessonEntity,
    preferences: {
      favoriteStudios: string[];
      favoriteInstructors: string[];
      interestedLessons: Array<{ programName: string; weight: number }>;
    }
  ): number {
    let score = 0;
    
    // スタジオ好み
    if (preferences.favoriteStudios.includes(lesson.studioCode)) {
      score += 30;
    }
    
    // インストラクター好み
    if (preferences.favoriteInstructors.includes(lesson.instructorName)) {
      score += 40;
    }
    
    // プログラム興味度
    const interestedProgram = preferences.interestedLessons
      .find(p => p.programName === lesson.programName);
    if (interestedProgram) {
      score += interestedProgram.weight * 30;
    }
    
    return Math.min(score, 100);
  }

  /**
   * 通知設定の妥当性チェック
   */
  static validateNotificationSettings(settings: {
    enableLineNotifications: boolean;
    enableEmailNotifications: boolean;
    notificationTiming: number;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!settings.enableLineNotifications && !settings.enableEmailNotifications) {
      errors.push('At least one notification method must be enabled');
    }
    
    if (settings.notificationTiming < 5 || settings.notificationTiming > 1440) {
      errors.push('Notification timing must be between 5 minutes and 24 hours');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// =============================
// スケジュール関連ドメインサービス
// =============================

export class ScheduleDomainService {
  /**
   * スケジュールの最適化
   */
  static optimizeSchedule(
    lessons: LessonEntity[],
    preferences: { maxLessonsPerDay: number; preferredTimeSlots: string[] }
  ): LessonEntity[] {
    // 日付ごとにグループ化
    const lessonsByDate = new Map<string, LessonEntity[]>();
    
    lessons.forEach(lesson => {
      const dateKey = lesson.startTime.toDateString();
      if (!lessonsByDate.has(dateKey)) {
        lessonsByDate.set(dateKey, []);
      }
      lessonsByDate.get(dateKey)!.push(lesson);
    });
    
    // 各日の最適化
    const optimizedLessons: LessonEntity[] = [];
    
    lessonsByDate.forEach((dayLessons, date) => {
      // 時間帯別優先度適用
      const prioritizedLessons = dayLessons
        .sort((a, b) => {
          const aTimeSlot = this.getTimeSlotCategory(a.startTime);
          const bTimeSlot = this.getTimeSlotCategory(b.startTime);
          
          const aPriority = preferences.preferredTimeSlots.includes(aTimeSlot) ? 1 : 0;
          const bPriority = preferences.preferredTimeSlots.includes(bTimeSlot) ? 1 : 0;
          
          return bPriority - aPriority;
        })
        .slice(0, preferences.maxLessonsPerDay);
      
      optimizedLessons.push(...prioritizedLessons);
    });
    
    return optimizedLessons;
  }

  private static getTimeSlotCategory(time: Date): string {
    const hour = time.getHours();
    
    if (hour < 10) return 'morning';
    if (hour < 14) return 'midday';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  /**
   * スケジュールの競合検出
   */
  static detectConflicts(lessons: LessonEntity[]): Array<{
    lesson1: LessonEntity;
    lesson2: LessonEntity;
    conflictType: 'time' | 'travel';
  }> {
    const conflicts: Array<{
      lesson1: LessonEntity;
      lesson2: LessonEntity;
      conflictType: 'time' | 'travel';
    }> = [];
    
    for (let i = 0; i < lessons.length; i++) {
      for (let j = i + 1; j < lessons.length; j++) {
        const lesson1 = lessons[i];
        const lesson2 = lessons[j];
        
        if (LessonDomainService.hasConflict(lesson1, lesson2)) {
          conflicts.push({
            lesson1,
            lesson2,
            conflictType: lesson1.studioCode === lesson2.studioCode ? 'time' : 'travel'
          });
        }
      }
    }
    
    return conflicts;
  }
}

// =============================
// ファクトリーサービス
// =============================

export class DomainFactory {
  static createLesson(data: any): LessonEntity {
    return new LessonEntity({
      id: data.id,
      studioName: data.studioName,
      studioCode: data.studioCode,
      programName: data.programName,
      instructorName: data.instructorName,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      availability: data.availability,
      difficulty: data.difficulty,
      description: data.description
    });
  }

  static createInstructor(data: any): InstructorEntity {
    return new InstructorEntity({
      id: data.id,
      name: data.name,
      studioCode: data.studioCode,
      bio: data.bio,
      specialties: data.specialties || [],
      rating: data.rating
    });
  }

  static createWaitlistEntry(data: any): WaitlistEntity {
    return new WaitlistEntity({
      id: data.id,
      lessonId: data.lessonId,
      userId: data.userId,
      position: data.position,
      registeredAt: new Date(data.registeredAt),
      status: data.status
    });
  }
}