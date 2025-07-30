'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, Settings, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useRouter } from 'next/navigation';

interface BookingRule {
  id: string;
  name: string;
  isActive: boolean;
  studios: string[];
  instructors: string[];
  programs: string[];
  timeSlots: string[];
  priority: number;
  lastExecuted?: string;
  successRate: number;
}

export default function BookingPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [bookingRules, setBookingRules] = useState<BookingRule[]>([]);
  const [stats, setStats] = useState({
    totalRules: 0,
    activeRules: 0,
    successfulBookings: 0,
    successRate: 0
  });

  // サンプルデータ（実際はAPIから取得）
  useEffect(() => {
    if (isAuthenticated) {
      // サンプルの自動予約ルール
      setBookingRules([
        {
          id: '1',
          name: 'BB2 平日朝クラス',
          isActive: true,
          studios: ['GNZ', 'SBY'],
          instructors: ['Mizuki', 'A.Airi'],
          programs: ['BB2'],
          timeSlots: ['07:30', '08:30'],
          priority: 1,
          lastExecuted: '2025-07-29',
          successRate: 85
        },
        {
          id: '2', 
          name: 'BSL 週末クラス',
          isActive: false,
          studios: ['SJK', 'IKB'],
          instructors: ['K.Miku'],
          programs: ['BSL'],
          timeSlots: ['10:00', '11:00'],
          priority: 2,
          successRate: 92
        }
      ]);

      setStats({
        totalRules: 2,
        activeRules: 1,
        successfulBookings: 12,
        successRate: 88
      });
    }
  }, [isAuthenticated]);

  const handleNavigateToSchedule = () => {
    router.push('/booking/schedule');
  };

  const handleCreateRule = () => {
    router.push('/booking/schedule?mode=create');
  };

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
    <div className="px-4 py-4">
      <div className="mb-4">
        <h1 className="text-[14px] font-medium mb-1">自動予約</h1>
        <p className="text-[12px] text-muted-foreground">条件に基づいた自動レッスン予約の管理</p>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground">アクティブルール</p>
                <p className="text-[16px] font-medium">{stats.activeRules}/{stats.totalRules}</p>
              </div>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-3 pb-3 px-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-muted-foreground">成功率</p>
                <p className="text-[16px] font-medium">{stats.successRate}%</p>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 予約ルール一覧 */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              予約ルール
            </CardTitle>
            <Button size="sm" onClick={handleCreateRule}>
              <BookOpen className="w-3 h-3 mr-1" />
              新規作成
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {bookingRules.length > 0 ? (
            bookingRules.map((rule) => (
              <div key={rule.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm">{rule.name}</h3>
                      <Badge variant={rule.isActive ? "default" : "secondary"} className="text-xs">
                        {rule.isActive ? "有効" : "無効"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      優先度: {rule.priority} | 成功率: {rule.successRate}%
                    </div>
                    <div className="flex flex-wrap gap-1 text-xs">
                      <Badge variant="outline" className="text-xs">
                        {rule.studios.join(', ')}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rule.programs.join(', ')}
                      </Badge>
                    </div>
                  </div>
                  {rule.isActive && (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                {rule.lastExecuted && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    最終実行: {rule.lastExecuted}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">予約ルールがありません</p>
              <p className="text-xs">新しいルールを作成してください</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="space-y-2">
        <Button 
          className="w-full h-11" 
          onClick={handleNavigateToSchedule}
        >
          <Calendar className="w-4 h-4 mr-2" />
          スケジュール管理
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full h-11"
          onClick={handleCreateRule}
        >
          <Settings className="w-4 h-4 mr-2" />
          新しい予約ルールを作成
        </Button>
      </div>
    </div>
  );
}