'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Clock, Plus, X, Play, MapPin, ChevronRight, CircleAlert } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { fetchProgramsData, getProgramColors } from '@/utils/programsApi';

type WaitlistStatus = 'active' | 'paused' | 'expired' | 'cancelled';

interface Waitlist {
  userId: string;
  waitlistId: string;
  studioCode: string;
  studioName: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
  lessonName: string;
  instructor: string;
  status: WaitlistStatus;
  createdAt: string;
  updatedAt: string;
  pausedAt?: string;
  expiredAt?: string;
  cancelledAt?: string;
  notificationHistory: Array<{
    sentAt: string;
    availableSlots: number;
    totalSlots: number;
    notificationId: string;
  }>;
}

export default function WaitlistPage() {
  const { apiUser } = useAuth();
  const [waitlists, setWaitlists] = useState<Waitlist[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [studioGroups, setStudioGroups] = useState<any>({});
  const [studios, setStudios] = useState<any[]>([]);
  const [selectedStudio, setSelectedStudio] = useState<string>(''); // 単一選択に変更
  const [lessonsByDate, setLessonsByDate] = useState<any>({});
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [isStudioCollapsibleOpen, setIsStudioCollapsibleOpen] = useState(false);
  
  // キャンセル待ち登録用
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (apiUser) {
      fetchWaitlists();
      fetchStudios();
      // プログラム色データを事前に取得
      fetchProgramsData().catch(error => {
        console.error('Failed to fetch programs data:', error);
      });
      // 自動リロードは削除（ユーザー要求通り）
    }
  }, [apiUser]);

  const fetchWaitlists = async () => {
    if (!apiUser) return;
    
    try {
      setLoading(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.get(
        `${apiBaseUrl}/waitlist?userId=${apiUser.userId}`
      );
      
      if (response.data.success) {
        console.log('🔍 キャンセル待ちデータ:', response.data.data);
        
        // 現在のactive/pausedのみをログ出力（過去データ除外）
        const activeWaitlistsForLog = response.data.data.filter((w: Waitlist) => 
          w.status === 'active' || w.status === 'paused'
        );
        
        console.log(`📋 現在のキャンセル待ち件数: ${activeWaitlistsForLog.length}`);
        
        activeWaitlistsForLog.forEach((waitlist: Waitlist, index: number) => {
          console.log(`📋 キャンセル待ち[${index}]:`, {
            waitlistId: waitlist.waitlistId,
            status: waitlist.status,
            lessonName: waitlist.lessonName,
            lessonDate: waitlist.lessonDate,
            startTime: waitlist.startTime,
            notificationCount: waitlist.notificationHistory?.length || 0,
            pausedAt: waitlist.pausedAt,
            createdAt: waitlist.createdAt,
            updatedAt: waitlist.updatedAt
          });
          
          // 通知履歴の詳細（最新5件のみ）
          if (waitlist.notificationHistory && waitlist.notificationHistory.length > 0) {
            console.log(`📬 通知履歴 (最新5件):`, 
              waitlist.notificationHistory.slice(-5).map((notification: any) => ({
                sentAt: notification.sentAt,
                availableSlots: notification.availableSlots,
                totalSlots: notification.totalSlots,
                notificationId: notification.notificationId
              }))
            );
          }
        });
        
        setWaitlists(response.data.data);
      } else {
        throw new Error(response.data.message || 'キャンセル待ちリストの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching waitlists:', error);
      // Set empty array and let the UI show appropriate message
      setWaitlists([]);
    } finally {
      setLoading(false);
    }
  };

  const resumeWaitlist = async (waitlistId: string) => {
    if (!apiUser) return;
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.put(
        `${apiBaseUrl}/waitlist/${encodeURIComponent(waitlistId)}`,
        { 
          action: 'resume',
          userId: apiUser.userId
        }
      );
      
      if (response.data.success) {
        fetchWaitlists(); // Refresh data
      }
    } catch (error: any) {
      console.error('Error resuming waitlist:', error);
    }
  };

  const cancelWaitlist = async (waitlistId: string) => {
    if (!apiUser) return;
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const response = await axios.put(
        `${apiBaseUrl}/waitlist/${encodeURIComponent(waitlistId)}`,
        { 
          action: 'cancel',
          userId: apiUser.userId
        }
      );
      
      if (response.data.success) {
        fetchWaitlists(); // Refresh data
      }
    } catch (error: any) {
      console.error('Error cancelling waitlist:', error);
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

  const getStatusText = (status: WaitlistStatus, waitlist?: Waitlist) => {
    if (waitlist) {
      console.log(`🎯 ステータス判定:`, {
        waitlistId: waitlist.waitlistId,
        status: status,
        displayText: status === 'paused' ? '通知済み' : (status === 'active' ? '待機中' : status),
        notificationHistory: waitlist.notificationHistory,
        notificationCount: waitlist.notificationHistory?.length || 0,
        pausedAt: waitlist.pausedAt
      });
    }
    
    switch (status) {
      case 'active': return '待機中';
      case 'paused': return '通知済み';
      case 'expired': return '期限切れ';
      case 'cancelled': return '解除済み';
      default: return '不明';
    }
  };

  // スタジオ一覧取得
  const fetchStudios = async () => {
    try {
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
    }
  };

  const getProgramClass = (program: string) => {
    if (!program) return 'bg-gray-100 text-gray-700';
    const normalizedProgram = program.toLowerCase().replace(/\s+/g, '');
    const className = `program-${normalizedProgram}`;
    console.log('Program:', program, '-> Class:', className);
    return className;
  };

  const extractProgramCode = (lessonName: string): string => {
    if (!lessonName) return '';
    // プログラム名からプログラムコードを抽出（例: "BB3 10s 1" → "BB3"）
    const programMatch = lessonName.match(/^(BB1|BB2|BB3|BSL|BSB|BSW|BSWI|BSBI|OTHER)/);
    return programMatch ? programMatch[1] : 'OTHER';
  };

  const getProgramBackgroundColor = (lessonName: string) => {
    if (!lessonName) return '#f3f4f6';
    const programCode = extractProgramCode(lessonName);
    const colors = getProgramColors(programCode);
    return colors.backgroundColor;
  };

  const getProgramTextColor = (lessonName: string) => {
    if (!lessonName) return '#374151';
    const programCode = extractProgramCode(lessonName);
    const colors = getProgramColors(programCode);
    return colors.textColor;
  };

  const handleStudioSelect = async (studioCode: string, studioName: string) => {
    console.log('Studio selected:', { studioCode: studioCode.toLowerCase(), studioName });
    setSelectedStudio(studioCode.toLowerCase());
    setIsStudioCollapsibleOpen(false); // 選択後にCollapsibleを閉じる
    
    // スタジオ選択後に自動的にレッスン取得（大文字で送信）
    await fetchLessonsForStudio(studioCode.toUpperCase());
  };

  const handleLessonClick = (lesson: any) => {
    setSelectedLesson(lesson);
    setShowRegisterModal(true);
  };

  const registerWaitlist = async () => {
    if (!apiUser || !selectedLesson) return;
    
    try {
      setRegistering(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      
      const response = await axios.post(`${apiBaseUrl}/waitlist`, {
        userId: apiUser.userId,
        studioCode: selectedLesson.studioCode,
        lessonDate: selectedLesson.lessonDate,
        startTime: selectedLesson.startTime,
        endTime: selectedLesson.endTime,
        lessonName: selectedLesson.lessonName,
        instructor: selectedLesson.instructor
      });
      
      if (response.data.success) {
        setShowRegisterModal(false);
        setSelectedLesson(null);
        await fetchWaitlists(); // リストを再取得
      }
    } catch (error) {
      console.error('Error registering waitlist:', error);
    } finally {
      setRegistering(false);
    }
  };

  const fetchLessonsForStudio = async (studioCode: string) => {
    if (!studioCode) return;
    
    try {
      setLoadingLessons(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      
      // 今日から60日間のレッスンを取得（検索ページと同じ形式）
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      console.log(`🔗 API呼び出し:`, { studioCode, url: `${apiBaseUrl}/lessons?studioCode=${studioCode}&range=true&startDate=${today}&endDate=${endDate}` });
      
      const response = await axios.get(`${apiBaseUrl}/lessons?studioCode=${studioCode}&range=true&startDate=${today}&endDate=${endDate}`);
      
      console.log('📊 API Response:', response.data);
      
      if (response.data.success && response.data.data?.lessonsByDate) {
        setLessonsByDate(response.data.data.lessonsByDate);
        console.log('✅ Lessons loaded for studio:', studioCode, Object.keys(response.data.data.lessonsByDate).length, 'days');
      } else {
        setLessonsByDate({});
        console.warn('No lesson data received for studio:', studioCode, response.data);
      }
    } catch (error) {
      console.error('Error fetching lessons for studio:', studioCode, error);
      setLessonsByDate({});
    } finally {
      setLoadingLessons(false);
    }
  };
  

  const getStatusTextClass = (status: WaitlistStatus) => {
    return 'text-foreground font-medium';
  };

  const getStatusBackgroundClass = (status: WaitlistStatus) => {
    switch (status) {
      case 'paused':
        return 'bg-gray-300'; // 通知済み
      default:
        return 'bg-muted/30'; // 待機中など
    }
  };

  const activeWaitlists = waitlists.filter(w => w.status === 'active' || w.status === 'paused');

  return (
    <div className="px-4 py-2">
      <div className="mb-2">
        <h1 className="font-medium mb-1 text-[14px]">キャンセル待ち</h1>
        <p className="text-muted-foreground text-[12px]">人気レッスンのキャンセル待ち登録・管理 - 空席通知はLINE公式アカウントから送信されます</p>
      </div>

      {/* 登録済みリスト */}
      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4" />
            登録中のキャンセル待ち
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
              <p className="text-[12px] text-muted-foreground">データを読み込み中...</p>
            </div>
          ) : activeWaitlists.length > 0 ? (
            <div className="space-y-3">
              {activeWaitlists.map((waitlist) => (
                <div key={waitlist.waitlistId} className="cancel-waiting-card">
                  {/* ヘッダー（ステータス + 削除ボタン） */}
                  <div className={`cancel-waiting-card-header ${getStatusBackgroundClass(waitlist.status)}`}>
                    <div className="flex items-center gap-2">
                      <span className={`${getStatusTextClass(waitlist.status)} text-sm`}>
                        {getStatusText(waitlist.status, waitlist)}
                      </span>
                    </div>
                    
                    {/* 削除ボタン */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-muted">
                          <X className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-sm">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-center">キャンセル待ち解除確認</AlertDialogTitle>
                        </AlertDialogHeader>
                        
                        {/* レッスン情報カード */}
                        <div className="bg-gray-100 rounded-lg p-4 space-y-2">
                          {/* 日時 */}
                          <div className="text-center text-muted-foreground text-sm">
                            {formatDate(waitlist.lessonDate)} {waitlist.startTime} - {waitlist.endTime}
                          </div>
                          
                          {/* プログラム名バッジ */}
                          <div className="flex justify-center">
                            <div className="text-sm font-medium rounded px-2 py-1" style={{
                              backgroundColor: getProgramBackgroundColor(waitlist.lessonName),
                              color: getProgramTextColor(waitlist.lessonName)
                            }}>
                              {waitlist.lessonName}
                            </div>
                          </div>
                          
                          {/* インストラクター */}
                          <div className="text-center text-muted-foreground text-sm">
                            {waitlist.instructor}
                          </div>
                        </div>
                        
                        {/* 確認メッセージ */}
                        <AlertDialogDescription className="text-center">
                          このレッスンのキャンセル待ちを解除しますか？
                        </AlertDialogDescription>
                        
                        <AlertDialogFooter className="flex-col space-y-2 sm:space-y-2 sm:flex-col">
                          <AlertDialogAction 
                            onClick={() => cancelWaitlist(waitlist.waitlistId)}
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
                  </div>
                  
                  {/* コンテンツエリア */}
                  <div className="cancel-waiting-card-content">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-1.5">
                        {/* 日付・時間・スタジオ */}
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-medium text-sm">
                            {formatDate(waitlist.lessonDate)} {waitlist.startTime} - {waitlist.endTime}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {waitlist.studioName}（{waitlist.studioCode.toUpperCase()}）
                          </span>
                        </div>
                        
                        {/* プログラム名とインストラクター */}
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-medium rounded px-2 py-1" style={{
                            backgroundColor: getProgramBackgroundColor(waitlist.lessonName),
                            color: getProgramTextColor(waitlist.lessonName)
                          }}>
                            {waitlist.lessonName}
                          </div>
                          <span className="text-muted-foreground text-sm">
                            {waitlist.instructor}
                          </span>
                        </div>
                      </div>
                      
                      {/* 再開ボタン（右下） - pausedステータスの場合のみ表示 */}
                      {waitlist.status === 'paused' && (
                        <div className="ml-3 self-end">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-8 px-3 bg-blue-500 text-white hover:bg-blue-600 text-[11px]"
                            onClick={() => resumeWaitlist(waitlist.waitlistId)}
                          >
                            再開する
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              現在キャンセル待ちに登録されているレッスンはありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* 新規キャンセル待ち登録 */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleAlert className="w-4 h-4" />
            新規キャンセル待ち登録
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border border-border rounded-lg bg-card">
            <Collapsible open={isStudioCollapsibleOpen} onOpenChange={setIsStudioCollapsibleOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex w-full justify-between items-center px-3 h-12 hover:bg-accent rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <div className="font-medium">
                      {selectedStudio ? 
                        (() => {
                          // 既存のキャンセル待ちと同じ形式で表示：「銀座（gnz）」
                          let studioName = null;
                          if (studioGroups && Object.keys(studioGroups).length > 0) {
                            const studio = Object.values(studioGroups).flat().find((s: any) => s.code.toLowerCase() === selectedStudio);
                            studioName = studio?.name;
                          }
                          if (!studioName && studios.length > 0) {
                            // studiosから検索
                            let studio = studios.find((s: any) => s.code?.toLowerCase() === selectedStudio);
                            if (!studio) {
                              studio = studios.find((s: any) => s.Code?.toLowerCase() === selectedStudio);
                            }
                            if (!studio) {
                              studio = studios.find((s: any) => s.id === selectedStudio);
                            }
                            studioName = studio?.name || studio?.Name;
                          }
                          return studioName ? `${studioName}（${selectedStudio.toUpperCase()}）` : selectedStudio.toUpperCase();
                        })()
                        : 'スタジオを選択'
                      }
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-5 h-5">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-3">
                  <div className="space-y-4">
                    {/* APIからのスタジオグループがある場合 */}
                    {Object.keys(studioGroups).length > 0 ? (
                      Object.keys(studioGroups).map((groupName) => (
                        <div key={groupName}>
                          <h4 className="text-sm font-medium text-muted-foreground mb-2">
                            {groupName}
                          </h4>
                          <div className="grid grid-cols-2 gap-1">
                            {studioGroups[groupName].map((studio: any) => (
                              <Button
                                key={studio.code}
                                variant={selectedStudio === studio.code.toLowerCase() ? "default" : "outline"}
                                size="sm"
                                className="h-8 px-2 text-xs font-normal justify-start"
                                onClick={() => {
                                  console.log('Studio button clicked:', studio.code);
                                  handleStudioSelect(studio.code.toLowerCase(), studio.name);
                                }}
                              >
                                {studio.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        スタジオデータを読み込み中...
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          
          {/* レッスン表示エリア */}
          {selectedStudio && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{(() => {
                    // 既存のキャンセル待ちと同じ形式で表示
                    let studioName = null;
                    if (studioGroups && Object.keys(studioGroups).length > 0) {
                      const studio = Object.values(studioGroups).flat().find((s: any) => s.code.toLowerCase() === selectedStudio);
                      studioName = studio?.name;
                    }
                    if (!studioName && studios.length > 0) {
                      let studio = studios.find((s: any) => s.code?.toLowerCase() === selectedStudio);
                      if (!studio) {
                        studio = studios.find((s: any) => s.Code?.toLowerCase() === selectedStudio);
                      }
                      if (!studio) {
                        studio = studios.find((s: any) => s.id === selectedStudio);
                      }
                      studioName = studio?.name || studio?.Name;
                    }
                    return studioName ? `${studioName}（${selectedStudio.toUpperCase()}）` : selectedStudio.toUpperCase();
                  })()} のスケジュール</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingLessons ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">レッスンを読み込み中...</p>
                  </div>
                ) : selectedStudio ? (
                  <div className="overflow-x-auto">
                    <div className="flex min-w-max">
                      {(() => {
                        // スクレイピングで取得された全日付を取得（レッスンがあるなしに関わらず）
                        const allDates = Object.keys(lessonsByDate).sort();
                        
                        // 日付範囲を補完（開始日から終了日まで連続した日付を生成）
                        if (allDates.length === 0) return [];
                        
                        const startDate = new Date(allDates[0]);
                        const endDate = new Date(allDates[allDates.length - 1]);
                        const dates = [];
                        
                        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                          dates.push(d.toISOString().split('T')[0]);
                        }
                        
                        return dates;
                      })().map(date => {
                        const dateObj = new Date(date);
                        const month = dateObj.getMonth() + 1;
                        const day = dateObj.getDate();
                        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
                        const weekday = weekdays[dateObj.getDay()];
                        
                        return (
                          <div key={date} className="flex-shrink-0 w-[150px] border-r border-border last:border-r-0">
                            <div className="p-2 border-b border-border text-center bg-muted/50">
                              <div className="flex items-center justify-center gap-1 text-sm">
                                <span>{month}/{day}</span>
                                <span>({weekday})</span>
                              </div>
                            </div>
                            <div className="p-1.5 space-y-1.5 min-h-[400px]">
                              {lessonsByDate[date] ? lessonsByDate[date].map((lesson: any, index: number) => (
                                <button 
                                  key={index} 
                                  className="w-full lesson-item text-left hover:bg-muted/50 transition-colors" 
                                  onClick={() => handleLessonClick(lesson)}
                                >
                                  <div className="relative">
                                    <div className="text-sm mb-1 text-muted-foreground">
                                      {lesson.startTime} - {lesson.endTime}
                                    </div>
                                    <div className="mb-1">
                                      <div className="text-xs font-medium rounded px-2 py-1" style={{
                                        backgroundColor: getProgramBackgroundColor(lesson.lessonName),
                                        color: getProgramTextColor(lesson.lessonName)
                                      }}>
                                        {lesson.lessonName}
                                      </div>
                                    </div>
                                    <div className="text-sm font-medium">
                                      <span>{lesson.instructor}</span>
                                    </div>
                                    <div className="reservation-number mt-1 min-h-[20px] text-sm font-normal"></div>
                                    <div className="absolute bottom-0 right-0 text-xs text-muted-foreground flex items-center gap-1">
                                      <span>{(() => {
                                        // レッスンデータからスタジオ名を取得
                                        let studioName = lesson.studioName;
                                        if (!studioName && studioGroups && Object.keys(studioGroups).length > 0) {
                                          const studio = Object.values(studioGroups).flat().find((s: any) => s.code.toLowerCase() === lesson.studioCode.toLowerCase());
                                          studioName = studio?.name;
                                        }
                                        if (!studioName && studios.length > 0) {
                                          let studio = studios.find((s: any) => s.code?.toLowerCase() === lesson.studioCode.toLowerCase());
                                          if (!studio) {
                                            studio = studios.find((s: any) => s.Code?.toLowerCase() === lesson.studioCode.toLowerCase());
                                          }
                                          studioName = studio?.name || studio?.Name;
                                        }
                                        return studioName ? `${studioName}(${lesson.studioCode.toUpperCase()})` : `(${lesson.studioCode.toUpperCase()})`;
                                      })()}</span>
                                    </div>
                                  </div>
                                </button>
                              )) : (
                                <div className="text-center py-8 text-xs text-muted-foreground">
                                  レッスンなし
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    レッスンデータがありません
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* キャンセル待ち登録モーダル */}
      <Dialog open={showRegisterModal} onOpenChange={setShowRegisterModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">キャンセル待ち登録確認</DialogTitle>
          </DialogHeader>
          
          {selectedLesson && (
            <div className="bg-gray-100 rounded-lg p-4 space-y-2">
              {/* 日時 */}
              <div className="text-center text-muted-foreground text-sm">
                {formatDate(selectedLesson.lessonDate)} {selectedLesson.startTime} - {selectedLesson.endTime}
              </div>
              
              {/* プログラム名バッジ */}
              <div className="flex justify-center">
                <div className="text-sm font-medium rounded px-2 py-1" style={{
                  backgroundColor: getProgramBackgroundColor(selectedLesson.lessonName),
                  color: getProgramTextColor(selectedLesson.lessonName)
                }}>
                  {selectedLesson.lessonName}
                </div>
              </div>
              
              {/* インストラクター */}
              <div className="text-center text-muted-foreground text-sm">
                {selectedLesson.instructor}
              </div>

              {/* スタジオ */}
              <div className="text-center text-muted-foreground text-sm">
                {(() => {
                  let studioName = selectedLesson.studioName;
                  if (!studioName && studioGroups && Object.keys(studioGroups).length > 0) {
                    const studio = Object.values(studioGroups).flat().find((s: any) => s.code.toLowerCase() === selectedLesson.studioCode.toLowerCase());
                    studioName = studio?.name;
                  }
                  return studioName ? `${studioName}（${selectedLesson.studioCode.toUpperCase()}）` : selectedLesson.studioCode.toUpperCase();
                })()}
              </div>
            </div>
          )}
          
          <DialogDescription className="text-center">
            このレッスンのキャンセル待ちを登録しますか？
          </DialogDescription>
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={registerWaitlist}
              disabled={registering}
              className="w-full bg-black text-white hover:bg-gray-800"
            >
              {registering ? '登録中...' : 'キャンセル待ち登録'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowRegisterModal(false)}
              className="w-full"
            >
              キャンセル
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}