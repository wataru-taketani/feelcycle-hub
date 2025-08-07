/**
 * 包括的キャッシュ戦略システム
 * ブラウザキャッシュ・API キャッシュ・PWA キャッシュの統合管理
 */

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size in bytes
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  tags?: string[]; // Cache invalidation tags
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  tags: string[];
  hits: number;
  lastAccessed: number;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalSize: number;
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
  averageSize: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private totalSize = 0;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 50 * 1024 * 1024) { // 50MB default
    this.maxSize = maxSize;
    this.setupCleanupInterval();
  }

  /**
   * キャッシュエントリの設定
   */
  set<T>(key: string, data: T, config: CacheConfig): void {
    const size = this.calculateSize(data);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      size,
      tags: config.tags || [],
      hits: 0,
      lastAccessed: Date.now()
    };

    // 容量チェックと必要に応じてエビクション
    this.ensureCapacity(size);

    // 既存エントリがある場合はサイズを更新
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.totalSize -= existingEntry.size;
    }

    this.cache.set(key, entry);
    this.totalSize += size;

    console.log(`💾 Cached "${key}": ${this.formatBytes(size)}`);
  }

  /**
   * キャッシュエントリの取得
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // TTL チェック
    if (this.isExpired(entry)) {
      this.delete(key);
      this.misses++;
      return null;
    }

    // ヒット統計更新
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.hits++;

    return entry.data;
  }

  /**
   * キャッシュエントリの削除
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.totalSize -= entry.size;
      this.cache.delete(key);
      console.log(`🗑️ Removed from cache: "${key}"`);
      return true;
    }
    return false;
  }

  /**
   * タグによるキャッシュ無効化
   */
  invalidateByTag(tag: string): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.delete(key);
        invalidated++;
      }
    }

    console.log(`🏷️ Invalidated ${invalidated} entries with tag "${tag}"`);
    return invalidated;
  }

  /**
   * 期限切れエントリのクリーンアップ
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleaned++;
      }
    }

    console.log(`🧹 Cleaned up ${cleaned} expired entries`);
    return cleaned;
  }

  /**
   * キャッシュクリア
   */
  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
    this.hits = 0;
    this.misses = 0;
    console.log('🗑️ Cache cleared');
  }

  /**
   * キャッシュメトリクス取得
   */
  getMetrics(): CacheMetrics {
    const entries = Array.from(this.cache.values());
    const totalRequests = this.hits + this.misses;
    
    return {
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.misses / totalRequests : 0,
      totalSize: this.totalSize,
      entryCount: this.cache.size,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0,
      averageSize: this.cache.size > 0 ? this.totalSize / this.cache.size : 0
    };
  }

  /**
   * データサイズの計算
   */
  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // UTF-16 approximation
  }

  /**
   * エントリの期限切れチェック
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * 容量確保（LRU エビクション）
   */
  private ensureCapacity(newEntrySize: number): void {
    while (this.totalSize + newEntrySize > this.maxSize && this.cache.size > 0) {
      // 最も古くアクセスされたエントリを削除
      let oldestKey = '';
      let oldestAccess = Infinity;
      
      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestAccess) {
          oldestAccess = entry.lastAccessed;
          oldestKey = key;
        }
      }
      
      if (oldestKey) {
        this.delete(oldestKey);
      }
    }
  }

  /**
   * 定期クリーンアップの設定
   */
  private setupCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 5分ごと
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * API キャッシュ戦略
 */
export class ApiCacheStrategy {
  private cacheManager: CacheManager;
  
  constructor(cacheManager: CacheManager) {
    this.cacheManager = cacheManager;
  }

  /**
   * キャッシュ戦略付きAPI呼び出し
   */
  async fetch<T>(
    url: string,
    options: RequestInit = {},
    cacheConfig: CacheConfig
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(url, options);
    
    switch (cacheConfig.strategy) {
      case 'cache-first':
        return this.cacheFirst<T>(cacheKey, url, options, cacheConfig);
      
      case 'network-first':
        return this.networkFirst<T>(cacheKey, url, options, cacheConfig);
      
      case 'stale-while-revalidate':
        return this.staleWhileRevalidate<T>(cacheKey, url, options, cacheConfig);
      
      default:
        return this.networkFirst<T>(cacheKey, url, options, cacheConfig);
    }
  }

  /**
   * Cache First 戦略
   */
  private async cacheFirst<T>(
    cacheKey: string,
    url: string,
    options: RequestInit,
    config: CacheConfig
  ): Promise<T> {
    // キャッシュから取得を試行
    const cached = this.cacheManager.get<T>(cacheKey);
    if (cached) {
      console.log(`🎯 Cache hit: ${url}`);
      return cached;
    }

    // ネットワークから取得
    console.log(`🌐 Cache miss, fetching: ${url}`);
    const data = await this.fetchFromNetwork<T>(url, options);
    this.cacheManager.set(cacheKey, data, config);
    
    return data;
  }

  /**
   * Network First 戦略
   */
  private async networkFirst<T>(
    cacheKey: string,
    url: string,
    options: RequestInit,
    config: CacheConfig
  ): Promise<T> {
    try {
      // ネットワークから取得を試行
      console.log(`🌐 Network first: ${url}`);
      const data = await this.fetchFromNetwork<T>(url, options);
      this.cacheManager.set(cacheKey, data, config);
      return data;
    } catch (error) {
      // ネットワークエラー時はキャッシュから取得
      console.log(`⚠️ Network failed, trying cache: ${url}`);
      const cached = this.cacheManager.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  /**
   * Stale While Revalidate 戦略
   */
  private async staleWhileRevalidate<T>(
    cacheKey: string,
    url: string,
    options: RequestInit,
    config: CacheConfig
  ): Promise<T> {
    const cached = this.cacheManager.get<T>(cacheKey);
    
    // バックグラウンドで更新
    this.fetchFromNetwork<T>(url, options)
      .then(data => {
        this.cacheManager.set(cacheKey, data, config);
        console.log(`🔄 Background update completed: ${url}`);
      })
      .catch(error => {
        console.warn(`⚠️ Background update failed: ${url}`, error);
      });

    if (cached) {
      console.log(`⚡ Stale data returned, updating in background: ${url}`);
      return cached;
    }

    // キャッシュがない場合は同期的に取得
    console.log(`🌐 No cache, fetching synchronously: ${url}`);
    return this.fetchFromNetwork<T>(url, options);
  }

  /**
   * ネットワークからのデータ取得
   */
  private async fetchFromNetwork<T>(url: string, options: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * キャッシュキーの生成
   */
  private generateCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    const headers = JSON.stringify(options.headers || {});
    
    return `${method}:${url}:${body}:${headers}`;
  }
}

/**
 * Service Worker キャッシュ戦略
 */
export class ServiceWorkerCacheStrategy {
  private readonly CACHE_NAME = 'feelcycle-hub-v1';
  private readonly RUNTIME_CACHE = 'runtime-cache-v1';

  /**
   * Service Worker キャッシュ戦略の設定
   */
  generateServiceWorkerConfig(): string {
    return `
// service-worker.js
const CACHE_NAME = '${this.CACHE_NAME}';
const RUNTIME_CACHE = '${this.RUNTIME_CACHE}';

// 事前キャッシュするリソース
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html'
];

// インストール時の事前キャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// アクティベーション時の古いキャッシュクリーンアップ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => 
            cacheName !== CACHE_NAME && 
            cacheName !== RUNTIME_CACHE
          )
          .map(cacheName => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// フェッチ時のキャッシュ戦略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // API リクエストは Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 静的リソースは Cache First
  if (request.destination === 'image' || 
      request.destination === 'script' || 
      request.destination === 'style') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML は Stale While Revalidate
  if (request.destination === 'document') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(request);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request).then(response => {
    cache.put(request, response.clone());
    return response;
  });
  
  return cached || fetchPromise;
}
`;
  }

  /**
   * PWA マニフェスト生成
   */
  generatePWAManifest(): object {
    return {
      name: 'FEELCYCLE Hub',
      short_name: 'FC Hub',
      description: 'FEELCYCLE レッスン管理アプリ',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#000000',
      icons: [
        {
          src: '/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ],
      cache_strategy: {
        runtime_caching: [
          {
            urlPattern: '/api/*',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 300 // 5分
              }
            }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 86400 // 24時間
              }
            }
          }
        ]
      }
    };
  }
}

// シングルトンインスタンス
export const cacheManager = new CacheManager();
export const apiCache = new ApiCacheStrategy(cacheManager);
export const swCache = new ServiceWorkerCacheStrategy();

/**
 * React Hook: キャッシュ統計
 */
export function useCacheMetrics() {
  return {
    metrics: cacheManager.getMetrics(),
    invalidateByTag: (tag: string) => cacheManager.invalidateByTag(tag),
    cleanup: () => cacheManager.cleanup(),
    clear: () => cacheManager.clear()
  };
}