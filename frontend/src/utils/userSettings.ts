// ユーザー設定の永続化管理

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