/**
 * 型安全バリデーション関数
 * Phase 4.2: 型安全性強化
 */

import type { 
  TypeGuard, 
  JsonValue, 
  JsonObject,
  StrictValidationError,
  ValidationFunction
} from '../types/global';
import type { 
  NoUndefined,
  NonEmptyArray,
  isDefined,
  isNonEmptyArray
} from '../types/strict';

// =============================
// 基本バリデーション関数
// =============================

/**
 * 必須フィールドのバリデーション
 */
export const required = <T>(message: string = 'This field is required'): ValidationFunction<T | undefined | null> => {
  return (value: T | undefined | null): string | undefined => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    return undefined;
  };
};

/**
 * 文字列の最小長バリデーション
 */
export const minLength = (min: number, message?: string): ValidationFunction<string> => {
  return (value: string): string | undefined => {
    if (value.length < min) {
      return message || `Minimum length is ${min} characters`;
    }
    return undefined;
  };
};

/**
 * 文字列の最大長バリデーション
 */
export const maxLength = (max: number, message?: string): ValidationFunction<string> => {
  return (value: string): string | undefined => {
    if (value.length > max) {
      return message || `Maximum length is ${max} characters`;
    }
    return undefined;
  };
};

/**
 * 正規表現パターンバリデーション
 */
export const pattern = (regex: RegExp, message?: string): ValidationFunction<string> => {
  return (value: string): string | undefined => {
    if (!regex.test(value)) {
      return message || 'Invalid format';
    }
    return undefined;
  };
};

/**
 * 数値の最小値バリデーション
 */
export const min = (minValue: number, message?: string): ValidationFunction<number> => {
  return (value: number): string | undefined => {
    if (value < minValue) {
      return message || `Minimum value is ${minValue}`;
    }
    return undefined;
  };
};

/**
 * 数値の最大値バリデーション
 */
export const max = (maxValue: number, message?: string): ValidationFunction<number> => {
  return (value: number): string | undefined => {
    if (value > maxValue) {
      return message || `Maximum value is ${maxValue}`;
    }
    return undefined;
  };
};

/**
 * 配列の要素数バリデーション
 */
export const arrayLength = <T>(
  minCount: number, 
  maxCount?: number, 
  message?: string
): ValidationFunction<T[]> => {
  return (value: T[]): string | undefined => {
    if (value.length < minCount) {
      return message || `Minimum ${minCount} items required`;
    }
    if (maxCount && value.length > maxCount) {
      return message || `Maximum ${maxCount} items allowed`;
    }
    return undefined;
  };
};

// =============================
// 型ガード付きバリデーション
// =============================

/**
 * 文字列型の検証
 */
export const isString: TypeGuard<string> = (value: unknown): value is string => {
  return typeof value === 'string';
};

/**
 * 数値型の検証
 */
export const isNumber: TypeGuard<number> = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

/**
 * 整数型の検証
 */
export const isInteger: TypeGuard<number> = (value: unknown): value is number => {
  return isNumber(value) && Number.isInteger(value);
};

/**
 * 正の数の検証
 */
export const isPositiveNumber: TypeGuard<number> = (value: unknown): value is number => {
  return isNumber(value) && value > 0;
};

/**
 * ブール型の検証
 */
export const isBoolean: TypeGuard<boolean> = (value: unknown): value is boolean => {
  return typeof value === 'boolean';
};

/**
 * 配列型の検証
 */
export const isArray: TypeGuard<unknown[]> = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

/**
 * オブジェクト型の検証
 */
export const isObject: TypeGuard<Record<string, unknown>> = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

/**
 * 日付型の検証
 */
export const isDate: TypeGuard<Date> = (value: unknown): value is Date => {
  return value instanceof Date && !isNaN(value.getTime());
};

/**
 * ISO日付文字列の検証
 */
export const isISODateString: TypeGuard<string> = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const date = new Date(value);
  return isDate(date) && date.toISOString() === value;
};

// =============================
// ドメイン固有バリデーション
// =============================

/**
 * メールアドレスの検証
 */
export const isEmail: TypeGuard<string> = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

/**
 * URLの検証
 */
export const isUrl: TypeGuard<string> = (value: unknown): value is string => {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * FEELCYCLE スタジオコードの検証
 */
export const isStudioCode: TypeGuard<string> = (value: unknown): value is string => {
  if (!isString(value)) return false;
  // 2-4文字の大文字アルファベット
  return /^[A-Z]{2,4}$/.test(value);
};

/**
 * レッスン時間の検証（HH:MM形式）
 */
export const isLessonTime: TypeGuard<string> = (value: unknown): value is string => {
  if (!isString(value)) return false;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(value);
};

/**
 * 難易度レベルの検証（1-5）
 */
export const isDifficultyLevel: TypeGuard<number> = (value: unknown): value is number => {
  return isInteger(value) && value >= 1 && value <= 5;
};

// =============================
// 複合バリデーション
// =============================

/**
 * 複数のバリデーション関数を組み合わせる
 */
export function combineValidators<T>(
  ...validators: Array<ValidationFunction<T>>
): ValidationFunction<T> {
  return (value: T): string | undefined => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return undefined;
  };
}

/**
 * 条件付きバリデーション
 */
export function conditionalValidator<T>(
  condition: (value: T) => boolean,
  validator: ValidationFunction<T>
): ValidationFunction<T> {
  return (value: T): string | undefined => {
    if (condition(value)) {
      return validator(value);
    }
    return undefined;
  };
}

/**
 * オブジェクトの複数フィールドバリデーション
 */
export function validateObject<T extends Record<string, unknown>>(
  obj: T,
  validators: Partial<Record<keyof T, ValidationFunction<T[keyof T]>>>
): StrictValidationError[] {
  const errors: StrictValidationError[] = [];

  for (const [field, validator] of Object.entries(validators) as Array<[keyof T, ValidationFunction<T[keyof T]>]>) {
    const value = obj[field];
    const error = validator(value);
    
    if (error) {
      errors.push({
        field: String(field),
        code: 'VALIDATION_ERROR',
        message: error,
        value: value as JsonValue
      });
    }
  }

  return errors;
}

// =============================
// カスタムバリデータービルダー
// =============================

/**
 * スキーマベースバリデーター
 */
export interface ValidationSchema<T> {
  [K in keyof T]: {
    required?: boolean;
    type?: TypeGuard<T[K]>;
    validators?: Array<ValidationFunction<T[K]>>;
  };
}

/**
 * スキーマバリデーター作成関数
 */
export function createSchemaValidator<T extends Record<string, unknown>>(
  schema: ValidationSchema<T>
): (data: unknown) => { isValid: boolean; data?: T; errors: StrictValidationError[] } {
  return (data: unknown) => {
    if (!isObject(data)) {
      return {
        isValid: false,
        errors: [
          {
            field: 'root',
            code: 'TYPE_ERROR',
            message: 'Expected object',
            value: data as JsonValue
          }
        ]
      };
    }

    const errors: StrictValidationError[] = [];
    const validatedData: Partial<T> = {};

    for (const [field, config] of Object.entries(schema) as Array<[keyof T, any]>) {
      const value = data[field];

      // Required check
      if (config.required && (value === undefined || value === null)) {
        errors.push({
          field: String(field),
          code: 'REQUIRED',
          message: `Field ${String(field)} is required`,
          value: value as JsonValue
        });
        continue;
      }

      // Skip validation if optional and not provided
      if (!config.required && (value === undefined || value === null)) {
        continue;
      }

      // Type check
      if (config.type && !config.type(value)) {
        errors.push({
          field: String(field),
          code: 'TYPE_ERROR',
          message: `Field ${String(field)} has invalid type`,
          value: value as JsonValue
        });
        continue;
      }

      // Custom validators
      if (config.validators) {
        for (const validator of config.validators) {
          const error = validator(value);
          if (error) {
            errors.push({
              field: String(field),
              code: 'VALIDATION_ERROR',
              message: error,
              value: value as JsonValue
            });
            break;
          }
        }
      }

      if (errors.some(e => e.field === String(field))) continue;

      validatedData[field] = value as T[keyof T];
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? validatedData as T : undefined,
      errors
    };
  };
}

// =============================
// よく使われるバリデータープリセット
// =============================

/**
 * ユーザー設定バリデーション
 */
export const userPreferencesSchema: ValidationSchema<{
  favoriteStudios: string[];
  favoriteInstructors: string[];
  notificationTiming: number;
}> = {
  favoriteStudios: {
    required: false,
    type: isArray,
    validators: [arrayLength(0, 10)]
  },
  favoriteInstructors: {
    required: false,
    type: isArray,
    validators: [arrayLength(0, 20)]
  },
  notificationTiming: {
    required: true,
    type: isInteger,
    validators: [min(5), max(1440)] // 5分から24時間
  }
};

/**
 * レッスンデータバリデーション
 */
export const lessonSchema: ValidationSchema<{
  studioCode: string;
  programName: string;
  instructorName: string;
  difficulty: number;
  startTime: string;
}> = {
  studioCode: {
    required: true,
    type: isStudioCode
  },
  programName: {
    required: true,
    type: isString,
    validators: [minLength(1), maxLength(100)]
  },
  instructorName: {
    required: true,
    type: isString,
    validators: [minLength(1), maxLength(50)]
  },
  difficulty: {
    required: true,
    type: isDifficultyLevel
  },
  startTime: {
    required: true,
    type: isISODateString
  }
};