/**
 * FEELCYCLE Hub - アーキテクチャ設計
 * 
 * Phase 4.1: コードアーキテクチャリファクタリング
 * - モジュール分離と依存関係整理
 * - レイヤードアーキテクチャの実装
 */

// =============================
// アーキテクチャ層定義
// =============================

/**
 * プレゼンテーション層
 * - React コンポーネント
 * - UI ロジック
 */
export namespace PresentationLayer {
  export interface ComponentProps {
    className?: string;
    children?: React.ReactNode;
  }

  export interface PageComponent {
    metadata: {
      title: string;
      description: string;
    };
  }
}

/**
 * アプリケーション層
 * - ビジネスロジック
 * - ユースケース実装
 */
export namespace ApplicationLayer {
  export interface UseCase<TInput, TOutput> {
    execute(input: TInput): Promise<TOutput>;
  }

  export interface Service {
    name: string;
    version: string;
  }
}

/**
 * ドメイン層
 * - ドメインモデル
 * - ビジネスルール
 */
export namespace DomainLayer {
  export interface Entity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Repository<T extends Entity> {
    findById(id: string): Promise<T | null>;
    save(entity: T): Promise<void>;
    delete(id: string): Promise<void>;
  }
}

/**
 * インフラストラクチャ層
 * - 外部API呼び出し
 * - データアクセス
 */
export namespace InfrastructureLayer {
  export interface ApiClient {
    baseUrl: string;
    timeout: number;
  }

  export interface CacheProvider {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
  }
}

// =============================
// 依存関係注入
// =============================

export class DependencyContainer {
  private static instance: DependencyContainer;
  private services = new Map<string, any>();

  static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not found: ${key}`);
    }
    return service;
  }
}

// =============================
// エラーハンドリング統合
// =============================

export class ArchitectureError extends Error {
  constructor(
    public layer: 'presentation' | 'application' | 'domain' | 'infrastructure',
    public code: string,
    message: string,
    public context?: any
  ) {
    super(`[${layer.toUpperCase()}] ${code}: ${message}`);
    this.name = 'ArchitectureError';
  }
}

export const withErrorBoundary = <T extends (...args: any[]) => any>(
  fn: T,
  layer: ArchitectureError['layer']
): T => {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          throw new ArchitectureError(layer, 'EXECUTION_ERROR', error.message, { args });
        });
      }
      return result;
    } catch (error) {
      throw new ArchitectureError(layer, 'SYNC_ERROR', (error as Error).message, { args });
    }
  }) as T;
};