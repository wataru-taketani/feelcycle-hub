'use client';

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import axios from "axios";

interface LessonSummary {
  period: string;
  totalLessons: number;
  remainingLessons: number;
  favoriteInstructors: Array<{ name: string; count: number }>;
  favoritePrograms: Array<{ name: string; count: number }>;
  studioBreakdown: Array<{ studio: string; count: number }>;
}

export function Dashboard() {
  const { apiUser } = useAuth();
  const [lessonSummary, setLessonSummary] = useState<LessonSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchLessonSummary = async () => {
    if (!apiUser) return;

    try {
      setLoadingSummary(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.get(
        `${apiBaseUrl}/history/summary`,
        {
          params: { userId: apiUser.userId },
        }
      );
      setLessonSummary(response.data.data);
    } catch (error) {
      console.error('Failed to fetch lesson summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (apiUser) {
      fetchLessonSummary();
    }
  }, [apiUser]);

  // 今月の受講実績統計を計算（サンプルデータ）
  const monthlyStats = {
    totalLessons: lessonSummary?.totalLessons || 12,
    remainingLessons: lessonSummary?.remainingLessons || 18,
    basicLessons: 30,
    additionalLessons: 2,
    favoritePrograms: lessonSummary?.favoritePrograms || [
      { name: "BB2", count: 5 },
      { name: "BSL", count: 3 },
      { name: "BSB", count: 2 }
    ],
    studioBreakdown: lessonSummary?.studioBreakdown || [
      { studio: "銀座", code: "GNZ", count: 8 },
      { studio: "川崎", code: "KWS", count: 3 },
      { studio: "吉祥寺", code: "KCJ", count: 1 }
    ]
  };

  // 会員種別設定
  const membershipType = "マンスリー30";

  // プログラム別の色設定
  const programColors: Record<string, string> = {
    BB1: "rgb(255, 255, 102)",
    BB2: "rgb(255, 153, 51)",
    BB3: "rgb(255, 51, 0)",
    BSL: "rgb(0, 0, 204)",
    BSB: "rgb(0, 204, 255)",
    BSW: "rgb(204, 102, 255)",
    BSWi: "rgb(153, 0, 153)",
    BSBi: "rgb(51, 102, 153)"
  };

  return (
    <section className="py-4 px-4">
      <div className="mb-4">
        <h2 className="text-[14px] font-medium mb-1">ダッシュボード</h2>
        <p className="text-[12px] text-muted-foreground">今月のFEELCYCLE受講状況</p>
      </div>

      <div className="space-y-4 mb-4">
        {/* 今月の受講実績サマリー */}
        <Card className="border border-border bg-white">
          <CardHeader className="cancel-waiting-card-header bg-muted/30 px-3 pt-2 pb-2.5">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-foreground text-[12px] font-medium">今月の受講実績</CardTitle>
              <Badge variant="outline" className="text-[11px] border-border text-muted-foreground">
                {membershipType}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-[12px] pr-[12px] pb-[12px] pl-[12px]">
            {loadingSummary ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                <p className="text-[12px] text-muted-foreground">データを読み込み中...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="text-left">
                  <div className="text-[12px] text-muted-foreground mb-1">受講回数</div>
                  <div className="text-[16px] font-medium text-foreground">
                    {monthlyStats.totalLessons}回
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-[12px] text-muted-foreground mb-1">残り</div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-[16px] font-medium text-foreground">
                      {monthlyStats.remainingLessons}/{monthlyStats.basicLessons + monthlyStats.additionalLessons}回
                    </div>
                    {monthlyStats.additionalLessons > 0 && (
                      <div className="text-[11px] text-muted-foreground">
                        （追加{monthlyStats.additionalLessons}回）
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 今月の受講状況 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 受講プログラム */}
        <Card className="border border-border bg-white">
          <CardHeader className="cancel-waiting-card-header bg-muted/30 px-3 pt-2 pb-2.5">
            <CardTitle className="text-foreground text-[12px] font-medium">受講プログラム</CardTitle>
          </CardHeader>
          <CardContent className="pt-[12px] pr-[12px] pb-[7px] pl-[12px]">
            <div className="space-y-2">
              {monthlyStats.favoritePrograms.length > 0 ? (
                monthlyStats.favoritePrograms.map((program, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: programColors[program.name] || "rgb(128, 128, 128)" }}
                      />
                      <span className="text-foreground text-sm">{program.name}</span>
                    </div>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-border text-sm">{program.count}回</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-[12px] text-muted-foreground py-2">
                  受講データなし
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 受講スタジオ */}
        <Card className="border border-border bg-white">
          <CardHeader className="cancel-waiting-card-header bg-muted/30 px-3 pt-2 pb-2.5">
            <CardTitle className="text-foreground text-[12px] font-medium">受講スタジオ</CardTitle>
          </CardHeader>
          <CardContent className="pt-[12px] pr-[12px] pb-[7px] pl-[12px]">
            <div className="space-y-2">
              {monthlyStats.studioBreakdown.length > 0 ? (
                monthlyStats.studioBreakdown.map((studio, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-foreground text-sm">{studio.studio}({studio.code})</span>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-border text-sm">{studio.count}回</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-[12px] text-muted-foreground py-2">
                  受講データなし
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}