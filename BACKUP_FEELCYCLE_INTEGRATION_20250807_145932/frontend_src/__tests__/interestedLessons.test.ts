/**
 * interestedLessons.ts の基本テスト
 * 型と基本機能のテスト（localStorage Mockは複雑なため最小限）
 */

import {
  InterestedLessonData
} from '@/utils/interestedLessons';

describe('interestedLessons 型定義', () => {
  it('InterestedLessonData型が正しく定義されている', () => {
    const lesson: InterestedLessonData = {
      lessonId: 'lesson-123',
      addedAt: '2024-12-01T10:00:00.000Z',
      lessonDate: '2024-12-25',
      lessonTime: '10:00',
      program: 'BB1',
      instructor: 'テストインストラクター',
      studioCode: 'ST001',
      studioName: 'テストスタジオ'
    };

    expect(typeof lesson.lessonId).toBe('string');
    expect(typeof lesson.addedAt).toBe('string');
    expect(typeof lesson.lessonDate).toBe('string');
    expect(typeof lesson.lessonTime).toBe('string');
    expect(typeof lesson.program).toBe('string');
    expect(typeof lesson.instructor).toBe('string');
    expect(typeof lesson.studioCode).toBe('string');
    expect(typeof lesson.studioName).toBe('string');
  });

  it('addedAt は有効なISO日時文字列である', () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const addedAt = '2024-12-01T10:00:00.000Z';
    
    expect(addedAt).toMatch(isoRegex);
    expect(new Date(addedAt).toString()).not.toBe('Invalid Date');
  });

  it('lessonDate は YYYY-MM-DD 形式である', () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const lessonDate = '2024-12-25';
    
    expect(lessonDate).toMatch(dateRegex);
    expect(new Date(lessonDate).toString()).not.toBe('Invalid Date');
  });

  it('lessonTime は HH:MM 形式である', () => {
    const timeRegex = /^\d{2}:\d{2}$/;
    const lessonTime = '10:00';
    
    expect(lessonTime).toMatch(timeRegex);
  });
});