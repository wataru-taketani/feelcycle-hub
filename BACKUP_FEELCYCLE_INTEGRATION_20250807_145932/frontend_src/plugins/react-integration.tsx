/**
 * React プラグイン統合
 * Phase 4.4: プラグイン機能とReactの統合
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Plugin, PluginManifest } from './index';
import { pluginManager, pluginEventEmitter, HookType } from './index';
import { AnalyticsPlugin } from './examples/AnalyticsPlugin';
import { NotificationPlugin } from './examples/NotificationPlugin';
import type { JsonObject } from '../types/global';

// =============================
// プラグイン コンテキスト
// =============================

interface PluginContextValue {
  plugins: PluginManifest[];
  activePlugins: Set<string>;
  loading: boolean;
  error: string | null;
  
  // プラグイン管理
  installPlugin: (plugin: Plugin) => Promise<boolean>;
  uninstallPlugin: (pluginName: string) => Promise<boolean>;
  activatePlugin: (pluginName: string) => Promise<boolean>;
  deactivatePlugin: (pluginName: string) => Promise<boolean>;
  
  // イベント発行
  emitLessonSearch: (query: string, filters: JsonObject) => Promise<void>;
  emitWaitlistJoin: (lessonId: string, userId: string) => Promise<void>;
  emitUserPreferencesUpdate: (preferences: JsonObject) => Promise<void>;
  emitPageLoad: (pageName: string) => Promise<void>;
  
  // プラグイン情報
  getPlugin: (name: string) => Plugin | undefined;
  isPluginActive: (name: string) => boolean;
}

const PluginContext = createContext<PluginContextValue | null>(null);

// =============================
// プラグイン プロバイダー
// =============================

interface PluginProviderProps {
  children: React.ReactNode;
  autoLoadPlugins?: boolean;
}

export function PluginProvider({ 
  children, 
  autoLoadPlugins = true 
}: PluginProviderProps): JSX.Element {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [activePlugins, setActivePlugins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // プラグイン管理関数
  const installPlugin = useCallback(async (plugin: Plugin): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await pluginManager.registerPlugin(plugin);
      if (success) {
        setPlugins(pluginManager.getPlugins());
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Plugin installation failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const uninstallPlugin = useCallback(async (pluginName: string): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await pluginManager.unregisterPlugin(pluginName);
      if (success) {
        setPlugins(pluginManager.getPlugins());
        setActivePlugins(prev => {
          const next = new Set(prev);
          next.delete(pluginName);
          return next;
        });
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Plugin uninstallation failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const activatePlugin = useCallback(async (pluginName: string): Promise<boolean> => {
    try {
      const success = await pluginManager.activatePlugin(pluginName);
      if (success) {
        setActivePlugins(prev => new Set(prev).add(pluginName));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Plugin activation failed');
      return false;
    }
  }, []);

  const deactivatePlugin = useCallback(async (pluginName: string): Promise<boolean> => {
    try {
      const success = await pluginManager.deactivatePlugin(pluginName);
      if (success) {
        setActivePlugins(prev => {
          const next = new Set(prev);
          next.delete(pluginName);
          return next;
        });
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Plugin deactivation failed');
      return false;
    }
  }, []);

  // イベント発行関数
  const emitLessonSearch = useCallback(async (query: string, filters: JsonObject): Promise<void> => {
    await pluginEventEmitter.emitLessonSearch(query, filters);
  }, []);

  const emitWaitlistJoin = useCallback(async (lessonId: string, userId: string): Promise<void> => {
    await pluginEventEmitter.emitWaitlistJoin(lessonId, userId);
  }, []);

  const emitUserPreferencesUpdate = useCallback(async (preferences: JsonObject): Promise<void> => {
    await pluginEventEmitter.emitUserPreferencesUpdate(preferences);
  }, []);

  const emitPageLoad = useCallback(async (pageName: string): Promise<void> => {
    await pluginEventEmitter.emitPageLoad(pageName);
  }, []);

  // ユーティリティ関数
  const getPlugin = useCallback((name: string): Plugin | undefined => {
    return pluginManager.getPlugin(name);
  }, []);

  const isPluginActive = useCallback((name: string): boolean => {
    return activePlugins.has(name);
  }, [activePlugins]);

  // 初期化
  useEffect(() => {
    const initializePlugins = async (): Promise<void> => {
      setLoading(true);
      try {
        // 基本権限を付与
        pluginManager.grantPermission('storage.read');
        pluginManager.grantPermission('storage.write');
        pluginManager.grantPermission('api.call');
        pluginManager.grantPermission('notification.send');

        if (autoLoadPlugins) {
          // デフォルトプラグインを自動インストール
          const analyticsPlugin = new AnalyticsPlugin();
          const notificationPlugin = new NotificationPlugin();

          await pluginManager.registerPlugin(analyticsPlugin);
          await pluginManager.registerPlugin(notificationPlugin);

          // デフォルトで有効化
          await pluginManager.activatePlugin(analyticsPlugin.manifest.name);
          await pluginManager.activatePlugin(notificationPlugin.manifest.name);

          setActivePlugins(new Set([
            analyticsPlugin.manifest.name,
            notificationPlugin.manifest.name
          ]));
        }

        setPlugins(pluginManager.getPlugins());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Plugin initialization failed');
      } finally {
        setLoading(false);
      }
    };

    initializePlugins();
  }, [autoLoadPlugins]);

  const contextValue: PluginContextValue = {
    plugins,
    activePlugins,
    loading,
    error,
    installPlugin,
    uninstallPlugin,
    activatePlugin,
    deactivatePlugin,
    emitLessonSearch,
    emitWaitlistJoin,
    emitUserPreferencesUpdate,
    emitPageLoad,
    getPlugin,
    isPluginActive
  };

  return (
    <PluginContext.Provider value={contextValue}>
      {children}
    </PluginContext.Provider>
  );
}

// =============================
// プラグイン フック
// =============================

/**
 * プラグインコンテキストを使用するフック
 */
export function usePlugins(): PluginContextValue {
  const context = useContext(PluginContext);
  if (!context) {
    throw new Error('usePlugins must be used within a PluginProvider');
  }
  return context;
}

/**
 * ページロードイベントを自動発行するフック
 */
export function usePageLoad(pageName: string): void {
  const { emitPageLoad } = usePlugins();

  useEffect(() => {
    emitPageLoad(pageName);
  }, [pageName, emitPageLoad]);
}

/**
 * レッスン検索イベントを発行するフック
 */
export function useLessonSearchEvents(): {
  emitSearch: (query: string, filters: JsonObject) => Promise<void>;
} {
  const { emitLessonSearch } = usePlugins();

  return {
    emitSearch: emitLessonSearch
  };
}

/**
 * 待機リストイベントを発行するフック
 */
export function useWaitlistEvents(): {
  emitJoin: (lessonId: string, userId: string) => Promise<void>;
} {
  const { emitWaitlistJoin } = usePlugins();

  return {
    emitJoin: emitWaitlistJoin
  };
}

/**
 * 特定のプラグインを使用するフック
 */
export function usePlugin<T extends Plugin>(pluginName: string): T | null {
  const { getPlugin, isPluginActive } = usePlugins();

  if (!isPluginActive(pluginName)) {
    return null;
  }

  return getPlugin(pluginName) as T | null;
}

// =============================
// プラグイン管理 UI コンポーネント
// =============================

/**
 * プラグイン管理ダッシュボード
 */
export function PluginDashboard(): JSX.Element {
  const {
    plugins,
    activePlugins,
    loading,
    error,
    activatePlugin,
    deactivatePlugin
  } = usePlugins();

  if (loading) {
    return <div className="p-4">Loading plugins...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Plugin Management</h2>
      
      {plugins.length === 0 ? (
        <p className="text-gray-500">No plugins installed</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plugins.map((plugin) => (
            <PluginCard
              key={plugin.name}
              plugin={plugin}
              isActive={activePlugins.has(plugin.name)}
              onToggle={async (active: boolean) => {
                if (active) {
                  await activatePlugin(plugin.name);
                } else {
                  await deactivatePlugin(plugin.name);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * プラグインカード
 */
interface PluginCardProps {
  plugin: PluginManifest;
  isActive: boolean;
  onToggle: (active: boolean) => Promise<void>;
}

function PluginCard({ plugin, isActive, onToggle }: PluginCardProps): JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (): Promise<void> => {
    setLoading(true);
    try {
      await onToggle(!isActive);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-lg">{plugin.name}</h3>
        <span 
          className={`px-2 py-1 text-xs rounded ${
            isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-3">{plugin.description}</p>
      
      <div className="text-xs text-gray-500 mb-3">
        <div>Version: {plugin.version}</div>
        <div>Author: {plugin.author}</div>
      </div>
      
      {plugin.permissions && plugin.permissions.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-700 mb-1">Permissions:</div>
          <div className="flex flex-wrap gap-1">
            {plugin.permissions.map((permission) => (
              <span
                key={permission}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`w-full py-2 px-4 rounded text-sm font-medium transition-colors ${
          isActive
            ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300'
            : 'bg-green-500 text-white hover:bg-green-600 disabled:bg-green-300'
        }`}
      >
        {loading ? 'Loading...' : (isActive ? 'Deactivate' : 'Activate')}
      </button>
    </div>
  );
}

// =============================
// HOC（高次コンポーネント）
// =============================

/**
 * プラグイン機能付きコンポーネントHOC
 */
export function withPlugins<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WithPluginsComponent = (props: P): JSX.Element => {
    return (
      <PluginProvider>
        <Component {...props} />
      </PluginProvider>
    );
  };

  WithPluginsComponent.displayName = `withPlugins(${Component.displayName || Component.name})`;
  
  return WithPluginsComponent;
}

/**
 * ページロードイベント自動発行HOC
 */
export function withPageTracking<P extends object>(
  Component: React.ComponentType<P>,
  pageName: string
): React.ComponentType<P> {
  const WithPageTrackingComponent = (props: P): JSX.Element => {
    usePageLoad(pageName);
    return <Component {...props} />;
  };

  WithPageTrackingComponent.displayName = `withPageTracking(${Component.displayName || Component.name})`;
  
  return WithPageTrackingComponent;
}

// =============================
// エクスポート
// =============================

export type { PluginContextValue };
export { PluginContext };