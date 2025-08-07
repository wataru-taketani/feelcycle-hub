// 気になるリストの永続化管理

const INTERESTED_LESSONS_KEY = 'feelcycle-hub-interested-lessons';

export interface InterestedLessonData {
  lessonId: string;
  addedAt: string; // ISO timestamp
  lessonDate: string;
  lessonTime: string;
  program: string;
  instructor: string;
  studioCode: string;
  studioName: string;
}

/**
 * 気になるリストをlocalStorageから取得
 */
export function getInterestedLessons(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(INTERESTED_LESSONS_KEY);
    if (!stored) return [];
    
    const data = JSON.parse(stored) as InterestedLessonData[];
    
    // 過去のレッスンを自動削除（7日前より古いもの）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const filtered = data.filter(item => {
      const lessonDate = new Date(item.lessonDate);
      return lessonDate >= sevenDaysAgo;
    });
    
    // フィルタリング後にストレージを更新
    if (filtered.length !== data.length) {
      localStorage.setItem(INTERESTED_LESSONS_KEY, JSON.stringify(filtered));
    }
    
    return filtered.map(item => item.lessonId);
  } catch (error) {
    console.error('Failed to get interested lessons from localStorage:', error);
    return [];
  }
}

/**
 * 気になるレッスンを追加
 */
export function addInterestedLesson(lesson: Omit<InterestedLessonData, 'addedAt'>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getInterestedLessonsData();
    const exists = current.some(item => item.lessonId === lesson.lessonId);
    
    if (!exists) {
      const newLesson: InterestedLessonData = {
        ...lesson,
        addedAt: new Date().toISOString()
      };
      
      current.push(newLesson);
      localStorage.setItem(INTERESTED_LESSONS_KEY, JSON.stringify(current));
    }
  } catch (error) {
    console.error('Failed to add interested lesson:', error);
  }
}

/**
 * 気になるレッスンを削除
 */
export function removeInterestedLesson(lessonId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getInterestedLessonsData();
    const filtered = current.filter(item => item.lessonId !== lessonId);
    localStorage.setItem(INTERESTED_LESSONS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove interested lesson:', error);
  }
}

/**
 * 詳細データを取得（内部用）
 */
function getInterestedLessonsData(): InterestedLessonData[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(INTERESTED_LESSONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to parse interested lessons data:', error);
    return [];
  }
}

/**
 * 気になるリストの詳細データを取得（表示用）
 */
export function getInterestedLessonsData_(): InterestedLessonData[] {
  return getInterestedLessonsData();
}

/**
 * 気になるリストをクリア
 */
export function clearInterestedLessons(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(INTERESTED_LESSONS_KEY);
  } catch (error) {
    console.error('Failed to clear interested lessons:', error);
  }
}