'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Calendar, MapPin, ChevronDown, ChevronRight, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { getTodayJST, getDateAfterDaysJST, formatDateJST } from '@/utils/dateUtils';
import { getProgramColors } from '@/utils/programsApi';

interface LessonData {
  studioCode: string;
  studioName?: string;
  lessonDate: string;
  startTime: string;
  lessonName: string;
  instructor: string;
  isAvailable: string;
  program: string;
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

interface WaitlistEntry {
  userId: string;
  waitlistId: string;
  studioCode: string;
  lessonDate: string;
  startTime: string;
  lessonName: string;
  instructor: string;
  status: 'active' | 'notified' | 'cancelled';
  createdAt: string;
  notificationSent?: boolean;
}

export default function WaitlistSchedulePage() {
  const { isAuthenticated, apiUser, loading } = useAuth();
  
  const [lessonsByDate, setLessonsByDate] = useState<LessonsByDate>({});
  const [studioGroups, setStudioGroups] = useState<StudioGroups>({});
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingStudios, setLoadingStudios] = useState(false);
  
  // キャンセル待ち関連状態
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [loadingWaitlist, setLoadingWaitlist] = useState(false);
  const [registeringLessons, setRegisteringLessons] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // キャンセル待ち解除モーダル関連
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedLessonForCancel, setSelectedLessonForCancel] = useState<{lesson: LessonData, waitlistId: string} | null>(null);
  
  // キャンセル待ち登録確認モーダル関連
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedLessonForRegister, setSelectedLessonForRegister] = useState<LessonData | null>(null);
  
  // 検索フィルター
  const [selectedStudio, setSelectedStudio] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

  useEffect(() => {
    fetchStudios();
    if (apiUser) {
      fetchUserWaitlist();
    }
  }, [apiUser]);

  // プログラムデータを初期化
  useEffect(() => {
    const initPrograms = async () => {
      try {
        const { fetchProgramsData } = await import('@/utils/programsApi');
        await fetchProgramsData();
        console.log('Programs data initialized for waitlist page');
      } catch (error) {
        console.error('Failed to initialize programs data:', error);
      }
    };
    initPrograms();
  }, []);

  // スタジオ一覧取得
  const fetchStudios = async () => {
    try {
      setLoadingStudios(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.get(`${apiBaseUrl}/studios`);
      if (response.data.success) {
        const { studioGroups: groups, studios: studiosData } = response.data.data;
        
        if (groups && Object.keys(groups).length > 0) {
          setStudioGroups(groups);
        } else {
          setStudioGroups({});
        }
        setStudios(studiosData || []);
      }
    } catch (error) {
      console.error('Failed to fetch studios:', error);
      setStudioGroups({});
      setStudios([]);
    } finally {
      setLoadingStudios(false);
    }
  };

  // ユーザーのキャンセル待ちリスト取得
  const fetchUserWaitlist = async () => {
    if (!apiUser) return;
    
    try {
      setLoadingWaitlist(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.get(`${apiBaseUrl}/waitlist?userId=${apiUser.userId}`);
      
      if (response.data.success && response.data.data) {
        setWaitlistEntries(response.data.data);
        console.log('✅ Waitlist loaded:', response.data.data.length, 'entries');
      } else {
        setWaitlistEntries([]);
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error);
      setWaitlistEntries([]);
    } finally {
      setLoadingWaitlist(false);
    }
  };

  // レッスンスケジュール取得（キャンセル待ち登録用）
  const fetchLessonsForStudio = async (studioCode: string) => {
    if (!studioCode) return;
    
    try {
      setLoadingLessons(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      
      // 今日から14日間のレッスンを取得（キャンセル待ち対象期間）
      const startDate = getTodayJST();
      const endDate = getDateAfterDaysJST(14);
      
      console.log(`📅 Fetching lessons for waitlist: ${studioCode} (${startDate} to ${endDate})`);
      
      const response = await axios.get(`${apiBaseUrl}/lessons?studioCode=${studioCode}&range=true&startDate=${startDate}&endDate=${endDate}`);
      
      if (response.data.success && response.data.data?.lessonsByDate) {
        setLessonsByDate(response.data.data.lessonsByDate);
        console.log('✅ Lessons loaded for waitlist:', Object.keys(response.data.data.lessonsByDate).length, 'days');
      } else {
        console.warn('No lesson data returned:', response.data);
        setLessonsByDate({});
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
      setLessonsByDate({});
    } finally {
      setLoadingLessons(false);
    }
  };

  // キャンセル待ち登録
  const registerWaitlist = async (lesson: LessonData) => {
    if (!apiUser) return;
    
    const lessonKey = `${lesson.studioCode}-${lesson.lessonDate}-${lesson.startTime}`;
    setRegisteringLessons(prev => new Set(prev).add(lessonKey));
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.post(`${apiBaseUrl}/waitlist`, {
        userId: apiUser.userId,
        studioCode: lesson.studioCode,
        lessonDate: lesson.lessonDate,
        startTime: lesson.startTime,
        lessonName: lesson.lessonName,
        instructor: lesson.instructor
      });
      
      if (response.data.success) {
        setSuccessMessage('キャンセル待ちに登録しました');
        setShowSuccessModal(true);
        
        // キャンセル待ちリストを再取得
        await fetchUserWaitlist();
      }
    } catch (error) {
      console.error('Error registering waitlist:', error);
    } finally {
      setRegisteringLessons(prev => {
        const newSet = new Set(prev);
        newSet.delete(lessonKey);
        return newSet;
      });
    }
  };

  // キャンセル待ち削除
  const removeFromWaitlist = async (waitlistId: string) => {
    if (!apiUser) return;
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.delete(`${apiBaseUrl}/waitlist/${waitlistId}?userId=${apiUser.userId}`);
      
      if (response.data.success) {
        setSuccessMessage('キャンセル待ちを解除しました');
        setShowSuccessModal(true);
        
        // キャンセル待ちリストを再取得
        await fetchUserWaitlist();
      }
    } catch (error) {
      console.error('Error removing from waitlist:', error);
    }
  };

  // 解除確認処理
  const handleCancelConfirm = async () => {
    if (selectedLessonForCancel) {
      await removeFromWaitlist(selectedLessonForCancel.waitlistId);
      setShowCancelModal(false);
      setSelectedLessonForCancel(null);
    }
  };

  // 登録確認処理
  const handleRegisterConfirm = async () => {
    if (selectedLessonForRegister) {
      await registerWaitlist(selectedLessonForRegister);
      setShowRegisterModal(false);
      setSelectedLessonForRegister(null);
    }
  };

  const getSelectedStudioName = () => {
    if (!selectedStudio) return '';
    const studio = studios.find(s => s.code === selectedStudio);
    return studio ? studio.name : selectedStudio;
  };

  // フィルター済みのレッスンを取得
  const getFilteredLessons = () => {
    if (!selectedStudio) return {};
    
    const filtered: LessonsByDate = {};
    Object.keys(lessonsByDate).forEach(date => {
      const lessons = lessonsByDate[date].filter(lesson => {
        const keywordMatch = !searchKeyword || 
          lesson.lessonName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          lesson.instructor.toLowerCase().includes(searchKeyword.toLowerCase());
        
        return keywordMatch;
      });
      if (lessons.length > 0) {
        filtered[date] = lessons;
      }
    });
    return filtered;
  };

  // 既にキャンセル待ち登録済みかチェック
  const isAlreadyInWaitlist = (lesson: LessonData): boolean => {
    return waitlistEntries.some(entry => 
      entry.studioCode === lesson.studioCode &&
      entry.lessonDate === lesson.lessonDate &&
      entry.startTime === lesson.startTime &&
      entry.status === 'active'
    );
  };

  const getProgramClass = (program: string) => {
    if (!program) return 'bg-gray-100 text-gray-700';
    const normalizedProgram = program.toLowerCase().replace(/\s+/g, '');
    const className = `program-${normalizedProgram}`;
    return className;
  };

  const getProgramBackgroundColor = (program: string) => {
    if (!program) return '#f3f4f6';
    const colors = getProgramColors(program);
    return colors.backgroundColor;
  };

  const getProgramTextColor = (program: string) => {
    if (!program) return '#374151';
    const colors = getProgramColors(program);
    return colors.textColor;
  };

  const filteredLessons = getFilteredLessons();
  const hasResults = Object.keys(filteredLessons).length > 0;

  if (loading) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
          <p className="text-[12px] text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="px-4 py-2 text-center">
        <p className="text-muted-foreground mb-4">ログインが必要です</p>
        <p className="text-sm text-muted-foreground">
          このページは現在開発中です。<br/>
          LINE公式アカウントからアクセスしてください。
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="mb-2 flex items-center gap-3">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-muted transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <div>
          <h1 className="font-medium mb-1 text-[14px]">スケジュール</h1>
          <p className="text-muted-foreground text-[12px]">キャンセル待ちしたいレッスンを選択</p>
        </div>
      </div>

      {/* 現在のキャンセル待ちリスト */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4" />
            登録中のキャンセル待ち
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingWaitlist ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
              <p className="text-[12px] text-muted-foreground">読み込み中...</p>
            </div>
          ) : waitlistEntries.length > 0 ? (
            <div className="space-y-2">
              {waitlistEntries
                .filter(entry => entry.status === 'active')
                .sort((a, b) => `${a.lessonDate} ${a.startTime}`.localeCompare(`${b.lessonDate} ${b.startTime}`))
                .map((entry) => (
                  <div key={entry.waitlistId} className="border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatDateJST(entry.lessonDate)} {entry.startTime}
                          </span>
                          <Badge variant="outline" className="text-orange-600">
                            {entry.lessonName}
                          </Badge>
                          {entry.notificationSent && (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              通知済み
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {studios.find(s => s.code === entry.studioCode)?.name || entry.studioCode} • {entry.instructor}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFromWaitlist(entry.waitlistId)}
                        className="ml-3 text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        解除
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">現在キャンセル待ち中のレッスンはありません</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新規キャンセル待ち登録 */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="w-4 h-4" />
            新規キャンセル待ち登録
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* スタジオ選択 */}
          <div className="border border-border rounded-lg bg-card">
            <Button
              variant="ghost"
              onClick={() => setIsStudioOpen(!isStudioOpen)}
              className={`flex w-full justify-between items-center px-3 h-12 hover:bg-accent rounded-lg ${
                isStudioOpen ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <div className="font-medium">
                  {selectedStudio ? getSelectedStudioName() : 'スタジオを選択'}
                </div>
              </div>
              <div className="flex items-center justify-center w-5 h-5">
                {isStudioOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </Button>
            <Collapsible open={isStudioOpen}>
              <CollapsibleContent>
                <div className="p-3">
                  {selectedStudio && (
                    <div className="mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedStudio('')}
                        className="h-8 px-3 text-sm"
                      >
                        選択をクリア
                      </Button>
                    </div>
                  )}
                  
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {Object.keys(studioGroups).map((groupName) => (
                        <div key={groupName}>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">
                            {groupName}
                          </h4>
                          <div className="grid grid-cols-2 gap-1">
                            {studioGroups[groupName].map((studio) => (
                              <Button
                                key={studio.code}
                                variant={selectedStudio === studio.code ? "default" : "outline"}
                                size="sm"
                                className="h-8 px-2 text-xs font-normal justify-start"
                                onClick={() => {
                                  setSelectedStudio(studio.code);
                                  fetchLessonsForStudio(studio.code);
                                  setIsStudioOpen(false);
                                }}
                              >
                                {studio.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* キーワード検索 */}
          <div>
            <Input
              placeholder="レッスン名・インストラクター名で検索..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* レッスンスケジュール（/search と同じ横スクロール式） */}
      {/* 
      FIGMA確認: /searchページと同じ実装を使用
      LAYOUT: overflow-x-auto + flex + w-[150px] (横スクロール式)
      COLOR: BB1=黄色、BB2=オレンジ、BSL=青色、BSB=水色
      BEHAVIOR: 青い枠線=キャンセル待ち登録済み、クリックで解除モーダル
      実装開始前に/searchページの実装を確認済み ✓
      */}
      {selectedStudio && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {getSelectedStudioName()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingLessons ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                <p className="text-[12px] text-muted-foreground">レッスンを読み込み中...</p>
              </div>
            ) : hasResults ? (
              <div className="overflow-x-auto">
                <div className="flex min-w-max">
                  {Object.keys(filteredLessons)
                    .sort()
                    .map((date) => (
                      <div key={date} className="flex-shrink-0 w-[150px] border-r border-border last:border-r-0">
                        {/* 日付ヘッダー */}
                        <div className="p-2 border-b border-border text-center bg-muted/50">
                          <div className="flex items-center justify-center gap-1 text-sm">
                            <span>{formatDateJST(date).split('(')[0]}</span>
                            <span>({formatDateJST(date).split('(')[1]?.replace(')', '') || ''})</span>
                          </div>
                        </div>
                        
                        {/* レッスン一覧 */}
                        <div className="p-1.5 space-y-1.5 min-h-[400px]">
                          {filteredLessons[date].length > 0 ? (
                            filteredLessons[date].map((lesson, index) => {
                              const lessonKey = `${lesson.studioCode}-${lesson.lessonDate}-${lesson.startTime}`;
                              const isRegistering = registeringLessons.has(lessonKey);
                              const isAlreadyRegistered = isAlreadyInWaitlist(lesson);
                              
                              return (
                                <button
                                  key={index}
                                  onClick={() => {
                                    if (isAlreadyRegistered) {
                                      const entry = waitlistEntries.find(e => 
                                        e.studioCode === lesson.studioCode &&
                                        e.lessonDate === lesson.lessonDate &&
                                        e.startTime === lesson.startTime &&
                                        e.status === 'active'
                                      );
                                      if (entry) {
                                        setSelectedLessonForCancel({ lesson, waitlistId: entry.waitlistId });
                                        setShowCancelModal(true);
                                      }
                                    } else if (!isRegistering) {
                                      setSelectedLessonForRegister(lesson);
                                      setShowRegisterModal(true);
                                    }
                                  }}
                                  className={`w-full lesson-item text-left ${
                                    isAlreadyRegistered 
                                      ? 'border-blue-500 border-2 bg-blue-50' 
                                      : ''
                                  }`}
                                >
                                  <div className="relative">
                                    <div className="text-sm mb-1 text-muted-foreground">
                                      {lesson.startTime}
                                    </div>
                                    <div className="mb-1">
                                      <div className="text-xs font-medium rounded px-2 py-1" style={{
                                        backgroundColor: getProgramBackgroundColor(lesson.program || lesson.lessonName),
                                        color: getProgramTextColor(lesson.program || lesson.lessonName)
                                      }}>
                                        {lesson.lessonName}
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium">
                                      <span>{lesson.instructor}</span>
                                    </div>
                                    
                                    {/* キャンセル待ち状態表示 */}
                                    <div className="mt-1 min-h-[20px] text-sm font-normal">
                                      {isRegistering && (
                                        <div className="text-xs text-blue-600">登録中...</div>
                                      )}
                                      {isAlreadyRegistered && (
                                        <div className="text-xs text-blue-600">キャンセル待ち中</div>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                              レッスンなし
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  スタジオを選択してスケジュールを表示
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* キャンセル待ち登録確認モーダル */}
      <AlertDialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">キャンセル待ち登録確認</AlertDialogTitle>
          </AlertDialogHeader>
          
          {selectedLessonForRegister && (
            <div className="bg-gray-100 rounded-lg p-4 space-y-2">
              {/* 日時 */}
              <div className="text-center text-muted-foreground text-sm">
                {formatDateJST(selectedLessonForRegister.lessonDate)} {selectedLessonForRegister.startTime}
              </div>
              
              {/* プログラム名バッジ */}
              <div className="flex justify-center">
                <div className="text-center border-0 text-sm px-2 py-1 rounded font-medium" style={{
                  backgroundColor: getProgramBackgroundColor(selectedLessonForRegister.program || selectedLessonForRegister.lessonName),
                  color: getProgramTextColor(selectedLessonForRegister.program || selectedLessonForRegister.lessonName)
                }}>
                  {selectedLessonForRegister.lessonName}
                </div>
              </div>
              
              {/* インストラクター */}
              <div className="text-center text-muted-foreground text-sm">
                {selectedLessonForRegister.instructor}
              </div>
            </div>
          )}
          
          {/* 確認メッセージ */}
          <AlertDialogDescription className="text-center">
            このレッスンをキャンセル待ちに登録しますか？
          </AlertDialogDescription>
          
          <AlertDialogFooter className="flex-col space-y-2 sm:space-y-2 sm:flex-col">
            <AlertDialogAction 
              onClick={handleRegisterConfirm}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              登録する
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">
              キャンセル
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* キャンセル待ち解除確認モーダル */}
      <AlertDialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">キャンセル待ち解除確認</AlertDialogTitle>
          </AlertDialogHeader>
          
          {selectedLessonForCancel && (
            <div className="bg-gray-100 rounded-lg p-4 space-y-2">
              {/* 日時 */}
              <div className="text-center text-muted-foreground text-sm">
                {formatDateJST(selectedLessonForCancel.lesson.lessonDate)} {selectedLessonForCancel.lesson.startTime}
              </div>
              
              {/* プログラム名バッジ */}
              <div className="flex justify-center">
                <div className={`text-center border-0 text-sm px-2 py-1 rounded font-medium ${getProgramClass(selectedLessonForCancel.lesson.lessonName)}`}>
                  {selectedLessonForCancel.lesson.lessonName}
                </div>
              </div>
              
              {/* インストラクター */}
              <div className="text-center text-muted-foreground text-sm">
                {selectedLessonForCancel.lesson.instructor}
              </div>
            </div>
          )}
          
          {/* 確認メッセージ */}
          <AlertDialogDescription className="text-center">
            このレッスンのキャンセル待ちを解除しますか？
          </AlertDialogDescription>
          
          <AlertDialogFooter className="flex-col space-y-2 sm:space-y-2 sm:flex-col">
            <AlertDialogAction 
              onClick={handleCancelConfirm}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              解除する
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">
              キャンセル
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 成功モーダル */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">完了</DialogTitle>
            <DialogDescription className="text-center">
              {successMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button onClick={() => setShowSuccessModal(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}