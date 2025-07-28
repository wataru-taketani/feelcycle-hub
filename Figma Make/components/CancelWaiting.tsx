import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Clock, Plus, X, Play } from "lucide-react";
import { LessonSchedule } from "./LessonSchedule";

export function CancelWaiting() {
  const [showSchedule, setShowSchedule] = useState(false);
  const [waitingList, setWaitingList] = useState([
    {
      id: 1,
      program: "BB1",
      name: "MORNING",
      instructor: "YUKI",
      date: "7/28",
      day: "月",
      time: "07:30 - 08:15",
      studio: "銀座",
      studioCode: "GNZ",
      status: "待機中" as const
    },
    {
      id: 2,
      program: "BSL",
      name: "NIGHT",
      instructor: "AKIRA",
      date: "7/30",
      day: "水",
      time: "19:30 - 20:15",
      studio: "表参道",
      studioCode: "OTD",
      status: "通知済み" as const
    },
    {
      id: 3,
      program: "BB2",
      name: "House 4",
      instructor: "Mizuki",
      date: "7/29",
      day: "火",
      time: "12:30 - 13:15",
      studio: "川崎",
      studioCode: "KWS",
      status: "待機中" as const
    }
  ]);

  const getProgramClass = (program: string) => {
    const normalizedProgram = program.toLowerCase().replace(/\s+/g, '');
    return `program-${normalizedProgram}`;
  };

  const getStatusTextClass = (status: string) => {
    switch (status) {
      case '通知済み':
        return 'text-foreground font-medium'; // 黒
      case '待機中':
        return 'text-foreground font-medium'; // 黒
      default:
        return 'text-foreground font-medium';
    }
  };

  const getStatusHeaderClass = (status: string): string => {
    switch (status) {
      case '通知済み':
        return 'notified';
      case '待機中':
        return 'waiting';
      case '終了':
        return 'ended';
      default:
        return 'waiting';
    }
  };

  const handleResumeWaiting = (itemId: number) => {
    console.log(`キャンセル待ちを再開: ${itemId}`);
    // ここで実際の再開処理を行う
    setWaitingList(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, status: '待機中' as const }
          : item
      )
    );
  };

  const handleDeleteWaiting = (itemId: number) => {
    console.log(`キャンセル待ちを削除: ${itemId}`);
    setWaitingList(prev => prev.filter(item => item.id !== itemId));
  };

  if (showSchedule) {
    return <LessonSchedule onBack={() => setShowSchedule(false)} mode="cancel-waiting" />;
  }

  return (
    <div className="px-4 py-2">
      <div className="mb-2">
        <h1 className="font-medium mb-1 text-[14px]">キャンセル待ち</h1>
        <p className="text-muted-foreground text-[12px]">人気レッスンのキャンセル待ち登録・管理</p>
      </div>

      {/* 新規登録ボタン */}
      <div className="mb-4">
        <Button 
          className="w-full h-11"
          onClick={() => setShowSchedule(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          スケジュールから選択
        </Button>
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
          {waitingList.length > 0 ? (
            <div className="space-y-3">
              {waitingList.map((item) => (
                <div key={item.id} className="cancel-waiting-card">
                  {/* ヘッダー（ステータス + 削除ボタン） */}
                  <div className={`cancel-waiting-card-header ${item.status === '通知済み' ? 'bg-gray-300' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`${getStatusTextClass(item.status)} text-sm`}>
                        {item.status}
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
                            {item.date}({item.day}) {item.time}
                          </div>
                          
                          {/* プログラム名バッジ */}
                          <div className="flex justify-center">
                            <Badge className={`${getProgramClass(item.program)} text-center border-0 text-sm`}>
                              {item.program} {item.name}
                            </Badge>
                          </div>
                          
                          {/* インストラクター */}
                          <div className="text-center text-muted-foreground text-sm">
                            {item.instructor}
                          </div>
                        </div>
                        
                        {/* 確認メッセージ */}
                        <AlertDialogDescription className="text-center">
                          このレッスンのキャンセル待ちを解除しますか？
                        </AlertDialogDescription>
                        
                        <AlertDialogFooter className="flex-col space-y-2 sm:space-y-2 sm:flex-col">
                          <AlertDialogAction 
                            onClick={() => handleDeleteWaiting(item.id)}
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
                            {item.date}({item.day}) {item.time}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {item.studio}（{item.studioCode}）
                          </span>
                        </div>
                        
                        {/* プログラム名とインストラクター */}
                        <div className="flex items-center gap-3">
                          <span className={`program-name text-sm ${getProgramClass(item.program)}`}>
                            {item.program} {item.name}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {item.instructor}
                          </span>
                        </div>
                      </div>
                      
                      {/* 再開ボタン（右下） */}
                      {item.status === '通知済み' && (
                        <div className="ml-3 self-end">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="h-8 px-3 bg-blue-500 text-white hover:bg-blue-600 text-[11px]"
                            onClick={() => handleResumeWaiting(item.id)}
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
    </div>
  );
}