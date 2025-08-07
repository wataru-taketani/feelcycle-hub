/**
 * グローバル型定義
 * Phase 4.2: 型安全性強化
 */

// =============================
// ユーティリティ型定義
// =============================

/**
 * 厳格なNonNullable型
 */
export type NonNullableStrict<T> = T extends null | undefined ? never : T;

/**
 * 部分的に必須にする型
 */
export type PartiallyRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 再帰的にReadonlyにする型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 特定のプロパティを除外する型
 */
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * ネストしたオブジェクトのパスを取得する型
 */
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & (string | number)]: T[K] extends object
        ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
        : `${K}`;
    }[keyof T & (string | number)]
  : never;

/**
 * 型安全なJSON値
 */
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonArray 
  | JsonObject;

export interface JsonArray extends Array<JsonValue> {}

export interface JsonObject extends Record<string, JsonValue> {}

// =============================
// API 関連型定義
// =============================

/**
 * API レスポンス基本型
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * API エラーレスポンス型
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: JsonObject;
  };
  timestamp: string;
}

/**
 * ページネーション型
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * ソート設定型
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * フィルター設定型
 */
export interface FilterConfig {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like';
  value: JsonValue;
}

// =============================
// フォーム関連型定義
// =============================

/**
 * フォームフィールドの状態
 */
export interface FormFieldState<T = string> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

/**
 * フォーム状態
 */
export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  dirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}

/**
 * バリデーション関数型
 */
export type ValidationFunction<T> = (value: T) => string | undefined;

/**
 * バリデーションルール
 */
export interface ValidationRules<T extends Record<string, any>> {
  [K in keyof T]?: Array<ValidationFunction<T[K]>>;
}

// =============================
// 日時関連型定義
// =============================

/**
 * 日時文字列（ISO 8601形式）
 */
export type ISODateString = `${number}-${number}-${number}T${number}:${number}:${number}${string}`;

/**
 * 日付文字列（YYYY-MM-DD形式）
 */
export type DateString = `${number}-${number}-${number}`;

/**
 * 時刻文字列（HH:MM形式）
 */
export type TimeString = `${number}:${number}`;

/**
 * タイムゾーン
 */
export type TimeZone = 'Asia/Tokyo' | 'UTC' | string;

/**
 * 時間間隔
 */
export interface TimeInterval {
  start: Date;
  end: Date;
  duration: number; // milliseconds
}

// =============================
// イベント関連型定義
// =============================

/**
 * カスタムイベント型
 */
export interface CustomEvent<T = JsonObject> {
  type: string;
  payload: T;
  timestamp: Date;
  source?: string;
}

/**
 * イベントハンドラー型
 */
export type EventHandler<T = JsonObject> = (event: CustomEvent<T>) => void | Promise<void>;

/**
 * イベント リスナー設定
 */
export interface EventListenerConfig<T = JsonObject> {
  type: string;
  handler: EventHandler<T>;
  once?: boolean;
  priority?: number;
}

// =============================
// パフォーマンス関連型定義
// =============================

/**
 * パフォーマンス指標
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: Date;
  context?: JsonObject;
}

/**
 * メモリ使用量
 */
export interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  timestamp: Date;
}

/**
 * ネットワーク情報
 */
export interface NetworkInfo {
  online: boolean;
  connectionType: 'wifi' | '4g' | '3g' | '2g' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
  downloadSpeed: number; // Mbps
  ping: number; // ms
}

// =============================
// エラー処理型定義
// =============================

/**
 * 構造化エラー
 */
export interface StructuredError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'validation' | 'network' | 'business' | 'system';
  context: JsonObject;
  timestamp: Date;
  stack?: string;
}

/**
 * エラー境界のコンテキスト
 */
export interface ErrorBoundaryContext {
  componentStack: string;
  eventId: string;
  errorBoundary?: string;
  tags?: Record<string, string>;
}

// =============================
// 設定・環境関連型定義
// =============================

/**
 * 環境設定
 */
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  API_BASE_URL: string;
  LIFF_ID?: string;
  DEBUG_ENABLED: boolean;
  CACHE_ENABLED: boolean;
  ANALYTICS_ENABLED: boolean;
}

/**
 * 機能フラグ
 */
export interface FeatureFlags {
  enableBetaFeatures: boolean;
  enableAdvancedAnalytics: boolean;
  enablePushNotifications: boolean;
  enableOfflineMode: boolean;
  enableExperimentalUI: boolean;
}

// =============================
// React 関連型定義
// =============================

/**
 * React コンポーネントのprops基底型
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

/**
 * React コンポーネントの参照型
 */
export interface ComponentRef {
  focus: () => void;
  blur: () => void;
  scrollIntoView: (options?: ScrollIntoViewOptions) => void;
}

/**
 * 非同期コンポーネントの状態
 */
export type AsyncComponentState = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: unknown }
  | { status: 'error'; error: StructuredError };

// =============================
// タイプガード
// =============================

/**
 * 型ガード関数のテンプレート
 */
export type TypeGuard<T> = (value: unknown) => value is T;

/**
 * null/undefined チェック
 */
export function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 文字列チェック
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 数値チェック
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * オブジェクトチェック
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 配列チェック
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

// =============================
// 条件付き型の例
// =============================

/**
 * キーの型に基づいて値の型を決定
 */
export type ConditionalValue<K, T> = K extends 'id' 
  ? string 
  : K extends 'count' 
  ? number 
  : K extends 'enabled' 
  ? boolean 
  : T;

/**
 * 関数の戻り値が Promise かどうかで分岐
 */
export type SyncOrAsync<T> = T extends (...args: any[]) => Promise<infer R>
  ? Promise<R>
  : T extends (...args: any[]) => infer R
  ? R
  : never;