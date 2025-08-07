/**
 * サンプルプラグイン: アナリティクス
 * Phase 4.4: プラグイン機能の実装例
 */

import type { JsonObject } from '../../types/global';
import { BasePlugin, type PluginManifest } from '../index';

/**
 * アナリティクスプラグイン
 * ユーザーの行動を記録・分析するプラグイン
 */
export class AnalyticsPlugin extends BasePlugin {
  readonly manifest: PluginManifest = {
    name: 'analytics-plugin',
    version: '1.0.0',
    description: 'User behavior analytics and tracking',
    author: 'FEELCYCLE Hub Team',
    permissions: ['storage.write', 'api.call'],
    hooks: ['lesson:search', 'waitlist:join', 'page:load', 'user:preferences:update'],
    config: {
      enableTracking: true,
      trackingId: 'GA-XXXXXXXXX',
      enableHeatmap: false,
      sampleRate: 1.0
    }
  };

  private sessionId: string;
  private events: AnalyticsEvent[] = [];

  constructor() {
    super();
    this.sessionId = this.generateSessionId();
  }

  async onActivate(): Promise<void> {
    await super.onActivate();
    
    // セッション開始イベント
    this.trackEvent('session_start', {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height
      }
    });

    console.log('Analytics plugin activated with session:', this.sessionId);
  }

  async onDeactivate(): Promise<void> {
    // セッション終了イベント
    this.trackEvent('session_end', {
      sessionId: this.sessionId,
      duration: this.calculateSessionDuration(),
      eventCount: this.events.length
    });

    // イベントをサーバーに送信
    await this.flushEvents();
    
    await super.onDeactivate();
  }

  /**
   * レッスン検索イベント処理
   */
  async onLessonSearch(query: string, filters: JsonObject): Promise<void> {
    this.trackEvent('lesson_search', {
      query,
      filters,
      timestamp: new Date().toISOString()
    });

    // 人気検索クエリを記録
    this.updateSearchStatistics(query, filters);
  }

  /**
   * 待機リスト参加イベント処理
   */
  async onWaitlistJoin(lessonId: string, userId: string): Promise<void> {
    this.trackEvent('waitlist_join', {
      lessonId,
      userId,
      timestamp: new Date().toISOString()
    });

    // コンバージョン追跡
    this.trackConversion('waitlist_registration', lessonId);
  }

  /**
   * ユーザー設定更新イベント処理
   */
  async onUserPreferencesUpdate(preferences: JsonObject): Promise<void> {
    this.trackEvent('preferences_update', {
      preferences: this.sanitizePreferences(preferences),
      timestamp: new Date().toISOString()
    });

    // 設定変更パターンの分析
    this.analyzePreferenceChanges(preferences);
  }

  /**
   * ページロードイベント処理
   */
  async onPageLoad(pageName: string): Promise<void> {
    this.trackEvent('page_view', {
      page: pageName,
      timestamp: new Date().toISOString(),
      referrer: document.referrer,
      url: window.location.href
    });

    // ページ滞在時間の測定開始
    this.startPageTimer(pageName);
  }

  /**
   * イベントを記録
   */
  private trackEvent(eventName: string, data: JsonObject): void {
    const enableTracking = this.getConfig<{ enableTracking: boolean }>('enableTracking');
    if (!enableTracking) return;

    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      name: eventName,
      data,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userId: this.getCurrentUserId(),
      deviceInfo: this.getDeviceInfo()
    };

    this.events.push(event);

    // バッファが一定数に達したら送信
    if (this.events.length >= 10) {
      this.flushEvents();
    }
  }

  /**
   * コンバージョンを追跡
   */
  private trackConversion(type: string, value: string): void {
    this.trackEvent('conversion', {
      type,
      value,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 検索統計を更新
   */
  private updateSearchStatistics(query: string, filters: JsonObject): void {
    const stats = this.getStoredConfig<SearchStatistics>('search_stats') || {
      queries: {},
      popularFilters: {},
      totalSearches: 0
    };

    // クエリ統計
    stats.queries[query] = (stats.queries[query] || 0) + 1;
    
    // フィルター統計
    Object.keys(filters).forEach(key => {
      if (!stats.popularFilters[key]) {
        stats.popularFilters[key] = {};
      }
      const value = String(filters[key]);
      stats.popularFilters[key][value] = (stats.popularFilters[key][value] || 0) + 1;
    });

    stats.totalSearches += 1;
    
    this.setStoredConfig('search_stats', stats);
  }

  /**
   * 設定変更パターンを分析
   */
  private analyzePreferenceChanges(preferences: JsonObject): void {
    const changes = this.getStoredConfig<PreferenceChanges>('preference_changes') || {
      frequentChanges: {},
      changePatterns: [],
      lastChange: null
    };

    Object.keys(preferences).forEach(key => {
      changes.frequentChanges[key] = (changes.frequentChanges[key] || 0) + 1;
    });

    changes.changePatterns.push({
      timestamp: new Date().toISOString(),
      fields: Object.keys(preferences)
    });

    // 最新100件のみ保持
    if (changes.changePatterns.length > 100) {
      changes.changePatterns = changes.changePatterns.slice(-100);
    }

    changes.lastChange = new Date().toISOString();
    
    this.setStoredConfig('preference_changes', changes);
  }

  /**
   * ページタイマーを開始
   */
  private startPageTimer(pageName: string): void {
    this.setStoredConfig(`page_start_${pageName}`, Date.now());
  }

  /**
   * ページタイマーを終了して滞在時間を記録
   */
  private endPageTimer(pageName: string): void {
    const startTime = this.getStoredConfig<number>(`page_start_${pageName}`);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.trackEvent('page_duration', {
        page: pageName,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * イベントをサーバーに送信
   */
  private async flushEvents(): Promise<void> {
    if (this.events.length === 0) return;

    try {
      // サンプリング適用
      const sampleRate = this.getConfig<number>('sampleRate') || 1.0;
      const sampledEvents = this.events.filter(() => Math.random() < sampleRate);

      // APIエンドポイントに送信（実装例）
      await this.sendToAnalyticsAPI(sampledEvents);
      
      // 送信成功後にイベントをクリア
      this.events = [];
      
      console.log(`Sent ${sampledEvents.length} analytics events`);
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      
      // 失敗した場合は後で再試行のためにローカルに保存
      this.saveEventsLocally(this.events);
    }
  }

  /**
   * アナリティクスAPIにデータを送信
   */
  private async sendToAnalyticsAPI(events: AnalyticsEvent[]): Promise<void> {
    const trackingId = this.getConfig<string>('trackingId');
    if (!trackingId) return;

    const response = await fetch('/api/analytics/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trackingId,
        events,
        sessionId: this.sessionId
      })
    });

    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status}`);
    }
  }

  /**
   * イベントをローカルストレージに保存
   */
  private saveEventsLocally(events: AnalyticsEvent[]): void {
    const existingEvents = this.getStoredConfig<AnalyticsEvent[]>('pending_events') || [];
    const allEvents = [...existingEvents, ...events];
    
    // 最新1000件のみ保持
    const limitedEvents = allEvents.slice(-1000);
    this.setStoredConfig('pending_events', limitedEvents);
  }

  /**
   * 個人情報を除外して設定を無害化
   */
  private sanitizePreferences(preferences: JsonObject): JsonObject {
    const sanitized: JsonObject = {};
    
    Object.keys(preferences).forEach(key => {
      if (!this.isSensitiveField(key)) {
        sanitized[key] = preferences[key];
      }
    });
    
    return sanitized;
  }

  /**
   * 機密フィールドかどうかチェック
   */
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = ['email', 'phone', 'address', 'userId'];
    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * イベントIDを生成
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 現在のユーザーIDを取得
   */
  private getCurrentUserId(): string | undefined {
    // LIFFから取得（実装依存）
    return localStorage.getItem('user_id') || undefined;
  }

  /**
   * デバイス情報を取得
   */
  private getDeviceInfo(): DeviceInfo {
    return {
      userAgent: navigator.userAgent,
      screen: {
        width: screen.width,
        height: screen.height
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * セッション継続時間を計算
   */
  private calculateSessionDuration(): number {
    const sessionStart = this.getStoredConfig<number>('session_start') || Date.now();
    return Date.now() - sessionStart;
  }

  /**
   * 統計レポートを生成
   */
  generateReport(): AnalyticsReport {
    const searchStats = this.getStoredConfig<SearchStatistics>('search_stats');
    const preferenceChanges = this.getStoredConfig<PreferenceChanges>('preference_changes');
    
    return {
      sessionId: this.sessionId,
      eventCount: this.events.length,
      searchStatistics: searchStats || null,
      preferenceChanges: preferenceChanges || null,
      generatedAt: new Date().toISOString()
    };
  }
}

// =============================
// 型定義
// =============================

interface AnalyticsEvent {
  id: string;
  name: string;
  data: JsonObject;
  sessionId: string;
  timestamp: string;
  userId?: string;
  deviceInfo: DeviceInfo;
}

interface DeviceInfo {
  userAgent: string;
  screen: {
    width: number;
    height: number;
  };
  viewport: {
    width: number;
    height: number;
  };
  language: string;
  timezone: string;
}

interface SearchStatistics {
  queries: Record<string, number>;
  popularFilters: Record<string, Record<string, number>>;
  totalSearches: number;
}

interface PreferenceChanges {
  frequentChanges: Record<string, number>;
  changePatterns: Array<{
    timestamp: string;
    fields: string[];
  }>;
  lastChange: string | null;
}

interface AnalyticsReport {
  sessionId: string;
  eventCount: number;
  searchStatistics: SearchStatistics | null;
  preferenceChanges: PreferenceChanges | null;
  generatedAt: string;
}