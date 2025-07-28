import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Separator } from "./ui/separator";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Settings, User, Bell, Calendar as CalendarIcon, Heart, X, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner@2.0.3";

export function UserSettings() {
  const [firstLessonDate, setFirstLessonDate] = useState<Date | undefined>();
  const [displayName, setDisplayName] = useState("山田太郎");
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
    toast.success("プロフィールを保存しました");
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 実際のインストラクターデータ（LessonSearchと同じ）
  const instructors = [
    { id: 'a-airi', name: 'A.Airi' }, { id: 'a-honoka', name: 'A.Honoka' }, { id: 'a-mako', name: 'A.Mako' },
    { id: 'a-riko', name: 'A.Riko' }, { id: 'a-yuto', name: 'A.Yuto' }, { id: 'ai', name: 'Ai' },
    { id: 'aini', name: 'Aini' }, { id: 'airi-f', name: 'Airi.F' }, { id: 'akane', name: 'Akane' },
    { id: 'akito', name: 'Akito' }, { id: 'ami', name: 'Ami' }, { id: 'aoi', name: 'Aoi' },
    { id: 'aru', name: 'Aru' }, { id: 'asami', name: 'Asami' }, { id: 'asuka', name: 'Asuka' },
    { id: 'ayaka-s', name: 'Ayaka.S' }, { id: 'ayame', name: 'Ayame' }, { id: 'ayana', name: 'Ayana' },
    { id: 'ayane', name: 'Ayane' }, { id: 'ayumu', name: 'Ayumu' }, { id: 'azusa', name: 'Azusa' },
    { id: 'chiharu', name: 'Chiharu' }, { id: 'chiho', name: 'Chiho' }, { id: 'chika', name: 'Chika' },
    { id: 'chisaki', name: 'Chisaki' }, { id: 'daichi', name: 'Daichi' }, { id: 'daisuke', name: 'Daisuke' },
    { id: 'e-ruka', name: 'E.Ruka' }, { id: 'eiichi', name: 'Eiichi' }, { id: 'elly', name: 'Elly' },
    { id: 'erina', name: 'Erina' }, { id: 'f-ayaka', name: 'F.Ayaka' }, { id: 'f-hinako', name: 'F.Hinako' },
    { id: 'f-sakura', name: 'F.Sakura' }, { id: 'f-saya', name: 'F.Saya' }, { id: 'f-yuko', name: 'F.Yuko' },
    { id: 'fuka', name: 'Fuka' }, { id: 'fumi', name: 'Fumi' }, { id: 'g-ryoma', name: 'G.Ryoma' },
    { id: 'h-ibuki', name: 'H.Ibuki' }, { id: 'h-ikumi', name: 'H.Ikumi' }, { id: 'h-nao', name: 'H.Nao' },
    { id: 'h-rena', name: 'H.Rena' }, { id: 'haruhi', name: 'Haruhi' }, { id: 'haruka', name: 'Haruka' },
    { id: 'haruna', name: 'Haruna' }, { id: 'hikaru', name: 'Hikaru' }, { id: 'himari', name: 'Himari' },
    { id: 'hinako', name: 'Hinako' }, { id: 'hiro', name: 'Hiro' }, { id: 'hiroki', name: 'Hiroki' },
    { id: 'hiroko', name: 'Hiroko' }, { id: 'hiromu', name: 'Hiromu' }, { id: 'hitomi', name: 'Hitomi' },
    { id: 'i-misaki', name: 'I.Misaki' }, { id: 'i-shiori', name: 'I.Shiori' }, { id: 'izu', name: 'IZU' },
    { id: 'ibuki', name: 'Ibuki' }, { id: 'igor', name: 'Igor' }, { id: 'jigen', name: 'Jigen' },
    { id: 'joanna', name: 'Joanna' }, { id: 'junna', name: 'Junna' }, { id: 'k-haruka', name: 'K.Haruka' },
    { id: 'k-miho', name: 'K.Miho' }, { id: 'k-miku', name: 'K.Miku' }, { id: 'k-miyuu', name: 'K.Miyuu' },
    { id: 'k-naoki', name: 'K.Naoki' }, { id: 'k-riho', name: 'K.Riho' }, { id: 'k-rina', name: 'K.Rina' },
    { id: 'k-risa', name: 'K.Risa' }, { id: 'k-saki', name: 'K.Saki' }, { id: 'k-shiori', name: 'K.Shiori' },
    { id: 'k-yuki', name: 'K.Yuki' }, { id: 'kaede', name: 'Kaede' }, { id: 'kako', name: 'Kako' },
    { id: 'kanon', name: 'Kanon' }, { id: 'kaori', name: 'Kaori' }, { id: 'kaori-n', name: 'Kaori.N' },
    { id: 'kaori-s', name: 'Kaori.S' }, { id: 'karin', name: 'Karin' }, { id: 'kasumi', name: 'Kasumi' },
    { id: 'kazuha', name: 'Kazuha' }, { id: 'kazuhiro', name: 'Kazuhiro' }, { id: 'kentaro', name: 'Kentaro' },
    { id: 'kiko', name: 'Kiko' }, { id: 'kirika', name: 'Kirika' }, { id: 'kita-yuki', name: 'Kita.Yuki' },
    { id: 'koki', name: 'Koki' }, { id: 'koyuki', name: 'Koyuki' }, { id: 'kurara', name: 'Kurara' },
    { id: 'kyoko', name: 'Kyoko' }, { id: 'liz', name: 'Liz' }, { id: 'm-kaho', name: 'M.Kaho' },
    { id: 'm-mami', name: 'M.Mami' }, { id: 'm-megumi', name: 'M.Megumi' }, { id: 'm-minami', name: 'M.Minami' },
    { id: 'm-mizuki', name: 'M.Mizuki' }, { id: 'm-natsuki', name: 'M.Natsuki' }, { id: 'm-ryo', name: 'M.Ryo' },
    { id: 'm-yuka', name: 'M.Yuka' }, { id: 'maaya', name: 'Maaya' }, { id: 'machi', name: 'Machi' },
    { id: 'mae', name: 'Mae' }, { id: 'maho', name: 'Maho' }, { id: 'mako', name: 'Mako' },
    { id: 'makoto', name: 'Makoto' }, { id: 'manaki', name: 'Manaki' }, { id: 'masa', name: 'Masa' },
    { id: 'masaki', name: 'Masaki' }, { id: 'masaya', name: 'Masaya' }, { id: 'meg', name: 'Meg' },
    { id: 'megu', name: 'Megu' }, { id: 'megumi', name: 'Megumi' }, { id: 'mei', name: 'Mei' },
    { id: 'miho', name: 'Miho' }, { id: 'mika', name: 'Mika' }, { id: 'miko', name: 'Miko' },
    { id: 'miku-i', name: 'Miku.I' }, { id: 'mina', name: 'Mina' }, { id: 'mirai', name: 'Mirai' },
    { id: 'mitsuki', name: 'Mitsuki' }, { id: 'miu', name: 'Miu' }, { id: 'mizuki', name: 'Mizuki' },
    { id: 'moeka', name: 'Moeka' }, { id: 'moeto', name: 'Moeto' }, { id: 'momoko', name: 'Momoko' },
    { id: 'n-ai', name: 'N.Ai' }, { id: 'n-kanna', name: 'N.Kanna' }, { id: 'n-mika', name: 'N.Mika' },
    { id: 'n-sakura', name: 'N.Sakura' }, { id: 'n-sena', name: 'N.Sena' }, { id: 'nagisa', name: 'Nagisa' },
    { id: 'nahki', name: 'Nahki' }, { id: 'nana', name: 'Nana' }, { id: 'nana-y', name: 'Nana.Y' },
    { id: 'nao', name: 'Nao' }, { id: 'narumi', name: 'Narumi' }, { id: 'natsumi', name: 'Natsumi' },
    { id: 'noa', name: 'Noa' }, { id: 'o-airi', name: 'O.Airi' }, { id: 'o-hiroyuki', name: 'O.Hiroyuki' },
    { id: 'o-manami', name: 'O.Manami' }, { id: 'o-miyu', name: 'O.Miyu' }, { id: 'o-motoki', name: 'O.Motoki' },
    { id: 'osamu', name: 'Osamu' }, { id: 'r-hikaru', name: 'R.Hikaru' }, { id: 'reika', name: 'Reika' },
    { id: 'reiko', name: 'Reiko' }, { id: 'reina', name: 'Reina' }, { id: 'ren', name: 'Ren' },
    { id: 'riko', name: 'Riko' }, { id: 'rin', name: 'Rin' }, { id: 'rina', name: 'Rina' },
    { id: 'rio', name: 'Rio' }, { id: 'risa', name: 'Risa' }, { id: 'rui', name: 'Rui' },
    { id: 'runa', name: 'Runa' }, { id: 'ryo', name: 'Ryo' }, { id: 'ryuga', name: 'Ryuga' },
    { id: 'ryuhei', name: 'Ryuhei' }, { id: 'ryuhi', name: 'Ryuhi' }, { id: 'ryutaro', name: 'Ryutaro' },
    { id: 's-akane', name: 'S.Akane' }, { id: 's-atsushi', name: 'S.Atsushi' }, { id: 's-ayaka', name: 'S.Ayaka' },
    { id: 's-ayumi', name: 'S.Ayumi' }, { id: 's-hinako', name: 'S.Hinako' }, { id: 's-kaori', name: 'S.Kaori' },
    { id: 's-koyuki', name: 'S.Koyuki' }, { id: 's-manaka', name: 'S.Manaka' }, { id: 's-natsumi', name: 'S.Natsumi' },
    { id: 's-risa', name: 'S.Risa' }, { id: 's-takeshi', name: 'S.Takeshi' }, { id: 's-yui', name: 'S.Yui' },
    { id: 's-yurina', name: 'S.Yurina' }, { id: 'sachi', name: 'Sachi' }, { id: 'sachika', name: 'Sachika' },
    { id: 'sadao', name: 'Sadao' }, { id: 'sae', name: 'Sae' }, { id: 'sakurako', name: 'Sakurako' },
    { id: 'satomi', name: 'Satomi' }, { id: 'sawako', name: 'Sawako' }, { id: 'sayo', name: 'Sayo' },
    { id: 'seiji', name: 'Seiji' }, { id: 'senna', name: 'Senna' }, { id: 'shige', name: 'Shige' },
    { id: 'shiho', name: 'Shiho' }, { id: 'shiori-i', name: 'Shiori.I' }, { id: 'shoka', name: 'Shoka' },
    { id: 'shunsuke', name: 'Shunsuke' }, { id: 'shunta', name: 'Shunta' }, { id: 'soma', name: 'Soma' },
    { id: 'sota', name: 'Sota' }, { id: 'sumiki', name: 'Sumiki' }, { id: 'suzu', name: 'Suzu' },
    { id: 't-ai', name: 'T.Ai' }, { id: 't-haruka', name: 'T.Haruka' }, { id: 't-harumi', name: 'T.Harumi' },
    { id: 't-kazuya', name: 'T.Kazuya' }, { id: 't-mai', name: 'T.Mai' }, { id: 't-misaki', name: 'T.Misaki' },
    { id: 't-mizuki', name: 'T.Mizuki' }, { id: 't-natsumi', name: 'T.Natsumi' }, { id: 't-sakura', name: 'T.Sakura' },
    { id: 't-taiga', name: 'T.Taiga' }, { id: 't-yui', name: 'T.Yui' }, { id: 't-yurina', name: 'T.Yurina' },
    { id: 'taiyo', name: 'Taiyo' }, { id: 'tamaki', name: 'Tamaki' }, { id: 'toshiaki', name: 'Toshiaki' },
    { id: 'tsubasa', name: 'Tsubasa' }, { id: 'tsukasa', name: 'Tsukasa' }, { id: 'u-tatsuya', name: 'U.Tatsuya' },
    { id: 'u-yuto', name: 'U.Yuto' }, { id: 'w-miki', name: 'W.Miki' }, { id: 'wataru', name: 'Wataru' },
    { id: 'y-arisa', name: 'Y.Arisa' }, { id: 'y-daiki', name: 'Y.Daiki' }, { id: 'y-nozomi', name: 'Y.Nozomi' },
    { id: 'y-yuri', name: 'Y.Yuri' }, { id: 'yae', name: 'Yae' }, { id: 'yoshifumi', name: 'Yoshifumi' },
    { id: 'yosui', name: 'Yosui' }, { id: 'yuco', name: 'Yuco' }, { id: 'yudai', name: 'Yudai' },
    { id: 'yui', name: 'Yui' }, { id: 'yui-o', name: 'Yui.O' }, { id: 'yukako', name: 'Yukako' },
    { id: 'yuko', name: 'Yuko' }, { id: 'yumi', name: 'Yumi' }, { id: 'yuriko', name: 'Yuriko' },
    { id: 'yusei', name: 'Yusei' }, { id: 'yusuke', name: 'Yusuke' }, { id: 'yuta', name: 'Yuta' },
    { id: 'yuyuri', name: 'Yuyuri' }
  ];

  // インストラクター検索フィルター
  const filteredInstructors = instructors.filter(instructor =>
    instructor.name.toLowerCase().includes(instructorSearch.toLowerCase()) &&
    !favoriteInstructors.includes(instructor.id)
  );

  const handleAddFavorite = (instructorId: string) => {
    setFavoriteInstructors(prev => [...prev, instructorId]);
    toast.success("お気に入りに追加しました");
  };

  const handleRemoveFavorite = (instructorId: string) => {
    setFavoriteInstructors(prev => prev.filter(id => id !== instructorId));
    toast.success("お気に入りから削除しました");
  };

  const getFavoriteInstructorName = (id: string) => {
    return instructors.find(instructor => instructor.id === id)?.name || id;
  };

  // 実際のスタジオデータ（LessonSearchと同じ）
  const eastAreaStudios = [
    { id: 'gkbs', name: '銀座京橋', code: 'GKBS' },
    { id: 'gnz', name: '銀座', code: 'GNZ' },
    { id: 'gtd', name: '五反田', code: 'GTD' },
    { id: 'ikb', name: '池袋', code: 'IKB' },
    { id: 'jyo', name: '自由が丘', code: 'JYO' },
    { id: 'kcj', name: '吉祥寺', code: 'KCJ' },
    { id: 'nmg', name: '中目黒', code: 'NMG' },
    { id: 'mcd', name: '町田', code: 'MCD' },
    { id: 'tck', name: '立川', code: 'TCK' },
    { id: 'sby', name: '渋谷', code: 'SBY' },
    { id: 'sdm', name: '汐留', code: 'SDM' },
    { id: 'sjk', name: '新宿', code: 'SJK' },
    { id: 'tmc', name: '多摩センター', code: 'TMC' },
    { id: 'uen', name: '上野', code: 'UEN' },
    { id: 'azn', name: 'あざみ野', code: 'AZN' },
    { id: 'kok', name: '上大岡', code: 'KOK' },
    { id: 'kws', name: '川崎', code: 'KWS' },
    { id: 'mkg', name: '武蔵小杉', code: 'MKG' },
    { id: 'ykh', name: '横浜', code: 'YKH' },
    { id: 'ysc', name: '横須賀中央', code: 'YSC' },
    { id: 'ksg', name: '越谷', code: 'KSG' },
    { id: 'omy', name: '大宮', code: 'OMY' },
    { id: 'fnb', name: '船橋', code: 'FNB' },
    { id: 'khm', name: '海浜幕張', code: 'KHM' },
    { id: 'ksw', name: '柏', code: 'KSW' }
  ];

  const northAreaStudios = [
    { id: 'spr', name: '札幌', code: 'SPR' }
  ];

  const westAreaStudios = [
    { id: 'ngy', name: '名古屋', code: 'NGY' },
    { id: 'ske', name: '栄', code: 'SKE' },
    { id: 'gif', name: '岐阜', code: 'GIF' },
    { id: 'okbs', name: '大阪京橋', code: 'OKBS' },
    { id: 'ssb', name: '心斎橋', code: 'SSB' },
    { id: 'umdc', name: '梅田茶屋町', code: 'UMDC' },
    { id: 'ktk', name: '京都河原町', code: 'KTK' },
    { id: 'smy', name: '三ノ宮', code: 'SMY' }
  ];

  const southAreaStudios = [
    { id: 'hsm', name: '広島', code: 'HSM' },
    { id: 'tkm', name: '高松', code: 'TKM' },
    { id: 'ftj', name: '福岡天神', code: 'FTJ' }
  ];

  const allStudios = [...eastAreaStudios, ...northAreaStudios, ...westAreaStudios, ...southAreaStudios];

  // スタジオ検索フィルター
  const filteredStudios = allStudios.filter(studio =>
    (studio.name.toLowerCase().includes(studioSearch.toLowerCase()) ||
     studio.code.toLowerCase().includes(studioSearch.toLowerCase())) &&
    !favoriteStudios.includes(studio.id)
  );

  const handleAddFavoriteStudio = (studioId: string) => {
    setFavoriteStudios(prev => [...prev, studioId]);
    toast.success("お気に入りに追加しました");
  };

  const handleRemoveFavoriteStudio = (studioId: string) => {
    setFavoriteStudios(prev => prev.filter(id => id !== studioId));
    toast.success("お気に入りから削除しました");
  };

  const getFavoriteStudioName = (id: string) => {
    const studio = allStudios.find(studio => studio.id === id);
    return studio ? `${studio.name}(${studio.code})` : id;
  };

  return (
    <div className="px-4 py-4">
      <div className="mb-4">
        <h1 className="text-[14px] font-medium mb-1">ユーザー設定</h1>
        <p className="text-[12px] text-muted-foreground">アカウント設定・通知設定</p>
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
              <Input defaultValue="yamada@example.com" disabled />
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
            <div>
              <label className="block mb-1.5 text-sm font-medium">初回レッスン（任意）</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {firstLessonDate 
                      ? format(firstLessonDate, "yyyy年MM月dd日", { locale: ja }) 
                      : "日付を選択してください"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={firstLessonDate}
                    onSelect={setFirstLessonDate}
                    initialFocus
                    locale={ja}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground mt-1">
                初回レッスン日を登録すると受講実績の取得が可能になります
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
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4 p-1">
                      {/* 関東エリア */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">EAST AREA │ 関東</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {eastAreaStudios.filter(studio => 
                            !favoriteStudios.includes(studio.id) && 
                            (studio.name.toLowerCase().includes(studioSearch.toLowerCase()) || 
                             studio.code.toLowerCase().includes(studioSearch.toLowerCase()))
                          ).map((studio) => (
                            <Button
                              key={studio.id}
                              variant="outline"
                              className="h-8 p-2 text-xs font-normal justify-center hover:bg-accent transition-colors"
                              onClick={() => handleAddFavoriteStudio(studio.id)}
                            >
                              {studio.name}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* 北海道エリア */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">NORTH AREA │ 北海道</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {northAreaStudios.filter(studio => 
                            !favoriteStudios.includes(studio.id) && 
                            (studio.name.toLowerCase().includes(studioSearch.toLowerCase()) || 
                             studio.code.toLowerCase().includes(studioSearch.toLowerCase()))
                          ).map((studio) => (
                            <Button
                              key={studio.id}
                              variant="outline"
                              className="h-8 p-2 text-xs font-normal justify-center hover:bg-accent transition-colors"
                              onClick={() => handleAddFavoriteStudio(studio.id)}
                            >
                              {studio.name}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* 東海・関西エリア */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">WEST AREA │ 東海・関西</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {westAreaStudios.filter(studio => 
                            !favoriteStudios.includes(studio.id) && 
                            (studio.name.toLowerCase().includes(studioSearch.toLowerCase()) || 
                             studio.code.toLowerCase().includes(studioSearch.toLowerCase()))
                          ).map((studio) => (
                            <Button
                              key={studio.id}
                              variant="outline"
                              className="h-8 p-2 text-xs font-normal justify-center hover:bg-accent transition-colors"
                              onClick={() => handleAddFavoriteStudio(studio.id)}
                            >
                              {studio.name}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* 中国・四国・九州エリア */}
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">SOUTH AREA │ 中国・四国・九州</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {southAreaStudios.filter(studio => 
                            !favoriteStudios.includes(studio.id) && 
                            (studio.name.toLowerCase().includes(studioSearch.toLowerCase()) || 
                             studio.code.toLowerCase().includes(studioSearch.toLowerCase()))
                          ).map((studio) => (
                            <Button
                              key={studio.id}
                              variant="outline"
                              className="h-8 p-2 text-xs font-normal justify-center hover:bg-accent transition-colors"
                              onClick={() => handleAddFavoriteStudio(studio.id)}
                            >
                              {studio.name}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* 該当なしメッセージ */}
                      {[...eastAreaStudios, ...northAreaStudios, ...westAreaStudios, ...southAreaStudios]
                        .filter(studio => 
                          !favoriteStudios.includes(studio.id) && 
                          (studio.name.toLowerCase().includes(studioSearch.toLowerCase()) || 
                           studio.code.toLowerCase().includes(studioSearch.toLowerCase()))
                        ).length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground">
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
                  <ScrollArea className="h-[300px]">
                    <div className="grid grid-cols-3 gap-2 p-1">
                      {filteredInstructors.filter(instructor => !favoriteInstructors.includes(instructor.id)).map((instructor) => (
                        <Button
                          key={instructor.id}
                          variant="outline"
                          className="h-8 p-2 text-xs font-normal justify-center hover:bg-accent transition-colors"
                          onClick={() => handleAddFavorite(instructor.id)}
                        >
                          {instructor.name}
                        </Button>
                      ))}
                      {filteredInstructors.filter(instructor => !favoriteInstructors.includes(instructor.id)).length === 0 && (
                        <div className="col-span-3 text-center py-8 text-sm text-muted-foreground">
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