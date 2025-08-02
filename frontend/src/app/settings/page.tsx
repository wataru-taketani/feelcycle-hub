'use client';

import { useState, useEffect } from "react";
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
import StudioGrid from "@/components/shared/StudioGrid";
import { 
  getUserSettings, 
  saveUserSettings, 
  addFavoriteInstructor, 
  removeFavoriteInstructor,
  addFavoriteStudio,
  removeFavoriteStudio,
  updateNotificationSettings,
  updateProfileSettings,
  getUserFavoritesWithSync,
  addFavoriteInstructorWithSync,
  removeFavoriteInstructorWithSync,
  addFavoriteStudioWithSync,
  removeFavoriteStudioWithSync
} from '@/utils/userSettings';

export default function SettingsPage() {
  const { user, isAuthenticated, loading, apiUser } = useAuth();
  
  // Add error boundary for debugging
  const [pageError, setPageError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  
  // ユーザー設定の状態管理（サーバー同期対応）
  const [userSettings, setUserSettings] = useState(() => getUserSettings());
  
  // サーバーとの同期処理
  useEffect(() => {
    async function initializeSettings() {
      try {
        console.log('SettingsPage mounted', { isAuthenticated, loading, userId: apiUser?.userId });
        
        if (isAuthenticated && apiUser?.userId) {
          setSyncStatus('syncing');
          const syncedSettings = await getUserFavoritesWithSync(apiUser.userId);
          setUserSettings(syncedSettings);
          setSyncStatus('synced');
          console.log('✅ Settings synced with server');
        }
      } catch (error) {
        console.error('Settings sync error:', error);
        setSyncStatus('error');
        setPageError(error instanceof Error ? error.message : 'Settings sync failed');
      }
    }
    
    if (!loading && isAuthenticated) {
      initializeSettings();
    }
  }, [isAuthenticated, loading, apiUser?.userId]);
  const [displayName, setDisplayName] = useState(userSettings.profile.displayName || user?.displayName || "");
  const [favoriteInstructors, setFavoriteInstructors] = useState<string[]>(userSettings.favoriteInstructors);
  const [favoriteStudios, setFavoriteStudios] = useState<string[]>(userSettings.favoriteStudios);
  const [instructorSearch, setInstructorSearch] = useState("");
  const [favoriteTab, setFavoriteTab] = useState("studios");
  
  // 通知設定の状態管理
  const [notifications, setNotifications] = useState(userSettings.notifications);

  const handleSaveProfile = () => {
    // プロフィール保存
    updateProfileSettings({
      displayName,
      email: user?.email || '',
      homeStudio: userSettings.profile.homeStudio,
      membershipType: userSettings.profile.membershipType
    });
    console.log('Profile saved');
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    const updatedNotifications = {
      ...notifications,
      [key]: value
    };
    setNotifications(updatedNotifications);
    updateNotificationSettings(updatedNotifications);
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

  const handleAddFavorite = async (instructorId: string) => {
    setFavoriteInstructors(prev => [...prev, instructorId]);
    
    // サーバー統合版を使用（認証済みかつAPIユーザーが存在する場合）
    if (isAuthenticated && apiUser?.userId) {
      await addFavoriteInstructorWithSync(instructorId, apiUser.userId);
    } else {
      // フォールバック: ローカルのみ
      addFavoriteInstructor(instructorId);
    }
  };

  const handleRemoveFavorite = async (instructorId: string) => {
    setFavoriteInstructors(prev => prev.filter(id => id !== instructorId));
    
    // サーバー統合版を使用（認証済みかつAPIユーザーが存在する場合）
    if (isAuthenticated && apiUser?.userId) {
      await removeFavoriteInstructorWithSync(instructorId, apiUser.userId);
    } else {
      // フォールバック: ローカルのみ
      removeFavoriteInstructor(instructorId);
    }
  };

  // スタジオ関連のロジックは共通コンポーネントに移動

  // スタジオお気に入り変更ハンドラー（共通コンポーネント用）
  const handleStudioChange = async (studioId: string, selected: boolean) => {
    if (selected) {
      setFavoriteStudios(prev => [...prev, studioId]);
      
      // サーバー統合版を使用（認証済みかつAPIユーザーが存在する場合）
      if (isAuthenticated && apiUser?.userId) {
        await addFavoriteStudioWithSync(studioId, apiUser.userId);
      } else {
        // フォールバック: ローカルのみ
        addFavoriteStudio(studioId);
      }
    } else {
      setFavoriteStudios(prev => prev.filter(id => id !== studioId));
      
      // サーバー統合版を使用（認証済みかつAPIユーザーが存在する場合）
      if (isAuthenticated && apiUser?.userId) {
        await removeFavoriteStudioWithSync(studioId, apiUser.userId);
      } else {
        // フォールバック: ローカルのみ
        removeFavoriteStudio(studioId);
      }
    }
  };

  // Show error if page failed to mount
  if (pageError) {
    return (
      <div className="px-4 py-2">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          <h2 className="font-medium text-destructive mb-2">ページエラー</h2>
          <p className="text-sm text-muted-foreground">{pageError}</p>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-medium mb-1 text-[14px]">ユーザー設定</h1>
            <p className="text-muted-foreground text-[12px]">アカウント設定・通知設定・データ管理</p>
          </div>
          {/* 同期ステータス表示 */}
          {isAuthenticated && (
            <div className="flex items-center gap-1 text-[10px]">
              {syncStatus === 'syncing' && (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border border-primary border-t-transparent" />
                  <span className="text-muted-foreground">同期中...</span>
                </>
              )}
              {syncStatus === 'synced' && (
                <>
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-green-600">同期完了</span>
                </>
              )}
              {syncStatus === 'error' && (
                <>
                  <div className="h-2 w-2 bg-red-500 rounded-full" />
                  <span className="text-red-600">同期エラー</span>
                </>
              )}
              {syncStatus === 'idle' && (
                <>
                  <div className="h-2 w-2 bg-gray-400 rounded-full" />
                  <span className="text-muted-foreground">ローカル</span>
                </>
              )}
            </div>
          )}
        </div>
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
                <TabsTrigger 
                  value="studios" 
                  className="flex items-center gap-2 data-[state=active]:!bg-white data-[state=active]:!text-foreground"
                >
                  <MapPin className="w-3 h-3" />
                  スタジオ ({favoriteStudios.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="instructors" 
                  className="flex items-center gap-2 data-[state=active]:!bg-white data-[state=active]:!text-foreground"
                >
                  <User className="w-3 h-3" />
                  インストラクター ({favoriteInstructors.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="studios" className="space-y-4 mt-4">
                <StudioGrid
                  mode="favorites"
                  selectedStudios={favoriteStudios}
                  onStudioChange={handleStudioChange}
                  showAreaSelection={true}
                  showFavoriteIntegration={false}
                />
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