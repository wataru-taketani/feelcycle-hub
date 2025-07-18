'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

interface FeelcycleCredentials {
  email: string;
  password: string;
}

interface NotificationSettings {
  enableLineNotifications: boolean;
  notificationTiming: 'immediate' | '5min' | '10min';
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

interface UserSettings {
  feelcycleCredentials: FeelcycleCredentials | null;
  notificationSettings: NotificationSettings;
}

export default function SettingsPage() {
  const { apiUser } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    feelcycleCredentials: null,
    notificationSettings: {
      enableLineNotifications: true,
      notificationTiming: 'immediate',
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
      },
    },
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<FeelcycleCredentials>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (apiUser) {
      fetchUserSettings();
    }
  }, [apiUser]);

  const fetchUserSettings = async () => {
    try {
      setLoading(true);
      // Mock API call - in real implementation, fetch from backend
      const mockSettings: UserSettings = {
        feelcycleCredentials: null, // Will be populated if exists
        notificationSettings: {
          enableLineNotifications: true,
          notificationTiming: 'immediate',
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
          },
        },
      };
      setSettings(mockSettings);
    } catch (error) {
      console.error('Error fetching user settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveFeelcycleCredentials = async () => {
    if (!credentials.email || !credentials.password) {
      alert('メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      setSaving(true);
      // Mock API call - in real implementation, save to backend
      console.log('Saving FEELCYCLE credentials:', { email: credentials.email });
      
      // Update settings
      setSettings(prev => ({
        ...prev,
        feelcycleCredentials: { ...credentials },
      }));
      
      setIsEditing(false);
      setCredentials({ email: '', password: '' });
      alert('FEELCYCLE認証情報を保存しました');
    } catch (error) {
      console.error('Error saving credentials:', error);
      alert('認証情報の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const deleteFeelcycleCredentials = async () => {
    if (!confirm('FEELCYCLE認証情報を削除しますか？\n自動予約と受講履歴機能が無効になります。')) {
      return;
    }

    try {
      setSaving(true);
      // Mock API call - in real implementation, delete from backend
      console.log('Deleting FEELCYCLE credentials');
      
      setSettings(prev => ({
        ...prev,
        feelcycleCredentials: null,
      }));
      
      alert('FEELCYCLE認証情報を削除しました');
    } catch (error) {
      console.error('Error deleting credentials:', error);
      alert('認証情報の削除に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      setSaving(true);
      // Mock API call - in real implementation, save to backend
      console.log('Saving notification settings:', settings.notificationSettings);
      alert('通知設定を保存しました');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('通知設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          ⚙️ ユーザー設定
        </h1>

        {/* FEELCYCLE認証情報 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🔐 FEELCYCLE認証情報</h2>
          
          {settings.feelcycleCredentials ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="text-green-800 font-medium">✅ 認証情報が登録済み</p>
                  <p className="text-green-600 text-sm">
                    📧 {settings.feelcycleCredentials.email}
                  </p>
                </div>
                <button
                  onClick={deleteFeelcycleCredentials}
                  disabled={saving}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  削除
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">🤖 自動予約</h3>
                  <p className="text-blue-800 text-sm">
                    キャンセル待ち中のレッスンに空きが出たら自動で予約します
                  </p>
                </div>
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="font-medium text-purple-900 mb-2">📊 受講履歴</h3>
                  <p className="text-purple-800 text-sm">
                    過去のレッスン受講記録を自動で取得・表示します
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  ⚠️ FEELCYCLE認証情報が未設定です
                </p>
                <p className="text-yellow-700 text-sm mt-1">
                  自動予約と受講履歴機能を利用するには認証情報の登録が必要です
                </p>
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      value={credentials.email}
                      onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your-email@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      パスワード
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={credentials.password}
                        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="パスワード"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L7.758 7.758M12 12l2.122 2.122m-2.122-2.122L14.122 14.122M12 12l2.122-2.122m0 0l2.122-2.122" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={saveFeelcycleCredentials}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {saving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setCredentials({ email: '', password: '' });
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  認証情報を設定
                </button>
              )}
            </div>
          )}
        </div>

        {/* 通知設定 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🔔 通知設定</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">LINE通知</p>
                <p className="text-sm text-gray-600">キャンセル待ちの結果をLINEで通知</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationSettings.enableLineNotifications}
                  onChange={(e) => 
                    setSettings(prev => ({
                      ...prev,
                      notificationSettings: {
                        ...prev.notificationSettings,
                        enableLineNotifications: e.target.checked,
                      },
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <p className="font-medium text-gray-900 mb-2">通知タイミング</p>
              <select
                value={settings.notificationSettings.notificationTiming}
                onChange={(e) => 
                  setSettings(prev => ({
                    ...prev,
                    notificationSettings: {
                      ...prev.notificationSettings,
                      notificationTiming: e.target.value as 'immediate' | '5min' | '10min',
                    },
                  }))
                }
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="immediate">即座に通知</option>
                <option value="5min">5分後に通知</option>
                <option value="10min">10分後に通知</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-gray-900">サイレント時間</p>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationSettings.quietHours.enabled}
                    onChange={(e) => 
                      setSettings(prev => ({
                        ...prev,
                        notificationSettings: {
                          ...prev.notificationSettings,
                          quietHours: {
                            ...prev.notificationSettings.quietHours,
                            enabled: e.target.checked,
                          },
                        },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {settings.notificationSettings.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">開始時間</label>
                    <input
                      type="time"
                      value={settings.notificationSettings.quietHours.startTime}
                      onChange={(e) => 
                        setSettings(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            quietHours: {
                              ...prev.notificationSettings.quietHours,
                              startTime: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">終了時間</label>
                    <input
                      type="time"
                      value={settings.notificationSettings.quietHours.endTime}
                      onChange={(e) => 
                        setSettings(prev => ({
                          ...prev,
                          notificationSettings: {
                            ...prev.notificationSettings,
                            quietHours: {
                              ...prev.notificationSettings.quietHours,
                              endTime: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={saveNotificationSettings}
              disabled={saving}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '通知設定を保存'}
            </button>
          </div>
        </div>

        {/* アカウント情報 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">👤 アカウント情報</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">LINE連携アカウント</p>
              <p className="font-medium">{apiUser?.email}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">作成日</p>
              <p className="font-medium">
                {apiUser?.createdAt ? new Date(apiUser.createdAt).toLocaleDateString('ja-JP') : '不明'}
              </p>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                ⚠️ アカウントの削除や設定の変更に関するご質問は、サポートまでお問い合わせください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}