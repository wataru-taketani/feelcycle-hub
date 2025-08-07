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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Calendar, MapPin, ChevronDown, ChevronRight, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { getTodayJST, getDateAfterDaysJST, formatDateJST } from '@/utils/dateUtils';

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
  
  // 検索フィルター
  const [selectedStudio, setSelectedStudio] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStudios();
      fetchUserWaitlist();
    }
  }, [isAuthenticated]);

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
        
        const availabilityMatch = !showOnlyAvailable || lesson.isAvailable === 'false'; // キャンセル待ちは満席レッスンが対象
        
        return keywordMatch && availabilityMatch;
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
        <p className="text-muted-foreground">ログインが必要です</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="mb-2">
        <h1 className="font-medium mb-1 text-[14px]">キャンセル待ち登録</h1>
        <p className="text-muted-foreground text-[12px]">満席レッスンのキャンセル待ちを登録・管理</p>
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
                          {studios.find(s => s.code === entry.studioCode)?.name || entry.studioCode.toUpperCase()} • {entry.instructor}
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

      {/* 満席レッスン一覧 */}
      {selectedStudio && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {getSelectedStudioName()} の満席レッスン
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLessons ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                <p className="text-[12px] text-muted-foreground">レッスンを読み込み中...</p>
              </div>
            ) : hasResults ? (
              <div className="space-y-4">
                {Object.keys(filteredLessons)
                  .sort()
                  .map((date) => (
                    <div key={date}>
                      <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatDateJST(date)}
                      </h3>
                      <div className="space-y-2">
                        {filteredLessons[date].map((lesson, index) => {
                          const lessonKey = `${lesson.studioCode}-${lesson.lessonDate}-${lesson.startTime}`;
                          const isRegistering = registeringLessons.has(lessonKey);
                          const isAlreadyRegistered = isAlreadyInWaitlist(lesson);
                          
                          return (
                            <div
                              key={index}
                              className="border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {lesson.startTime}
                                    </span>
                                    <Badge variant="secondary">
                                      {lesson.lessonName}
                                    </Badge>
                                    <Badge variant="outline" className="text-red-600">
                                      満席
                                    </Badge>
                                    {isAlreadyRegistered && (
                                      <Badge variant="outline" className="text-orange-600">
                                        登録済み
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {lesson.instructor}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  disabled={isRegistering || isAlreadyRegistered}
                                  onClick={() => registerWaitlist(lesson)}
                                  className="ml-3"
                                >
                                  {isRegistering ? '登録中...' : 
                                   isAlreadyRegistered ? '登録済み' : 'キャンセル待ち登録'}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  {selectedStudio ? '該当する満席レッスンが見つかりませんでした' : 'スタジオを選択してください'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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