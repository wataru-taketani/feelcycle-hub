'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarDays, TrendingUp, BarChart3, Clock } from "lucide-react";
import { getTodayJST, formatDateJST } from '@/utils/dateUtils';

interface LessonHistory {
  lessonId: string;
  studioCode: string;
  studioName: string;
  lessonDate: string;
  startTime: string;
  lessonName: string;
  instructor: string;
  program: string;
  attendanceStatus: 'attended' | 'no-show' | 'cancelled';
  timestamp: string;
}

interface HistoryStats {
  totalLessons: number;
  monthlyLessons: number;
  favoritePrograms: Array<{ name: string; count: number }>;
  favoriteStudios: Array<{ name: string; count: number }>;
  favoriteInstructors: Array<{ name: string; count: number }>;
}

export default function HistoryPage() {
  const { isAuthenticated, apiUser, loading } = useAuth();
  
  const [history, setHistory] = useState<LessonHistory[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30日前
    end: new Date()
  });
  
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

  // 履歴データ取得
  const fetchHistory = async () => {
    if (!apiUser?.userId) return;
    
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/history`, {
        params: {
          userId: apiUser.userId,
          startDate: dateRange.start.toISOString().split('T')[0],
          endDate: dateRange.end.toISOString().split('T')[0]
        }
      });
      
      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (error) {
      console.error('履歴データの取得に失敗:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 統計データ取得
  const fetchStats = async () => {
    if (!apiUser?.userId) return;
    
    setLoadingStats(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/history/summary`, {
        params: {
          userId: apiUser.userId
        }
      });
      
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('統計データの取得に失敗:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && apiUser?.userId) {
      fetchHistory();
      fetchStats();
    }
  }, [isAuthenticated, apiUser, dateRange]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'attended': return 'default';
      case 'no-show': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'attended': return '参加';
      case 'no-show': return '欠席';
      case 'cancelled': return 'キャンセル';
      default: return status;
    }
  };

  const getProgramColor = (program: string) => {
    const colors = {
      'BB1': 'bg-program-bb1',
      'BB2': 'bg-program-bb2', 
      'BB3': 'bg-program-bb3',
      'BSL': 'bg-program-bsl',
      'BSB': 'bg-program-bsb',
      'BSW': 'bg-program-bsw',
      'BSWi': 'bg-program-bswi',
      'BSBi': 'bg-program-bsbi'
    };
    return colors[program as keyof typeof colors] || 'bg-gray-100';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">読み込み中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-muted-foreground">ログインしてください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">レッスン履歴・統計</h1>
          <p className="text-muted-foreground">受講履歴とパフォーマンス統計を確認できます</p>
        </div>
        <CalendarDays className="h-8 w-8 text-primary" />
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総受講回数</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLessons}回</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今月の受講</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthlyLessons}回</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">お気に入りプログラム</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {stats.favoritePrograms[0]?.name || 'なし'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.favoritePrograms[0]?.count || 0}回受講
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">お気に入りスタジオ</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {stats.favoriteStudios[0]?.name || 'なし'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.favoriteStudios[0]?.count || 0}回利用
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* プログラム別統計 */}
      {stats && stats.favoritePrograms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>プログラム別受講回数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.favoritePrograms.map((program, index) => (
                <div key={program.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded ${getProgramColor(program.name)}`}></div>
                    <span className="font-medium">{program.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{program.count}回</span>
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ 
                          width: `${Math.min(100, (program.count / stats.favoritePrograms[0].count) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 履歴一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>受講履歴</CardTitle>
          <p className="text-sm text-muted-foreground">
            過去30日間の受講履歴を表示しています
          </p>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              履歴データがありません
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {history.map((lesson) => (
                  <div key={lesson.lessonId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className={`w-3 h-3 rounded ${getProgramColor(lesson.program)}`}></div>
                        <span className="font-medium">{lesson.lessonName}</span>
                        <Badge variant={getStatusBadgeVariant(lesson.attendanceStatus)}>
                          {getStatusText(lesson.attendanceStatus)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {lesson.studioName} • {lesson.instructor} • {formatDateJST(lesson.lessonDate)} {lesson.startTime}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}