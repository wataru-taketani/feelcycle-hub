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
import { Checkbox } from "@/components/ui/checkbox";
import { BookOpen, Calendar, MapPin, ChevronDown, ChevronRight, ExternalLink, CheckCircle, Clock, AlertTriangle } from "lucide-react";
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

interface AutoBookingRule {
  id: string;
  userId: string;
  studioCode: string;
  program?: string;
  instructor?: string;
  dayOfWeek?: number[]; // 0=日曜日, 1=月曜日, ...
  timeSlot?: string; // "10:30", "19:30", etc.
  priority: number;
  isActive: boolean;
  createdAt: string;
}

export default function BookingSchedulePage() {
  const { isAuthenticated, apiUser, loading } = useAuth();
  
  const [lessonsByDate, setLessonsByDate] = useState<LessonsByDate>({});
  const [studioGroups, setStudioGroups] = useState<StudioGroups>({});
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingStudios, setLoadingStudios] = useState(false);
  
  // 自動予約関連状態
  const [autoBookingRules, setAutoBookingRules] = useState<AutoBookingRule[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // 検索フィルター
  const [selectedStudio, setSelectedStudio] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

  // 予約対象選択
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isAuthenticated) {
      fetchStudios();
      fetchAutoBookingRules();
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

  // 自動予約ルール取得
  const fetchAutoBookingRules = async () => {
    if (!apiUser) return;
    
    try {
      setLoadingRules(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.get(`${apiBaseUrl}/auto-booking/rules?userId=${apiUser.userId}`);
      
      if (response.data.success && response.data.data) {
        setAutoBookingRules(response.data.data);
        console.log('✅ Auto-booking rules loaded:', response.data.data.length, 'rules');
      } else {
        setAutoBookingRules([]);
      }
    } catch (error) {
      console.error('Error fetching auto-booking rules:', error);
      setAutoBookingRules([]);
    } finally {
      setLoadingRules(false);
    }
  };

  // レッスンスケジュール取得（予約対象表示用）
  const fetchLessonsForStudio = async (studioCode: string) => {
    if (!studioCode) return;
    
    try {
      setLoadingLessons(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      
      // 今日から7日間のレッスンを取得（自動予約対象期間）
      const startDate = getTodayJST();
      const endDate = getDateAfterDaysJST(7);
      
      console.log(`📅 Fetching lessons for booking: ${studioCode} (${startDate} to ${endDate})`);
      
      const response = await axios.get(`${apiBaseUrl}/lessons?studioCode=${studioCode}&range=true&startDate=${startDate}&endDate=${endDate}`);
      
      if (response.data.success && response.data.data?.lessonsByDate) {
        setLessonsByDate(response.data.data.lessonsByDate);
        console.log('✅ Lessons loaded for booking:', Object.keys(response.data.data.lessonsByDate).length, 'days');
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

  // 自動予約ルール作成
  const createAutoBookingRule = async () => {
    if (!apiUser || !selectedStudio || selectedLessons.size === 0) return;
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      
      // 選択されたレッスンから自動予約ルールを生成
      const selectedLessonList = Array.from(selectedLessons);
      
      for (const lessonKey of selectedLessonList) {
        const [studioCode, lessonDate, startTime] = lessonKey.split('-');
        
        // 対応するレッスンデータを取得
        const lesson = Object.values(lessonsByDate)
          .flat()
          .find(l => `${l.studioCode}-${l.lessonDate}-${l.startTime}` === lessonKey);
        
        if (!lesson) continue;
        
        // 曜日を計算
        const date = new Date(lessonDate);
        const dayOfWeek = date.getDay();
        
        const ruleData = {
          userId: apiUser.userId,
          studioCode: lesson.studioCode,
          program: lesson.program,
          instructor: lesson.instructor,
          dayOfWeek: [dayOfWeek],
          timeSlot: lesson.startTime,
          priority: 1,
          isActive: true
        };
        
        await axios.post(`${apiBaseUrl}/auto-booking/rules`, ruleData);
      }
      
      setSuccessMessage(`${selectedLessonList.length}件の自動予約ルールを作成しました`);
      setShowSuccessModal(true);
      setSelectedLessons(new Set());
      
      // ルール一覧を再取得
      await fetchAutoBookingRules();
      
    } catch (error) {
      console.error('Error creating auto-booking rules:', error);
    }
  };

  // 自動予約ルール削除
  const deleteAutoBookingRule = async (ruleId: string) => {
    if (!apiUser) return;
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.delete(`${apiBaseUrl}/auto-booking/rules/${ruleId}?userId=${apiUser.userId}`);
      
      if (response.data.success) {
        setSuccessMessage('自動予約ルールを削除しました');
        setShowSuccessModal(true);
        
        // ルール一覧を再取得
        await fetchAutoBookingRules();
      }
    } catch (error) {
      console.error('Error deleting auto-booking rule:', error);
    }
  };

  // FEELCYCLEサイトを開く
  const openFeelcycleSite = () => {
    window.open('https://www.feelcycle.com/feelcycle/reserve/', '_blank');
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
        
        const availabilityMatch = !showOnlyAvailable || lesson.isAvailable === 'true';
        
        return keywordMatch && availabilityMatch;
      });
      if (lessons.length > 0) {
        filtered[date] = lessons;
      }
    });
    return filtered;
  };

  // レッスン選択切り替え
  const toggleLessonSelection = (lesson: LessonData) => {
    const lessonKey = `${lesson.studioCode}-${lesson.lessonDate}-${lesson.startTime}`;
    setSelectedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonKey)) {
        newSet.delete(lessonKey);
      } else {
        newSet.add(lessonKey);
      }
      return newSet;
    });
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
        <h1 className="font-medium mb-1 text-[14px]">自動予約設定</h1>
        <p className="text-muted-foreground text-[12px]">定期的に予約したいレッスンの自動予約ルールを設定</p>
      </div>

      {/* 注意事項 */}
      <Card className="mb-4 border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-medium text-orange-800">自動予約について</h3>
              <p className="text-sm text-orange-700">
                こちらは自動予約の「設定」画面です。実際の予約は別途FEELCYCLEの公式サイトで行う必要があります。
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={openFeelcycleSite}
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                FEELCYCLE公式サイトで予約
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 現在の自動予約ルール */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4" />
            設定済み自動予約ルール
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRules ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
              <p className="text-[12px] text-muted-foreground">読み込み中...</p>
            </div>
          ) : autoBookingRules.length > 0 ? (
            <div className="space-y-2">
              {autoBookingRules
                .filter(rule => rule.isActive)
                .map((rule) => {
                  const studio = studios.find(s => s.code === rule.studioCode);
                  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
                  const dayText = rule.dayOfWeek?.map(d => dayNames[d]).join(', ') || '毎日';
                  
                  return (
                    <div key={rule.id} className="border border-border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-blue-600">
                              {studio?.name || rule.studioCode.toUpperCase()}
                            </Badge>
                            <span className="text-sm font-medium">
                              {dayText} {rule.timeSlot}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {rule.program && `${rule.program} • `}
                            {rule.instructor && `${rule.instructor} • `}
                            優先度: {rule.priority}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteAutoBookingRule(rule.id)}
                          className="ml-3 text-red-600 border-red-600 hover:bg-red-50"
                        >
                          削除
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-6">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">現在設定されている自動予約ルールはありません</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新規自動予約ルール作成 */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4" />
            新規自動予約ルール作成
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

          {/* 選択中のレッスン数と作成ボタン */}
          {selectedLessons.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700">
                {selectedLessons.size}件のレッスンを選択中
              </span>
              <Button onClick={createAutoBookingRule} size="sm">
                自動予約ルール作成
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 空席レッスン一覧 */}
      {selectedStudio && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {getSelectedStudioName()} の空席レッスン
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
                          const isSelected = selectedLessons.has(lessonKey);
                          
                          return (
                            <div
                              key={index}
                              className={`border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors ${
                                isSelected ? 'bg-blue-50 border-blue-200' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleLessonSelection(lesson)}
                                    />
                                    <span className="text-sm font-medium">
                                      {lesson.startTime}
                                    </span>
                                    <Badge variant={lesson.isAvailable === 'true' ? 'default' : 'secondary'}>
                                      {lesson.lessonName}
                                    </Badge>
                                    <Badge variant="outline" className="text-green-600">
                                      空席あり
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground ml-6">
                                    {lesson.instructor}
                                  </div>
                                </div>
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
                  {selectedStudio ? '該当する空席レッスンが見つかりませんでした' : 'スタジオを選択してください'}
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