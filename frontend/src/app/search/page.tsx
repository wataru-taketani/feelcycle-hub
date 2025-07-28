'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Calendar, MapPin, ChevronDown, ChevronRight, Heart, Clock } from "lucide-react";
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

export default function SearchPage() {
  const { isAuthenticated, apiUser, loading } = useAuth();
  
  const [lessonsByDate, setLessonsByDate] = useState<LessonsByDate>({});
  const [studioGroups, setStudioGroups] = useState<StudioGroups>({});
  const [studios, setStudios] = useState<Studio[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [loadingStudios, setLoadingStudios] = useState(false);
  
  // 検索フィルター
  const [selectedStudio, setSelectedStudio] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  
  // 気になるリスト関連状態
  const [favoriteList, setFavoriteList] = useState<Set<string>>(new Set());
  const [addingToFavorites, setAddingToFavorites] = useState<Set<string>>(new Set());
  
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

  // レッスン検索（複数スタジオ対応）
  const searchLessons = async () => {
    if (!selectedStudio) return;
    
    try {
      setLoadingLessons(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      
      // 今日から7日間のレッスンを検索
      const startDate = getTodayJST();
      const endDate = getDateAfterDaysJST(7);
      
      console.log(`🔍 Searching lessons for ${selectedStudio}: ${startDate} to ${endDate}`);
      
      const response = await axios.get(`${apiBaseUrl}/lessons?studioCode=${selectedStudio}&range=true&startDate=${startDate}&endDate=${endDate}`);
      
      if (response.data.success && response.data.data?.lessonsByDate) {
        setLessonsByDate(response.data.data.lessonsByDate);
        console.log('✅ Search results loaded:', Object.keys(response.data.data.lessonsByDate).length, 'days');
      } else {
        console.warn('No lesson data returned:', response.data);
        setLessonsByDate({});
      }
    } catch (error) {
      console.error('Error searching lessons:', error);
      setLessonsByDate({});
    } finally {
      setLoadingLessons(false);
    }
  };

  // 気になるリストに追加
  const addToFavorites = async (lesson: LessonData) => {
    if (!apiUser) return;
    
    const lessonKey = `${lesson.studioCode}-${lesson.lessonDate}-${lesson.startTime}`;
    setAddingToFavorites(prev => new Set(prev).add(lessonKey));
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.post(`${apiBaseUrl}/user-lessons/favorites`, {
        userId: apiUser.userId,
        studioCode: lesson.studioCode,
        lessonDate: lesson.lessonDate,
        startTime: lesson.startTime,
        lessonName: lesson.lessonName,
        instructor: lesson.instructor,
        notes: '検索から追加'
      });
      
      if (response.data.success) {
        setFavoriteList(prev => new Set(prev).add(lessonKey));
        console.log('✅ Added to favorites');
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
    } finally {
      setAddingToFavorites(prev => {
        const newSet = new Set(prev);
        newSet.delete(lessonKey);
        return newSet;
      });
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
        
        const programMatch = !selectedProgram || lesson.program === selectedProgram;
        const instructorMatch = !selectedInstructor || lesson.instructor === selectedInstructor;
        
        return keywordMatch && programMatch && instructorMatch;
      });
      if (lessons.length > 0) {
        filtered[date] = lessons;
      }
    });
    return filtered;
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
        <h1 className="font-medium mb-1 text-[14px]">レッスン検索</h1>
        <p className="text-muted-foreground text-[12px]">詳細条件でレッスンを検索・気になるリストに追加</p>
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

          {/* 検索実行ボタン */}
          <Button 
            onClick={searchLessons} 
            disabled={!selectedStudio || loadingLessons}
            className="w-full"
          >
            {loadingLessons ? '検索中...' : '検索実行'}
          </Button>
        </CardContent>
      </Card>

      {/* 検索結果 */}
      {selectedStudio && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {getSelectedStudioName()} の検索結果
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingLessons ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                <p className="text-[12px] text-muted-foreground">検索中...</p>
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
                          const isAddingToFavorite = addingToFavorites.has(lessonKey);
                          const isFavorite = favoriteList.has(lessonKey);
                          
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
                                    <Badge variant={lesson.isAvailable === 'true' ? 'default' : 'secondary'}>
                                      {lesson.lessonName}
                                    </Badge>
                                    {lesson.isAvailable === 'true' && (
                                      <Badge variant="outline" className="text-green-600">
                                        空席あり
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {lesson.instructor}
                                  </div>
                                </div>
                                <div className="flex gap-2 ml-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isAddingToFavorite || isFavorite}
                                    onClick={() => addToFavorites(lesson)}
                                    className="flex items-center gap-1"
                                  >
                                    <Heart className={`w-3 h-3 ${isFavorite ? 'fill-current text-red-500' : ''}`} />
                                    {isAddingToFavorite ? '追加中...' : 
                                     isFavorite ? '追加済み' : '気になる'}
                                  </Button>
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
                <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">
                  {selectedStudio ? '検索条件に一致するレッスンが見つかりませんでした' : 'スタジオを選択して検索してください'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}