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
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  
  // カスタムドロップダウン用の状態
  const [isStudioDropdownOpen, setIsStudioDropdownOpen] = useState(false);
  const [selectedStudioName, setSelectedStudioName] = useState<string>('');
  
  // キャンセル待ち関連状態
  const [registeredWaitlists, setRegisteredWaitlists] = useState<Set<string>>(new Set());
  const [registeringLessons, setRegisteringLessons] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
      }
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
      alert('レッスン情報の取得に失敗しました');
    } finally {
      setLoadingLessons(false);
    }
  };

  // レッスンのIDを生成
  const getLessonId = (lesson: LessonData) => {
    return `${lesson.studioCode}-${lesson.lessonDate}-${lesson.startTime}-${lesson.lessonName}`;
  };

  // 登録済みキャンセル待ちを取得
  const fetchRegisteredWaitlists = async () => {
    if (!apiUser) return;
    
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/waitlist?userId=${apiUser.userId}`);
      
      if (response.data.success) {
        const registered = new Set<string>();
        response.data.data.forEach((waitlist: any) => {
          if (waitlist.status === 'active') {
            const id = `${waitlist.studioCode}-${waitlist.lessonDate}-${waitlist.startTime}-${waitlist.lessonName}`;
            registered.add(id);
          }
        });
        setRegisteredWaitlists(registered);
      }
    } catch (error) {
      console.error('Failed to fetch waitlists:', error);
    }
  };

  // キャンセル待ち登録
  const registerWaitlist = async (lesson: LessonData) => {
    if (!apiUser) {
      setSuccessMessage('ログインが必要です');
      setShowSuccessModal(true);
      return;
    }

    const lessonId = getLessonId(lesson);
    
    // 重複登録チェック
    if (registeredWaitlists.has(lessonId)) {
      setSuccessMessage('このレッスンはすでにキャンセル待ち登録済みです');
      setShowSuccessModal(true);
      return;
    }

    // 登録中状態を設定
    setRegisteringLessons(prev => new Set([...prev, lessonId]));

    try {
      const startTime = lesson.startTime || lesson.time?.split(' - ')[0] || '00:00';
      // 一時的にヘッダーを削除してテスト
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_BASE_URL}/waitlist`, {
        userId: apiUser.userId,
        studioCode: lesson.studioCode,
        lessonDate: lesson.lessonDate,
        startTime: startTime,
        lessonName: lesson.lessonName,
        instructor: lesson.instructor,
      });

      if (response.data.success) {
        // 登録成功時の処理
        setRegisteredWaitlists(prev => new Set([...prev, lessonId]));
        setSuccessMessage(`キャンセル待ちを登録しました！\n${lesson.lessonName} - ${lesson.instructor}\n空きが出たらLINEで通知します。`);
        setShowSuccessModal(true);
      } else {
        setSuccessMessage(response.data.message || 'キャンセル待ち登録に失敗しました');
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error('Failed to register waitlist:', error);
      const errorMessage = error.response?.data?.message || 'キャンセル待ち登録に失敗しました';
      setSuccessMessage(errorMessage);
      setShowSuccessModal(true);
    } finally {
      // 登録中状態を解除
      setRegisteringLessons(prev => {
        const newSet = new Set(prev);
        newSet.delete(lessonId);
        return newSet;
      });
    }
  };

  // 全レッスンを取得してフィルタリング
  const getAllLessons = () => {
    const allLessons: LessonData[] = [];
    Object.values(lessonsByDate).forEach(lessons => {
      allLessons.push(...lessons);
    });
    return allLessons;
  };

  // フィルタリング
  const filteredLessons = getAllLessons().filter(lesson => {
    // 今日以降のレッスンのみ表示
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時間をリセットして日付のみで比較
    const lessonDate = new Date(lesson.lessonDate);
    
    if (lessonDate < today) {
      return false; // 過去のレッスンは除外
    }
    
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      return (
        lesson.lessonName.toLowerCase().includes(keyword) ||
        lesson.instructor.toLowerCase().includes(keyword)
      );
    }
    return true;
  });

  // 日付でグループ化
  const groupedLessons = filteredLessons.reduce((groups: {[date: string]: LessonData[]}, lesson) => {
    const date = lesson.lessonDate;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(lesson);
    return groups;
  }, {});

  // プログラム別カラー取得
  const getProgramColor = (lessonName: string) => {
    if (lessonName.includes('BB1')) return 'bg-yellow-100 text-yellow-800';
    if (lessonName.includes('BB2')) return 'bg-orange-100 text-orange-800';
    if (lessonName.includes('BSL')) return 'bg-blue-100 text-blue-800';
    if (lessonName.includes('BSW')) return 'bg-purple-100 text-purple-800';
    if (lessonName.includes('BST')) return 'bg-green-100 text-green-800';
    if (lessonName.includes('Hip Hop')) return 'bg-pink-100 text-pink-800';
    return 'bg-gray-100 text-gray-800';
  };

  // スタジオ状態表示
  const getAvailabilityStatus = (lesson: LessonData) => {
    if (lesson.isAvailable === 'false') {
      return { text: '満席', color: 'bg-red-100 text-red-800' };
    }
    // 残席数が少ない時のみ表示（正確な数はログイン後のみ）
    if (lesson.availableSlots !== null && lesson.availableSlots !== undefined && lesson.availableSlots <= 3 && lesson.availableSlots > 0) {
      return { text: `残り${lesson.availableSlots}席`, color: 'bg-yellow-100 text-yellow-800' };
    }
    return null;
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStudios();
      fetchRegisteredWaitlists();
    }
  }, [isAuthenticated]);

  // スタジオ選択時にキャンセル待ち状態を更新
  useEffect(() => {
    if (selectedStudio) {
      fetchRegisteredWaitlists();
    }
  }, [selectedStudio]);

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

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* 検索フィルター */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">レッスン検索</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              レッスン一覧 ({filteredLessons.length}件)
            </h2>
          </div>

          {loadingLessons ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600">レッスン情報を取得中...</p>
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">
                {Object.keys(lessonsByDate).length === 0 ? 'スタジオを選択してレッスンを表示してください' : '条件に合うレッスンが見つかりません'}
              </p>
            </div>
          ) : (
            <div>
              {Object.entries(groupedLessons)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, lessons]) => {
                  const dateObj = new Date(date);
                  const isToday = dateObj.toDateString() === new Date().toDateString();
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                  
                  return (
                    <div key={date} className="border-b border-gray-200 last:border-b-0">
                      {/* 日付ヘッダー */}
                      <div className={`sticky top-0 px-6 py-4 border-b border-gray-200 ${
                        isToday 
                          ? 'bg-orange-50 border-orange-200' 
                          : isWeekend 
                            ? 'bg-red-50 border-red-200'
                            : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <h3 className={`text-lg font-bold ${
                              isToday 
                                ? 'text-orange-700' 
                                : isWeekend 
                                  ? 'text-red-700'
                                  : 'text-gray-900'
                            }`}>
                              {dateObj.toLocaleDateString('ja-JP', { 
                                month: 'numeric', 
                                day: 'numeric',
                                weekday: 'short'
                              })}
                            </h3>
                            {isToday && (
                              <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                                TODAY
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            {lessons.length}件
                          </span>
                        </div>
                      </div>
                      
                      {/* その日のレッスン一覧 */}
                      <div className="divide-y divide-gray-100">
                        {lessons
                          .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
                          .map((lesson, index) => {
                            const availabilityStatus = getAvailabilityStatus(lesson);
                            return (
                              <div key={`${date}-${index}`} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center flex-wrap gap-2 mb-3">
                                      <span className="bg-gray-700 text-white text-sm font-bold px-3 py-1 rounded">
                                        {lesson.startTime}
                                      </span>
                                      <span className={`text-sm font-medium px-3 py-1 rounded ${getProgramColor(lesson.lessonName)}`}>
                                        {lesson.lessonName}
                                      </span>
                                      {availabilityStatus && (
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${availabilityStatus.color}`}>
                                          {availabilityStatus.text}
                                        </span>
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex items-center text-gray-600">
                                        <span className="text-lg mr-2">👨‍🏫</span>
                                        <span className="font-medium">{lesson.instructor}</span>
                                      </div>
                                      <div className="flex items-center text-gray-600">
                                        <span className="text-lg mr-2">📍</span>
                                        <span>{selectedStudioName}</span>
                                      </div>
                                      <p className="text-xs text-gray-400">
                                        最終更新: {new Date(lesson.lastUpdated).toLocaleDateString('ja-JP')} {new Date(lesson.lastUpdated).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    {(() => {
                                      const lessonId = getLessonId(lesson);
                                      const isRegistered = registeredWaitlists.has(lessonId);
                                      const isRegistering = registeringLessons.has(lessonId);
                                      
                                      if (isRegistered) {
                                        return (
                                          <div className="flex items-center text-green-600">
                                            <span className="mr-2">✅</span>
                                            <span className="text-sm font-medium">登録済み</span>
                                          </div>
                                        );
                                      }
                                      
                                      return (
                                        <button
                                          onClick={() => registerWaitlist(lesson)}
                                          disabled={isRegistering}
                                          className={`${
                                            isRegistering 
                                              ? 'bg-gray-400 cursor-not-allowed' 
                                              : 'bg-orange-500 hover:bg-orange-600'
                                          } text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg flex items-center`}
                                        >
                                          {isRegistering ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                              登録中...
                                            </>
                                          ) : (
                                            <>
                                              <span className="mr-2">🔔</span>
                                              キャンセル待ち登録
                                            </>
                                          )}
                                        </button>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </main>

      {/* 成功/エラーモーダル */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 mb-4">
                <span className="text-2xl">🔔</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                キャンセル待ち登録
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-line mb-6">
                {successMessage}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                >
                  OK
                </button>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    window.location.href = '/waitlist/';
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                >
                  一覧を見る
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}