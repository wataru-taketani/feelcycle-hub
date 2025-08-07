// ユーザー設定のサーバーサイドAPI統合サービス
import axios from 'axios';
import { UserSettings } from '@/utils/userSettings';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
const API_TIMEOUT = 10000; // 10秒

export interface ServerUserFavorites {
  favoriteInstructors: string[];
  favoriteStudios: string[];
  updatedAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * サーバーサイドからお気に入りを取得
 */
export async function fetchUserFavorites(userId: string): Promise<ServerUserFavorites | null> {
  try {
    const response = await axios.get<ApiResponse<ServerUserFavorites>>(
      `${API_BASE_URL}/user/preferences/favorites`,
      {
        params: { userId },
        timeout: API_TIMEOUT,
      }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    console.warn('Failed to fetch user favorites:', response.data.message);
    return null;
  } catch (error) {
    console.error('Error fetching user favorites:', error);
    return null;
  }
}

/**
 * サーバーサイドにお気に入りを保存
 */
export async function saveUserFavorites(
  userId: string, 
  favorites: Pick<ServerUserFavorites, 'favoriteInstructors' | 'favoriteStudios'>
): Promise<boolean> {
  try {
    const response = await axios.put<ApiResponse<ServerUserFavorites>>(
      `${API_BASE_URL}/user/preferences/favorites`,
      {
        userId,
        favoriteInstructors: favorites.favoriteInstructors,
        favoriteStudios: favorites.favoriteStudios,
      },
      {
        timeout: API_TIMEOUT,
      }
    );

    if (response.data.success) {
      console.log('✅ User favorites saved to server:', response.data.message);
      return true;
    } else {
      console.warn('Failed to save user favorites:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('Error saving user favorites:', error);
    return false;
  }
}

/**
 * LocalStorageとサーバーの同期処理
 */
export async function syncUserFavorites(
  userId: string,
  localFavorites: Pick<UserSettings, 'favoriteInstructors' | 'favoriteStudios'>
): Promise<ServerUserFavorites | null> {
  try {
    // サーバーからデータを取得
    const serverFavorites = await fetchUserFavorites(userId);
    
    if (!serverFavorites) {
      // サーバーにデータがない場合、ローカルデータをアップロード
      console.log('📤 Uploading local favorites to server...');
      const success = await saveUserFavorites(userId, localFavorites);
      
      if (success) {
        return {
          favoriteInstructors: localFavorites.favoriteInstructors,
          favoriteStudios: localFavorites.favoriteStudios,
          updatedAt: new Date().toISOString(),
        };
      }
      return null;
    }

    // サーバーデータが存在する場合、マージロジック
    const mergedFavorites = mergeUserFavorites(localFavorites, serverFavorites);
    
    // マージした結果をサーバーに保存
    const success = await saveUserFavorites(userId, mergedFavorites);
    
    if (success) {
      return {
        ...mergedFavorites,
        updatedAt: new Date().toISOString(),
      };
    }
    
    return serverFavorites;
    
  } catch (error) {
    console.error('Error syncing user favorites:', error);
    return null;
  }
}

/**
 * ローカルとサーバーのお気に入りデータをマージ
 */
function mergeUserFavorites(
  local: Pick<UserSettings, 'favoriteInstructors' | 'favoriteStudios'>,
  server: ServerUserFavorites
): Pick<ServerUserFavorites, 'favoriteInstructors' | 'favoriteStudios'> {
  // 重複を排除して結合
  const mergedInstructors = [...new Set([...local.favoriteInstructors, ...server.favoriteInstructors])];
  const mergedStudios = [...new Set([...local.favoriteStudios, ...server.favoriteStudios])];
  
  console.log('🔄 Merging favorites:', {
    local: { instructors: local.favoriteInstructors.length, studios: local.favoriteStudios.length },
    server: { instructors: server.favoriteInstructors.length, studios: server.favoriteStudios.length },
    merged: { instructors: mergedInstructors.length, studios: mergedStudios.length },
  });
  
  return {
    favoriteInstructors: mergedInstructors,
    favoriteStudios: mergedStudios,
  };
}

/**
 * サーバーサイド有効性チェック
 */
export async function checkApiAvailability(): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/simple-test`, {
      timeout: 5000, // 短いタイムアウト
    });
    return response.status === 200;
  } catch (error) {
    console.warn('API not available, falling back to localStorage');
    return false;
  }
}