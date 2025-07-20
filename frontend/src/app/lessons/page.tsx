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

interface LessonsByDate {
  [date: string]: LessonData[];
}

interface Studio {
  code: string;
  name: string;
}

interface StudioGroups {
  [groupName: string]: Studio[];
}

export default function LessonsPage() {
  const { isAuthenticated, apiUser, loading } = useAuth();
  const [lessonsByDate, setLessonsByDate] = useState<LessonsByDate>({});
  const [studioGroups, setStudioGroups] = useState<StudioGroups>({});
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingStudios, setLoadingStudios] = useState(false);
  
  // 検索フィルター
  const [selectedStudio, setSelectedStudio] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  
  // 日付タブ管理
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  // カスタムドロップダウン用の状態
  const [isStudioDropdownOpen, setIsStudioDropdownOpen] = useState(false);
  const [selectedStudioName, setSelectedStudioName] = useState<string>('');
  
  // 日付カレンダー用の状態
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // スタジオ選択ハンドラー
  const handleStudioSelect = (studioCode: string, studioName: string) => {
    setSelectedStudio(studioCode);
    setSelectedStudioName(studioName);
    setIsStudioDropdownOpen(false);
    
    // スタジオ選択と同時にレッスンを取得
    fetchLessonsForStudio(studioCode);
  };

  // スタジオ選択リセット
  const handleStudioReset = () => {
    setSelectedStudio('');
    setSelectedStudioName('');
    setIsStudioDropdownOpen(false);
  };

  // ドロップダウン外をクリックした時の処理
  const handleDropdownClose = () => {
    setIsStudioDropdownOpen(false);
  };

  // 日付選択ハンドラー
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setIsDatePickerOpen(false);
  };

  // 日付表示用フォーマット
  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      weekday: 'short'
    });
  };

  // カレンダー表示用の日付生成
  const generateCalendarDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 20; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      dates.push({
        value: dateString,
        date: date.getDate(),
        month: date.getMonth() + 1,
        weekday: date.toLocaleDateString('ja-JP', { weekday: 'short' }),
        isToday: i === 0,
        isWeekend: date.getDay() === 0 || date.getDay() === 6
      });
    }
    
    return dates;
  };

  // スタジオ一覧取得
  const fetchStudios = async () => {
    try {
      setLoadingStudios(true);
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/studios`);
      if (response.data.success) {
        // 新しいAPIレスポンス構造: { data: { studioGroups: {...}, studios: [...] } }
        const { studioGroups: groups, studios: studiosData } = response.data.data;
        console.log('✅ API Response received:', response.data);
        console.log('📊 Groups:', groups);
        console.log('🔑 Groups keys:', Object.keys(groups || {}));
        console.log('📍 Studios data:', studiosData?.length || 0);
        
        if (groups && Object.keys(groups).length > 0) {
          console.log('✅ Setting studio groups:', Object.keys(groups));
          setStudioGroups(groups);
        } else {
          console.log('⚠️ No groups found, using fallback');
          setStudioGroups({});
        }
        setStudios(studiosData || []);
      }
    } catch (error) {
      console.error('Failed to fetch studios:', error);
      // フォールバック用に空の配列を設定
      setStudioGroups({});
      setStudios([]);
    } finally {
      setLoadingStudios(false);
    }
  };

  // スタジオが選択されたときに自動でレッスンを取得
  const fetchLessonsForStudio = async (studioCode: string) => {
    if (!studioCode) return;

    try {
      setLoadingLessons(true);
      console.log('Fetching lessons for studio:', studioCode);
      
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/lessons`, {
        params: {
          studioCode: studioCode,
          range: 'true'
        }
      });
      
      if (response.data.success) {
        const { lessonsByDate: lessonsData, dateRange } = response.data.data;
        console.log('Received lessons data:', lessonsData);
        
        setLessonsByDate(lessonsData);
        
        // 利用可能な日付を設定
        const dates = Object.keys(lessonsData).sort();
        setAvailableDates(dates);
        
        // 最初の日付を自動選択
        if (dates.length > 0 && !selectedDate) {
          setSelectedDate(dates[0]);
        }
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

  // 選択された日付のレッスンを取得
  const getCurrentLessons = () => {
    if (!selectedDate || !lessonsByDate[selectedDate]) {
      return [];
    }
    return lessonsByDate[selectedDate];
  };

  // フィルタリング
  const filteredLessons = getCurrentLessons().filter(lesson => {
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* スタジオ選択 */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">スタジオ</label>
              
              {/* カスタムドロップダウンボタン */}
              <button
                type="button"
                onClick={() => setIsStudioDropdownOpen(!isStudioDropdownOpen)}
                disabled={loadingStudios}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 flex items-center justify-between"
              >
                <span className={selectedStudioName ? "text-gray-900" : "text-gray-500"}>
                  {selectedStudioName || "スタジオを選択"}
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* ドロップダウンメニュー */}
              {isStudioDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  {/* 背景クリック用のオーバーレイ */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={handleDropdownClose}
                  ></div>
                  
                  <div className="relative z-50">
                    {/* リセットオプション */}
                    <button
                      type="button"
                      onClick={handleStudioReset}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 border-b border-gray-200 sticky top-0 bg-white"
                    >
                      <div className="text-sm text-gray-600 italic">スタジオを選択</div>
                    </button>
                    
                    {(() => {
                      console.log('🔄 Rendering check - StudioGroups:', studioGroups);
                      console.log('🔄 Groups count:', Object.keys(studioGroups).length);
                      console.log('🔄 Should show groups:', Object.keys(studioGroups).length > 0);
                      return Object.keys(studioGroups).length > 0;
                    })() ? (
                      // 地域グループ化表示
                      Object.entries(studioGroups).map(([groupName, groupStudios]) => (
                        <div key={groupName}>
                          {/* 地域ヘッダー */}
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200 sticky top-0">
                            {groupName}
                          </div>
                          {/* スタジオリスト */}
                          {groupStudios.map(studio => (
                            <button
                              key={studio.code}
                              type="button"
                              onClick={() => handleStudioSelect(studio.code, studio.name)}
                              className="w-full px-3 py-2 text-left hover:bg-orange-50 focus:bg-orange-50 border-b border-gray-100 last:border-b-0"
                            >
                              <div className="text-sm text-gray-900">
                                {studio.name} <span className="text-xs text-gray-500">({studio.code})</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      ))
                    ) : (
                      // フォールバック: フラットリスト
                      (() => {
                        console.log('📋 Using fallback flat list. Studios count:', studios.length);
                        return studios.map(studio => (
                        <button
                          key={studio.code}
                          type="button"
                          onClick={() => handleStudioSelect(studio.code, studio.name)}
                          className="w-full px-3 py-2 text-left hover:bg-orange-50 focus:bg-orange-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="text-sm text-gray-900">
                            {studio.name} <span className="text-xs text-gray-500">({studio.code})</span>
                          </div>
                        </button>
                        ));
                      })()
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 日付選択 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">日付</label>
              
              {/* 日付タブ表示（スタジオ選択後） */}
              {availableDates.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableDates.map(date => {
                    const dateObj = new Date(date);
                    const today = new Date();
                    const isToday = dateObj.toDateString() === today.toDateString();
                    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                    
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-colors
                          ${selectedDate === date 
                            ? 'bg-orange-500 text-white' 
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-orange-50'
                          }
                          ${isToday ? 'ring-2 ring-orange-200' : ''}
                        `}
                      >
                        <div className="text-center">
                          <div className={`text-xs ${selectedDate === date ? 'text-orange-100' : 'text-gray-500'}`}>
                            {dateObj.toLocaleDateString('ja-JP', { weekday: 'short' })}
                          </div>
                          <div className={`font-semibold ${isWeekend ? 'text-red-500' : ''} ${selectedDate === date ? 'text-white' : ''}`}>
                            {dateObj.getMonth() + 1}/{dateObj.getDate()}
                          </div>
                          {isToday && (
                            <div className={`text-xs ${selectedDate === date ? 'text-orange-200' : 'text-orange-600'}`}>
                              今日
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* カレンダー表示（スタジオ未選択時） */
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left focus:ring-2 focus:ring-orange-500 focus:border-orange-500 flex items-center justify-between"
                  >
                    <span className={selectedDate ? "text-gray-900" : "text-gray-500"}>
                      {selectedDate ? formatDateDisplay(selectedDate) : "日付を選択"}
                    </span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {/* カレンダードロップダウン */}
                  {isDatePickerOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                      {/* 背景クリック用のオーバーレイ */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsDatePickerOpen(false)}
                      ></div>
                      
                      <div className="relative z-50 p-4">
                        {/* カレンダーヘッダー */}
                        <div className="mb-3">
                          <h3 className="text-sm font-medium text-gray-900 text-center">
                            {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                          </h3>
                        </div>
                        
                        {/* カレンダーグリッド */}
                        <div className="grid grid-cols-7 gap-1 text-xs">
                          {/* 曜日ヘッダー */}
                          {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                            <div key={day} className="p-2 text-center text-gray-500 font-medium">
                              {day}
                            </div>
                          ))}
                          
                          {/* カレンダー日付 */}
                          {generateCalendarDates().map(dateInfo => (
                            <button
                              key={dateInfo.value}
                              type="button"
                              onClick={() => handleDateSelect(dateInfo.value)}
                              className={`
                                p-2 text-center rounded transition-colors
                                ${selectedDate === dateInfo.value 
                                  ? 'bg-orange-500 text-white' 
                                  : 'hover:bg-orange-50 text-gray-700'
                                }
                                ${dateInfo.isToday ? 'ring-1 ring-orange-300' : ''}
                                ${dateInfo.isWeekend ? 'text-red-500' : ''}
                              `}
                            >
                              <div className="font-medium">{dateInfo.date}</div>
                              <div className="text-xs opacity-75">{dateInfo.weekday}</div>
                              {dateInfo.isToday && (
                                <div className="text-xs opacity-75">今日</div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                {Object.keys(lessonsByDate).length === 0 ? 'スタジオと日付を選択して検索してください' : '条件に合うレッスンが見つかりません'}
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