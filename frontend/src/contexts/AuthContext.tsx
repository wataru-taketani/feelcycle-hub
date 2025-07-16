'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { liffService } from '@/lib/liff';
import { AuthState, LiffUser, ApiUser } from '@/types/liff';

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => void;
  apiUser: ApiUser | null;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
    error: null,
  });
  const [apiUser, setApiUser] = useState<ApiUser | null>(null);

  const updateAuthState = (updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  };

  const fetchApiUser = async (lineUserId: string): Promise<ApiUser | null> => {
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/user`,
        {
          params: { lineUserId },
        }
      );
      return response.data.data;
    } catch (error) {
      console.log('API user not found or error:', error);
      return null;
    }
  };

  const createApiUser = async (user: LiffUser): Promise<ApiUser> => {
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/line/register`,
        {
          lineUserId: user.userId,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to create API user:', error);
      throw error;
    }
  };

  const initializeAuth = async () => {
    try {
      updateAuthState({ loading: true, error: null });

      // LIFF環境外での動作確認
      if (typeof window !== 'undefined' && !window.location.href.includes('liff')) {
        console.log('LIFF環境外で実行されています');
        updateAuthState({
          isAuthenticated: false,
          user: null,
          loading: false,
          error: 'LIFF環境でのみ動作します',
        });
        return;
      }

      await liffService.init();

      if (liffService.isLoggedIn()) {
        const liffUser = await liffService.getProfile();
        updateAuthState({
          isAuthenticated: true,
          user: liffUser,
        });

        // APIユーザーを取得または作成
        let user = await fetchApiUser(liffUser.userId);
        if (!user) {
          user = await createApiUser(liffUser);
        }
        
        setApiUser(user);
        
        // ユーザー情報をCookieに保存
        Cookies.set('lineUserId', liffUser.userId, { expires: 30 });
        Cookies.set('apiUserId', user.userId, { expires: 30 });
      } else {
        updateAuthState({
          isAuthenticated: false,
          user: null,
        });
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      updateAuthState({
        isAuthenticated: false,
        user: null,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    } finally {
      updateAuthState({ loading: false });
    }
  };

  const login = async () => {
    try {
      updateAuthState({ loading: true, error: null });
      await liffService.login();
      // ログイン後のリダイレクトでinitializeAuthが再実行される
    } catch (error) {
      console.error('Login failed:', error);
      updateAuthState({
        error: error instanceof Error ? error.message : 'Login failed',
        loading: false,
      });
    }
  };

  const logout = () => {
    liffService.logout();
    updateAuthState({
      isAuthenticated: false,
      user: null,
      error: null,
    });
    setApiUser(null);
    
    // Cookieをクリア
    Cookies.remove('lineUserId');
    Cookies.remove('apiUserId');
  };

  const refreshUser = async () => {
    if (authState.user) {
      const user = await fetchApiUser(authState.user.userId);
      setApiUser(user);
    }
  };

  useEffect(() => {
    initializeAuth();
  }, []);

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    apiUser,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};