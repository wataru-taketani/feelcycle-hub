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
import { Search, Calendar, MapPin, ChevronDown, ChevronRight } from "lucide-react";

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
  
  // Add error boundary for debugging
  const [pageError, setPageError] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      // Basic page load test
      console.log('LessonsPage mounted', { isAuthenticated, loading });
    } catch (error) {
      console.error('Page mount error:', error);
      setPageError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, []);
  const [lessonsByDate, setLessonsByDate] = useState<LessonsByDate>({});
  const [studioGroups, setStudioGroups] = useState<StudioGroups>({});
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingStudios, setLoadingStudios] = useState(false);
  
  // 検索フィルター
  const [selectedStudio, setSelectedStudio] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  
  // キャンセル待ち関連状態
  const [registeredWaitlists, setRegisteredWaitlists] = useState<Set<string>>(new Set());
  const [registeringLessons, setRegisteringLessons] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchStudios();
    }
  }, [isAuthenticated]);

  // スタジオ一覧取得
  const fetchStudios = async () => {
    try {
      setLoadingStudios(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.get(`${apiBaseUrl}/studios`);
      if (response.data.success) {
        // 新しいAPIレスポンス構造: { data: { studioGroups: {...}, studios: [...] } }
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

  // 特定のスタジオのレッスン取得
  const fetchLessonsForStudio = async (studioCode: string) => {
    if (!studioCode) return;
    
    try {
      setLoadingLessons(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      
      // 今日から7日間のレッスンを取得
      const today = new Date();
      const dates = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
      }
      
      // 複数日のレッスンを並列取得
      const responses = await Promise.all(
        dates.map(date => 
          axios.get(`${apiBaseUrl}/lessons?studioCode=${studioCode}&date=${date}`)
            .catch(error => {
              console.warn(`Failed to fetch lessons for ${date}:`, error);
              return { data: { success: false, data: [] } };
            })
        )
      );
      
      // 日付別にレッスンをまとめる
      const lessonsByDate: { [date: string]: any[] } = {};
      responses.forEach((response, index) => {
        if (response.data.success && response.data.data) {
          const date = dates[index];
          lessonsByDate[date] = Array.isArray(response.data.data) 
            ? response.data.data 
            : Object.values(response.data.data).flat();
        }
      });
      
      setLessonsByDate(lessonsByDate);
      console.log('✅ Lessons fetched successfully:', Object.keys(lessonsByDate).length, 'days');
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
        setRegisteredWaitlists(prev => new Set(prev).add(lessonKey));
        setSuccessMessage('キャンセル待ちに登録しました');
        setShowSuccessModal(true);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  };

  const getProgramClass = (program: string) => {
    const normalizedProgram = program.toLowerCase().replace(/\s+/g, '');
    return `program-${normalizedProgram}`;
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

  const filteredLessons = getFilteredLessons();
  const hasResults = Object.keys(filteredLessons).length > 0;

  // Show error if page failed to mount
  if (pageError) {
    return (
      <div className="px-4 py-2">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <h2 className="font-medium text-destructive mb-2">ページエラー</h2>
          <p className="text-sm text-muted-foreground">{pageError}</p>
        </div>
      </div>
    );
  }

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
        <h1 className="font-medium mb-1 text-[14px]">レッスン検索</h1>
        <p className="text-muted-foreground text-[12px]">詳細条件でレッスンを検索・比較</p>
      </div>

      {/* 検索フィルター */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="w-4 h-4" />
            検索条件
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

      {/* 検索結果 */}
      {selectedStudio ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {getSelectedStudioName()} のレッスン
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
                        {formatDate(date)}
                      </h3>
                      <div className="space-y-2">
                        {filteredLessons[date].map((lesson, index) => {
                          const lessonKey = `${lesson.studioCode}-${lesson.lessonDate}-${lesson.startTime}`;
                          const isRegistering = registeringLessons.has(lessonKey);
                          const isRegistered = registeredWaitlists.has(lessonKey);
                          
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
                                    <Badge className={`${getProgramClass(lesson.lessonName)} text-xs`}>
                                      {lesson.lessonName}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {lesson.instructor}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  disabled={isRegistering || isRegistered}
                                  onClick={() => registerWaitlist(lesson)}
                                  className="ml-3"
                                >
                                  {isRegistering ? '登録中...' : 
                                   isRegistered ? '登録済み' : 'キャンセル待ち'}
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
                  {searchKeyword ? '検索条件に一致するレッスンが見つかりませんでした' : 'レッスンが見つかりませんでした'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              スタジオを選択してレッスンを検索してください
            </p>
          </CardContent>
        </Card>
      )}

      {/* 成功モーダル */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">登録完了</DialogTitle>
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