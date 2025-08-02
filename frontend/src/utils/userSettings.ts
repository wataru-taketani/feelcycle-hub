// ユーザー設定の永続化管理（LocalStorage + サーバーサイドAPI統合）

import { fetchUserFavorites, saveUserFavorites, syncUserFavorites, checkApiAvailability } from '@/services/userPreferencesApi';

const USER_SETTINGS_KEY = 'feelcycle-hub-user-settings';

export interface UserSettings {
  favoriteInstructors: string[];
  favoriteStudios: string[];
  notifications: {
    cancelWaiting: boolean;
    autoBooking: boolean;
    lessonReminder: boolean;
  };
  profile: {
    displayName: string;
    email: string;
    homeStudio: string;
    membershipType: string;
  };
}

// デフォルト設定
const defaultSettings: UserSettings = {
  favoriteInstructors: [],
  favoriteStudios: [],
  notifications: {
    cancelWaiting: true,
    autoBooking: true,
    lessonReminder: false,
  },
  profile: {
    displayName: '',
    email: '',
    homeStudio: '',
    membershipType: ''
  }
};

/**
 * ユーザー設定をlocalStorageから取得
 */
export function getUserSettings(): UserSettings {
  if (typeof window === 'undefined') return defaultSettings;
  
  try {
    const stored = localStorage.getItem(USER_SETTINGS_KEY);
    if (!stored) return defaultSettings;
    
    const parsed = JSON.parse(stored) as UserSettings;
    
    // マイグレーション: 不足している設定項目をデフォルト値で補完
    return {
      favoriteInstructors: parsed.favoriteInstructors || [],
      favoriteStudios: parsed.favoriteStudios || [],
      notifications: {
        ...defaultSettings.notifications,
        ...parsed.notifications
      },
      profile: {
        ...defaultSettings.profile,
        ...parsed.profile
      }
    };
  } catch (error) {
    console.error('Failed to get user settings from localStorage:', error);
    return defaultSettings;
  }
}

/**
 * ユーザー設定をlocalStorageに保存
 */
export function saveUserSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save user settings to localStorage:', error);
  }
}

/**
 * お気に入りインストラクターを追加
 */
export function addFavoriteInstructor(instructorId: string): void {
  const settings = getUserSettings();
  if (!settings.favoriteInstructors.includes(instructorId)) {
    settings.favoriteInstructors.push(instructorId);
    saveUserSettings(settings);
  }
}

/**
 * お気に入りインストラクターを削除
 */
export function removeFavoriteInstructor(instructorId: string): void {
  const settings = getUserSettings();
  settings.favoriteInstructors = settings.favoriteInstructors.filter(id => id !== instructorId);
  saveUserSettings(settings);
}

/**
 * お気に入りスタジオを追加
 */
export function addFavoriteStudio(studioId: string): void {
  const settings = getUserSettings();
  if (!settings.favoriteStudios.includes(studioId)) {
    settings.favoriteStudios.push(studioId);
    saveUserSettings(settings);
  }
}

/**
 * お気に入りスタジオを削除
 */
export function removeFavoriteStudio(studioId: string): void {
  const settings = getUserSettings();
  settings.favoriteStudios = settings.favoriteStudios.filter(id => id !== studioId);
  saveUserSettings(settings);
}

/**
 * 通知設定を更新
 */
export function updateNotificationSettings(notifications: UserSettings['notifications']): void {
  const settings = getUserSettings();
  settings.notifications = notifications;
  saveUserSettings(settings);
}

/**
 * プロフィール設定を更新
 */
export function updateProfileSettings(profile: UserSettings['profile']): void {
  const settings = getUserSettings();
  settings.profile = profile;
  saveUserSettings(settings);
}

/**
 * ユーザー設定をクリア
 */
export function clearUserSettings(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(USER_SETTINGS_KEY);
  } catch (error) {
    console.error('Failed to clear user settings:', error);
  }
}

// ==========================================
// サーバーサイドAPI統合機能
// ==========================================

/**
 * サーバーサイドからお気に入りを同期して取得
 */
export async function getUserFavoritesWithSync(userId?: string): Promise<UserSettings> {
  const localSettings = getUserSettings();
  
  // ユーザーIDがない場合はローカル設定のみ返す
  if (!userId) {
    console.log('No userId provided, returning local settings only');
    return localSettings;
  }
  
  try {
    // API可用性チェック
    const apiAvailable = await checkApiAvailability();
    if (!apiAvailable) {
      console.log('API not available, using local settings');
      return localSettings;
    }
    
    // サーバーとの同期
    const syncedFavorites = await syncUserFavorites(userId, {
      favoriteInstructors: localSettings.favoriteInstructors,
      favoriteStudios: localSettings.favoriteStudios,
    });
    
    if (syncedFavorites) {
      // 同期結果をローカルに保存
      const updatedSettings: UserSettings = {
        ...localSettings,
        favoriteInstructors: syncedFavorites.favoriteInstructors,
        favoriteStudios: syncedFavorites.favoriteStudios,
      };
      
      saveUserSettings(updatedSettings);
      console.log('✅ User favorites synced with server');
      return updatedSettings;
    }
    
  } catch (error) {
    console.error('Error syncing with server, using local settings:', error);
  }
  
  return localSettings;
}

/**
 * お気に入りをサーバーとローカルの両方に保存
 */
export async function saveFavoritesToServer(
  userId: string,
  favoriteInstructors: string[],
  favoriteStudios: string[]
): Promise<boolean> {
  try {
    // ローカルにも保存
    const currentSettings = getUserSettings();
    const updatedSettings: UserSettings = {
      ...currentSettings,
      favoriteInstructors,
      favoriteStudios,
    };
    saveUserSettings(updatedSettings);
    
    // サーバーに保存
    const success = await saveUserFavorites(userId, {
      favoriteInstructors,
      favoriteStudios,
    });
    
    if (success) {
      console.log('✅ Favorites saved to both local and server');
      return true;
    } else {
      console.warn('⚠️  Server save failed, but local save succeeded');
      return false;
    }
    
  } catch (error) {
    console.error('Error saving favorites to server:', error);
    return false;
  }
}

/**
 * お気に入りインストラクターを追加（サーバー統合版）
 */
export async function addFavoriteInstructorWithSync(instructorId: string, userId?: string): Promise<void> {
  const settings = getUserSettings();
  if (!settings.favoriteInstructors.includes(instructorId)) {
    const updatedInstructors = [...settings.favoriteInstructors, instructorId];
    
    // ローカル更新
    settings.favoriteInstructors = updatedInstructors;
    saveUserSettings(settings);
    
    // サーバー同期（非同期、エラーがあってもローカル更新は成功扱い）
    if (userId) {
      saveFavoritesToServer(userId, updatedInstructors, settings.favoriteStudios).catch(error => {
        console.warn('Failed to sync instructor favorite to server:', error);
      });
    }
  }
}

/**
 * お気に入りインストラクターを削除（サーバー統合版）
 */
export async function removeFavoriteInstructorWithSync(instructorId: string, userId?: string): Promise<void> {
  const settings = getUserSettings();
  const updatedInstructors = settings.favoriteInstructors.filter(id => id !== instructorId);
  
  // ローカル更新
  settings.favoriteInstructors = updatedInstructors;
  saveUserSettings(settings);
  
  // サーバー同期（非同期、エラーがあってもローカル更新は成功扱い）
  if (userId) {
    saveFavoritesToServer(userId, updatedInstructors, settings.favoriteStudios).catch(error => {
      console.warn('Failed to sync instructor favorite removal to server:', error);
    });
  }
}

/**
 * お気に入りスタジオを追加（サーバー統合版）
 */
export async function addFavoriteStudioWithSync(studioId: string, userId?: string): Promise<void> {
  const settings = getUserSettings();
  if (!settings.favoriteStudios.includes(studioId)) {
    const updatedStudios = [...settings.favoriteStudios, studioId];
    
    // ローカル更新
    settings.favoriteStudios = updatedStudios;
    saveUserSettings(settings);
    
    // サーバー同期（非同期、エラーがあってもローカル更新は成功扱い）
    if (userId) {
      saveFavoritesToServer(userId, settings.favoriteInstructors, updatedStudios).catch(error => {
        console.warn('Failed to sync studio favorite to server:', error);
      });
    }
  }
}

/**
 * お気に入りスタジオを削除（サーバー統合版）
 */
export async function removeFavoriteStudioWithSync(studioId: string, userId?: string): Promise<void> {
  const settings = getUserSettings();
  const updatedStudios = settings.favoriteStudios.filter(id => id !== studioId);
  
  // ローカル更新
  settings.favoriteStudios = updatedStudios;
  saveUserSettings(settings);
  
  // サーバー同期（非同期、エラーがあってもローカル更新は成功扱い）
  if (userId) {
    saveFavoritesToServer(userId, settings.favoriteInstructors, updatedStudios).catch(error => {
      console.warn('Failed to sync studio favorite removal to server:', error);
    });
  }
}