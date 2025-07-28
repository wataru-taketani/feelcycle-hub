import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { parseISO, isWithinInterval } from "date-fns";

export function Dashboard() {
  // 現在の日付情報を取得（統計計算用）
  const today = new Date();

  // ユーザーの会員種別設定（実際のアプリでは設定から取得）
  const membershipType = "マンスリー30";

  // 実際の受講データ（AttendanceHistoryと同じデータ）
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

  // 今月の受講実績統計を計算
  const calculateMonthlyStats = () => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // 今月のレッスンを抽出
    const thisMonthLessons = attendanceData.filter((lesson) => {
      const lessonDate = parseISO(lesson.dateForFilter);
      return isWithinInterval(lessonDate, {
        start: thisMonthStart,
        end: thisMonthEnd
      });
    });

    // 会員種別から基本回数を取得
    const basicLessonsMatch = membershipType.match(/マンスリー(\d+)/);
    const basicLessons = basicLessonsMatch ? parseInt(basicLessonsMatch[1]) : 30;

    // 総受講回数
    const totalLessons = thisMonthLessons.length;

    // 追加購入レッスン（基本回数にカウントしない）
    const additionalLessons = thisMonthLessons.filter((lesson) => 
      lesson.ticket === "イベントチケット" || lesson.ticket === "マンスリー1回券"
    ).length;

    // 基本プランでの受講回数（基本回数から差し引く）
    const basicPlanLessons = totalLessons - additionalLessons;

    // 残り回数
    const remainingLessons = Math.max(0, basicLessons - basicPlanLessons);

    // プログラム別統計
    const programStats = thisMonthLessons.reduce((acc, lesson) => {
      const programType = lesson.program.substring(0, 3); // BB2, BSL, BSB, etc.
      if (!acc[programType]) {
        acc[programType] = 0;
      }
      acc[programType]++;
      return acc;
    }, {} as Record<string, number>);

    // スタジオ別統計
    const studioStats = thisMonthLessons.reduce((acc, lesson) => {
      const studioName = lesson.studio.replace(/（.*）/, ''); // 括弧内を除去
      const studioCode = lesson.studio.match(/（(.*)）/)?.[1] || '';
      if (!acc[studioName]) {
        acc[studioName] = { count: 0, code: studioCode };
      }
      acc[studioName].count++;
      return acc;
    }, {} as Record<string, { count: number; code: string }>);

    return {
      totalLessons,
      basicLessons,
      basicPlanLessons,
      additionalLessons,
      remainingLessons,
      programStats,
      studioStats,
      thisMonthLessons
    };
  };

  const monthlyStats = calculateMonthlyStats();

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

  // プログラム統計を配列に変換
  const attendedPrograms = Object.entries(monthlyStats.programStats)
    .map(([name, count]) => ({
      name,
      count,
      color: programColors[name] || "rgb(128, 128, 128)"
    }))
    .sort((a, b) => b.count - a.count);

  // スタジオ統計を配列に変換
  const attendedStudios = Object.entries(monthlyStats.studioStats)
    .map(([name, data]) => ({
      name,
      code: data.code,
      count: data.count
    }))
    .sort((a, b) => b.count - a.count);

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
              {attendedPrograms.length > 0 ? (
                attendedPrograms.map((program, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: program.color }}
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
              {attendedStudios.length > 0 ? (
                attendedStudios.map((studio, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-foreground text-sm">{studio.name}({studio.code})</span>
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