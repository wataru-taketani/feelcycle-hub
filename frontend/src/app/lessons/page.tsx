'use client';

import { useState, useEffect } from 'react';

interface Studio {
  code: string;
  name: string;
  region: string;
}

interface Lesson {
  lessonId: string;
  studio: string;
  date: string;
  time: string;
  instructor: string;
  program: string;
  availableSlots: number;
  totalSlots: number;
  isAvailable: boolean;
}

export default function LessonsPage() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [selectedStudio, setSelectedStudio] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFilters, setSelectedFilters] = useState({
    program: '',
    instructor: '',
  });

  // Load studios on component mount
  useEffect(() => {
    fetchStudios();
  }, []);

  // Load dates when studio is selected
  useEffect(() => {
    if (selectedStudio) {
      fetchStudioDates(selectedStudio);
    }
  }, [selectedStudio]);

  // Load lessons when both studio and date are selected
  useEffect(() => {
    if (selectedStudio && selectedDate) {
      fetchLessons();
    }
  }, [selectedStudio, selectedDate, selectedFilters]);

  const fetchStudios = async () => {
    try {
      // Mock API call
      const mockStudios: Studio[] = [
        { code: 'omotesando', name: '表参道', region: 'tokyo' },
        { code: 'ginza', name: '銀座', region: 'tokyo' },
        { code: 'shibuya', name: '渋谷', region: 'tokyo' },
        { code: 'shinjuku', name: '新宿', region: 'tokyo' },
        { code: 'sapporo', name: '札幌', region: 'hokkaido' },
      ];
      setStudios(mockStudios);
    } catch (error) {
      console.error('Error fetching studios:', error);
    }
  };

  const fetchStudioDates = async (studioCode: string) => {
    try {
      setLoading(true);
      // Mock API call - next 7 days
      const dates: string[] = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      setAvailableDates(dates);
      setSelectedDate(''); // Reset date selection
      setLessons([]); // Clear lessons
    } catch (error) {
      console.error('Error fetching studio dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      // Mock API call
      const mockLessons: Lesson[] = [
        {
          lessonId: `${selectedStudio}_${selectedDate}_1030_BSL1`,
          studio: selectedStudio,
          date: selectedDate,
          time: '10:30',
          instructor: 'YUKI',
          program: 'BSL House 1',
          availableSlots: 0,
          totalSlots: 20,
          isAvailable: false,
        },
        {
          lessonId: `${selectedStudio}_${selectedDate}_1200_BB1`,
          studio: selectedStudio,
          date: selectedDate,
          time: '12:00',
          instructor: 'MIKI',
          program: 'BB1 Beat',
          availableSlots: 3,
          totalSlots: 20,
          isAvailable: true,
        },
        {
          lessonId: `${selectedStudio}_${selectedDate}_1930_BSL2`,
          studio: selectedStudio,
          date: selectedDate,
          time: '19:30',
          instructor: 'Shiori.I',
          program: 'BSL House 1',
          availableSlots: 0,
          totalSlots: 20,
          isAvailable: false,
        },
      ];
      setLessons(mockLessons);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWaitlist = async (lesson: Lesson) => {
    try {
      console.log('Creating waitlist for:', lesson);
      // Mock API call for creating waitlist
      alert(`キャンセル待ちを作成しました:\n${lesson.program} ${lesson.time}`);
    } catch (error) {
      console.error('Error creating waitlist:', error);
      alert('キャンセル待ちの作成に失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  };

  const getProgramColor = (program: string) => {
    if (program.includes('BB1')) return 'bg-yellow-100 text-yellow-800';
    if (program.includes('BB2')) return 'bg-orange-100 text-orange-800';
    if (program.includes('BSL')) return 'bg-blue-100 text-blue-800';
    if (program.includes('BSW')) return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          🚴‍♀️ レッスン検索 & キャンセル待ち
        </h1>

        {/* Studio Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📍 スタジオ選択</h2>
          <select
            value={selectedStudio}
            onChange={(e) => setSelectedStudio(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">スタジオを選択してください</option>
            {studios.map((studio) => (
              <option key={studio.code} value={studio.code}>
                {studio.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Selection */}
        {selectedStudio && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">📅 日付選択</h2>
            <div className="grid grid-cols-7 gap-2">
              {availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`p-3 text-center rounded-lg border ${
                    selectedDate === date
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {formatDate(date)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        {selectedStudio && selectedDate && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">🔍 フィルター</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プログラム
                </label>
                <select
                  value={selectedFilters.program}
                  onChange={(e) =>
                    setSelectedFilters({ ...selectedFilters, program: e.target.value })
                  }
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">全て</option>
                  <option value="BB1">BB1</option>
                  <option value="BB2">BB2</option>
                  <option value="BSL">BSL</option>
                  <option value="BSW">BSW</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  インストラクター
                </label>
                <input
                  type="text"
                  value={selectedFilters.instructor}
                  onChange={(e) =>
                    setSelectedFilters({ ...selectedFilters, instructor: e.target.value })
                  }
                  placeholder="インストラクター名"
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Lessons List */}
        {selectedStudio && selectedDate && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              🎵 レッスン一覧 ({formatDate(selectedDate)})
            </h2>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-600">読み込み中...</p>
              </div>
            ) : lessons.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                レッスンが見つかりませんでした
              </p>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.lessonId}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-semibold">
                            {lesson.time}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getProgramColor(
                              lesson.program
                            )}`}
                          >
                            {lesson.program}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-1">
                          👤 {lesson.instructor}
                        </p>
                        <p className="text-sm text-gray-500">
                          💺 {lesson.availableSlots}/{lesson.totalSlots}席
                          {lesson.isAvailable ? (
                            <span className="text-green-600 ml-2">✅ 空きあり</span>
                          ) : (
                            <span className="text-red-600 ml-2">❌ 満席</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {lesson.isAvailable ? (
                          <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                            📱 予約する
                          </button>
                        ) : (
                          <button
                            onClick={() => createWaitlist(lesson)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            🔔 キャンセル待ち
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}