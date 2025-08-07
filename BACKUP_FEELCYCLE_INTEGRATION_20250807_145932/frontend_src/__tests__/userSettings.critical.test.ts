/**
 * User Settings Critical Path Test
 * Phase 1前段 Light - Essential Favorites Management Test
 */

// Mock localStorage properly for Next.js environment
const mockStorage = {
  data: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockStorage.data[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage.data[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage.data[key];
  }),
  clear: jest.fn(() => {
    mockStorage.data = {};
  })
};

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
  writable: true
});

import { 
  getUserSettings, 
  addFavoriteInstructor, 
  removeFavoriteInstructor,
  addFavoriteStudio,
  removeFavoriteStudio
} from '@/utils/userSettings';

describe('User Settings - Critical Favorites Test', () => {
  beforeEach(() => {
    // Clear mock data before each test
    mockStorage.data = {};
    mockStorage.clear();
    jest.clearAllMocks();
  });

  test('[CRITICAL] お気に入り機能の基本動作', () => {
    // Test 1: 初期状態確認
    const initialSettings = getUserSettings();
    expect(initialSettings.favoriteInstructors).toEqual([]);
    expect(initialSettings.favoriteStudios).toEqual([]);

    // Test 2: インストラクター追加
    addFavoriteInstructor('TestInstructor001');
    const afterInstructorAdd = getUserSettings();
    expect(afterInstructorAdd.favoriteInstructors).toContain('TestInstructor001');
    expect(afterInstructorAdd.favoriteInstructors).toHaveLength(1);

    // Test 3: スタジオ追加
    addFavoriteStudio('TestStudio001');
    const afterStudioAdd = getUserSettings();
    expect(afterStudioAdd.favoriteStudios).toContain('TestStudio001');
    expect(afterStudioAdd.favoriteStudios).toHaveLength(1);
    // インストラクターも保持されているか確認
    expect(afterStudioAdd.favoriteInstructors).toContain('TestInstructor001');

    // Test 4: インストラクター削除
    removeFavoriteInstructor('TestInstructor001');
    const afterInstructorRemove = getUserSettings();
    expect(afterInstructorRemove.favoriteInstructors).not.toContain('TestInstructor001');
    expect(afterInstructorRemove.favoriteInstructors).toHaveLength(0);
    // スタジオは保持されているか確認
    expect(afterInstructorRemove.favoriteStudios).toContain('TestStudio001');

    // Test 5: スタジオ削除
    removeFavoriteStudio('TestStudio001');
    const afterStudioRemove = getUserSettings();
    expect(afterStudioRemove.favoriteStudios).not.toContain('TestStudio001');
    expect(afterStudioRemove.favoriteStudios).toHaveLength(0);
  });

  test('[CRITICAL] 重複追加防止機能', () => {
    // Clean start for this test
    mockStorage.data = {};
    
    const instructorId = 'DuplicateInstructor';
    const studioId = 'DuplicateStudio';

    // 同じ項目を複数回追加
    addFavoriteInstructor(instructorId);
    let settings = getUserSettings();
    expect(settings.favoriteInstructors).toContain(instructorId);
    
    // 重複追加 - 長さは変わらないはず
    const beforeLength = settings.favoriteInstructors.length;
    addFavoriteInstructor(instructorId); // 重複
    settings = getUserSettings();
    expect(settings.favoriteInstructors).toHaveLength(beforeLength);
    expect(settings.favoriteInstructors).toContain(instructorId);

    // スタジオでも同様にテスト
    addFavoriteStudio(studioId);
    settings = getUserSettings();
    expect(settings.favoriteStudios).toContain(studioId);
    
    const beforeStudioLength = settings.favoriteStudios.length;
    addFavoriteStudio(studioId); // 重複
    settings = getUserSettings();
    expect(settings.favoriteStudios).toHaveLength(beforeStudioLength);
    expect(settings.favoriteStudios).toContain(studioId);
  });

  test('[CRITICAL] localStorage永続化機能', () => {
    const instructorId = 'PersistentInstructor';
    const studioId = 'PersistentStudio';

    // データ追加
    addFavoriteInstructor(instructorId);
    addFavoriteStudio(studioId);

    // setItem が呼ばれることを確認
    expect(mockStorage.setItem).toHaveBeenCalled();

    // 保存されたデータが正しいことを確認
    const storageKey = 'feelcycle-hub-user-settings';
    const savedData = mockStorage.data[storageKey];
    expect(savedData).toBeDefined();

    const parsedData = JSON.parse(savedData);
    expect(parsedData.favoriteInstructors).toContain(instructorId);
    expect(parsedData.favoriteStudios).toContain(studioId);
  });

  test('[CRITICAL] 設定の型安全性と初期値', () => {
    const settings = getUserSettings();

    // 必須プロパティの存在確認
    expect(settings.favoriteInstructors).toBeDefined();
    expect(settings.favoriteStudios).toBeDefined();
    expect(settings.notifications).toBeDefined();
    expect(settings.profile).toBeDefined();

    // 型の確認
    expect(Array.isArray(settings.favoriteInstructors)).toBe(true);
    expect(Array.isArray(settings.favoriteStudios)).toBe(true);
    expect(typeof settings.notifications).toBe('object');
    expect(typeof settings.profile).toBe('object');

    // 初期値の確認
    expect(settings.notifications.cancelWaiting).toBe(true);
    expect(settings.notifications.autoBooking).toBe(true);
    expect(settings.notifications.lessonReminder).toBe(false);
    expect(settings.profile.displayName).toBe('');
    expect(settings.profile.email).toBe('');
  });
});