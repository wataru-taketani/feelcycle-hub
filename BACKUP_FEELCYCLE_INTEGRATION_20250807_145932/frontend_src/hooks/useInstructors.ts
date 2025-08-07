import { useState, useEffect } from 'react';
import { fetchInstructors, clearInstructorCache, testInstructorApi } from '@/services/instructorsApi';

export interface Instructor {
  id: string;
  name: string;
}

export interface UseInstructorsReturn {
  instructors: Instructor[];
  loading: boolean;
  error: string | null;
  isApiConnected: boolean;
  refresh: () => Promise<void>;
  clearCache: () => void;
}

/**
 * インストラクター一覧取得Hook（安全なフォールバック付き）
 */
export function useInstructors(): UseInstructorsReturn {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isApiConnected, setIsApiConnected] = useState(false);

  const loadInstructors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // API接続テスト
      const apiConnected = await testInstructorApi();
      setIsApiConnected(apiConnected);
      
      // インストラクター取得（フォールバック付き）
      const data = await fetchInstructors();
      setInstructors(data);
      
      console.log('📚 Instructors loaded:', {
        count: data.length,
        apiConnected,
        source: apiConnected ? 'API' : 'fallback'
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load instructors';
      setError(errorMessage);
      console.error('❌ useInstructors error:', err);
      
      // エラー時もフォールバックを試行
      try {
        const fallbackData = await fetchInstructors();
        setInstructors(fallbackData);
        setError(null); // フォールバック成功時はエラークリア
      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    clearCache();
    await loadInstructors();
  };

  const clearCache = () => {
    clearInstructorCache();
  };

  useEffect(() => {
    loadInstructors();
  }, []);

  return {
    instructors,
    loading,
    error,
    isApiConnected,
    refresh,
    clearCache
  };
}