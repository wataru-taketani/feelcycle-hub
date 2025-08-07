'use client';

import { useState, useCallback, useEffect } from 'react';

interface FEELCYCLEUserData {
  name: string;
  memberType: string;
  homeStudio: string;
  linkedAt: string;
  remainingLessons?: string;
}

interface FEELCYCLEIntegrationState {
  isLinked: boolean;
  isLoading: boolean;
  data: FEELCYCLEUserData | null;
  error: string | null;
}

interface UseFEELCYCLEIntegrationReturn {
  // 状態プロパティを直接公開
  isLinked: boolean;
  loading: boolean;
  userData: FEELCYCLEUserData | null;
  error: string | null;
  
  // アクション関数
  integrate: (email: string, password: string) => Promise<void>;
  checkStatus: () => Promise<void>;
  unlink: () => Promise<void>;
  reset: () => void;
}

/**
 * FEELCYCLE統合機能のカスタムフック
 */
export const useFEELCYCLEIntegration = (userId: string): UseFEELCYCLEIntegrationReturn => {
  const [state, setState] = useState<FEELCYCLEIntegrationState>({
    isLinked: false,
    isLoading: false,
    data: null,
    error: null
  });

  // 連携状態をチェック
  const checkStatus = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('📊 FEELCYCLE連携状態確認中...');
      
      const response = await fetch(`/api/feelcycle/status/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      console.log('📊 連携状態レスポンス:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setState(prev => ({
        ...prev,
        isLinked: data.isLinked || false,
        data: data.data || null,
        isLoading: false,
        error: null
      }));

      console.log(`✅ 連携状態確認完了: ${data.isLinked ? '連携済み' : '未連携'}`);

    } catch (error) {
      console.error('❌ 連携状態確認エラー:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [userId]);

  // FEELCYCLE連携実行
  const integrate = useCallback(async (email: string, password: string) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🚀 FEELCYCLE連携実行中...');
      
      const response = await fetch('/api/feelcycle/integrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email,
          password
        })
      });

      const data = await response.json();
      console.log('📊 連携レスポンス:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Integration failed`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Integration failed');
      }

      setState(prev => ({
        ...prev,
        isLinked: true,
        data: data.data,
        isLoading: false,
        error: null
      }));

      console.log('✅ FEELCYCLE連携成功');

    } catch (error) {
      console.error('❌ FEELCYCLE連携エラー:', error);
      
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // エラーメッセージをユーザーフレンドリーに変換
      if (errorMessage.includes('401') || errorMessage.includes('credentials')) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'FEELCYCLEサーバーの応答が遅延しています';
      } else if (errorMessage.includes('network')) {
        errorMessage = 'ネットワークエラーが発生しました';
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      throw error;
    }
  }, [userId]);

  // 連携解除
  const unlink = useCallback(async () => {
    if (!userId) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('🔓 FEELCYCLE連携解除中...');
      
      const response = await fetch(`/api/feelcycle/unlink/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Unlink failed`);
      }

      setState(prev => ({
        ...prev,
        isLinked: false,
        data: null,
        isLoading: false,
        error: null
      }));

      console.log('✅ FEELCYCLE連携解除完了');

    } catch (error) {
      console.error('❌ FEELCYCLE連携解除エラー:', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));

      throw error;
    }
  }, [userId]);

  // 状態リセット
  const reset = useCallback(() => {
    setState({
      isLinked: false,
      isLoading: false,
      data: null,
      error: null
    });
  }, []);

  // 初期化時に連携状態をチェック
  useEffect(() => {
    if (userId) {
      checkStatus();
    }
  }, [userId, checkStatus]);

  return {
    // 状態プロパティを直接公開
    isLinked: state.isLinked,
    loading: state.isLoading,
    userData: state.data,
    error: state.error,
    
    // アクション関数
    integrate,
    checkStatus,
    unlink,
    reset
  };
};

export default useFEELCYCLEIntegration;
