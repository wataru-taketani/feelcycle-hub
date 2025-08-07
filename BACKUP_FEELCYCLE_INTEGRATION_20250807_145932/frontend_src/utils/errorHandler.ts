/**
 * 統一エラーハンドリングシステム
 * アプリケーション全体のエラー処理を標準化
 */

import { handleAuthError } from './authHelpers';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorInfo {
  id: string;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
  shouldRetry: boolean;
  shouldReAuth: boolean;
}

export interface ErrorHandlerOptions {
  context?: Record<string, any>;
  customMessage?: string;
  suppressLog?: boolean;
}

/**
 * エラー分類と重要度判定
 */
function classifyError(error: any): { severity: ErrorSeverity; category: string } {
  // ネットワークエラー
  if (error?.code === 'NETWORK_ERROR' || !navigator.onLine) {
    return { severity: 'medium', category: 'network' };
  }

  // HTTPエラー
  if (error?.response?.status) {
    const status = error.response.status;
    if (status >= 500) {
      return { severity: 'high', category: 'server' };
    } else if (status === 401 || status === 403) {
      return { severity: 'high', category: 'auth' };
    } else if (status >= 400) {
      return { severity: 'medium', category: 'client' };
    }
  }

  // 認証関連エラー
  if (error?.message?.includes('auth') || error?.message?.includes('token')) {
    return { severity: 'high', category: 'auth' };
  }

  // JavaScript実行時エラー
  if (error instanceof TypeError || error instanceof ReferenceError) {
    return { severity: 'high', category: 'runtime' };
  }

  // タイムアウトエラー
  if (error?.code === 'TIMEOUT' || error?.message?.includes('timeout')) {
    return { severity: 'medium', category: 'timeout' };
  }

  // その他
  return { severity: 'medium', category: 'unknown' };
}

/**
 * ユーザー向けメッセージの生成
 */
function generateUserMessage(error: any, category: string, customMessage?: string): string {
  if (customMessage) {
    return customMessage;
  }

  switch (category) {
    case 'network':
      return 'ネットワーク接続を確認してください。';
    case 'server':
      return 'サーバーで問題が発生しています。しばらく待ってから再試行してください。';
    case 'auth':
      return '認証に問題があります。再ログインが必要な場合があります。';
    case 'client':
      return '入力内容を確認してください。';
    case 'timeout':
      return 'タイムアウトが発生しました。もう一度お試しください。';
    case 'runtime':
      return 'アプリケーションエラーが発生しました。';
    default:
      return 'エラーが発生しました。しばらく待ってから再試行してください。';
  }
}

/**
 * メインのエラーハンドラー
 */
export function handleError(
  error: any,
  options: ErrorHandlerOptions = {}
): ErrorInfo {
  const { context, customMessage, suppressLog } = options;
  
  // エラー分類
  const { severity, category } = classifyError(error);
  
  // 認証エラーの詳細処理
  const authInfo = handleAuthError(error);
  
  // エラー情報の構築
  const errorInfo: ErrorInfo = {
    id: generateErrorId(),
    severity,
    message: error?.message || String(error),
    userMessage: generateUserMessage(error, category, customMessage),
    timestamp: new Date().toISOString(),
    context: {
      category,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ...context
    },
    stack: error?.stack,
    shouldRetry: authInfo.shouldRetry,
    shouldReAuth: authInfo.shouldReAuth
  };

  // ログ出力（本番環境では外部サービスに送信）
  if (!suppressLog) {
    logError(errorInfo);
  }

  // 統計に追加
  errorStats.add(errorInfo);

  return errorInfo;
}

/**
 * エラーIDの生成
 */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `err_${timestamp}_${random}`;
}

/**
 * エラーログ出力
 */
function logError(errorInfo: ErrorInfo): void {
  const logLevel = getLogLevel(errorInfo.severity);
  
  // コンソール出力
  console[logLevel](`[${errorInfo.severity.toUpperCase()}] ${errorInfo.id}:`, {
    message: errorInfo.message,
    userMessage: errorInfo.userMessage,
    context: errorInfo.context,
    timestamp: errorInfo.timestamp
  });

  // 本番環境では外部ログサービスへ送信
  if (process.env.NODE_ENV === 'production' && errorInfo.severity === 'critical') {
    // TODO: 外部ログサービス（CloudWatch、Sentry等）への送信
    sendToExternalLogger(errorInfo);
  }
}

/**
 * ログレベルの決定
 */
function getLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
  switch (severity) {
    case 'low':
      return 'log';
    case 'medium':
      return 'warn';
    case 'high':
    case 'critical':
      return 'error';
    default:
      return 'warn';
  }
}

/**
 * 外部ログサービスへの送信（プレースホルダー）
 */
function sendToExternalLogger(errorInfo: ErrorInfo): void {
  // 本番環境でのみ実装
  console.log('Would send to external logger:', errorInfo.id);
}

/**
 * APIエラー専用ハンドラー
 */
export function handleApiError(
  error: any,
  endpoint: string,
  options: ErrorHandlerOptions = {}
): ErrorInfo {
  return handleError(error, {
    ...options,
    context: {
      type: 'api',
      endpoint,
      ...options.context
    }
  });
}

/**
 * UI操作エラー専用ハンドラー
 */
export function handleUIError(
  error: any,
  component: string,
  action: string,
  options: ErrorHandlerOptions = {}
): ErrorInfo {
  return handleError(error, {
    ...options,
    context: {
      type: 'ui',
      component,
      action,
      ...options.context
    }
  });
}

/**
 * ビジネスロジックエラー専用ハンドラー
 */
export function handleBusinessError(
  error: any,
  operation: string,
  options: ErrorHandlerOptions = {}
): ErrorInfo {
  return handleError(error, {
    ...options,
    context: {
      type: 'business',
      operation,
      ...options.context
    }
  });
}

/**
 * エラー統計情報（メモリ内保持）
 */
class ErrorStats {
  private errors: ErrorInfo[] = [];
  private readonly maxErrors = 100; // メモリ使用量制限

  add(errorInfo: ErrorInfo): void {
    this.errors.push(errorInfo);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift(); // 古いエラーを削除
    }
  }

  getStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    recent: ErrorInfo[];
  } {
    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    this.errors.forEach(error => {
      bySeverity[error.severity]++;
    });

    return {
      total: this.errors.length,
      bySeverity,
      recent: this.errors.slice(-10) // 最新10件
    };
  }

  clear(): void {
    this.errors = [];
  }
}

export const errorStats = new ErrorStats();

// エラーハンドリングされた際に統計に追加するため、handleError内で統計更新
// （上記のhandleError関数内で errorStats.add(errorInfo) を実行）