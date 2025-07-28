import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarIcon, MapPin, Clock, User, Ticket } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { ja } from "date-fns/locale";

export function AttendanceHistory() {
  // 日付範囲の状態管理
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: new Date(2025, 6, 1), // 2025年7月1日
    to: new Date(2025, 6, 31)   // 2025年7月31日
  });

  // 実際の受講データ（サンプルデータ）
  const attendanceData = [
    // 7月のデータ
    {
      id: 1,
      date: "2025/07/24 (木)",
      dateForFilter: "2025-07-24",
      time: "11:30-12:15",
      studio: "川崎（KWS）",
      program: "BB2 MLN 3",
      instructor: "K.Miho",
      ticket: "他店利用チケット"
    },
    {
      id: 2,
      date: "2025/07/24 (木)",
      dateForFilter: "2025-07-24",
      time: "07:00-07:45",
      studio: "川崎（KWS）",
      program: "BSL House 2",
      instructor: "N.Kanna",
      ticket: "他店利用チケット"
    },
    {
      id: 3,
      date: "2025/07/23 (水)",
      dateForFilter: "2025-07-23",
      time: "16:30-17:15",
      studio: "銀座（GNZ）",
      program: "BB2 Rock 1",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 4,
      date: "2025/07/22 (火)",
      dateForFilter: "2025-07-22",
      time: "11:30-12:15",
      studio: "自由が丘（JYO）",
      program: "BB2 House 7",
      instructor: "Miku.I",
      ticket: "他店利用チケット"
    },
    {
      id: 5,
      date: "2025/07/21 (月)",
      dateForFilter: "2025-07-21",
      time: "20:00-20:45",
      studio: "銀座（GNZ）",
      program: "BSB HipHop 1",
      instructor: "K.Miho",
      ticket: ""
    },
    {
      id: 6,
      date: "2025/07/20 (日)",
      dateForFilter: "2025-07-20",
      time: "07:30-08:15",
      studio: "銀座（GNZ）",
      program: "BSL Deep 1",
      instructor: "Y.Yuri",
      ticket: ""
    },
    {
      id: 7,
      date: "2025/07/19 (土)",
      dateForFilter: "2025-07-19",
      time: "17:30-18:15",
      studio: "銀座（GNZ）",
      program: "BSL House 1",
      instructor: "K.Miho",
      ticket: ""
    },
    {
      id: 8,
      date: "2025/07/17 (木)",
      dateForFilter: "2025-07-17",
      time: "19:30-20:15",
      studio: "銀座（GNZ）",
      program: "BSB House 1",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 9,
      date: "2025/07/17 (木)",
      dateForFilter: "2025-07-17",
      time: "18:30-19:15",
      studio: "銀座（GNZ）",
      program: "BB2 UPGD 3",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 10,
      date: "2025/07/16 (水)",
      dateForFilter: "2025-07-16",
      time: "21:30-22:15",
      studio: "銀座（GNZ）",
      program: "BSWi House 3",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 11,
      date: "2025/07/15 (火)",
      dateForFilter: "2025-07-15",
      time: "17:30-18:15",
      studio: "銀座（GNZ）",
      program: "BB2 10s 2",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 12,
      date: "2025/07/14 (月)",
      dateForFilter: "2025-07-14",
      time: "07:00-07:45",
      studio: "銀座（GNZ）",
      program: "BSW House 3",
      instructor: "Taiyo",
      ticket: ""
    },
    {
      id: 13,
      date: "2025/07/13 (日)",
      dateForFilter: "2025-07-13",
      time: "09:30-10:15",
      studio: "横須賀中央（YSC）",
      program: "BSW House 2",
      instructor: "K.Naoki",
      ticket: "他店利用チケット"
    },
    {
      id: 14,
      date: "2025/07/12 (土)",
      dateForFilter: "2025-07-12",
      time: "16:15-17:00",
      studio: "銀座（GNZ）",
      program: "BB2 House 5",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 15,
      date: "2025/07/10 (木)",
      dateForFilter: "2025-07-10",
      time: "18:30-19:15",
      studio: "銀座（GNZ）",
      program: "BB2 House 4",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 16,
      date: "2025/07/09 (水)",
      dateForFilter: "2025-07-09",
      time: "10:30-11:15",
      studio: "川崎（KWS）",
      program: "BB2 MLN 3",
      instructor: "K.Miho",
      ticket: "他店利用チケット"
    },
    {
      id: 17,
      date: "2025/07/08 (火)",
      dateForFilter: "2025-07-08",
      time: "08:00-08:45",
      studio: "銀座（GNZ）",
      program: "BSW Comp 3",
      instructor: "Y.Yuri",
      ticket: ""
    },
    {
      id: 18,
      date: "2025/07/07 (月)",
      dateForFilter: "2025-07-07",
      time: "18:00-18:45",
      studio: "銀座（GNZ）",
      program: "BB2 Summer 2",
      instructor: "Mizuki",
      ticket: "イベントチケット"
    },
    {
      id: 19,
      date: "2025/07/06 (日)",
      dateForFilter: "2025-07-06",
      time: "16:15-17:00",
      studio: "吉祥寺（KCJ）",
      program: "BB2 Comp 4",
      instructor: "N.Kanna",
      ticket: "他店利用チケット"
    },
    {
      id: 20,
      date: "2025/07/06 (日)",
      dateForFilter: "2025-07-06",
      time: "15:00-15:45",
      studio: "吉祥寺（KCJ）",
      program: "BSB Jazz 1",
      instructor: "N.Kanna",
      ticket: "他店利用チケット"
    },
    {
      id: 21,
      date: "2025/07/05 (土)",
      dateForFilter: "2025-07-05",
      time: "11:15-12:00",
      studio: "川崎（KWS）",
      program: "BB2 Comp 6",
      instructor: "Masa",
      ticket: "他店利用チケット"
    },
    {
      id: 22,
      date: "2025/07/05 (土)",
      dateForFilter: "2025-07-05",
      time: "07:30-08:15",
      studio: "川崎（KWS）",
      program: "BB2 Reggae 2",
      instructor: "K.Miho",
      ticket: "他店利用チケット"
    },
    {
      id: 23,
      date: "2025/07/04 (金)",
      dateForFilter: "2025-07-04",
      time: "18:00-18:45",
      studio: "汐留（SDM）",
      program: "BB2 Summer 2",
      instructor: "Liz / Mizuki",
      ticket: "イベントチケット"
    },
    {
      id: 24,
      date: "2025/07/03 (木)",
      dateForFilter: "2025-07-03",
      time: "15:30-16:15",
      studio: "銀座（GNZ）",
      program: "BB2 UPGD 3",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 25,
      date: "2025/07/02 (水)",
      dateForFilter: "2025-07-02",
      time: "16:30-17:15",
      studio: "銀座（GNZ）",
      program: "BB2 Comp 2",
      instructor: "Y.Yuri",
      ticket: ""
    },
    {
      id: 26,
      date: "2025/07/01 (火)",
      dateForFilter: "2025-07-01",
      time: "18:30-19:15",
      studio: "川崎（KWS）",
      program: "BSL House 1",
      instructor: "K.Miho",
      ticket: "他店利用チケット"
    },
    {
      id: 27,
      date: "2025/07/01 (火)",
      dateForFilter: "2025-07-01",
      time: "11:30-12:15",
      studio: "銀座（GNZ）",
      program: "BB2 Deep 3",
      instructor: "N.Kanna",
      ticket: ""
    },
    // 6月のデータ
    {
      id: 28,
      date: "2025/06/30 (月)",
      dateForFilter: "2025-06-30",
      time: "19:30-20:15",
      studio: "銀座（GNZ）",
      program: "BSL Deep 2",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 29,
      date: "2025/06/30 (月)",
      dateForFilter: "2025-06-30",
      time: "18:30-19:15",
      studio: "銀座（GNZ）",
      program: "BB2 LDGG 2",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 30,
      date: "2025/06/29 (日)",
      dateForFilter: "2025-06-29",
      time: "20:00-20:45",
      studio: "川崎（KWS）",
      program: "BSWi House 1",
      instructor: "N.Kanna",
      ticket: "他店利用チケット"
    },
    {
      id: 31,
      date: "2025/06/29 (日)",
      dateForFilter: "2025-06-29",
      time: "18:45-19:30",
      studio: "川崎（KWS）",
      program: "BB2 R＆B 1",
      instructor: "N.Kanna",
      ticket: "他店利用チケット"
    },
    {
      id: 32,
      date: "2025/06/28 (土)",
      dateForFilter: "2025-06-28",
      time: "20:00-20:45",
      studio: "銀座（GNZ）",
      program: "BB2 Deep 1",
      instructor: "K.Miho",
      ticket: ""
    },
    {
      id: 33,
      date: "2025/06/26 (木)",
      dateForFilter: "2025-06-26",
      time: "15:30-16:15",
      studio: "吉祥寺（KCJ）",
      program: "BSW Comp 3",
      instructor: "A.Mako",
      ticket: "他店利用チケット"
    },
    {
      id: 34,
      date: "2025/06/25 (水)",
      dateForFilter: "2025-06-25",
      time: "21:30-22:15",
      studio: "銀座（GNZ）",
      program: "BB2 LDGG 2",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 35,
      date: "2025/06/25 (水)",
      dateForFilter: "2025-06-25",
      time: "20:30-21:15",
      studio: "銀座（GNZ）",
      program: "BB2 MJ",
      instructor: "Mizuki",
      ticket: "マンスリー1回券"
    },
    {
      id: 36,
      date: "2025/06/24 (火)",
      dateForFilter: "2025-06-24",
      time: "20:30-21:15",
      studio: "銀座（GNZ）",
      program: "BSL House 2",
      instructor: "Kaori",
      ticket: ""
    },
    {
      id: 37,
      date: "2025/06/23 (月)",
      dateForFilter: "2025-06-23",
      time: "17:30-18:15",
      studio: "銀座（GNZ）",
      program: "BB2 LDGG 2",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 38,
      date: "2025/06/23 (月)",
      dateForFilter: "2025-06-23",
      time: "16:30-17:15",
      studio: "銀座（GNZ）",
      program: "BSB House 1",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 39,
      date: "2025/06/22 (日)",
      dateForFilter: "2025-06-22",
      time: "20:00-20:45",
      studio: "銀座（GNZ）",
      program: "BB2 NOW 1",
      instructor: "K.Miho",
      ticket: ""
    },
    {
      id: 40,
      date: "2025/06/21 (土)",
      dateForFilter: "2025-06-21",
      time: "15:00-15:45",
      studio: "吉祥寺（KCJ）",
      program: "BB2 10s 1",
      instructor: "Hiromu",
      ticket: "他店利用チケット"
    },
    {
      id: 41,
      date: "2025/06/21 (土)",
      dateForFilter: "2025-06-21",
      time: "13:45-14:30",
      studio: "吉祥寺（KCJ）",
      program: "BB1 House 4",
      instructor: "N.Kanna",
      ticket: "他店利用チケット"
    },
    {
      id: 42,
      date: "2025/06/19 (木)",
      dateForFilter: "2025-06-19",
      time: "08:00-08:45",
      studio: "銀座（GNZ）",
      program: "BB2 LDGG 2",
      instructor: "Yuta",
      ticket: ""
    },
    {
      id: 43,
      date: "2025/06/18 (水)",
      dateForFilter: "2025-06-18",
      time: "18:30-19:15",
      studio: "銀座（GNZ）",
      program: "BSB Rock 1",
      instructor: "Kentaro",
      ticket: ""
    },
    {
      id: 44,
      date: "2025/06/17 (火)",
      dateForFilter: "2025-06-17",
      time: "08:00-08:45",
      studio: "銀座（GNZ）",
      program: "BB1 10s 1",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 45,
      date: "2025/06/17 (火)",
      dateForFilter: "2025-06-17",
      time: "07:00-07:45",
      studio: "銀座（GNZ）",
      program: "BSWi House 2",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 46,
      date: "2025/06/16 (月)",
      dateForFilter: "2025-06-16",
      time: "07:00-08:00",
      studio: "銀座（GNZ）",
      program: "9th SP 2",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 47,
      date: "2025/06/15 (日)",
      dateForFilter: "2025-06-15",
      time: "11:15-12:00",
      studio: "銀座（GNZ）",
      program: "BB1 House 2",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 48,
      date: "2025/06/15 (日)",
      dateForFilter: "2025-06-15",
      time: "10:00-10:45",
      studio: "銀座（GNZ）",
      program: "BSW R＆B 1",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 49,
      date: "2025/06/14 (土)",
      dateForFilter: "2025-06-14",
      time: "17:30-18:15",
      studio: "銀座（GNZ）",
      program: "BB2 Rock 2",
      instructor: "Kentaro",
      ticket: ""
    },
    {
      id: 50,
      date: "2025/06/13 (金)",
      dateForFilter: "2025-06-13",
      time: "18:00-18:45",
      studio: "汐留（SDM）",
      program: "BB3 Hit 4",
      instructor: "Mizuki",
      ticket: "イベントチケット"
    },
    {
      id: 51,
      date: "2025/06/12 (木)",
      dateForFilter: "2025-06-12",
      time: "20:30-21:15",
      studio: "銀座（GNZ）",
      program: "BB2 Rock 1",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 52,
      date: "2025/06/11 (水)",
      dateForFilter: "2025-06-11",
      time: "17:30-18:15",
      studio: "銀座（GNZ）",
      program: "BB2  UPGD 1",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 53,
      date: "2025/06/10 (火)",
      dateForFilter: "2025-06-10",
      time: "18:30-19:15",
      studio: "銀座（GNZ）",
      program: "BB2 Deep 1",
      instructor: "Masa",
      ticket: ""
    },
    {
      id: 54,
      date: "2025/06/09 (月)",
      dateForFilter: "2025-06-09",
      time: "19:30-20:15",
      studio: "銀座（GNZ）",
      program: "BB2 House 4",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 55,
      date: "2025/06/08 (日)",
      dateForFilter: "2025-06-08",
      time: "17:30-18:15",
      studio: "銀座（GNZ）",
      program: "BSB House 1",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 56,
      date: "2025/06/07 (土)",
      dateForFilter: "2025-06-07",
      time: "12:30-13:15",
      studio: "吉祥寺（KCJ）",
      program: "BSL Deep 3",
      instructor: "Masa",
      ticket: "他店利用チケット"
    },
    {
      id: 57,
      date: "2025/06/06 (金)",
      dateForFilter: "2025-06-06",
      time: "21:15-22:15",
      studio: "川崎（KWS）",
      program: "L 24 FEEL 2",
      instructor: "Liz / Yoshifumi",
      ticket: "イベントチケット"
    },
    {
      id: 58,
      date: "2025/06/05 (木)",
      dateForFilter: "2025-06-05",
      time: "20:30-21:15",
      studio: "銀座（GNZ）",
      program: "BB3 House 1",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 59,
      date: "2025/06/03 (火)",
      dateForFilter: "2025-06-03",
      time: "20:30-21:15",
      studio: "銀座（GNZ）",
      program: "BB2 LDGG 2",
      instructor: "Mizuki",
      ticket: ""
    },
    {
      id: 60,
      date: "2025/06/02 (月)",
      dateForFilter: "2025-06-02",
      time: "20:30-21:15",
      studio: "銀座（GNZ）",
      program: "BB2 Soul 1",
      instructor: "Y.Yuri",
      ticket: ""
    }
  ];

  // 日付範囲でフィルタリングされたデータ
  const filteredData = attendanceData.filter((lesson) => {
    if (!dateRange.from || !dateRange.to) return true;
    
    const lessonDate = parseISO(lesson.dateForFilter);
    return isWithinInterval(lessonDate, {
      start: dateRange.from,
      end: dateRange.to
    });
  });

  // プログラムタイプを判定する関数
  const getProgramType = (program: string): string => {
    if (program.startsWith('BB1')) return 'BB1';
    if (program.startsWith('BB2')) return 'BB2';
    if (program.startsWith('BB3')) return 'BB3';
    if (program.startsWith('BSL')) return 'BSL';
    if (program.startsWith('BSB')) return 'BSB';
    if (program.startsWith('BSW') && !program.startsWith('BSWi')) return 'BSW';
    if (program.startsWith('BSWi')) return 'BSWi';
    if (program.startsWith('BSBi')) return 'BSBi';
    return 'BB2'; // デフォルト
  };

  // プログラムタイプ別のクラス名を取得
  const getProgramClass = (program: string): string => {
    const type = getProgramType(program);
    return `program-${type.toLowerCase()}`;
  };

  // チケットタイプ別のスタイルを取得
  const getTicketBadge = (ticket: string) => {
    if (!ticket) return null;
    
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    let className = "text-xs";
    
    if (ticket === "イベントチケット") {
      variant = "default";
      className = "text-xs bg-purple-100 text-purple-700";
    } else if (ticket === "他店利用チケット") {
      variant = "outline";
      className = "text-xs border-blue-300 text-blue-700";
    }
    
    return (
      <Badge variant={variant} className={className}>
        {ticket}
      </Badge>
    );
  };

  // 日付範囲の表示文字列を生成
  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) return "期間を選択";
    
    if (dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, "M/d", { locale: ja });
    }
    
    return `${format(dateRange.from, "M/d", { locale: ja })} - ${format(dateRange.to, "M/d", { locale: ja })}`;
  };

  // クイック選択ボタンの処理
  const setThisMonth = () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setDateRange({ from, to });
  };

  const setPast3Months = () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setDateRange({ from, to });
  };

  const setThisYear = () => {
    const today = new Date();
    const from = new Date(today.getFullYear(), 0, 1);
    const to = new Date(today.getFullYear(), 11, 31);
    
    setDateRange({ from, to });
  };

  return (
    <div className="px-4 py-4">
      <div className="mb-4">
        <h1 className="text-[14px] font-medium mb-1">受講実績</h1>
        <p className="text-[12px] text-muted-foreground">過去に受けたレッスンの履歴確認</p>
      </div>

      {/* 日付範囲選択 */}
      <div className="mb-4 space-y-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={1}
              locale={ja}
            />
          </PopoverContent>
        </Popover>

        {/* クイック選択ボタン */}
        <div className="flex gap-2 overflow-x-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={setThisMonth}
            className="whitespace-nowrap text-xs"
          >
            今月
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={setPast3Months}
            className="whitespace-nowrap text-xs"
          >
            過去3ヶ月
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={setThisYear}
            className="whitespace-nowrap text-xs"
          >
            今年
          </Button>
        </div>
      </div>

      {/* 件数表示 */}
      <div className="mb-3">
        <p className="text-[12px] text-muted-foreground">
          {filteredData.length}件のレッスン履歴
        </p>
      </div>

      {/* 受講履歴リスト */}
      <div className="space-y-3">
        {filteredData.length > 0 ? (
          filteredData.map((lesson) => (
            <Card key={lesson.id} className="border border-border bg-white">
              <CardContent className="pt-[12px] pr-[12px] pb-[12px] pl-[12px]">
                <div className="space-y-1.5">
                  {/* 1行目: 日付・時間・スタジオ */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium text-sm">
                      {lesson.date} {lesson.time}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {lesson.studio}
                    </span>
                  </div>

                  {/* 2行目: プログラム・インストラクター・チケット */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={`${getProgramClass(lesson.program)} text-sm font-medium px-2 py-1`}
                      >
                        {lesson.program}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {lesson.instructor}
                      </span>
                    </div>
                    {lesson.ticket && (
                      <div className="flex items-center">
                        {getTicketBadge(lesson.ticket)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border border-border bg-white">
            <CardContent className="pt-[24px] pr-[12px] pb-[24px] pl-[12px] text-center">
              <p className="text-[14px] text-muted-foreground">
                選択した期間にレッスン履歴がありません
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}