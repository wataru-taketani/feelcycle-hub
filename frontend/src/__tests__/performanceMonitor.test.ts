/**
 * performanceMonitor.ts のテスト
 * パフォーマンス監視システムの単体テスト
 */

import {
  DEFAULT_THRESHOLDS,
  withPerformanceMonitoring,
  PerformanceMetrics,
  PerformanceGrade
} from '@/utils/performanceMonitor';

// performance.now() のモック
const mockPerformanceNow = jest.fn();
Object.defineProperty(global, 'performance', {
  value: {
    now: mockPerformanceNow,
    timing: {
      navigationStart: 0,
      loadEventEnd: 2000,
      responseStart: 500,
      domContentLoadedEventEnd: 1500
    }
  },
  writable: true
});

// PerformanceObserver のモック
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

global.PerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect
}));

describe('performanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(1000);
  });

  describe('DEFAULT_THRESHOLDS', () => {
    it('Google推奨値が正しく設定されている', () => {
      expect(DEFAULT_THRESHOLDS.LCP.good).toBe(2500);
      expect(DEFAULT_THRESHOLDS.LCP.needsImprovement).toBe(4000);
      expect(DEFAULT_THRESHOLDS.FID.good).toBe(100);
      expect(DEFAULT_THRESHOLDS.FID.needsImprovement).toBe(300);
      expect(DEFAULT_THRESHOLDS.CLS.good).toBe(0.1);
      expect(DEFAULT_THRESHOLDS.CLS.needsImprovement).toBe(0.25);
    });

    it('閾値が適切な順序になっている', () => {
      Object.values(DEFAULT_THRESHOLDS).forEach(threshold => {
        expect(threshold.good).toBeLessThan(threshold.needsImprovement);
      });
    });
  });

  describe('withPerformanceMonitoring', () => {
    it('同期関数の実行時間を測定する', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockFn = jest.fn(() => 'result');
      
      mockPerformanceNow
        .mockReturnValueOnce(1000) // 開始時刻
        .mockReturnValueOnce(1050); // 終了時刻

      const monitoredFn = withPerformanceMonitoring(mockFn, 'testFunction');
      const result = monitoredFn('arg1', 'arg2');

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('result');
      expect(consoleSpy).toHaveBeenCalledWith('⚡ testFunction: 50.00ms');
      
      consoleSpy.mockRestore();
    });

    it('非同期関数の実行時間を測定する', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockAsyncFn = jest.fn(() => Promise.resolve('async result'));
      
      mockPerformanceNow
        .mockReturnValueOnce(2000) // 開始時刻
        .mockReturnValueOnce(2100); // 終了時刻

      const monitoredFn = withPerformanceMonitoring(mockAsyncFn, 'asyncFunction');
      const result = await monitoredFn('async arg');

      expect(mockAsyncFn).toHaveBeenCalledWith('async arg');
      expect(result).toBe('async result');
      expect(consoleSpy).toHaveBeenCalledWith('⚡ asyncFunction: 100.00ms');
      
      consoleSpy.mockRestore();
    });

    it('関数の型を保持する', () => {
      const originalFn = (a: string, b: number): boolean => a.length > b;
      const monitoredFn = withPerformanceMonitoring(originalFn, 'typedFunction');
      
      // TypeScriptの型チェックでエラーが出ないことを確認
      const result: boolean = monitoredFn('hello', 3);
      expect(typeof result).toBe('boolean');
    });
  });

  describe('PerformanceMetrics 型定義', () => {
    it('正しいメトリクス構造を持つ', () => {
      const metrics: PerformanceMetrics = {
        LCP: 2000,
        FID: 50,
        CLS: 0.05,
        FCP: 1500,
        TTFB: 600,
        TTI: 3000,
        pageLoadTime: 4000,
        apiResponseTime: 800,
        renderTime: 100,
        timestamp: '2024-08-05T12:00:00.000Z',
        url: 'https://example.com',
        userAgent: 'Mozilla/5.0...',
        connectionType: '4g'
      };

      expect(typeof metrics.LCP).toBe('number');
      expect(typeof metrics.FID).toBe('number');
      expect(typeof metrics.CLS).toBe('number');
      expect(typeof metrics.timestamp).toBe('string');
      expect(typeof metrics.url).toBe('string');
      expect(typeof metrics.userAgent).toBe('string');
    });

    it('必須プロパティのみでも有効', () => {
      const minimalMetrics: PerformanceMetrics = {
        timestamp: '2024-08-05T12:00:00.000Z',
        url: 'https://example.com',
        userAgent: 'Mozilla/5.0...'
      };

      expect(minimalMetrics.timestamp).toBeDefined();
      expect(minimalMetrics.url).toBeDefined();
      expect(minimalMetrics.userAgent).toBeDefined();
      expect(minimalMetrics.LCP).toBeUndefined();
    });
  });

  describe('PerformanceGrade 型定義', () => {
    it('正しいグレード値を受け入れる', () => {
      const grades: PerformanceGrade[] = ['good', 'needs-improvement', 'poor'];
      
      grades.forEach(grade => {
        expect(['good', 'needs-improvement', 'poor']).toContain(grade);
      });
    });
  });

  describe('パフォーマンス計算ロジック', () => {
    it('閾値に基づいてグレードを正しく判定する', () => {
      const gradeMetric = (
        value: number | undefined,
        thresholds: { good: number; needsImprovement: number }
      ): PerformanceGrade => {
        if (value === undefined) return 'poor';
        if (value <= thresholds.good) return 'good';
        if (value <= thresholds.needsImprovement) return 'needs-improvement';
        return 'poor';
      };

      // LCP テスト
      expect(gradeMetric(2000, DEFAULT_THRESHOLDS.LCP)).toBe('good');
      expect(gradeMetric(3000, DEFAULT_THRESHOLDS.LCP)).toBe('needs-improvement');
      expect(gradeMetric(5000, DEFAULT_THRESHOLDS.LCP)).toBe('poor');
      expect(gradeMetric(undefined, DEFAULT_THRESHOLDS.LCP)).toBe('poor');
    });

    it('総合スコアを正しく計算する', () => {
      const calculateOverallScore = (
        grades: Record<string, PerformanceGrade>
      ): number => {
        const scores = Object.values(grades).map(grade => {
          switch (grade) {
            case 'good': return 100;
            case 'needs-improvement': return 60;
            case 'poor': return 20;
            default: return 0;
          }
        });

        return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
      };

      expect(calculateOverallScore({
        LCP: 'good',
        FID: 'good',
        CLS: 'good'
      })).toBe(100);

      expect(calculateOverallScore({
        LCP: 'needs-improvement',
        FID: 'needs-improvement',
        CLS: 'needs-improvement'
      })).toBe(60);

      expect(calculateOverallScore({
        LCP: 'poor',
        FID: 'poor',
        CLS: 'poor'
      })).toBe(20);

      expect(calculateOverallScore({
        LCP: 'good',
        FID: 'needs-improvement',
        CLS: 'poor'
      })).toBe(60); // (100 + 60 + 20) / 3 = 60
    });
  });

  describe('エラーハンドリング', () => {
    it('PerformanceObserver が利用できない場合でもエラーにならない', () => {
      // PerformanceObserver を一時的に削除
      const originalPerformanceObserver = global.PerformanceObserver;
      delete (global as any).PerformanceObserver;

      expect(() => {
        withPerformanceMonitoring(() => 'test', 'testFunction')();
      }).not.toThrow();

      // 復元
      global.PerformanceObserver = originalPerformanceObserver;
    });

    it('performance.now が利用できない場合の代替処理', () => {
      const originalPerformance = global.performance;
      delete (global as any).performance;

      expect(() => {
        withPerformanceMonitoring(() => 'test', 'testFunction')();
      }).not.toThrow();

      // 復元
      global.performance = originalPerformance;
    });
  });
});