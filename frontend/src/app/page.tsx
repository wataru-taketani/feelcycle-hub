'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Dashboard } from '@/components/Dashboard';
import { Menu } from '@/components/Menu';

export default function HomePage() {
  const { isAuthenticated, loading, error, login } = useAuth();

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
      <Dashboard />
      <Menu />
    </div>
  );
}