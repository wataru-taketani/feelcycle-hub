'use client';

import { useState } from "react";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, User, Bell, Heart, X, MapPin } from "lucide-react";

export default function SettingsPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [favoriteInstructors, setFavoriteInstructors] = useState<string[]>(['a-airi', 'mizuki', 'k-miku', 'taiyo']);
  const [favoriteStudios, setFavoriteStudios] = useState<string[]>(['gnz', 'sby', 'sjk']);
  const [instructorSearch, setInstructorSearch] = useState("");
  const [studioSearch, setStudioSearch] = useState("");
  const [favoriteTab, setFavoriteTab] = useState("studios");
  
  // 通知設定の状態管理
  const [notifications, setNotifications] = useState({
    cancelWaiting: true,
    autoBooking: true,
    lessonReminder: false,
  });

  const handleSaveProfile = () => {
    // プロフィール保存の処理をここに実装
    console.log('Profile saved');
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 実際のインストラクターデータ（簡略版）
  const instructors = [
    { id: 'a-airi', name: 'A.Airi' }, { id: 'a-honoka', name: 'A.Honoka' }, { id: 'a-mako', name: 'A.Mako' },
    { id: 'a-riko', name: 'A.Riko' }, { id: 'a-yuto', name: 'A.Yuto' }, { id: 'ai', name: 'Ai' },
    { id: 'aini', name: 'Aini' }, { id: 'airi-f', name: 'Airi.F' }, { id: 'akane', name: 'Akane' },
    { id: 'akito', name: 'Akito' }, { id: 'ami', name: 'Ami' }, { id: 'aoi', name: 'Aoi' },
    { id: 'mizuki', name: 'Mizuki' }, { id: 'k-miku', name: 'K.Miku' }, { id: 'taiyo', name: 'Taiyo' },
    { id: 'yuriko', name: 'Yuriko' }, { id: 'masaki', name: 'Masaki' }, { id: 'rui', name: 'Rui' },
    { id: 'yosui', name: 'Yosui' }, { id: 't-mai', name: 'T.Mai' }, { id: 'y-yuri', name: 'Y.Yuri' }
  ];

  // インストラクター検索フィルター
  const filteredInstructors = instructors.filter(instructor =>
    instructor.name.toLowerCase().includes(instructorSearch.toLowerCase()) &&
    !favoriteInstructors.includes(instructor.id)
  );

  const handleAddFavorite = (instructorId: string) => {
    setFavoriteInstructors(prev => [...prev, instructorId]);
  };

  const handleRemoveFavorite = (instructorId: string) => {
    setFavoriteInstructors(prev => prev.filter(id => id !== instructorId));
  };

  // 実際のスタジオデータ（簡略版）
  const eastAreaStudios = [
    { id: 'gnz', name: '銀座', code: 'GNZ' },
    { id: 'sby', name: '渋谷', code: 'SBY' },
    { id: 'sjk', name: '新宿', code: 'SJK' },
    { id: 'ikb', name: '池袋', code: 'IKB' },
    { id: 'kcj', name: '吉祥寺', code: 'KCJ' },
    { id: 'kws', name: '川崎', code: 'KWS' },
    { id: 'ykh', name: '横浜', code: 'YKH' }
  ];

  const westAreaStudios = [
    { id: 'ngy', name: '名古屋', code: 'NGY' },
    { id: 'ssb', name: '心斎橋', code: 'SSB' },
    { id: 'smy', name: '三ノ宮', code: 'SMY' }
  ];

  const southAreaStudios = [
    { id: 'ftj', name: '福岡天神', code: 'FTJ' },
    { id: 'spr', name: '札幌', code: 'SPR' }
  ];

  const allStudios = [...eastAreaStudios, ...westAreaStudios, ...southAreaStudios];

  // スタジオ検索フィルター
  const filteredStudios = allStudios.filter(studio =>
    (studio.name.toLowerCase().includes(studioSearch.toLowerCase()) ||
     studio.code.toLowerCase().includes(studioSearch.toLowerCase())) &&
    !favoriteStudios.includes(studio.id)
  );

  const handleAddFavoriteStudio = (studioId: string) => {
    setFavoriteStudios(prev => [...prev, studioId]);
  };

  const handleRemoveFavoriteStudio = (studioId: string) => {
    setFavoriteStudios(prev => prev.filter(id => id !== studioId));
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
    <div className="px-4 py-2">
      <div className="mb-2">
        <h1 className="font-medium mb-1 text-[14px]">ユーザー設定</h1>
        <p className="text-muted-foreground text-[12px]">アカウント設定・通知設定・データ管理</p>
      </div>

      <div className="space-y-4">
        {/* プロフィール設定 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" />
              アカウント設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block mb-1.5 text-sm font-medium">表示名</label>
              <Input 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium">メールアドレス</label>
              <Input defaultValue="example@example.com" disabled />
              <p className="text-xs text-muted-foreground mt-1">
                LINEアカウントに紐づいたメールアドレスです
              </p>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium">所属店舗</label>
              <Input defaultValue="銀座（GNZ）" disabled />
              <p className="text-xs text-muted-foreground mt-1">
                FEELCYCLEサイトから自動取得されます
              </p>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium">会員種別</label>
              <Input defaultValue="マンスリー30" disabled />
              <p className="text-xs text-muted-foreground mt-1">
                FEELCYCLEサイトから自動取得されます
              </p>
            </div>
            <Button className="w-full h-11" onClick={handleSaveProfile}>
              プロフィールを保存
            </Button>
          </CardContent>
        </Card>

        {/* お気に入り設定 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="w-4 h-4" />
              お気に入り
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={favoriteTab} onValueChange={setFavoriteTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="studios" className="flex items-center gap-2">
                  <MapPin className="w-3 h-3" />
                  スタジオ ({favoriteStudios.length})
                </TabsTrigger>
                <TabsTrigger value="instructors" className="flex items-center gap-2">
                  <User className="w-3 h-3" />
                  インストラクター ({favoriteInstructors.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="studios" className="space-y-4 mt-4">
                {/* 現在のお気に入りスタジオ */}
                {favoriteStudios.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">現在のお気に入り ({favoriteStudios.length}店舗)</h4>
                    <div className="flex flex-wrap gap-2">
                      {favoriteStudios.map((studioId) => {
                        const studio = allStudios.find(s => s.id === studioId);
                        return (
                          <Badge
                            key={studioId}
                            variant="secondary"
                            className="flex items-center gap-1 h-8 px-3"
                          >
                            {studio?.name || studioId}({studio?.code || ''})
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleRemoveFavoriteStudio(studioId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {favoriteStudios.length > 0 && <Separator />}

                {/* スタジオ検索 */}
                <div>
                  <Input
                    placeholder="スタジオ名またはコードで検索..."
                    value={studioSearch}
                    onChange={(e) => setStudioSearch(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* スタジオ追加 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">スタジオを追加</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-2 gap-2 p-1">
                      {filteredStudios.map((studio) => (
                        <Button
                          key={studio.id}
                          variant="outline"
                          className="h-8 p-2 text-xs font-normal justify-center hover:bg-accent transition-colors"
                          onClick={() => handleAddFavoriteStudio(studio.id)}
                        >
                          {studio.name}
                        </Button>
                      ))}
                      {filteredStudios.length === 0 && (
                        <div className="col-span-2 text-center py-4 text-sm text-muted-foreground">
                          {studioSearch ? '該当するスタジオが見つかりません' : 'すべてのスタジオが既にお気に入りに追加されています'}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>

              <TabsContent value="instructors" className="space-y-4 mt-4">
                {/* 現在のお気に入りインストラクター */}
                {favoriteInstructors.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">現在のお気に入り ({favoriteInstructors.length}名)</h4>
                    <div className="flex flex-wrap gap-2">
                      {favoriteInstructors.map((instructorId) => {
                        const instructor = instructors.find(i => i.id === instructorId);
                        return (
                          <Badge
                            key={instructorId}
                            variant="secondary"
                            className="flex items-center gap-1 h-8 px-3"
                          >
                            {instructor?.name || instructorId}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleRemoveFavorite(instructorId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {favoriteInstructors.length > 0 && <Separator />}

                {/* インストラクター検索 */}
                <div>
                  <Input
                    placeholder="インストラクター名で検索..."
                    value={instructorSearch}
                    onChange={(e) => setInstructorSearch(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* インストラクター追加 */}
                <div>
                  <h4 className="text-sm font-medium mb-2">インストラクターを追加</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="grid grid-cols-2 gap-2 p-1">
                      {filteredInstructors.map((instructor) => (
                        <Button
                          key={instructor.id}
                          variant="outline"
                          className="h-8 p-2 text-xs font-normal justify-center hover:bg-accent transition-colors"
                          onClick={() => handleAddFavorite(instructor.id)}
                        >
                          {instructor.name}
                        </Button>
                      ))}
                      {filteredInstructors.length === 0 && (
                        <div className="col-span-2 text-center py-4 text-sm text-muted-foreground">
                          {instructorSearch ? '該当するインストラクターが見つかりません' : 'すべてのインストラクターが既にお気に入りに追加されています'}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 通知設定 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="w-4 h-4" />
              通知設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-3">
                <h4 className="font-medium text-sm">キャンセル待ち通知</h4>
                <p className="text-xs text-muted-foreground">
                  キャンセル待ちで予約が取れた時に通知します
                </p>
              </div>
              <Switch 
                checked={notifications.cancelWaiting}
                onCheckedChange={(checked) => handleNotificationChange('cancelWaiting', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-3">
                <h4 className="font-medium text-sm">自動予約結果通知</h4>
                <p className="text-xs text-muted-foreground">
                  自動予約の結果を通知します
                </p>
              </div>
              <Switch 
                checked={notifications.autoBooking}
                onCheckedChange={(checked) => handleNotificationChange('autoBooking', checked)}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-3">
                <h4 className="font-medium text-sm">レッスン開始前通知</h4>
                <p className="text-xs text-muted-foreground">
                  レッスン開始30分前に通知します
                </p>
              </div>
              <Switch 
                checked={notifications.lessonReminder}
                onCheckedChange={(checked) => handleNotificationChange('lessonReminder', checked)}
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}