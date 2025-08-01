'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Clock, Plus, X, Play, MapPin, ChevronRight, CircleAlert } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { fetchProgramsData, getProgramColors } from '@/utils/programsApi';

type WaitlistStatus = 'active' | 'paused' | 'expired' | 'cancelled' | 'completed';

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

  const getStatusText = (status: WaitlistStatus) => {
    switch (status) {
      case 'active': return '待機中';
      case 'paused': return '通知済み';
      case 'expired': return '期限切れ';
      case 'cancelled': return '解除済み';
      case 'completed': return '予約済み';
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

  const handleStudioSelect = (studioCode: string, studioName: string) => {
    console.log('Studio selected:', { studioCode, studioName });
    setSelectedStudio(studioCode);
  };
  

  const getStatusTextClass = (status: WaitlistStatus) => {
    switch (status) {
      case 'paused':
        return 'text-foreground font-medium'; // 黒
      case 'active':
        return 'text-foreground font-medium'; // 黒
      default:
        return 'text-foreground font-medium';
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
                  <div className={`cancel-waiting-card-header ${waitlist.status === 'paused' ? 'bg-gray-300' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`${getStatusTextClass(waitlist.status)} text-sm`}>
                        {getStatusText(waitlist.status)}
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
                            {waitlist.studioName}（{waitlist.studioCode}）
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
                      
                      {/* 再開ボタン（右下） */}
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
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex w-full justify-between items-center px-3 h-12 hover:bg-accent rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <div className="font-medium">
                      {selectedStudio ? 
                        Object.values(studioGroups).flat().find((s: any) => s.code.toLowerCase() === selectedStudio)?.name || selectedStudio.toUpperCase()
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
          
          <div>
            <Input
              placeholder="レッスン名・インストラクター名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}