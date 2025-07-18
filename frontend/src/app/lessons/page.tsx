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
  startTime: string;
  endTime: string;
  instructor: string;
  program: string;
  availableSlots: number | null;
  totalSlots: number | null;
  isAvailable: boolean;
}

interface DaySchedule {
  date: string;
  lessons: Lesson[];
  isExpanded: boolean;
}

export default function LessonsPage() {
  const [studios, setStudios] = useState<Studio[]>([]);
  const [selectedStudio, setSelectedStudio] = useState<string>('');
  const [weekSchedule, setWeekSchedule] = useState<DaySchedule[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFilters, setSelectedFilters] = useState({
    program: '',
    instructor: '',
  });

  // Load studios on component mount
  useEffect(() => {
    fetchStudios();
  }, []);

  // Load lessons when studio is selected
  useEffect(() => {
    if (selectedStudio) {
      fetchWeekSchedule();
    }
  }, [selectedStudio, currentWeekStart]);

  // Initialize current week
  useEffect(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    setCurrentWeekStart(startOfWeek);
  }, []);

  const fetchStudios = async () => {
    try {
      // Mock API call
      const mockStudios: Studio[] = [
        { code: 'ginza', name: '銀座', region: 'tokyo' },
        { code: 'omotesando', name: '表参道', region: 'tokyo' },
        { code: 'shibuya', name: '渋谷', region: 'tokyo' },
        { code: 'shinjuku', name: '新宿', region: 'tokyo' },
        { code: 'sapporo', name: '札幌', region: 'hokkaido' },
      ];
      setStudios(mockStudios);
      // Default to Ginza
      if (!selectedStudio) {
        setSelectedStudio('ginza');
      }
    } catch (error) {
      console.error('Error fetching studios:', error);
    }
  };

  const fetchWeekSchedule = async () => {
    try {
      setLoading(true);
      // Mock API call - generate 7 days schedule
      const schedule: DaySchedule[] = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(currentWeekStart.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Generate mock lessons for each day
        const lessons: Lesson[] = [
          {
            lessonId: `${selectedStudio}_${dateStr}_0730_BSL1`,
            studio: selectedStudio,
            date: dateStr,
            startTime: '07:30',
            endTime: '08:15',
            instructor: 'Y.Yuri',
            program: 'BSL Deep 1',
            availableSlots: null,
            totalSlots: null,
            isAvailable: false,
          },
          {
            lessonId: `${selectedStudio}_${dateStr}_0845_BB2`,
            studio: selectedStudio,
            date: dateStr,
            startTime: '08:45',
            endTime: '09:30',
            instructor: 'Y.Yuri',
            program: 'BB2 BRIT 2025',
            availableSlots: null,
            totalSlots: null,
            isAvailable: false,
          },
          {
            lessonId: `${selectedStudio}_${dateStr}_1000_BB1`,
            studio: selectedStudio,
            date: dateStr,
            startTime: '10:00',
            endTime: '10:45',
            instructor: 'Yuriko',
            program: 'BB1 House 2',
            availableSlots: null,
            totalSlots: null,
            isAvailable: true,
          },
          {
            lessonId: `${selectedStudio}_${dateStr}_1115_BSB`,
            studio: selectedStudio,
            date: dateStr,
            startTime: '11:15',
            endTime: '12:00',
            instructor: 'Yuriko',
            program: 'BSB Jazz 1',
            availableSlots: null,
            totalSlots: null,
            isAvailable: true,
          },
          {
            lessonId: `${selectedStudio}_${dateStr}_1230_BSW`,
            studio: selectedStudio,
            date: dateStr,
            startTime: '12:30',
            endTime: '13:15',
            instructor: 'Taiyo',
            program: 'BSW House 3',
            availableSlots: null,
            totalSlots: null,
            isAvailable: false,
          },
          {
            lessonId: `${selectedStudio}_${dateStr}_1345_BB2`,
            studio: selectedStudio,
            date: dateStr,
            startTime: '13:45',
            endTime: '14:30',
            instructor: 'Taiyo',
            program: 'BB2 10s 3',
            availableSlots: null,
            totalSlots: null,
            isAvailable: false,
          },
          {
            lessonId: `${selectedStudio}_${dateStr}_1500_BB3`,
            studio: selectedStudio,
            date: dateStr,
            startTime: '15:00',
            endTime: '15:45',
            instructor: 'Kentaro',
            program: 'BB3 HipHop 2',
            availableSlots: null,
            totalSlots: null,
            isAvailable: true,
          },
          {
            lessonId: `${selectedStudio}_${dateStr}_1615_BB1`,
            studio: selectedStudio,
            date: dateStr,
            startTime: '16:15',
            endTime: '17:00',
            instructor: 'Kentaro',
            program: 'BB1 House 2',
            availableSlots: null,
            totalSlots: null,
            isAvailable: true,
          },
        ];
        
        schedule.push({
          date: dateStr,
          lessons,
          isExpanded: i === 0, // Expand first day by default
        });
      }
      
      setWeekSchedule(schedule);
    } catch (error) {
      console.error('Error fetching week schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWaitlist = async (lesson: Lesson) => {
    try {
      console.log('Creating waitlist for:', lesson);
      // Mock API call for creating waitlist
      alert(`キャンセル待ちを作成しました:\n${lesson.program} ${lesson.startTime}`);
    } catch (error) {
      console.error('Error creating waitlist:', error);
      alert('キャンセル待ちの作成に失敗しました');
    }
  };

  const toggleDayExpansion = (date: string) => {
    setWeekSchedule(prev => prev.map(day => 
      day.date === date ? { ...day, isExpanded: !day.isExpanded } : day
    ));
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  const goToToday = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    setCurrentWeekStart(startOfWeek);
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
    if (program.includes('BB1')) return 'bg-gray-200 text-gray-800';
    if (program.includes('BB2')) return 'bg-orange-500 text-white';
    if (program.includes('BB3')) return 'bg-gray-200 text-gray-800';
    if (program.includes('BSL')) return 'bg-blue-600 text-white';
    if (program.includes('BSW')) return 'bg-purple-500 text-white';
    if (program.includes('BSB')) return 'bg-gray-200 text-gray-800';
    return 'bg-gray-200 text-gray-800';
  };

  const getSelectedStudioName = () => {
    const studio = studios.find(s => s.code === selectedStudio);
    return studio ? studio.name : '';
  };

  const getSelectedStudioCode = () => {
    return selectedStudio.toUpperCase();
  };

  if (loading && weekSchedule.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gray-600 text-white">
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {getSelectedStudioName()}
              </div>
              <div className="text-sm text-gray-300">
                ({getSelectedStudioCode()})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Studio Selection */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <select
            value={selectedStudio}
            onChange={(e) => setSelectedStudio(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
          >
            <option value="">スタジオを選択</option>
            {studios.map((studio) => (
              <option key={studio.code} value={studio.code}>
                {studio.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="bg-gray-500 text-white py-3">
        <div className="flex items-center justify-between px-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="px-4 py-2 text-sm font-medium hover:bg-gray-600 rounded transition-colors"
          >
            前週へ
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium hover:bg-gray-600 rounded transition-colors"
          >
            今日に戻る
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="px-4 py-2 text-sm font-medium hover:bg-gray-600 rounded transition-colors"
          >
            最終週へ
          </button>
        </div>
      </div>

      {/* Schedule */}
      <div className="pb-4">
        {weekSchedule.map((daySchedule, index) => (
          <div key={daySchedule.date} className="border-b border-gray-200">
            <button
              onClick={() => toggleDayExpansion(daySchedule.date)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <span className="font-medium text-gray-900">
                {formatDate(daySchedule.date)}
              </span>
              <svg
                className={`w-5 h-5 text-gray-400 transform transition-transform ${
                  daySchedule.isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {daySchedule.isExpanded && (
              <div className="bg-white">
                {daySchedule.lessons.map((lesson) => (
                  <div
                    key={lesson.lessonId}
                    className="flex items-center p-4 border-b border-gray-100 hover:bg-gray-50"
                  >
                    {/* Time */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="text-sm font-medium text-gray-900">{lesson.startTime}</div>
                      <div className="text-xs text-gray-500">{lesson.endTime}</div>
                    </div>
                    
                    {/* Program */}
                    <div className="flex-1 ml-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`px-3 py-1 rounded-md text-sm font-medium ${getProgramColor(lesson.program)}`}
                        >
                          {lesson.program}
                        </div>
                        <div className="text-sm text-gray-600">{lesson.instructor}</div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="flex-shrink-0 ml-4">
                      {lesson.isAvailable ? (
                        <button
                          onClick={() => window.open('https://www.feelcycle.com/', '_blank')}
                          className="px-3 py-1 bg-green-500 text-white text-xs rounded-md hover:bg-green-600 transition-colors"
                        >
                          予約
                        </button>
                      ) : (
                        <button
                          onClick={() => createWaitlist(lesson)}
                          className="px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
                        >
                          キャンセル待ち
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-gray-500 text-sm">
        feelcycle.com
      </div>
    </div>
  );
}