/**
 * パフォーマンス監視システム
 * Core Web Vitals測定・分析・改善提案
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  
  // その他の重要指標
  FCP?: number; // First Contentful Paint
  TTFB?: number; // Time to First Byte
  TTI?: number; // Time to Interactive
  
  // カスタム指標
  pageLoadTime?: number;
  apiResponseTime?: number;
  renderTime?: number;
  
  // メタデータ
  timestamp: string;
  url: string;
  userAgent: string;
  connectionType?: string;
}

export interface PerformanceThresholds {
  LCP: { good: number; needsImprovement: number };
  FID: { good: number; needsImprovement: number };
  CLS: { good: number; needsImprovement: number };
  FCP: { good: number; needsImprovement: number };
  TTFB: { good: number; needsImprovement: number };
}

// Google推奨の閾値
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 }
};

export type PerformanceGrade = 'good' | 'needs-improvement' | 'poor';

export interface PerformanceReport {
  metrics: PerformanceMetrics;
  grades: Record<keyof PerformanceThresholds, PerformanceGrade>;
  suggestions: string[];
  overallScore: number; // 0-100
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];
  private thresholds = DEFAULT_THRESHOLDS;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  /**
   * パフォーマンス観測の初期化
   */
  private initializeObservers(): void {
    try {
      // Core Web Vitals観測
      this.observeLCP();
      this.observeFID();
      this.observeCLS();
      this.observeFCP();
      
      // ナビゲーション時間測定
      this.measureNavigationTiming();
      
      console.log('🔍 Performance monitoring initialized');
    } catch (error) {
      console.warn('Performance monitoring initialization failed:', error);
    }
  }

  /**
   * Largest Contentful Paint (LCP) 測定
   */
  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        this.updateMetric('LCP', lastEntry.startTime);
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('LCP observation failed:', error);
    }
  }

  /**
   * First Input Delay (FID) 測定
   */
  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.updateMetric('FID', entry.processingStart - entry.startTime);
        });
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FID observation failed:', error);
    }
  }

  /**
   * Cumulative Layout Shift (CLS) 測定
   */
  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsScore = 0;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
            this.updateMetric('CLS', clsScore);
          }
        });
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('CLS observation failed:', error);
    }
  }

  /**
   * First Contentful Paint (FCP) 測定
   */
  private observeFCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.updateMetric('FCP', entry.startTime);
          }
        });
      });
      
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('FCP observation failed:', error);
    }
  }

  /**
   * ナビゲーション時間測定
   */
  private measureNavigationTiming(): void {
    if (typeof window === 'undefined' || !window.performance?.timing) return;

    // ページロード完了後に測定
    window.addEventListener('load', () => {
      const timing = window.performance.timing;
      const navigation = window.performance.navigation;

      const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
      const ttfb = timing.responseStart - timing.navigationStart;
      
      this.updateMetric('pageLoadTime', pageLoadTime);
      this.updateMetric('TTFB', ttfb);

      // TTI の概算 (DOMContentLoaded + 1秒の静寂期間)
      const tti = timing.domContentLoadedEventEnd - timing.navigationStart + 1000;
      this.updateMetric('TTI', tti);
    });
  }

  /**
   * メトリック更新
   */
  private updateMetric(key: keyof PerformanceMetrics, value: number): void {
    const currentMetrics = this.getCurrentMetrics();
    currentMetrics[key] = value;
    
    // 最新のメトリクスで更新
    if (this.metrics.length > 0) {
      this.metrics[this.metrics.length - 1] = currentMetrics;
    } else {
      this.metrics.push(currentMetrics);
    }
  }

  /**
   * 現在のメトリクス取得
   */
  private getCurrentMetrics(): PerformanceMetrics {
    const now = new Date().toISOString();
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    let connectionType: string | undefined;
    if ('connection' in navigator) {
      connectionType = (navigator as any).connection?.effectiveType;
    }

    if (this.metrics.length === 0) {
      return {
        timestamp: now,
        url,
        userAgent,
        connectionType
      };
    }

    return {
      ...this.metrics[this.metrics.length - 1],
      timestamp: now,
      url,
      userAgent,
      connectionType
    };
  }

  /**
   * API レスポンス時間測定
   */
  measureApiCall<T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    const startTime = performance.now();
    
    return apiCall().finally(() => {
      const responseTime = performance.now() - startTime;
      this.updateMetric('apiResponseTime', responseTime);
      
      console.log(`📊 API ${endpoint}: ${responseTime.toFixed(2)}ms`);
    });
  }

  /**
   * レンダリング時間測定
   */
  measureRender(componentName: string, renderFunction: () => void): void {
    const startTime = performance.now();
    
    renderFunction();
    
    const renderTime = performance.now() - startTime;
    this.updateMetric('renderTime', renderTime);
    
    console.log(`🎨 Render ${componentName}: ${renderTime.toFixed(2)}ms`);
  }

  /**
   * パフォーマンス評価
   */
  private gradeMetric(
    value: number | undefined,
    thresholds: { good: number; needsImprovement: number }
  ): PerformanceGrade {
    if (value === undefined) return 'poor';
    
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  }

  /**
   * 改善提案生成
   */
  private generateSuggestions(
    metrics: PerformanceMetrics,
    grades: Record<keyof PerformanceThresholds, PerformanceGrade>
  ): string[] {
    const suggestions: string[] = [];

    if (grades.LCP !== 'good') {
      suggestions.push(
        'LCP改善: 画像最適化、レンダーブロッキングリソースの削減、CDN使用を検討'
      );
    }

    if (grades.FID !== 'good') {
      suggestions.push(
        'FID改善: JavaScriptの分割読み込み、Web Workersの活用、長時間タスクの分割'
      );
    }

    if (grades.CLS !== 'good') {
      suggestions.push(
        'CLS改善: 画像・動画のサイズ指定、フォント読み込み最適化、動的コンテンツの予約領域確保'
      );
    }

    if (grades.FCP !== 'good') {
      suggestions.push(
        'FCP改善: クリティカルCSS のインライン化、フォント読み込み最適化'
      );
    }

    if (grades.TTFB !== 'good') {
      suggestions.push(
        'TTFB改善: サーバー最適化、CDN使用、キャッシュ戦略の改善'
      );
    }

    if (metrics.apiResponseTime && metrics.apiResponseTime > 1000) {
      suggestions.push(
        'API最適化: レスポンス時間が1秒超過。キャッシュ、データ取得の最適化を検討'
      );
    }

    return suggestions;
  }

  /**
   * 総合スコア計算 (0-100)
   */
  private calculateOverallScore(grades: Record<keyof PerformanceThresholds, PerformanceGrade>): number {
    const scores = Object.values(grades).map(grade => {
      switch (grade) {
        case 'good': return 100;
        case 'needs-improvement': return 60;
        case 'poor': return 20;
        default: return 0;
      }
    });

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  /**
   * パフォーマンスレポート生成
   */
  generateReport(): PerformanceReport | null {
    if (this.metrics.length === 0) return null;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    
    const grades: Record<keyof PerformanceThresholds, PerformanceGrade> = {
      LCP: this.gradeMetric(latestMetrics.LCP, this.thresholds.LCP),
      FID: this.gradeMetric(latestMetrics.FID, this.thresholds.FID),
      CLS: this.gradeMetric(latestMetrics.CLS, this.thresholds.CLS),
      FCP: this.gradeMetric(latestMetrics.FCP, this.thresholds.FCP),
      TTFB: this.gradeMetric(latestMetrics.TTFB, this.thresholds.TTFB)
    };

    const suggestions = this.generateSuggestions(latestMetrics, grades);
    const overallScore = this.calculateOverallScore(grades);

    return {
      metrics: latestMetrics,
      grades,
      suggestions,
      overallScore
    };
  }

  /**
   * メトリクス履歴取得
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * 統計情報取得
   */
  getStatistics(): {
    averageLCP?: number;
    averageFID?: number;
    averageCLS?: number;
    totalSamples: number;
  } {
    if (this.metrics.length === 0) {
      return { totalSamples: 0 };
    }

    const validLCP = this.metrics.filter(m => m.LCP !== undefined).map(m => m.LCP!);
    const validFID = this.metrics.filter(m => m.FID !== undefined).map(m => m.FID!);
    const validCLS = this.metrics.filter(m => m.CLS !== undefined).map(m => m.CLS!);

    return {
      averageLCP: validLCP.length > 0 ? validLCP.reduce((a, b) => a + b, 0) / validLCP.length : undefined,
      averageFID: validFID.length > 0 ? validFID.reduce((a, b) => a + b, 0) / validFID.length : undefined,
      averageCLS: validCLS.length > 0 ? validCLS.reduce((a, b) => a + b, 0) / validCLS.length : undefined,
      totalSamples: this.metrics.length
    };
  }

  /**
   * リソースクリーンアップ
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    console.log('🔧 Performance monitoring cleaned up');
  }
}

// シングルトンインスタンス
export const performanceMonitor = new PerformanceMonitor();

/**
 * パフォーマンス測定デコレータ（HOC用）
 */
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: any[]) => {
    // performance API が利用できない場合はそのまま実行
    if (typeof performance === 'undefined' || !performance.now) {
      return fn(...args);
    }

    const startTime = performance.now();
    const result = fn(...args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - startTime;
        console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
      });
    } else {
      const duration = performance.now() - startTime;
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
      return result;
    }
  }) as T;
}

/**
 * React Hook: パフォーマンス監視
 */
export function usePerformanceMonitoring() {
  if (typeof window === 'undefined') {
    return {
      report: null,
      statistics: { totalSamples: 0 },
      measureApiCall: performanceMonitor.measureApiCall.bind(performanceMonitor)
    };
  }

  return {
    report: performanceMonitor.generateReport(),
    statistics: performanceMonitor.getStatistics(),
    measureApiCall: performanceMonitor.measureApiCall.bind(performanceMonitor)
  };
}