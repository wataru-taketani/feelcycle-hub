/**
 * 厳格型定義
 * Phase 4.2: 型安全性強化
 * 
 * TypeScript の厳格設定に対応した型定義
 */

import type { JsonValue, JsonObject } from './global';

// =============================
// 厳格なプロパティ定義
// =============================

/**
 * すべてのプロパティが明示的に定義されている型
 */
export type ExactProps<T> = T & {
  [K in Exclude<keyof any, keyof T>]?: never;
};

/**
 * オプショナルプロパティを厳格に扱う型
 */
export type StrictOptional<T, K extends keyof T> = Omit<T, K> & {
  [P in K]?: T[P] | undefined;
};

/**
 * undefinedを許可しない厳格な型
 */
export type NoUndefined<T> = T extends undefined ? never : T;

/**
 * 空オブジェクトを禁止する型
 */
export type NonEmptyObject<T> = keyof T extends never ? never : T;

// =============================
// 配列アクセスの安全性
// =============================

/**
 * 配列の安全なアクセス用型
 */
export type SafeArrayAccess<T> = {
  readonly [K in keyof T]: T[K];
} & {
  at(index: number): T[keyof T] | undefined;
  get(index: number): T[keyof T] | undefined;
  length: number;
};

/**
 * インデックスアクセスが安全な配列型
 */
export type StrictArray<T> = ReadonlyArray<T> & {
  [index: number]: T | undefined;
};

/**
 * 空でない配列型
 */
export type NonEmptyArray<T> = [T, ...T[]];

// =============================
// 関数の厳格な型定義
// =============================

/**
 * 戻り値が必須の関数型
 */
export type StrictFunction<TArgs extends readonly unknown[], TReturn> = 
  (...args: TArgs) => TReturn;

/**
 * エラーハンドリングが必須の非同期関数型
 */
export type SafeAsyncFunction<TArgs extends readonly unknown[], TReturn, TError = Error> = 
  (...args: TArgs) => Promise<TReturn | TError>;

/**
 * 副作用のない純粋関数型
 */
export type PureFunction<TArgs extends readonly unknown[], TReturn> = 
  (...args: TArgs) => TReturn;

// =============================
// イベントハンドラーの厳格型
// =============================

/**
 * 厳格なイベントハンドラー型
 */
export interface StrictEventHandler<T extends Event = Event> {
  (event: T): void;
  readonly once?: boolean;
  readonly passive?: boolean;
  readonly signal?: AbortSignal;
}

/**
 * カスタムイベントの厳格型
 */
export interface StrictCustomEvent<TDetail = JsonObject> extends CustomEvent {
  readonly detail: TDetail;
  readonly type: string;
  readonly bubbles: boolean;
  readonly cancelable: boolean;
}

// =============================
// React Props の厳格型
// =============================

/**
 * 必須プロパティを明示する React Props型
 */
export type StrictReactProps<T> = T & {
  key?: React.Key;
  ref?: React.Ref<any>;
};

/**
 * children が必須の Props型
 */
export type RequireChildren<T> = T & {
  children: React.ReactNode;
};

/**
 * children が禁止の Props型
 */
export type ForbidChildren<T> = T & {
  children?: never;
};

/**
 * className が必須の Props型
 */
export type RequireClassName<T> = T & {
  className: string;
};

// =============================
// API レスポンスの厳格型
// =============================

/**
 * 成功レスポンスの厳格型
 */
export interface StrictSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly message?: string;
  readonly timestamp: string;
}

/**
 * エラーレスポンスの厳格型
 */
export interface StrictErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: JsonObject;
  };
  readonly timestamp: string;
}

/**
 * API レスポンスの判別共用体型
 */
export type StrictApiResponse<T> = StrictSuccessResponse<T> | StrictErrorResponse;

// =============================
// 状態管理の厳格型
// =============================

/**
 * 不変状態の型
 */
export type ImmutableState<T> = {
  readonly [P in keyof T]: T[P] extends object ? ImmutableState<T[P]> : T[P];
};

/**
 * 状態更新アクションの厳格型
 */
export interface StrictAction<TType extends string, TPayload = undefined> {
  readonly type: TType;
  readonly payload: TPayload;
  readonly meta?: JsonObject;
  readonly error?: boolean;
}

/**
 * レデューサーの厳格型
 */
export type StrictReducer<TState, TAction extends StrictAction<string, any>> = 
  (state: ImmutableState<TState>, action: TAction) => ImmutableState<TState>;

// =============================
// フォーム関連の厳格型
// =============================

/**
 * フォーム値の厳格型
 */
export type StrictFormValues<T> = {
  readonly [K in keyof T]: T[K] extends string 
    ? string 
    : T[K] extends number 
    ? number 
    : T[K] extends boolean 
    ? boolean 
    : JsonValue;
};

/**
 * バリデーションエラーの厳格型
 */
export interface StrictValidationError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
  readonly value: JsonValue;
}

/**
 * フォーム状態の厳格型
 */
export interface StrictFormState<T> {
  readonly values: StrictFormValues<T>;
  readonly errors: ReadonlyArray<StrictValidationError>;
  readonly touched: ReadonlySet<keyof T>;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly submitting: boolean;
}

// =============================
// 型ガード関数の厳格版
// =============================

/**
 * 成功レスポンスの型ガード
 */
export function isSuccessResponse<T>(
  response: StrictApiResponse<T>
): response is StrictSuccessResponse<T> {
  return response.success === true;
}

/**
 * エラーレスポンスの型ガード
 */
export function isErrorResponse<T>(
  response: StrictApiResponse<T>
): response is StrictErrorResponse {
  return response.success === false;
}

/**
 * 空でない配列の型ガード
 */
export function isNonEmptyArray<T>(
  array: readonly T[]
): array is NonEmptyArray<T> {
  return array.length > 0;
}

/**
 * 空でないオブジェクトの型ガード
 */
export function isNonEmptyObject<T extends Record<string, unknown>>(
  obj: T
): obj is NonEmptyObject<T> {
  return Object.keys(obj).length > 0;
}

/**
 * undefined を除外する型ガード
 */
export function isDefined<T>(value: T | undefined): value is NoUndefined<T> {
  return value !== undefined;
}

// =============================
// ユーティリティ関数の厳格版
// =============================

/**
 * 配列の安全な要素取得
 */
export function safeArrayGet<T>(
  array: readonly T[], 
  index: number
): T | undefined {
  return array[index];
}

/**
 * オブジェクトの安全なプロパティアクセス
 */
export function safeObjectGet<T, K extends keyof T>(
  obj: T, 
  key: K
): T[K] | undefined {
  return obj[key];
}

/**
 * 型安全な JSON パース
 */
export function safeJsonParse<T>(
  json: string,
  validator: (value: unknown) => value is T
): T | undefined {
  try {
    const parsed = JSON.parse(json);
    return validator(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 型安全な数値変換
 */
export function safeNumberParse(value: string): number | undefined {
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

// =============================
// 条件付き型の高度な例
// =============================

/**
 * キーが存在する場合のみ値を設定可能にする型
 */
export type ConditionalProperty<T, K extends keyof T, V> = K extends keyof T
  ? Record<K, V>
  : never;

/**
 * 関数のパラメーター数に基づく型分岐
 */
export type ParameterCount<T> = T extends (...args: infer P) => any
  ? P extends []
    ? 'no-parameters'
    : P extends [any]
    ? 'one-parameter'
    : P extends [any, any]
    ? 'two-parameters'
    : 'multiple-parameters'
  : never;

/**
 * プロパティの存在に基づく型の変換
 */
export type TransformByProperty<T, K extends keyof T> = K extends keyof T
  ? T[K] extends string
    ? { stringValue: T[K] }
    : T[K] extends number
    ? { numberValue: T[K] }
    : { otherValue: T[K] }
  : never;