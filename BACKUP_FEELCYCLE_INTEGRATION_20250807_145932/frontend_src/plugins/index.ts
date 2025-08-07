/**
 * プラグインシステム
 * Phase 4.4: 拡張性基盤 - プラグイン機能とモジュラー設計
 */

import type { JsonObject } from '../types/global';

// =============================
// プラグインインターフェース
// =============================

/**
 * プラグインの基本情報
 */
export interface PluginManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly dependencies?: string[];
  readonly permissions?: PluginPermission[];
  readonly hooks?: string[];
  readonly config?: JsonObject;
}

/**
 * プラグインの権限
 */
export type PluginPermission = 
  | 'storage.read'
  | 'storage.write'
  | 'api.call'
  | 'notification.send'
  | 'ui.modify';

/**
 * プラグインのライフサイクル
 */
export interface PluginLifecycle {
  onInstall?(): Promise<void>;
  onActivate?(): Promise<void>;
  onDeactivate?(): Promise<void>;
  onUninstall?(): Promise<void>;
  onUpdate?(oldVersion: string, newVersion: string): Promise<void>;
}

/**
 * プラグインのメインインターフェース
 */
export interface Plugin extends PluginLifecycle {
  readonly manifest: PluginManifest;
  
  // フックハンドラー
  onLessonSearch?(query: string, filters: JsonObject): Promise<void>;
  onWaitlistJoin?(lessonId: string, userId: string): Promise<void>;
  onUserPreferencesUpdate?(preferences: JsonObject): Promise<void>;
  onPageLoad?(pageName: string): Promise<void>;
}

// =============================
// フックシステム
// =============================

/**
 * フックタイプ定義
 */
export enum HookType {
  LESSON_SEARCH = 'lesson:search',
  WAITLIST_JOIN = 'waitlist:join',
  WAITLIST_LEAVE = 'waitlist:leave',
  USER_PREFERENCES_UPDATE = 'user:preferences:update',
  PAGE_LOAD = 'page:load',
  PAGE_UNLOAD = 'page:unload',
  API_REQUEST = 'api:request',
  API_RESPONSE = 'api:response',
  ERROR_OCCURRED = 'error:occurred'
}

/**
 * フックハンドラー
 */
export type HookHandler<T = JsonObject> = (data: T) => Promise<void> | void;

/**
 * フック定義
 */
export interface Hook<T = JsonObject> {
  readonly type: HookType;
  readonly priority: number; // 0が最高優先度
  readonly handler: HookHandler<T>;
  readonly pluginName: string;
}

// =============================
// プラグインマネージャー
// =============================

export class PluginManager {
  private static instance: PluginManager;
  private plugins = new Map<string, Plugin>();
  private hooks = new Map<HookType, Hook[]>();
  private permissions = new Set<string>();

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /**
   * プラグインを登録
   */
  async registerPlugin(plugin: Plugin): Promise<boolean> {
    const { name, permissions = [] } = plugin.manifest;

    // 権限チェック
    if (!this.hasRequiredPermissions(permissions)) {
      console.warn(`Plugin ${name}: Missing required permissions`);
      return false;
    }

    // 依存関係チェック
    if (!this.checkDependencies(plugin.manifest.dependencies)) {
      console.warn(`Plugin ${name}: Missing dependencies`);
      return false;
    }

    try {
      // インストールフックを実行
      if (plugin.onInstall) {
        await plugin.onInstall();
      }

      // プラグインを登録
      this.plugins.set(name, plugin);
      
      // フックを登録
      this.registerPluginHooks(plugin);

      console.log(`Plugin ${name} registered successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to register plugin ${name}:`, error);
      return false;
    }
  }

  /**
   * プラグインを非登録
   */
  async unregisterPlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return false;
    }

    try {
      // アンインストールフックを実行
      if (plugin.onUninstall) {
        await plugin.onUninstall();
      }

      // フックを削除
      this.unregisterPluginHooks(pluginName);

      // プラグインを削除
      this.plugins.delete(pluginName);

      console.log(`Plugin ${pluginName} unregistered successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to unregister plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * プラグインを有効化
   */
  async activatePlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return false;
    }

    try {
      if (plugin.onActivate) {
        await plugin.onActivate();
      }
      return true;
    } catch (error) {
      console.error(`Failed to activate plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * プラグインを無効化
   */
  async deactivatePlugin(pluginName: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      return false;
    }

    try {
      if (plugin.onDeactivate) {
        await plugin.onDeactivate();
      }
      return true;
    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * フックを実行
   */
  async executeHook<T = JsonObject>(type: HookType, data: T): Promise<void> {
    const hooks = this.hooks.get(type) || [];
    
    // 優先度順にソート
    const sortedHooks = hooks.sort((a, b) => a.priority - b.priority);

    // 順次実行
    for (const hook of sortedHooks) {
      try {
        await hook.handler(data);
      } catch (error) {
        console.error(`Hook execution failed for ${hook.pluginName}:`, error);
      }
    }
  }

  /**
   * 登録済みプラグイン一覧を取得
   */
  getPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map(plugin => plugin.manifest);
  }

  /**
   * 特定のプラグインを取得
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * プラグインの権限チェック
   */
  private hasRequiredPermissions(required: PluginPermission[]): boolean {
    return required.every(permission => this.permissions.has(permission));
  }

  /**
   * 依存関係チェック
   */
  private checkDependencies(dependencies: string[] = []): boolean {
    return dependencies.every(dep => this.plugins.has(dep));
  }

  /**
   * プラグインのフックを登録
   */
  private registerPluginHooks(plugin: Plugin): void {
    const { name } = plugin.manifest;

    // 各フックハンドラーを登録
    if (plugin.onLessonSearch) {
      this.addHook(HookType.LESSON_SEARCH, plugin.onLessonSearch, name);
    }
    if (plugin.onWaitlistJoin) {
      this.addHook(HookType.WAITLIST_JOIN, plugin.onWaitlistJoin, name);
    }
    if (plugin.onUserPreferencesUpdate) {
      this.addHook(HookType.USER_PREFERENCES_UPDATE, plugin.onUserPreferencesUpdate, name);
    }
    if (plugin.onPageLoad) {
      this.addHook(HookType.PAGE_LOAD, plugin.onPageLoad, name);
    }
  }

  /**
   * プラグインのフックを削除
   */
  private unregisterPluginHooks(pluginName: string): void {
    for (const [type, hooks] of this.hooks.entries()) {
      const filteredHooks = hooks.filter(hook => hook.pluginName !== pluginName);
      this.hooks.set(type, filteredHooks);
    }
  }

  /**
   * フックを追加
   */
  private addHook<T>(
    type: HookType, 
    handler: HookHandler<T>, 
    pluginName: string, 
    priority = 100
  ): void {
    if (!this.hooks.has(type)) {
      this.hooks.set(type, []);
    }

    this.hooks.get(type)!.push({
      type,
      priority,
      handler: handler as HookHandler,
      pluginName
    });
  }

  /**
   * 権限を付与
   */
  grantPermission(permission: PluginPermission): void {
    this.permissions.add(permission);
  }

  /**
   * 権限を取り消し
   */
  revokePermission(permission: PluginPermission): void {
    this.permissions.delete(permission);
  }
}

// =============================
// プラグイン開発ヘルパー
// =============================

/**
 * プラグイン開発のためのベースクラス
 */
export abstract class BasePlugin implements Plugin {
  abstract readonly manifest: PluginManifest;

  async onInstall(): Promise<void> {
    console.log(`Installing plugin: ${this.manifest.name}`);
  }

  async onActivate(): Promise<void> {
    console.log(`Activating plugin: ${this.manifest.name}`);
  }

  async onDeactivate(): Promise<void> {
    console.log(`Deactivating plugin: ${this.manifest.name}`);
  }

  async onUninstall(): Promise<void> {
    console.log(`Uninstalling plugin: ${this.manifest.name}`);
  }

  /**
   * 設定値を取得
   */
  protected getConfig<T = JsonObject>(key?: string): T | undefined {
    const config = this.manifest.config;
    if (!config) return undefined;
    
    if (key) {
      return config[key] as T;
    }
    return config as T;
  }

  /**
   * ローカルストレージから設定を取得
   */
  protected getStoredConfig<T = JsonObject>(key: string): T | null {
    const stored = localStorage.getItem(`plugin_${this.manifest.name}_${key}`);
    if (!stored) return null;
    
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * ローカルストレージに設定を保存
   */
  protected setStoredConfig<T = JsonObject>(key: string, value: T): void {
    localStorage.setItem(
      `plugin_${this.manifest.name}_${key}`,
      JSON.stringify(value)
    );
  }
}

// =============================
// プラグインイベントエミッター
// =============================

export class PluginEventEmitter {
  private static instance: PluginEventEmitter;
  private pluginManager = PluginManager.getInstance();

  static getInstance(): PluginEventEmitter {
    if (!PluginEventEmitter.instance) {
      PluginEventEmitter.instance = new PluginEventEmitter();
    }
    return PluginEventEmitter.instance;
  }

  /**
   * レッスン検索イベント
   */
  async emitLessonSearch(query: string, filters: JsonObject): Promise<void> {
    await this.pluginManager.executeHook(HookType.LESSON_SEARCH, { query, filters });
  }

  /**
   * 待機リスト参加イベント
   */
  async emitWaitlistJoin(lessonId: string, userId: string): Promise<void> {
    await this.pluginManager.executeHook(HookType.WAITLIST_JOIN, { lessonId, userId });
  }

  /**
   * ユーザー設定更新イベント
   */
  async emitUserPreferencesUpdate(preferences: JsonObject): Promise<void> {
    await this.pluginManager.executeHook(HookType.USER_PREFERENCES_UPDATE, preferences);
  }

  /**
   * ページロードイベント
   */
  async emitPageLoad(pageName: string): Promise<void> {
    await this.pluginManager.executeHook(HookType.PAGE_LOAD, { pageName });
  }

  /**
   * エラー発生イベント
   */
  async emitError(error: Error, context: string): Promise<void> {
    await this.pluginManager.executeHook(HookType.ERROR_OCCURRED, { 
      message: error.message,
      stack: error.stack,
      context 
    });
  }
}

// =============================
// プラグイン設定管理
// =============================

export class PluginConfigManager {
  private static instance: PluginConfigManager;
  private configs = new Map<string, JsonObject>();

  static getInstance(): PluginConfigManager {
    if (!PluginConfigManager.instance) {
      PluginConfigManager.instance = new PluginConfigManager();
    }
    return PluginConfigManager.instance;
  }

  /**
   * プラグイン設定を取得
   */
  getConfig(pluginName: string): JsonObject | undefined {
    return this.configs.get(pluginName);
  }

  /**
   * プラグイン設定を更新
   */
  updateConfig(pluginName: string, config: JsonObject): void {
    this.configs.set(pluginName, { ...this.configs.get(pluginName), ...config });
    
    // ローカルストレージに保存
    localStorage.setItem(
      `plugin_config_${pluginName}`,
      JSON.stringify(this.configs.get(pluginName))
    );
  }

  /**
   * プラグイン設定を削除
   */
  deleteConfig(pluginName: string): void {
    this.configs.delete(pluginName);
    localStorage.removeItem(`plugin_config_${pluginName}`);
  }

  /**
   * 設定をローカルストレージから復元
   */
  loadConfigs(): void {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('plugin_config_')) {
        const pluginName = key.replace('plugin_config_', '');
        try {
          const config = JSON.parse(localStorage.getItem(key) || '{}');
          this.configs.set(pluginName, config);
        } catch (error) {
          console.warn(`Failed to load config for plugin ${pluginName}:`, error);
        }
      }
    }
  }
}

// =============================
// エクスポート
// =============================

// シングルトンインスタンス
export const pluginManager = PluginManager.getInstance();
export const pluginEventEmitter = PluginEventEmitter.getInstance();
export const pluginConfigManager = PluginConfigManager.getInstance();

// 初期化
pluginConfigManager.loadConfigs();