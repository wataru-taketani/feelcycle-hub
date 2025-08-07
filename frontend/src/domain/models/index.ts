/**
 * ドメインモデル定義
 * Phase 4.1: アーキテクチャリファクタリング
 */

import { DomainLayer } from '../../architecture';

// =============================
// 基本エンティティ
// =============================

export abstract class BaseEntity implements DomainLayer.Entity {
  public id: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(id: string, createdAt?: Date, updatedAt?: Date) {
    this.id = id;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  protected updateTimestamp(): void {
    this.updatedAt = new Date();
  }
}

// =============================
// ユーザー関連
// =============================

export interface UserPreferences {
  favoriteStudios: string[];
  favoriteInstructors: string[];
  interestedLessons: InterestedLesson[];
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  enableLineNotifications: boolean;
  enableEmailNotifications: boolean;
  notificationTiming: number; // minutes before lesson
}

// =============================
// レッスン関連
// =============================

export interface Lesson extends DomainLayer.Entity {
  studioName: string;
  studioCode: string;
  programName: string;
  instructorName: string;
  startTime: Date;
  endTime: Date;
  availability: 'available' | 'waitlist' | 'full';
  difficulty: number;
  description?: string;
}

export class LessonEntity extends BaseEntity implements Lesson {
  public studioName: string;
  public studioCode: string;
  public programName: string;
  public instructorName: string;
  public startTime: Date;
  public endTime: Date;
  public availability: 'available' | 'waitlist' | 'full';
  public difficulty: number;
  public description?: string;

  constructor(data: Omit<Lesson, keyof DomainLayer.Entity>) {
    super(data.id || `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    this.studioName = data.studioName;
    this.studioCode = data.studioCode;
    this.programName = data.programName;
    this.instructorName = data.instructorName;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.availability = data.availability;
    this.difficulty = data.difficulty;
    this.description = data.description;
  }

  public updateAvailability(availability: Lesson['availability']): void {
    this.availability = availability;
    this.updateTimestamp();
  }

  public isBookable(): boolean {
    return this.availability === 'available' && this.startTime > new Date();
  }

  public isWaitlistAvailable(): boolean {
    return this.availability === 'waitlist' && this.startTime > new Date();
  }
}

// =============================
// インストラクター関連
// =============================

export interface Instructor extends DomainLayer.Entity {
  name: string;
  studioCode: string;
  bio?: string;
  specialties: string[];
  rating?: number;
}

export class InstructorEntity extends BaseEntity implements Instructor {
  public name: string;
  public studioCode: string;
  public bio?: string;
  public specialties: string[];
  public rating?: number;

  constructor(data: Omit<Instructor, keyof DomainLayer.Entity>) {
    super(data.id || `instructor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    this.name = data.name;
    this.studioCode = data.studioCode;
    this.bio = data.bio;
    this.specialties = data.specialties;
    this.rating = data.rating;
  }

  public addSpecialty(specialty: string): void {
    if (!this.specialties.includes(specialty)) {
      this.specialties.push(specialty);
      this.updateTimestamp();
    }
  }

  public updateRating(rating: number): void {
    if (rating >= 0 && rating <= 5) {
      this.rating = rating;
      this.updateTimestamp();
    }
  }
}

// =============================
// 待機リスト関連
// =============================

export interface WaitlistEntry extends DomainLayer.Entity {
  lessonId: string;
  userId: string;
  position?: number;
  registeredAt: Date;
  status: 'active' | 'cancelled' | 'fulfilled';
}

export class WaitlistEntity extends BaseEntity implements WaitlistEntry {
  public lessonId: string;
  public userId: string;
  public position?: number;
  public registeredAt: Date;
  public status: 'active' | 'cancelled' | 'fulfilled';

  constructor(data: Omit<WaitlistEntry, keyof DomainLayer.Entity>) {
    super(data.id || `waitlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    this.lessonId = data.lessonId;
    this.userId = data.userId;
    this.position = data.position;
    this.registeredAt = data.registeredAt || new Date();
    this.status = data.status || 'active';
  }

  public cancel(): void {
    this.status = 'cancelled';
    this.updateTimestamp();
  }

  public fulfill(): void {
    this.status = 'fulfilled';
    this.updateTimestamp();
  }

  public updatePosition(position: number): void {
    this.position = position;
    this.updateTimestamp();
  }
}

// =============================
// 値オブジェクト
// =============================

export class StudioCode {
  private constructor(private value: string) {
    if (!this.isValid(value)) {
      throw new Error(`Invalid studio code: ${value}`);
    }
  }

  static create(value: string): StudioCode {
    return new StudioCode(value);
  }

  public getValue(): string {
    return this.value;
  }

  private isValid(value: string): boolean {
    return /^[A-Z]{2,4}$/.test(value); // 2-4文字の大文字アルファベット
  }

  public equals(other: StudioCode): boolean {
    return this.value === other.value;
  }
}

export class TimeSlot {
  constructor(
    private startTime: Date,
    private endTime: Date
  ) {
    if (startTime >= endTime) {
      throw new Error('Start time must be before end time');
    }
  }

  public getStartTime(): Date {
    return this.startTime;
  }

  public getEndTime(): Date {
    return this.endTime;
  }

  public getDuration(): number {
    return this.endTime.getTime() - this.startTime.getTime();
  }

  public overlaps(other: TimeSlot): boolean {
    return this.startTime < other.endTime && this.endTime > other.startTime;
  }

  public contains(date: Date): boolean {
    return date >= this.startTime && date <= this.endTime;
  }
}

// =============================
// 型エクスポート
// =============================

export type { InterestedLesson } from '../../utils/interestedLessons';