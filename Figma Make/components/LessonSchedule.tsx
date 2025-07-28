import { useState } from "react";
import * as React from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "./ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { ArrowLeft, Calendar } from "lucide-react";

interface LessonScheduleProps {
  onBack: () => void;
  mode?: 'cancel-waiting' | 'auto-booking';
}

interface Lesson {
  id: string;
  date: string;
  time: string;
  program: string;
  name: string;
  instructor: string;
  status: 'available' | 'full' | 'reserved' | 'waiting';
  reservationNumber?: string;
}

export function LessonSchedule({ onBack, mode = 'cancel-waiting' }: LessonScheduleProps) {
  const [selectedStudio, setSelectedStudio] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  // FEELCYCLE 全店舗リスト（エリア別）
  const studiosByArea = [
    {
      area: "EAST AREA｜関東",
      studios: [
        { id: "gkbs", name: "銀座京橋（GKBS）" },
        { id: "gnz", name: "銀座（GNZ）" },
        { id: "gtd", name: "五反田（GTD）" },
        { id: "ikb", name: "池袋（IKB）" },
        { id: "jyo", name: "自由が丘（JYO）" },
        { id: "kcj", name: "吉祥寺（KCJ）" },
        { id: "nmg", name: "中目黒（NMG）" },
        { id: "mcd", name: "町田（MCD）" },
        { id: "sby", name: "渋谷（SBY）" },
        { id: "sdm", name: "汐留（SDM）" },
        { id: "sjk", name: "新宿（SJK）" },
        { id: "tmc", name: "多摩センター（TMC）" },
        { id: "uen", name: "上野（UEN）" },
        { id: "azn", name: "あざみ野（AZN）" },
        { id: "aznp", name: "あざみ野Pilates（AZNP）" },
        { id: "kok", name: "上大岡（KOK）" },
        { id: "kws", name: "川崎（KWS）" },
        { id: "mkg", name: "武蔵小杉（MKG）" },
        { id: "ykh", name: "横浜（YKH）" },
        { id: "ysc", name: "横須賀中央（YSC）" },
        { id: "ksg", name: "越谷（KSG）" },
        { id: "omy", name: "大宮（OMY）" },
        { id: "fnb", name: "船橋（FNB）" },
        { id: "khm", name: "海浜幕張（KHM）" },
        { id: "ksw", name: "柏（KSW）" }
      ]
    },
    {
      area: "NORTH AREA｜北海道",
      studios: [
        { id: "spr", name: "札幌（SPR）" }
      ]
    },
    {
      area: "WEST AREA｜東海・関西",
      studios: [
        { id: "ngy", name: "名古屋（NGY）" },
        { id: "ske", name: "栄（SKE）" },
        { id: "gif", name: "岐阜（GIF）" },
        { id: "okbs", name: "大阪京橋（OKBS）" },
        { id: "ssb", name: "心斎橋（SSB）" },
        { id: "umdc", name: "梅田茶屋町（UMDC）" },
        { id: "ktk", name: "京都河原町（KTK）" },
        { id: "smy", name: "三ノ宮（SMY）" }
      ]
    },
    {
      area: "SOUTH AREA｜中国・四国・九州",
      studios: [
        { id: "hsm", name: "広島（HSM）" },
        { id: "tkm", name: "高松（TKM）" },
        { id: "ftj", name: "福岡天神（FTJ）" }
      ]
    }
  ];

  const dates = [
    { date: "7/23", day: "水" },
    { date: "7/24", day: "木" },
    { date: "7/25", day: "金" },
    { date: "7/26", day: "土" },
    { date: "7/27", day: "日" },
    { date: "7/28", day: "月" },
    { date: "7/29", day: "火" },
    { date: "7/30", day: "水" },
    { date: "7/31", day: "木" },
    { date: "8/1", day: "金" },
    { date: "8/2", day: "土" },
    { date: "8/3", day: "日" },
    { date: "8/4", day: "月" },
    { date: "8/5", day: "火" }
  ];

  // サンプルレッスンデータ（状態別に設定）
  const lessonsData: { [key: string]: Lesson[] } = {
    "gnz": [
      // 銀座店のデータ
      // 7/23 (水)
      { id: "1", date: "7/23", time: "07:00 - 07:45", program: "BB1", name: "House 4", instructor: "Junna", status: "full" },
      { id: "2", date: "7/23", time: "08:00 - 08:45", program: "BB2", name: "MLN 1", instructor: "Junna", status: "full" },
      { id: "3", date: "7/23", time: "10:30 - 11:15", program: "BB1", name: "10s 2", instructor: "Ayane", status: "full" },
      { id: "4", date: "7/23", time: "11:30 - 12:15", program: "BSL", name: "Deep 2", instructor: "Miho", status: "full" },
      { id: "5", date: "7/23", time: "12:30 - 13:15", program: "BB2", name: "R&B 2", instructor: "Mizuki", status: "reserved", reservationNumber: "#24" },
      { id: "6", date: "7/23", time: "16:30 - 17:15", program: "BB2", name: "Rock 1", instructor: "Mizuki", status: "reserved", reservationNumber: "#35" },
      { id: "7", date: "7/23", time: "17:30 - 18:15", program: "BB2", name: "10s 2", instructor: "Mizuki", status: "reserved", reservationNumber: "#35" },
      { id: "8", date: "7/23", time: "18:30 - 19:15", program: "BB2", name: "10s 3", instructor: "Taiyo", status: "waiting" },
      { id: "9", date: "7/23", time: "19:30 - 20:15", program: "BSL", name: "Deep 1", instructor: "Eiichi", status: "available" },
      { id: "10", date: "7/23", time: "20:30 - 21:15", program: "BB1", name: "BRIT 2024", instructor: "O.Airi", status: "available" },
      { id: "11", date: "7/23", time: "21:30 - 22:15", program: "BB2", name: "MLN 3", instructor: "O.Airi", status: "available" },

      // 7/24 (木)
      { id: "12", date: "7/24", time: "10:30 - 11:15", program: "BB2", name: "BRIT 2025", instructor: "S.Natsumi", status: "available" },
      { id: "13", date: "7/24", time: "11:30 - 12:15", program: "BSB", name: "10s 1", instructor: "S.Natsumi", status: "available" },
      { id: "14", date: "7/24", time: "12:30 - 13:15", program: "BB2", name: "GRMY 66", instructor: "Yosui", status: "available" },
      { id: "15", date: "7/24", time: "15:30 - 16:15", program: "BB1", name: "House 3", instructor: "Yosui", status: "available" },
      { id: "16", date: "7/24", time: "16:30 - 17:15", program: "BB2", name: "HipHop 1", instructor: "K.Miku", status: "available" },
      { id: "17", date: "7/24", time: "17:30 - 18:15", program: "BSBI", name: "House 1", instructor: "K.Miku", status: "available" },

      // 7/25 (金)
      { id: "18", date: "7/25", time: "20:15 - 21:00", program: "BB2", name: "EDM", instructor: "Ibuki", status: "waiting" },

      // 7/26 (土)
      { id: "19", date: "7/26", time: "10:00 - 10:45", program: "BB1", name: "10s 2", instructor: "Rui", status: "available" },
      { id: "20", date: "7/26", time: "11:15 - 12:00", program: "BSWI", name: "House 2", instructor: "Mizuki", status: "available" },
      { id: "21", date: "7/26", time: "12:30 - 13:15", program: "BB2", name: "R&B 2", instructor: "Mizuki", status: "available" },
      { id: "22", date: "7/26", time: "13:45 - 14:30", program: "BB1", name: "BRIT 2024", instructor: "Chiho", status: "available" },
      { id: "23", date: "7/26", time: "15:00 - 15:45", program: "BSB", name: "HipHop 2", instructor: "Chiho", status: "available" },
      { id: "24", date: "7/26", time: "16:15 - 17:00", program: "BB2", name: "Deep 1", instructor: "Yuriko", status: "available" },
      { id: "25", date: "7/26", time: "17:30 - 18:15", program: "BSL", name: "House 1", instructor: "Yuriko", status: "available" },

      // 7/27 (日)
      { id: "26", date: "7/27", time: "10:00 - 10:45", program: "BSB", name: "Reggae 1", instructor: "Mizuki", status: "available" },
      { id: "27", date: "7/27", time: "11:15 - 12:00", program: "BB1", name: "Comp 2", instructor: "K.Miku", status: "available" },
      { id: "28", date: "7/27", time: "12:30 - 13:15", program: "BB3", name: "HipHop 2", instructor: "K.Miku", status: "available" },
      { id: "29", date: "7/27", time: "13:45 - 14:30", program: "BB2", name: "10s 3", instructor: "Taiyo", status: "available" },
      { id: "30", date: "7/27", time: "15:00 - 15:45", program: "BSW", name: "House 3", instructor: "Taiyo", status: "available" },
      { id: "31", date: "7/27", time: "16:15 - 17:00", program: "BB1", name: "Comp 3", instructor: "Y.Yuri", status: "available" },

      // 7/28 (月)
      { id: "32", date: "7/28", time: "10:30 - 11:15", program: "BB2", name: "NOW 2", instructor: "Masaki", status: "available" },
      { id: "33", date: "7/28", time: "11:30 - 12:15", program: "BB1", name: "Comp 4", instructor: "Masaki", status: "available" },
      { id: "34", date: "7/28", time: "12:30 - 13:15", program: "BSW", name: "Comp 3", instructor: "Yudai", status: "available" },
      { id: "35", date: "7/28", time: "16:30 - 17:15", program: "BB2", name: "House 4", instructor: "Yudai", status: "available" },
      { id: "36", date: "7/28", time: "17:30 - 18:15", program: "BSW", name: "House 3", instructor: "Taiyo", status: "available" },
      { id: "37", date: "7/28", time: "18:30 - 19:15", program: "BB2", name: "R&B 1", instructor: "Yuriko", status: "available" },

      // 7/29 (火)
      { id: "38", date: "7/29", time: "10:30 - 11:15", program: "BB1", name: "10s 2", instructor: "Rui", status: "available" },
      { id: "39", date: "7/29", time: "11:30 - 12:15", program: "BSB", name: "House 1", instructor: "Rui", status: "available" },
      { id: "40", date: "7/29", time: "12:30 - 13:15", program: "BB2", name: "House 4", instructor: "Mizuki", status: "available" },
      { id: "41", date: "7/29", time: "15:30 - 16:15", program: "BB2", name: "10s 2", instructor: "Mizuki", status: "available" },
      { id: "42", date: "7/29", time: "16:30 - 17:15", program: "BB1", name: "House 2", instructor: "Y.Yuri", status: "available" },
      { id: "43", date: "7/29", time: "17:30 - 18:15", program: "BB2", name: "Comp 1", instructor: "Y.Yuri", status: "available" }
    ],
    "sby": [
      // 渋谷店のサンプルデータ
      { id: "100", date: "7/23", time: "07:30 - 08:15", program: "BSL", name: "Rock 1", instructor: "Akira", status: "available" },
      { id: "101", date: "7/23", time: "09:00 - 09:45", program: "BB1", name: "Soul 1", instructor: "Mari", status: "available" },
      { id: "102", date: "7/23", time: "10:30 - 11:15", program: "BB2", name: "House 2", instructor: "Kenta", status: "available" }
    ],
    "sjk": [
      // 新宿店のサンプルデータ
      { id: "200", date: "7/23", time: "08:00 - 08:45", program: "BB1", name: "NOW 1", instructor: "Yuki", status: "available" },
      { id: "201", date: "7/23", time: "10:30 - 11:15", program: "BB2", name: "Soul 2", instructor: "Akira", status: "available" },
      { id: "202", date: "7/23", time: "19:30 - 20:15", program: "BSL", name: "Deep 1", instructor: "Mai", status: "available" }
    ]
  };

  const getLessonsForDate = (date: string) => {
    if (!selectedStudio || !lessonsData[selectedStudio]) return [];
    return lessonsData[selectedStudio].filter(lesson => lesson.date === date);
  };

  const getProgramClass = (program: string) => {
    const normalizedProgram = program.toLowerCase().replace(/\s+/g, '');
    return `program-${normalizedProgram}`;
  };

  const getLessonItemClass = (lesson: Lesson) => {
    const baseClass = 'w-full lesson-item text-left';
    
    switch (lesson.status) {
      case 'reserved':
        return `${baseClass} reserved cursor-not-allowed opacity-60`;
      case 'waiting':
        return `${baseClass} waiting`;
      default:
        return baseClass;
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    // 予約済みレッスンはクリック無効
    if (lesson.status === 'reserved') {
      return;
    }
    
    setSelectedLesson(lesson);
    setDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedLesson) return;
    
    if (selectedLesson.status === 'waiting') {
      // 解除処理
      console.log(`${mode === 'cancel-waiting' ? 'キャンセル待ち' : '自動予約'}解除:`, selectedLesson);
      // ここで実際のAPI呼び出しなどを行う
    } else {
      // 登録処理
      console.log(`${mode === 'cancel-waiting' ? 'キャンセル待ち' : '自動予約'}登録:`, selectedLesson);
      // ここで実際のAPI呼び出しなどを行う
    }
    
    setDialogOpen(false);
    setSelectedLesson(null);
    onBack();
  };

  const handleCancelAction = () => {
    setDialogOpen(false);
    setSelectedLesson(null);
  };

  // 日付に曜日を追加する関数（7/23(水) 形式）
  const formatDateWithDayOfWeek = (dateString: string) => {
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = days[date.getDay()];
    return `${month}/${day}(${dayOfWeek})`;
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-1.5">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="font-medium mb-1">スケジュール</h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'cancel-waiting' ? 'キャンセル待ちしたいレッスンを選択' : '自動予約したいレッスンを選択'}
          </p>
        </div>
      </div>

      {/* スタジオ選択 */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium">スタジオを選択</label>
            <Select value={selectedStudio} onValueChange={setSelectedStudio}>
              <SelectTrigger>
                <SelectValue placeholder="スタジオを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {studiosByArea.map((area, areaIndex) => (
                  <React.Fragment key={area.area}>
                    <SelectGroup>
                      <SelectLabel className="bg-gray-50 text-gray-700 px-3 py-2 text-sm font-medium border-b border-gray-200/50 -mx-1 mb-1">
                        {area.area}
                      </SelectLabel>
                      {area.studios.map((studio) => (
                        <SelectItem key={studio.id} value={studio.id}>
                          {studio.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {areaIndex < studiosByArea.length - 1 && (
                      <SelectSeparator className="my-2 bg-gray-200" />
                    )}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* スケジュール表 */}
      {selectedStudio ? (
        <Card>
          <CardContent className="p-0">
            {/* 日付ごとのスケジュール表示 */}
            <div className="overflow-x-auto">
              <div className="flex min-w-max">
                {dates.map((dateInfo, index) => {
                  const lessons = getLessonsForDate(dateInfo.date);
                  return (
                    <div key={index} className="flex-shrink-0 w-[150px] border-r border-border last:border-r-0">
                      {/* 日付ヘッダー - 統一した表示 */}
                      <div className="p-2 border-b border-border text-center bg-muted/50">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <span>{dateInfo.date}</span>
                          <span>({dateInfo.day})</span>
                        </div>
                      </div>
                      
                      {/* レッスン一覧 */}
                      <div className="p-1.5 space-y-1.5 min-h-[400px]">
                        {lessons.length > 0 ? (
                          lessons.map((lesson) => (
                            <button
                              key={lesson.id}
                              onClick={() => handleLessonClick(lesson)}
                              className={getLessonItemClass(lesson)}
                            >
                              <div className="text-sm mb-1 text-muted-foreground">
                                {lesson.time}
                              </div>
                              <div className="mb-1">
                                <span className={`program-name ${getProgramClass(lesson.program)}`}>
                                  {lesson.program} {lesson.name}
                                </span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {lesson.instructor}
                              </div>
                              {/* 全てのレッスン枠で予約番号エリアを確保 */}
                              <div className="reservation-number mt-1 min-h-[20px] text-sm">
                                {lesson.status === 'reserved' && lesson.reservationNumber ? lesson.reservationNumber : ''}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            レッスンなし
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-[12px]">
              スタジオを選択してスケジュールを表示
            </p>
          </CardContent>
        </Card>
      )}

      {/* 確認ダイアログ */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedLesson?.status === 'waiting' 
                ? (mode === 'cancel-waiting' ? 'キャンセル待ち解除確認' : '自動予約解除確認')
                : (mode === 'cancel-waiting' ? 'キャンセル待ち登録確認' : '自動予約登録確認')
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedLesson && (
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-sm text-muted-foreground mb-1 text-center">
                      {formatDateWithDayOfWeek(selectedLesson.date)} {selectedLesson.time}
                    </div>
                    <div className="mb-1 text-center">
                      <span className={`program-name ${getProgramClass(selectedLesson.program)}`}>
                        {selectedLesson.program} {selectedLesson.name}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground text-center">
                      {selectedLesson.instructor}
                    </div>
                  </div>
                  <p className="text-sm">
                    {selectedLesson.status === 'waiting' 
                      ? (mode === 'cancel-waiting' 
                          ? 'このレッスンのキャンセル待ちを解除しますか？' 
                          : 'このレッスンの自動予約を解除しますか？'
                        )
                      : (mode === 'cancel-waiting' 
                          ? 'このレッスンをキャンセル待ちに登録しますか？' 
                          : 'このレッスンを自動予約に登録しますか？'
                        )
                    }
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {selectedLesson?.status === 'waiting' ? '解除する' : '登録する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}