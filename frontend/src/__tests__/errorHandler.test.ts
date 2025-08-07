/**
 * errorHandler.ts のテスト
 * エラーハンドリングシステムの単体テスト
 */

import {
  handleError,
  handleApiError,
  handleUIError,
  handleBusinessError,
  errorStats,
  ErrorSeverity
} from '@/utils/errorHandler';

describe('errorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    errorStats.clear();
  });

  describe('handleError', () => {
    it('基本的なエラー情報を正しく生成する', () => {
      const error = new Error('Test error');
      const result = handleError(error);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('message', 'Test error');
      expect(result).toHaveProperty('userMessage');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('shouldRetry');
      expect(result).toHaveProperty('shouldReAuth');
      expect(typeof result.id).toBe('string');
      expect(result.id).toMatch(/^err_[a-z0-9]+_[a-z0-9]+$/);
    });

    it('ネットワークエラーを正しく分類する', () => {
      const error = { code: 'NETWORK_ERROR' };
      const result = handleError(error);

      expect(result.severity).toBe('medium');
      expect(result.userMessage).toContain('ネットワーク接続');
      expect(result.context?.category).toBe('network');
    });

    it('HTTPエラーを正しく分類する', () => {
      const error = { response: { status: 500 } };
      const result = handleError(error);

      expect(result.severity).toBe('high');
      expect(result.userMessage).toContain('サーバーで問題');
      expect(result.context?.category).toBe('server');
    });

    it('認証エラーを正しく分類する', () => {
      const error = { response: { status: 401 } };
      const result = handleError(error);

      expect(result.severity).toBe('high');
      expect(result.userMessage).toContain('認証に問題');
      expect(result.context?.category).toBe('auth');
    });

    it('カスタムメッセージを使用する', () => {
      const error = new Error('Test error');
      const customMessage = 'カスタムエラーメッセージ';
      const result = handleError(error, { customMessage });

      expect(result.userMessage).toBe(customMessage);
    });

    it('コンテキスト情報を含める', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'test' };
      const result = handleError(error, { context });

      expect(result.context).toMatchObject(context);
    });
  });

  describe('専用エラーハンドラー', () => {
    it('handleApiError は API 関連コンテキストを追加する', () => {
      const error = new Error('API error');
      const endpoint = '/api/test';
      const result = handleApiError(error, endpoint);

      expect(result.context?.type).toBe('api');
      expect(result.context?.endpoint).toBe(endpoint);
    });

    it('handleUIError は UI 関連コンテキストを追加する', () => {
      const error = new Error('UI error');
      const component = 'TestComponent';
      const action = 'click';
      const result = handleUIError(error, component, action);

      expect(result.context?.type).toBe('ui');
      expect(result.context?.component).toBe(component);
      expect(result.context?.action).toBe(action);
    });

    it('handleBusinessError はビジネスロジック関連コンテキストを追加する', () => {
      const error = new Error('Business error');
      const operation = 'calculatePrice';
      const result = handleBusinessError(error, operation);

      expect(result.context?.type).toBe('business');
      expect(result.context?.operation).toBe(operation);
    });
  });

  describe('エラー分類', () => {
    const testCases: Array<{
      error: any;
      expectedSeverity: ErrorSeverity;
      expectedCategory: string;
    }> = [
      {
        error: { code: 'NETWORK_ERROR' },
        expectedSeverity: 'medium',
        expectedCategory: 'network'
      },
      {
        error: { response: { status: 500 } },
        expectedSeverity: 'high',
        expectedCategory: 'server'
      },
      {
        error: { response: { status: 401 } },
        expectedSeverity: 'high',
        expectedCategory: 'auth'
      },
      {
        error: { response: { status: 400 } },
        expectedSeverity: 'medium',
        expectedCategory: 'client'
      },
      {
        error: new TypeError('Type error'),
        expectedSeverity: 'high',
        expectedCategory: 'runtime'
      },
      {
        error: { code: 'TIMEOUT' },
        expectedSeverity: 'medium',
        expectedCategory: 'timeout'
      },
      {
        error: new Error('Unknown error'),
        expectedSeverity: 'medium',
        expectedCategory: 'unknown'
      }
    ];

    testCases.forEach(({ error, expectedSeverity, expectedCategory }) => {
      it(`${expectedCategory} エラーを正しく分類する`, () => {
        const result = handleError(error);
        expect(result.severity).toBe(expectedSeverity);
        expect(result.context?.category).toBe(expectedCategory);
      });
    });
  });

  describe('エラー統計', () => {
    it('エラー統計を正しく収集する', () => {
      handleError(new Error('Error 1'));
      handleError({ response: { status: 500 } });
      handleError({ code: 'NETWORK_ERROR' });

      const stats = errorStats.getStats();
      expect(stats.total).toBe(3);
      expect(stats.bySeverity.medium).toBe(2); // network + unknown
      expect(stats.bySeverity.high).toBe(1);   // server
    });

    it('最新のエラーを取得できる', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      handleError(error1);
      handleError(error2);

      const stats = errorStats.getStats();
      expect(stats.recent).toHaveLength(2);
      expect(stats.recent[1].message).toBe('Error 2');
    });

    it('統計をクリアできる', () => {
      handleError(new Error('Test error'));
      expect(errorStats.getStats().total).toBe(1);

      errorStats.clear();
      expect(errorStats.getStats().total).toBe(0);
    });
  });

  describe('エラーID生成', () => {
    it('ユニークなエラーIDを生成する', () => {
      const error1 = handleError(new Error('Error 1'));
      const error2 = handleError(new Error('Error 2'));

      expect(error1.id).not.toBe(error2.id);
      expect(error1.id).toMatch(/^err_[a-z0-9]+_[a-z0-9]+$/);
      expect(error2.id).toMatch(/^err_[a-z0-9]+_[a-z0-9]+$/);
    });
  });

  describe('エラーハンドリングの堅牢性', () => {
    it('nullやundefinedでも例外を投げない', () => {
      expect(() => handleError(null)).not.toThrow();
      expect(() => handleError(undefined)).not.toThrow();
    });

    it('空のオブジェクトでも処理できる', () => {
      const result = handleError({});
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('userMessage');
    });

    it('文字列エラーも処理できる', () => {
      const result = handleError('String error');
      expect(result.message).toBe('String error');
    });
  });
});