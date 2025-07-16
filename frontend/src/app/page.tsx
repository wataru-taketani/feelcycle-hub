'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface LessonSummary {
  period: string;
  totalLessons: number;
  remainingLessons: number;
  favoriteInstructors: Array<{ name: string; count: number }>;
  favoritePrograms: Array<{ name: string; count: number }>;
  studioBreakdown: Array<{ studio: string; count: number }>;
}

export default function HomePage() {
  const { isAuthenticated, user, apiUser, loading, error, login } = useAuth();
  const [lessonSummary, setLessonSummary] = useState<LessonSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchLessonSummary = async () => {
    if (!apiUser) return;

    try {
      setLoadingSummary(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/history/summary`,
        {
          params: { userId: apiUser.userId },
        }
      );
      setLessonSummary(response.data.data);
    } catch (error) {
      console.error('Failed to fetch lesson summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && apiUser) {
      fetchLessonSummary();
    }
  }, [isAuthenticated, apiUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">エラーが発生しました</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 text-xs text-gray-600">
            <strong>デバッグ情報:</strong><br/>
            URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}<br/>
            LIFF ID: {process.env.NEXT_PUBLIC_LIFF_ID || 'デフォルト値を使用'}<br/>
            User Agent: {typeof window !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'N/A'}
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">FEELCYCLE Hub</h1>
            <div className="w-12 h-1 bg-orange-400 mx-auto rounded-full mb-4"></div>
            <p className="text-gray-600 mb-2">レッスン予約サポートシステム</p>
            <p className="text-sm text-gray-500">ご利用にはLINEログインが必要です</p>
          </div>
          <button 
            onClick={login} 
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.5 4.5C19.8 1.9 17.1 0 14 0H6C2.7 0 0 2.7 0 6v8c0 3.3 2.7 6 6 6h8c3.3 0 6-2.7 6-6V6c0-.5-.1-1-.5-1.5zM12 18c-3.3 0-6-2.7-6-6s2.7-6 6-6 6 2.7 6 6-2.7 6-6 6z"/>
              </svg>
              LINEでログイン
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">FEELCYCLE Hub</h1>
              <div className="w-8 h-1 bg-orange-400 rounded-full mt-1"></div>
            </div>
            <div className="flex items-center space-x-3">
              {user?.pictureUrl && (
                <img 
                  src={user.pictureUrl} 
                  alt={user.displayName}
                  className="w-10 h-10 rounded-full border-2 border-gray-200"
                />
              )}
              <span className="text-gray-700 font-medium">{user?.displayName}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Dashboard Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">ダッシュボード</h2>
          
          {loadingSummary ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mr-3"></div>
              <p className="text-gray-600">データを読み込み中...</p>
            </div>
          ) : lessonSummary ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">今月の受講状況</h3>
                  <div className="space-y-2">
                    <p className="text-blue-800"><span className="font-medium">受講済み:</span> {lessonSummary.totalLessons}回</p>
                    <p className="text-blue-800"><span className="font-medium">残り:</span> {lessonSummary.remainingLessons}回</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 mb-3">お気に入りインストラクター</h3>
                  <div className="space-y-1">
                    {lessonSummary.favoriteInstructors.slice(0, 3).map((instructor, index) => (
                      <p key={index} className="text-green-800 text-sm">{instructor.name}: {instructor.count}回</p>
                    ))}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-900 mb-3">人気プログラム</h3>
                  <div className="space-y-1">
                    {lessonSummary.favoritePrograms.slice(0, 3).map((program, index) => (
                      <p key={index} className="text-purple-800 text-sm">{program.name}: {program.count}回</p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">スタジオ別利用状況</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {lessonSummary.studioBreakdown.map((studio, index) => (
                    <div key={index} className="bg-white rounded-lg p-3 text-center border border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{studio.studio}</p>
                      <p className="text-lg font-bold text-orange-500">{studio.count}回</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">データがありません</p>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">機能</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200 hover:shadow-md transition-shadow">
              <div className="text-orange-600 mb-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-orange-900 mb-2">レッスン検索</h3>
              <p className="text-orange-800 text-sm mb-4">空きのあるレッスンを検索</p>
              <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200">
                検索
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200 hover:shadow-md transition-shadow">
              <div className="text-blue-600 mb-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM12 17h3m-3 0v5m0-5V7a2 2 0 112 2m-2-2V5a2 2 0 012-2h.01M12 7V3.13a2 2 0 01.885-1.65l2-1.333a2 2 0 011.43-.133l1.774.443a2 2 0 011.61 1.955V7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">監視登録</h3>
              <p className="text-blue-800 text-sm mb-4">希望レッスンの空き通知を設定</p>
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200">
                設定
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200 hover:shadow-md transition-shadow">
              <div className="text-green-600 mb-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">履歴確認</h3>
              <p className="text-green-800 text-sm mb-4">受講履歴とレッスン詳細</p>
              <button className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200">
                確認
              </button>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200 hover:shadow-md transition-shadow">
              <div className="text-purple-600 mb-3">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">設定</h3>
              <p className="text-purple-800 text-sm mb-4">通知設定と個人情報管理</p>
              <button className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200">
                設定
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}