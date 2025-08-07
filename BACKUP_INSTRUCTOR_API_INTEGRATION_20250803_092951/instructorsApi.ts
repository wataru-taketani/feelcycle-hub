// インストラクター一覧取得API（フォールバック付き安全実装）
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
const API_TIMEOUT = 8000; // 8秒

export interface InstructorData {
  instructorId: string;
  name: string;
  category: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
  ttl: number;
}

export interface InstructorApiResponse {
  success: boolean;
  data?: {
    instructorGroups?: Record<string, InstructorData[]>;
    categories?: string[];
    total?: number;
  };
  error?: string;
  message?: string;
}

// ローカルストレージキー
const CACHE_KEY = 'instructors_cache';
const CACHE_TIMESTAMP_KEY = 'instructors_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

/**
 * ローカルキャッシュを確認
 */
function getCachedInstructors(): { id: string; name: string }[] | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const cached = localStorage.getItem(CACHE_KEY);
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    
    if (!cached || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_DURATION) {
      // キャッシュが古い場合は削除
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.warn('Failed to get cached instructors:', error);
    return null;
  }
}

/**
 * ローカルキャッシュに保存
 */
function setCachedInstructors(instructors: { id: string; name: string }[]): void {
  try {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(instructors));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Failed to cache instructors:', error);
  }
}

/**
 * APIレスポンスを共通フォーマットに変換
 */
function transformInstructorData(apiData: InstructorApiResponse): { id: string; name: string }[] {
  if (!apiData.success || !apiData.data?.instructorGroups) {
    return [];
  }
  
  const instructors: { id: string; name: string }[] = [];
  
  // 全カテゴリのインストラクターをフラット化
  Object.values(apiData.data.instructorGroups).forEach(categoryInstructors => {
    categoryInstructors.forEach(instructor => {
      instructors.push({
        id: instructor.instructorId,
        name: instructor.name
      });
    });
  });
  
  // 名前順でソート
  return instructors.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * インストラクター一覧を取得（段階的フォールバック付き）
 */
export async function fetchInstructors(): Promise<{ id: string; name: string }[]> {
  console.log('📚 Fetching instructors with fallback strategy...');
  
  // 1. キャッシュチェック
  const cached = getCachedInstructors();
  if (cached) {
    console.log('✅ Using cached instructor data:', cached.length, 'instructors');
    return cached;
  }
  
  try {
    // 2. API取得試行
    console.log('🌐 Fetching from API...');
    const response = await axios.get<InstructorApiResponse>(
      `${API_BASE_URL}/instructors`,
      { timeout: API_TIMEOUT }
    );
    
    const instructors = transformInstructorData(response.data);
    
    if (instructors.length > 0) {
      // APIデータが有効な場合
      console.log('✅ API data received:', instructors.length, 'instructors');
      setCachedInstructors(instructors);
      return instructors;
    } else {
      console.warn('⚠️ API returned empty data');
      return [];
    }
    
  } catch (error) {
    // 3. API失敗時は空配列（エラーハンドリングはHook側で）
    console.warn('❌ API failed:', error);
    return [];
  }
}

/**
 * キャッシュをクリア（手動更新用）
 */
export function clearInstructorCache(): void {
  try {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log('🗑️ Instructor cache cleared');
  } catch (error) {
    console.warn('Failed to clear instructor cache:', error);
  }
}

/**
 * API接続テスト
 */
export async function testInstructorApi(): Promise<boolean> {
  try {
    const response = await axios.get(`${API_BASE_URL}/instructors`, {
      timeout: 3000
    });
    return response.status === 200 && response.data?.success;
  } catch (error) {
    console.warn('Instructor API not available');
    return false;
  }
}