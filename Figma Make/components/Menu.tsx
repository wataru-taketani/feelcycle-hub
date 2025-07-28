import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { 
  Clock, 
  Zap, 
  Search, 
  BarChart3, 
  Settings,
  ChevronRight
} from "lucide-react";

const menuItems = [
  {
    title: "キャンセル待ち",
    description: "人気レッスンのキャンセル待ち登録・管理",
    icon: Clock,
    page: "cancel-waiting",
    color: "text-blue-600"
  },
  {
    title: "自動予約",
    description: "条件に基づいた自動レッスン予約設定",
    icon: Zap,
    page: "auto-booking",
    color: "text-green-600"
  },
  {
    title: "レッスン検索",
    description: "詳細条件でレッスンを検索・比較",
    icon: Search,
    page: "lesson-search",
    color: "text-purple-600"
  },
  {
    title: "受講実績",
    description: "過去の受講履歴・統計データ確認",
    icon: BarChart3,
    page: "attendance-history",
    color: "text-orange-600"
  },
  {
    title: "ユーザー設定",
    description: "アカウント設定・通知設定・データ管理",
    icon: Settings,
    page: "user-settings",
    color: "text-gray-600"
  }
];

interface MenuProps {
  onNavigate: (page: string) => void;
}

export function Menu({ onNavigate }: MenuProps) {
  return (
    <section className="py-4 px-4 bg-muted/30">
      <div className="mb-4">
        <h2 className="text-[14px] font-medium mb-1">メニュー</h2>
        <p className="text-[12px] text-muted-foreground">各機能にアクセスできます</p>
      </div>

      <div className="space-y-3">
        {menuItems.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onNavigate(item.page)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-muted rounded-lg">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors ml-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}