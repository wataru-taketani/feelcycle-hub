/**
 * バンドルサイズ分析・最適化システム
 * Next.js アプリケーションのバンドルサイズ監視と最適化提案
 */

export interface BundleStats {
  totalSize: number;
  gzippedSize: number;
  chunkCount: number;
  largestChunks: ChunkInfo[];
  duplicatedDependencies: string[];
  unusedExports: string[];
  suggestions: OptimizationSuggestion[];
}

export interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize: number;
  modules: ModuleInfo[];
}

export interface ModuleInfo {
  name: string;
  size: number;
  reasons: string[];
}

export interface OptimizationSuggestion {
  type: 'code-splitting' | 'tree-shaking' | 'dependency' | 'compression' | 'lazy-loading';
  priority: 'high' | 'medium' | 'low';
  description: string;
  estimatedSaving: number; // bytes
  implementation: string;
}

export class BundleAnalyzer {
  private stats: BundleStats | null = null;
  private readonly LARGE_CHUNK_THRESHOLD = 250 * 1024; // 250KB
  private readonly LARGE_BUNDLE_THRESHOLD = 1024 * 1024; // 1MB

  /**
   * Next.js バンドル統計の分析
   */
  async analyzeBundleStats(statsPath?: string): Promise<BundleStats> {
    // 実際の実装では webpack-bundle-analyzer の結果を解析
    // ここではモック実装を提供
    const mockStats = this.generateMockStats();
    
    this.stats = {
      ...mockStats,
      suggestions: this.generateOptimizationSuggestions(mockStats)
    };

    return this.stats;
  }

  /**
   * モック統計データ生成（実装例）
   */
  private generateMockStats(): Omit<BundleStats, 'suggestions'> {
    return {
      totalSize: 890 * 1024, // 890KB
      gzippedSize: 320 * 1024, // 320KB
      chunkCount: 12,
      largestChunks: [
        {
          name: 'main',
          size: 280 * 1024,
          gzippedSize: 95 * 1024,
          modules: [
            { name: 'node_modules/react', size: 45 * 1024, reasons: ['main entry'] },
            { name: 'node_modules/next', size: 38 * 1024, reasons: ['main entry'] },
            { name: 'src/pages/_app.tsx', size: 12 * 1024, reasons: ['entry point'] }
          ]
        },
        {
          name: 'vendor',
          size: 195 * 1024,
          gzippedSize: 68 * 1024,
          modules: [
            { name: 'node_modules/lodash', size: 85 * 1024, reasons: ['utility functions'] },
            { name: 'node_modules/moment', size: 67 * 1024, reasons: ['date handling'] },
            { name: 'node_modules/axios', size: 43 * 1024, reasons: ['HTTP client'] }
          ]
        }
      ],
      duplicatedDependencies: ['lodash', 'date-fns'],
      unusedExports: ['src/utils/deprecated.ts', 'src/components/OldModal.tsx']
    };
  }

  /**
   * 最適化提案生成
   */
  private generateOptimizationSuggestions(stats: Omit<BundleStats, 'suggestions'>): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // 大きなバンドルサイズのチェック
    if (stats.totalSize > this.LARGE_BUNDLE_THRESHOLD) {
      suggestions.push({
        type: 'code-splitting',
        priority: 'high',
        description: 'バンドルサイズが1MBを超えています。コード分割を実装してください。',
        estimatedSaving: stats.totalSize * 0.3,
        implementation: 'dynamic import() と Next.js の自動コード分割を活用'
      });
    }

    // 大きなチャンクのチェック
    stats.largestChunks.forEach(chunk => {
      if (chunk.size > this.LARGE_CHUNK_THRESHOLD) {
        suggestions.push({
          type: 'code-splitting',
          priority: 'medium',
          description: `チャンク "${chunk.name}" が250KBを超えています。`,
          estimatedSaving: chunk.size * 0.4,
          implementation: `${chunk.name} チャンクを複数の小さなチャンクに分割`
        });
      }
    });

    // 重複依存関係のチェック
    if (stats.duplicatedDependencies.length > 0) {
      suggestions.push({
        type: 'dependency',
        priority: 'medium',
        description: `重複依存関係を検出: ${stats.duplicatedDependencies.join(', ')}`,
        estimatedSaving: 50 * 1024 * stats.duplicatedDependencies.length,
        implementation: 'webpack の splitChunks 設定で共通依存関係を統合'
      });
    }

    // 未使用エクスポートのチェック
    if (stats.unusedExports.length > 0) {
      suggestions.push({
        type: 'tree-shaking',
        priority: 'low',
        description: `未使用エクスポートを検出: ${stats.unusedExports.length}個`,
        estimatedSaving: 10 * 1024 * stats.unusedExports.length,
        implementation: 'ESLint unused-imports ルールの有効化と定期クリーンアップ'
      });
    }

    // 特定ライブラリの最適化提案
    this.addLibrarySpecificSuggestions(suggestions, stats);

    return suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * ライブラリ固有の最適化提案
   */
  private addLibrarySpecificSuggestions(
    suggestions: OptimizationSuggestion[],
    stats: Omit<BundleStats, 'suggestions'>
  ): void {
    stats.largestChunks.forEach(chunk => {
      chunk.modules.forEach(module => {
        // Lodash の最適化
        if (module.name.includes('lodash')) {
          suggestions.push({
            type: 'tree-shaking',
            priority: 'high',
            description: 'Lodash を個別インポートに変更してバンドルサイズを削減',
            estimatedSaving: module.size * 0.8,
            implementation: 'import { debounce } from "lodash/debounce" 形式に変更'
          });
        }

        // Moment.js の最適化
        if (module.name.includes('moment')) {
          suggestions.push({
            type: 'dependency',
            priority: 'high',
            description: 'Moment.js を軽量な date-fns または dayjs に置き換え',
            estimatedSaving: module.size * 0.7,
            implementation: 'date-fns への移行でバンドルサイズを70%削減'
          });
        }

        // 大きなアイコンライブラリの最適化
        if (module.name.includes('react-icons') && module.size > 50 * 1024) {
          suggestions.push({
            type: 'tree-shaking',
            priority: 'medium',
            description: 'React Icons の個別インポートでバンドルサイズを削減',
            estimatedSaving: module.size * 0.9,
            implementation: 'import { FaHome } from "react-icons/fa" 形式に変更'
          });
        }
      });
    });
  }

  /**
   * 最適化の実装支援
   */
  generateImplementationGuide(suggestions: OptimizationSuggestion[]): string {
    const guide = suggestions
      .filter(s => s.priority === 'high')
      .map((suggestion, index) => {
        return `
## ${index + 1}. ${this.getSuggestionTitle(suggestion.type)}

**優先度**: ${suggestion.priority.toUpperCase()}
**推定削減サイズ**: ${this.formatBytes(suggestion.estimatedSaving)}

### 問題
${suggestion.description}

### 実装方法
${suggestion.implementation}

### 実装例
${this.getImplementationExample(suggestion.type)}
`;
      })
      .join('\n');

    return guide;
  }

  /**
   * 提案タイプのタイトル取得
   */
  private getSuggestionTitle(type: OptimizationSuggestion['type']): string {
    const titles = {
      'code-splitting': 'コード分割の実装',
      'tree-shaking': 'Tree Shaking の最適化',
      'dependency': '依存関係の最適化',
      'compression': '圧縮の改善',
      'lazy-loading': '遅延読み込みの実装'
    };
    return titles[type];
  }

  /**
   * 実装例の生成
   */
  private getImplementationExample(type: OptimizationSuggestion['type']): string {
    const examples = {
      'code-splitting': `
\`\`\`typescript
// Before
import HeavyComponent from './HeavyComponent';

// After
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>
});
\`\`\``,
      'tree-shaking': `
\`\`\`typescript
// Before
import _ from 'lodash';

// After
import { debounce } from 'lodash/debounce';
\`\`\``,
      'dependency': `
\`\`\`typescript
// Before
import moment from 'moment';

// After
import { format } from 'date-fns';
\`\`\``,
      'compression': `
\`\`\`javascript
// next.config.js
module.exports = {
  compress: true,
  experimental: {
    modern: true
  }
};
\`\`\``,
      'lazy-loading': `
\`\`\`typescript
// Before
import Image from 'next/image';

// After
<Image
  src="/image.jpg"
  loading="lazy"
  placeholder="blur"
/>
\`\`\``
    };
    return examples[type];
  }

  /**
   * バイト数のフォーマット
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * パフォーマンス予算の設定
   */
  setPerformanceBudget(budget: {
    maxBundleSize: number;
    maxChunkSize: number;
    maxChunkCount: number;
  }): void {
    // パフォーマンス予算に基づいた警告を設定
    console.log('📊 Performance budget set:', budget);
  }

  /**
   * CI/CD統合用レポート生成
   */
  generateCIReport(): {
    passed: boolean;
    warnings: string[];
    errors: string[];
    metrics: Record<string, number>;
  } {
    if (!this.stats) {
      return {
        passed: false,
        warnings: [],
        errors: ['Bundle analysis not performed'],
        metrics: {}
      };
    }

    const warnings: string[] = [];
    const errors: string[] = [];

    // 警告とエラーの判定
    if (this.stats.totalSize > this.LARGE_BUNDLE_THRESHOLD) {
      errors.push(`Bundle size exceeds ${this.formatBytes(this.LARGE_BUNDLE_THRESHOLD)}`);
    }

    this.stats.largestChunks.forEach(chunk => {
      if (chunk.size > this.LARGE_CHUNK_THRESHOLD) {
        warnings.push(`Chunk "${chunk.name}" exceeds ${this.formatBytes(this.LARGE_CHUNK_THRESHOLD)}`);
      }
    });

    if (this.stats.duplicatedDependencies.length > 0) {
      warnings.push(`${this.stats.duplicatedDependencies.length} duplicated dependencies found`);
    }

    return {
      passed: errors.length === 0,
      warnings,
      errors,
      metrics: {
        totalSize: this.stats.totalSize,
        gzippedSize: this.stats.gzippedSize,
        chunkCount: this.stats.chunkCount,
        compressionRatio: this.stats.gzippedSize / this.stats.totalSize
      }
    };
  }
}

// シングルトンインスタンス
export const bundleAnalyzer = new BundleAnalyzer();

/**
 * Next.js設定の最適化ヘルパー
 */
export function generateOptimizedNextConfig(): string {
  return `
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // 圧縮の有効化
  compress: true,
  
  // 最新ブラウザ向け最適化
  experimental: {
    modern: true,
  },
  
  // webpack最適化
  webpack: (config, { isServer }) => {
    // Bundle Analyzer統合
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)()
      );
    }
    
    // 分割チャンク最適化
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\\\/]node_modules[\\\\/]/,
          name: 'vendors',
          priority: 10,
          reuseExistingChunk: true,
        },
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    };
    
    return config;
  },
  
  // 画像最適化
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  
  // パフォーマンス最適化
  poweredByHeader: false,
  generateEtags: false,
});
`;
}