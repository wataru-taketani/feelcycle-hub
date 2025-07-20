'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface LessonData {
  studioCode: string;
  studioName?: string;
  lessonDate: string;
  startTime: string;
  time?: string;
  lessonName: string;
  instructor: string;
  lastUpdated: string;
}

interface Studio {
  code: string;
  name: string;
  region: string;
}

export default function LessonsPage() {
  const { isAuthenticated, apiUser, loading } = useAuth();
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingStudios, setLoadingStudios] = useState(false);
  
  // 検索フィルター
  const [selectedStudio, setSelectedStudio] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // スタジオ一覧取得
  const fetchStudios = async () => {
    try {
      setLoadingStudios(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/studios`);
      if (response.data.success) {
        // APIレスポンスの構造に応じて調整
        const studiosData = response.data.data.studios || response.data.data;
        setStudios(studiosData);
      }
    } catch (error) {
      console.error('Failed to fetch studios:', error);
      // フォールバック用にからの配列を設定
      setStudios([]);
    } finally {
      setLoadingStudios(false);
    }
  };

  // レッスン検索
  const searchLessons = async () => {
    if (!selectedStudio || !selectedDate) {
      alert('スタジオと日付を選択してください');
      return;
    }

    try {
      setLoadingLessons(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/lessons`, {
        params: {
          studioCode: selectedStudio,
          date: selectedDate,
        }
      });
      
      if (response.data.success) {
        // APIレスポンスの構造に応じて調整
        const lessonsData = response.data.data.lessons || response.data.data;
        setLessons(lessonsData);
      }
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
      alert('レッスン情報の取得に失敗しました');
    } finally {
      setLoadingLessons(false);
    }
  };

  // キャンセル待ち登録
  const registerWaitlist = async (lesson: LessonData) => {
    if (!apiUser) {
      alert('ログインが必要です');
      return;
    }

    try {
      const startTime = lesson.startTime || lesson.time?.split(' - ')[0] || '00:00';
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/waitlist`, {
        userId: apiUser.userId,
        studioCode: lesson.studioCode,
        lessonDate: lesson.lessonDate,
        startTime: startTime,
        lessonName: lesson.lessonName,
        instructor: lesson.instructor,
      });

      if (response.data.success) {
        alert('キャンセル待ちを登録しました！空きが出たら通知します。');
      } else {
        alert(response.data.message || 'キャンセル待ち登録に失敗しました');
      }
    } catch (error: any) {
      console.error('Failed to register waitlist:', error);
      const errorMessage = error.response?.data?.message || 'キャンセル待ち登録に失敗しました';
      alert(errorMessage);
    }
  };

  // 日付選択肢生成（今日から20日先まで）
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 20; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        weekday: 'short'
      });
      dates.push({ value: dateString, label: displayDate });
    }
    
    return dates;
  };

  // フィルタリング
  const filteredLessons = lessons.filter(lesson => {
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        lesson.lessonName.toLowerCase().includes(keyword) ||
        lesson.instructor.toLowerCase().includes(keyword)
      );
    }
    return true;
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchStudios();
    }
  }, [isAuthenticated]);

  // 今日の日付を初期値に設定
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">ログインが必要です</p>
          <a href="/" className="mt-4 inline-block bg-green-500 text-white px-4 py-2 rounded-lg">
            ホームに戻る
          </a>
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
              <h1 className="text-2xl font-bold text-gray-900">レッスン検索</h1>
              <div className="w-8 h-1 bg-orange-400 rounded-full mt-1"></div>
            </div>
            <a href="/" className="text-orange-600 hover:text-orange-700 font-medium">
              ← ホームに戻る
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 検索フィルター */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">レッスン検索</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* スタジオ選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">スタジオ</label>
              <select
                value={selectedStudio}
                onChange={(e) => setSelectedStudio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                disabled={loadingStudios}
              >
                <option value="">スタジオを選択</option>
                {studios.map(studio => (
                  <option key={studio.code} value={studio.code}>
                    {studio.name} ({studio.region})
                  </option>
                ))}
              </select>
            </div>

            {/* 日付選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日付</label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {generateDateOptions().map(date => (
                  <option key={date.value} value={date.value}>
                    {date.label}
                  </option>
                ))}
              </select>
            </div>

            {/* キーワード検索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">キーワード</label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="レッスン名・インストラクター"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* 検索ボタン */}
            <div className="flex items-end">
              <button
                onClick={searchLessons}
                disabled={loadingLessons || !selectedStudio || !selectedDate}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
              >
                {loadingLessons ? '検索中...' : '🔍 検索'}
              </button>
            </div>
          </div>
        </div>

        {/* レッスン一覧 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              検索結果 ({filteredLessons.length}件)
            </h2>
          </div>

          {loadingLessons ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">検索中...</p>
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">
                {lessons.length === 0 ? 'スタジオと日付を選択して検索してください' : '条件に合うレッスンが見つかりません'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredLessons.map((lesson, index) => (
                <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2.5 py-0.5 rounded">
                          {lesson.time || lesson.startTime}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">{lesson.lessonName}</h3>
                      </div>
                      <div className="text-gray-600 space-y-1">
                        <p>👨‍🏫 {lesson.instructor}</p>
                        <p>📍 {lesson.studioName || lesson.studioCode}</p>
                        <p className="text-xs text-gray-500">
                          最終更新: {new Date(lesson.lastUpdated).toLocaleString('ja-JP')}
                        </p>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => registerWaitlist(lesson)}
                        className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                      >
                        🔔 キャンセル待ち登録
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}