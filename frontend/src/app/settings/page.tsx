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
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.get(
        `${apiBaseUrl}/user/settings`,
        {
          params: { userId: apiUser?.userId },
        }
      );
      
      if (response.data.success) {
        setSettings(response.data.data);
      } else {
        // Use default settings if not found
        setSettings({
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
      }
    } catch (error) {
      console.error('Error fetching user settings:', error);
      // Use default settings on error
      setSettings({
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
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev'}/user/feelcycle-credentials`,
        {
          userId: apiUser?.userId,
          email: credentials.email,
          password: credentials.password,
        }
      );
      
      if (response.data.success) {
        // Update settings
        setSettings(prev => ({
          ...prev,
          feelcycleCredentials: { ...credentials },
        }));
        
        setIsEditing(false);
        setCredentials({ email: '', password: '' });
        alert('FEELCYCLE認証情報を保存しました');
      } else {
        throw new Error(response.data.message || '認証情報の保存に失敗しました');
      }
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
      const response = await axios.delete(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev'}/user/feelcycle-credentials`,
        {
          params: { userId: apiUser?.userId },
        }
      );
      
      if (response.data.success) {
        setSettings(prev => ({
          ...prev,
          feelcycleCredentials: null,
        }));
        
        alert('FEELCYCLE認証情報を削除しました');
      } else {
        throw new Error(response.data.message || '認証情報の削除に失敗しました');
      }
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
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev'}/user/notification-settings`,
        {
          userId: apiUser?.userId,
          notificationSettings: settings.notificationSettings,
        }
      );
      
      if (response.data.success) {
        alert('通知設定を保存しました');
      } else {
        throw new Error(response.data.message || '通知設定の保存に失敗しました');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      alert('通知設定の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ユーザー設定</h1>
              <p className="text-gray-600 text-sm">アカウント・通知・認証設定を管理</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* FEELCYCLE認証情報 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              FEELCYCLE認証情報
            </h2>
            <p className="text-blue-100 text-sm mt-1">自動予約と受講履歴機能のために必要</p>
          </div>
          
          <div className="p-6">
            {settings.feelcycleCredentials ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-emerald-900 font-semibold">認証情報が登録済み</p>
                      <p className="text-emerald-700 text-sm">
                        📧 {settings.feelcycleCredentials.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={deleteFeelcycleCredentials}
                    disabled={saving}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                  >
                    削除
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-blue-900">自動予約</h3>
                    </div>
                    <p className="text-blue-800 text-sm">
                      キャンセル待ち中のレッスンに空きが出たら自動で予約します
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h3 className="font-semibold text-purple-900">受講履歴</h3>
                    </div>
                    <p className="text-purple-800 text-sm">
                      過去のレッスン受講記録を自動で取得・表示します
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-amber-800 font-medium">FEELCYCLE認証情報が未設定です</p>
                  </div>
                  <p className="text-amber-700 text-sm">
                    自動予約と受講履歴機能を利用するには認証情報の登録が必要です
                  </p>
                </div>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        メールアドレス
                      </label>
                      <input
                        type="email"
                        value={credentials.email}
                        onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 transition-all"
                        placeholder="your-email@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        パスワード
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={credentials.password}
                          onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400 pr-10 transition-all"
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
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none font-medium"
                      >
                        {saving ? '保存中...' : '保存'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setCredentials({ email: '', password: '' });
                        }}
                        className="px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all font-medium"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 font-medium"
                  >
                    認証情報を設定
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 通知設定 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v10z" />
              </svg>
              通知設定
            </h2>
            <p className="text-emerald-100 text-sm mt-1">LINE通知とタイミングを設定</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM15 17H9a2 2 0 01-2-2V5a2 2 0 012-2h6a2 2 0 012 2v10z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">LINE通知</p>
                  <p className="text-sm text-gray-600">キャンセル待ちの結果をLINEで通知</p>
                </div>
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
              <label className="block text-sm font-semibold text-gray-700 mb-3">通知タイミング</label>
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
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
              >
                <option value="immediate">即座に通知</option>
                <option value="5min">5分後に通知</option>
                <option value="10min">10分後に通知</option>
              </select>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  <p className="font-semibold text-gray-900">サイレント時間</p>
                </div>
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
                <div className="grid grid-cols-2 gap-4 mt-3">
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
                      className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
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
                      className="w-full p-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={saveNotificationSettings}
              disabled={saving}
              className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none font-medium"
            >
              {saving ? '保存中...' : '通知設定を保存'}
            </button>
          </div>
        </div>

        {/* アカウント情報 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              アカウント情報
            </h2>
            <p className="text-gray-300 text-sm mt-1">LINE連携アカウントの詳細</p>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">LINE連携アカウント</p>
                <p className="font-semibold text-gray-900">{apiUser?.email}</p>
              </div>
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm text-gray-600">作成日</p>
                <p className="font-semibold text-gray-900">
                  {apiUser?.createdAt ? new Date(apiUser.createdAt).toLocaleDateString('ja-JP') : '不明'}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6v6m8-6v6" />
                </svg>
              </div>
            </div>
            
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                アカウントの削除や設定の変更に関するご質問は、サポートまでお問い合わせください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}