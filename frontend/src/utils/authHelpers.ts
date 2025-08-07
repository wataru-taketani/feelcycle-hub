/**
 * 認証関連のヘルパー関数
 * トークン管理とセキュリティ強化
 */

import { liffService } from '@/lib/liff';

export interface TokenValidationResult {
  isValid: boolean;
  error?: string;
  needsRefresh?: boolean;
}

/**
 * アクセストークンの有効性を検証
 */
export async function validateAccessToken(): Promise<TokenValidationResult> {
  try {
    // ログイン状態確認
    if (!liffService.isLoggedIn()) {
      return {
        isValid: false,
        error: 'User not logged in',
        needsRefresh: true
      };
    }

    // アクセストークン取得
    const accessToken = liffService.getAccessToken();
    if (!accessToken) {
      return {
        isValid: false,
        error: 'Access token not available',
        needsRefresh: true
      };
    }

    // トークンの形式検証（JWTの基本構造）
    const tokenParts = accessToken.split('.');
    if (tokenParts.length !== 3) {
      return {
        isValid: false,
        error: 'Invalid token format',
        needsRefresh: true
      };
    }

    // JWTペイロードのデコードと有効期限チェック
    try {
      const payload = JSON.parse(atob(tokenParts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < currentTime) {
        return {
          isValid: false,
          error: 'Token expired',
          needsRefresh: true
        };
      }
    } catch (decodeError) {
      console.warn('Token payload decode failed, assuming valid:', decodeError);
    }

    return { isValid: true };
  } catch (error) {
    console.error('Token validation error:', error);
    return {
      isValid: false,
      error: 'Validation failed',
      needsRefresh: true
    };
  }
}

/**
 * IDトークンの有効性を検証
 */
export async function validateIDToken(): Promise<TokenValidationResult> {
  try {
    const idToken = await liffService.getIDToken();
    if (!idToken) {
      return {
        isValid: false,
        error: 'ID token not available',
        needsRefresh: true
      };
    }

    // IDトークンの形式検証
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      return {
        isValid: false,
        error: 'Invalid ID token format',
        needsRefresh: true
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('ID token validation error:', error);
    return {
      isValid: false,
      error: 'ID token validation failed',
      needsRefresh: true
    };
  }
}

/**
 * 安全なAPI呼び出しのためのヘッダー生成
 */
export async function getSecureHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    // アクセストークンの検証と追加
    const tokenValidation = await validateAccessToken();
    if (tokenValidation.isValid) {
      const accessToken = liffService.getAccessToken();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    // IDトークンの追加（必要に応じて）
    const idToken = await liffService.getIDToken();
    if (idToken) {
      headers['X-Line-ID-Token'] = idToken;
    }

    // 追加のセキュリティヘッダー
    headers['X-Requested-With'] = 'XMLHttpRequest';
    headers['X-Client-Version'] = '1.0.0';
    
  } catch (error) {
    console.error('Error generating secure headers:', error);
  }

  return headers;
}

/**
 * トークンリフレッシュの実行
 */
export async function refreshTokens(): Promise<boolean> {
  try {
    // LIFFの再初期化を試行
    await liffService.init();
    
    // ログイン状態の再確認
    if (!liffService.isLoggedIn()) {
      console.log('Token refresh requires re-login');
      return false;
    }

    // 新しいトークンの検証
    const validation = await validateAccessToken();
    return validation.isValid;
    
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}

/**
 * 認証エラー時の統一処理
 */
export function handleAuthError(error: any): {
  shouldRetry: boolean;
  shouldReAuth: boolean;
  message: string;
} {
  // HTTPステータスコードベースの判定
  if (error?.response?.status === 401) {
    return {
      shouldRetry: false,
      shouldReAuth: true,
      message: '認証が必要です。再ログインしてください。'
    };
  }
  
  if (error?.response?.status === 403) {
    return {
      shouldRetry: false,
      shouldReAuth: false,
      message: 'アクセス権限がありません。'
    };
  }

  // トークン関連エラー
  if (error?.message?.includes('token') || error?.message?.includes('Token')) {
    return {
      shouldRetry: true,
      shouldReAuth: true,
      message: 'トークンエラーが発生しました。再認証を試行します。'
    };
  }

  // ネットワークエラー
  if (error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
    return {
      shouldRetry: true,
      shouldReAuth: false,
      message: 'ネットワークエラーです。接続を確認してください。'
    };
  }

  // タイムアウトエラー
  if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
    return {
      shouldRetry: true,
      shouldReAuth: false,
      message: 'タイムアウトが発生しました。しばらく待ってから再試行してください。'
    };
  }

  // その他のエラー
  return {
    shouldRetry: false,
    shouldReAuth: false,
    message: 'エラーが発生しました。しばらく待ってから再試行してください。'
  };
}

/**
 * 安全なログアウト処理
 */
export function secureLogout(): void {
  try {
    // LIFFログアウト
    liffService.logout();
    
    // ローカルストレージのクリア
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-preferences');
      sessionStorage.clear();
    }
    
    console.log('Secure logout completed');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * セキュリティ情報の取得（デバッグ用）
 */
export async function getSecurityInfo(): Promise<{
  isLoggedIn: boolean;
  hasAccessToken: boolean;
  hasIDToken: boolean;
  isInClient: boolean;
  tokenValidation?: TokenValidationResult;
}> {
  const isLoggedIn = liffService.isLoggedIn();
  const hasAccessToken = !!liffService.getAccessToken();
  const hasIDToken = !!(await liffService.getIDToken());
  const isInClient = liffService.isInClient();
  
  let tokenValidation: TokenValidationResult | undefined;
  if (hasAccessToken) {
    tokenValidation = await validateAccessToken();
  }

  return {
    isLoggedIn,
    hasAccessToken,
    hasIDToken,
    isInClient,
    tokenValidation
  };
}