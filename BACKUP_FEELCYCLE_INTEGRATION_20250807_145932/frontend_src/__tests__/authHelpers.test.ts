/**
 * authHelpers.ts の型定義テスト
 * 複雑なMock不要の型安全性テスト
 */

import {
  handleAuthError
} from '@/utils/authHelpers';

describe('authHelpers 型定義', () => {
  describe('handleAuthError', () => {
    it('正しい戻り値の型を持つ', () => {
      const result = handleAuthError({ response: { status: 401 } });
      
      expect(typeof result.shouldRetry).toBe('boolean');
      expect(typeof result.shouldReAuth).toBe('boolean');
      expect(typeof result.message).toBe('string');
      
      // 戻り値のプロパティが存在することを確認
      expect(result).toHaveProperty('shouldRetry');
      expect(result).toHaveProperty('shouldReAuth');
      expect(result).toHaveProperty('message');
    });

    it('401エラーの処理', () => {
      const error = { response: { status: 401 } };
      const result = handleAuthError(error);
      
      expect(result.shouldReAuth).toBe(true);
      expect(result.shouldRetry).toBe(false);
      expect(result.message).toContain('認証が必要');
    });

    it('403エラーの処理', () => {
      const error = { response: { status: 403 } };
      const result = handleAuthError(error);
      
      expect(result.shouldReAuth).toBe(false);
      expect(result.shouldRetry).toBe(false);
      expect(result.message).toContain('アクセス権限');
    });

    it('トークンエラーの処理', () => {
      const error = { message: 'Invalid token format' };
      const result = handleAuthError(error);
      
      expect(result.shouldReAuth).toBe(true);
      expect(result.shouldRetry).toBe(true);
      expect(result.message).toContain('トークンエラー');
    });

    it('ネットワークエラーの処理', () => {
      const error = { code: 'NETWORK_ERROR' };
      const result = handleAuthError(error);
      
      expect(result.shouldReAuth).toBe(false);
      expect(result.shouldRetry).toBe(true);
      expect(result.message).toContain('ネットワークエラー');
    });

    it('undefinedやnullでも例外を投げない', () => {
      expect(() => handleAuthError(undefined)).not.toThrow();
      expect(() => handleAuthError(null)).not.toThrow();
      expect(() => handleAuthError({})).not.toThrow();
    });

    it('空のエラーオブジェクトも処理できる', () => {
      const result = handleAuthError({});
      
      expect(typeof result.shouldRetry).toBe('boolean');
      expect(typeof result.shouldReAuth).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });
  });
});