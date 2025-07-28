import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Search, Calendar, MapPin, User, ChevronDown, ChevronRight, Heart, X, BookmarkPlus, List } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

interface LessonSearchProps {
  onNavigate?: (page: string) => void;
}

export function LessonSearch({ onNavigate }: LessonSearchProps) {
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedStudios, setSelectedStudios] = useState<string[]>([]);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isInstructorOpen, setIsInstructorOpen] = useState(false);
  const [instructorSearch, setInstructorSearch] = useState("");
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [interestedLessons, setInterestedLessons] = useState<string[]>([]);
  const [showInterestedList, setShowInterestedList] = useState(false);
  
  // サンプルお気に入りリスト（本来はUserSettingsから取得）
  const favoriteInstructors = ['a-airi', 'mizuki', 'k-miku', 'taiyo'];
  const favoriteStudios = ['gnz', 'sby', 'sjk'];
  
  // 実際のスタジオデータ
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

  // 実際のインストラクターデータ
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
    { id: 't-mizuki', name: 'T.Mizuki' }, { id: 't-natsuki', name: 'T.Natsumi' }, { id: 't-sakura', name: 'T.Sakura' },
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

  // サンプル検索結果データ（更新された実際のスタジオとインストラクターを使用）
  const searchResults = [
    // 7/25 (金)
    {
      id: 1,
      date: "7/25",
      day: "金",
      time: "07:30 - 08:15",
      program: "BB1",
      name: "MORNING",
      instructor: "A.Airi",
      studio: "銀座",
      studioCode: "GNZ",
      difficulty: "初心者",
      capacity: "20人",
      available: true,
      status: "available",
      reservationNumber: ""
    },
    {
      id: 2,
      date: "7/25",
      day: "金",
      time: "12:30 - 13:15",
      program: "BB2",
      name: "House 2",
      instructor: "Mizuki",
      studio: "銀座",
      studioCode: "GNZ",
      difficulty: "中級者",
      capacity: "20人",
      available: false,
      status: "reserved",
      reservationNumber: "#24"
    },
    {
      id: 3,
      date: "7/25",
      day: "金",
      time: "19:30 - 20:15",
      program: "BSL",
      name: "NIGHT",
      instructor: "Akane",
      studio: "表参道",
      studioCode: "OTD",
      difficulty: "上級者",
      capacity: "18人",
      available: false,
      status: "full",
      reservationNumber: ""
    },
    
    // 7/26 (土)
    {
      id: 4,
      date: "7/26",
      day: "土",
      time: "10:00 - 10:45",
      program: "BB1",
      name: "10s 2",
      instructor: "Rui",
      studio: "銀座",
      studioCode: "GNZ",
      difficulty: "初心者",
      capacity: "20人",
      available: true,
      status: "available",
      reservationNumber: ""
    },
    {
      id: 5,
      date: "7/26",
      day: "土",
      time: "12:30 - 13:15",
      program: "BB2",
      name: "House 4",
      instructor: "Mizuki",
      studio: "川崎",
      studioCode: "KWS",
      difficulty: "中級者",
      capacity: "22人",
      available: true,
      status: "available",
      reservationNumber: ""
    },
    {
      id: 6,
      date: "7/26",
      day: "土",
      time: "15:30 - 16:15",
      program: "BSB",
      name: "10s 1",
      instructor: "K.Miku",
      studio: "渋谷",
      studioCode: "SBY",
      difficulty: "初心者",
      capacity: "18人",
      available: false,
      status: "reserved",
      reservationNumber: "#35"
    },
    
    // 7/27 (日)
    {
      id: 7,
      date: "7/27",
      day: "日",
      time: "10:30 - 11:15",
      program: "BB1",
      name: "House 3",
      instructor: "Yosui",
      studio: "渋谷",
      studioCode: "SBY",
      difficulty: "中級者",
      capacity: "18人",
      available: false,
      status: "full",
      reservationNumber: ""
    },
    {
      id: 8,
      date: "7/27",
      day: "日",
      time: "13:45 - 14:30",
      program: "BB2",
      name: "10s 3",
      instructor: "Taiyo",
      studio: "銀座",
      studioCode: "GNZ",
      difficulty: "上級者",
      capacity: "20人",
      available: true,
      status: "available",
      reservationNumber: ""
    },
    {
      id: 9,
      date: "7/27",
      day: "日",
      time: "16:30 - 17:15",
      program: "BSBI",
      name: "House 1",
      instructor: "K.Miku",
      studio: "心斎橋",
      studioCode: "SSB",
      difficulty: "上級者",
      capacity: "16人",
      available: false,
      status: "reserved",
      reservationNumber: "#18"
    },
    
    // 7/28 (月)
    {
      id: 10,
      date: "7/28",
      day: "月",
      time: "10:30 - 11:15",
      program: "BB2",
      name: "NOW 2",
      instructor: "Masaki",
      studio: "銀座",
      studioCode: "GNZ",
      difficulty: "中級者",
      capacity: "20人",
      available: true,
      status: "available",
      reservationNumber: ""
    },
    {
      id: 11,
      date: "7/28",
      day: "月",
      time: "18:30 - 19:15",
      program: "BB2",
      name: "R&B 1",
      instructor: "Yuriko",
      studio: "銀座",
      studioCode: "GNZ",
      difficulty: "中級者",
      capacity: "20人",
      available: true,
      status: "available",
      reservationNumber: ""
    },
    
    // 7/29 (火)
    {
      id: 12,
      date: "7/29",
      day: "火",
      time: "12:30 - 13:15",
      program: "BB2",
      name: "House 4",
      instructor: "Mizuki",
      studio: "名古屋",
      studioCode: "NGY",
      difficulty: "中級者",
      capacity: "20人",
      available: false,
      status: "reserved",
      reservationNumber: "#42"
    },
    {
      id: 13,
      date: "7/29",
      day: "火",
      time: "17:30 - 18:15",
      program: "BB2",
      name: "Comp 1",
      instructor: "Y.Yuri",
      studio: "福岡天神",
      studioCode: "FTJ",
      difficulty: "上級者",
      capacity: "20人",
      available: false,
      status: "full",
      reservationNumber: ""
    },
    
    // 7/30 (水)
    {
      id: 14,
      date: "7/30",
      day: "水",
      time: "07:30 - 08:15",
      program: "BSL",
      name: "Rock 1",
      instructor: "Akane",
      studio: "札幌",
      studioCode: "SPR",
      difficulty: "上級者",
      capacity: "18人",
      available: true,
      status: "available",
      reservationNumber: ""
    },
    {
      id: 15,
      date: "7/30",
      day: "水",
      time: "19:30 - 20:15",
      program: "BSL",
      name: "Deep 1",
      instructor: "T.Mai",
      studio: "新宿",
      studioCode: "SJK",
      difficulty: "上級者",
      capacity: "18人",
      available: true,
      status: "available",
      reservationNumber: ""
    }
  ];

  const getProgramClass = (program: string) => {
    const normalizedProgram = program.toLowerCase().replace(/\s+/g, '');
    return `program-${normalizedProgram}`;
  };

  const getLessonItemClass = (lesson: any) => {
    const baseClass = 'w-full lesson-item text-left';
    
    switch (lesson.status) {
      case 'reserved':
        return `${baseClass} reserved cursor-not-allowed opacity-60`;
      case 'full':
        return `${baseClass} opacity-60`;
      default:
        return baseClass;
    }
  };

  const handleLessonClick = (lesson: any) => {
    setSelectedLesson(lesson);
    setIsModalOpen(true);
  };

  const handleAddToInterested = (lessonId: string) => {
    setInterestedLessons(prev => {
      if (prev.includes(lessonId)) {
        toast.success("気になるリストから削除しました");
        return prev.filter(id => id !== lessonId);
      } else {
        toast.success("気になるリストに追加しました");
        return [...prev, lessonId];
      }
    });
  };

  const toggleInterestedList = () => {
    setShowInterestedList(!showInterestedList);
    if (!showInterestedList) {
      toast.success("気になるリストを表示します");
    } else {
      toast.success("検索画面に戻ります");
    }
  };

  const handleSearch = () => {
    console.log('検索実行', {
      studios: selectedStudios,
      instructors: selectedInstructors
    });
    setHasSearched(true);
  };

  const handleStudioChange = (studioId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudios(prev => [...prev, studioId]);
    } else {
      setSelectedStudios(prev => prev.filter(id => id !== studioId));
    }
  };

  const handleInstructorChange = (instructorId: string, checked: boolean) => {
    if (checked) {
      setSelectedInstructors(prev => [...prev, instructorId]);
    } else {
      setSelectedInstructors(prev => prev.filter(id => id !== instructorId));
    }
  };

  const handleSelectAllStudios = () => {
    const allStudioIds = [...eastAreaStudios, ...northAreaStudios, ...westAreaStudios, ...southAreaStudios].map(studio => studio.id);
    setSelectedStudios(allStudioIds);
  };

  const handleClearAllStudios = () => {
    setSelectedStudios([]);
  };

  const handleSelectAllInstructors = () => {
    const allInstructorIds = instructors.map(instructor => instructor.id);
    setSelectedInstructors(allInstructorIds);
  };

  const handleClearAllInstructors = () => {
    setSelectedInstructors([]);
  };

  const handleSelectAreaStudios = (areaStudios: any[]) => {
    const areaStudioIds = areaStudios.map(studio => studio.id);
    const newSelected = [...new Set([...selectedStudios, ...areaStudioIds])];
    setSelectedStudios(newSelected);
  };

  const handleSelectFavoriteStudios = () => {
    const newSelected = [...new Set([...selectedStudios, ...favoriteStudios])];
    setSelectedStudios(newSelected);
    toast.success("お気に入りスタジオを検索条件に追加しました");
  };

  const handleSelectFavoriteInstructors = () => {
    const newSelected = [...new Set([...selectedInstructors, ...favoriteInstructors])];
    setSelectedInstructors(newSelected);
    toast.success("お気に入りインストラクターを検索条件に追加しました");
  };

  const handleSelectAllFavorites = () => {
    const newSelectedStudios = [...new Set([...selectedStudios, ...favoriteStudios])];
    const newSelectedInstructors = [...new Set([...selectedInstructors, ...favoriteInstructors])];
    setSelectedStudios(newSelectedStudios);
    setSelectedInstructors(newSelectedInstructors);
    
    const totalCount = favoriteStudios.length + favoriteInstructors.length;
    toast.success(`お気に入り（${totalCount}件）を検索条件に追加しました`);
  };

  // 検索条件に基づいてレッスンをフィルタリング（AND条件）
  const getFilteredLessons = () => {
    // 気になるリスト表示モード
    if (showInterestedList) {
      return searchResults.filter(lesson => interestedLessons.includes(lesson.id.toString()));
    }
    
    // 通常の検索モード
    if (!hasSearched) return [];
    
    return searchResults.filter(lesson => {
      // スタジオ条件チェック
      const studioMatch = selectedStudios.length === 0 || 
        selectedStudios.some(studioId => {
          const studio = [...eastAreaStudios, ...northAreaStudios, ...westAreaStudios, ...southAreaStudios]
            .find(s => s.id === studioId);
          return studio?.code === lesson.studioCode;
        });
      
      // インストラクター条件チェック
      const instructorMatch = selectedInstructors.length === 0 || 
        selectedInstructors.some(instructorId => {
          const instructor = instructors.find(i => i.id === instructorId);
          return instructor?.name === lesson.instructor;
        });
      
      // AND条件：両方の条件を満たす必要がある
      // ただし、条件が設定されていない場合は無視
      if (selectedStudios.length > 0 && selectedInstructors.length > 0) {
        return studioMatch && instructorMatch;
      } else if (selectedStudios.length > 0) {
        return studioMatch;
      } else if (selectedInstructors.length > 0) {
        return instructorMatch;
      } else {
        return true; // 何も条件が設定されていない場合は全て表示
      }
    });
  };

  const getLessonsForDate = (date: string) => {
    const filteredLessons = getFilteredLessons();
    return filteredLessons.filter(lesson => lesson.date === date);
  };

  // インストラクター検索フィルター
  const filteredInstructors = instructors.filter(instructor =>
    instructor.name.toLowerCase().includes(instructorSearch.toLowerCase())
  );

  // 固定の日付範囲を生成（7日間）
  const generateDateRange = () => {
    const today = new Date();
    const dates = [];
    
    // 現在の日付から7日間分の日付を生成
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
      
      dates.push({
        date: `${month}/${day}`,
        day: dayOfWeek,
        fullDate: date
      });
    }
    
    return dates;
  };

  // 常に7日間の日付列を表示
  const dates = generateDateRange();
  const filteredLessons = getFilteredLessons();

  return (
    <div className="px-4 py-4">
      <div className="mb-4">
        <h1 className="text-[14px] font-medium mb-1">レッスン検索</h1>
        <p className="text-[12px] text-muted-foreground">詳細条件でレッスンを検索・比較</p>
      </div>

      {/* 検索フィルター */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="w-4 h-4" />
            検索条件
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {/* スタジオ選択 */}
            <div className="border border-border rounded-lg bg-card">
              <Button
                variant="ghost"
                onClick={() => setIsStudioOpen(!isStudioOpen)}
                className={`flex w-full justify-between items-center px-3 h-12 hover:bg-accent rounded-lg ${
                  isStudioOpen ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="font-medium">スタジオ</div>
                  <Badge 
                    variant="secondary" 
                    className={`bg-muted text-muted-foreground border-border text-xs h-5 px-2 min-w-[60px] ${selectedStudios.length > 0 ? 'visible' : 'invisible'}`}
                  >
                    {selectedStudios.length > 0 ? `${selectedStudios.length}件選択` : '0件選択'}
                  </Badge>
                </div>
                <div className="flex items-center justify-center w-5 h-5">
                  {isStudioOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </Button>
              <Collapsible open={isStudioOpen}>
                <CollapsibleContent>
                  <div className="p-3">
                    {/* 選択されたスタジオの表示 */}
                    {selectedStudios.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-2">選択中のスタジオ ({selectedStudios.length}件)</h5>
                        <div className="flex flex-wrap gap-1">
                          {selectedStudios.map((studioId) => {
                            const studio = [...eastAreaStudios, ...northAreaStudios, ...westAreaStudios, ...southAreaStudios]
                              .find(s => s.id === studioId);
                            return studio ? (
                              <Badge 
                                key={studioId}
                                variant="secondary" 
                                className="bg-muted text-muted-foreground px-2 py-1 flex items-center gap-1"
                              >
                                {studio.name}
                                <button
                                  onClick={() => handleStudioChange(studioId, false)}
                                  className="ml-1 hover:bg-muted-foreground/20 rounded p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 mb-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-sm" 
                        onClick={handleSelectAllStudios}
                      >
                        すべて選択
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-sm" 
                        onClick={handleClearAllStudios}
                      >
                        すべて解除
                      </Button>
                      {favoriteStudios.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-3 text-sm flex items-center gap-1" 
                          onClick={handleSelectFavoriteStudios}
                        >
                          <Heart className="h-3 w-3" />
                          お気に入り
                        </Button>
                      )}
                    </div>
                    
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {/* 関東エリア */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-muted-foreground">EAST AREA │ 関東</h4>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 px-2 text-xs" 
                              onClick={() => handleSelectAreaStudios(eastAreaStudios)}
                            >
                              エリア選択
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {eastAreaStudios.map((studio) => (
                              <Button
                                key={studio.id}
                                variant={selectedStudios.includes(studio.id) ? "default" : "outline"}
                                size="sm"
                                className="h-8 px-2 text-xs font-normal justify-center"
                                onClick={() => handleStudioChange(studio.id, !selectedStudios.includes(studio.id))}
                              >
                                {studio.name}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* 北海道エリア */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-muted-foreground">NORTH AREA │ 北海道</h4>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 px-2 text-xs" 
                              onClick={() => handleSelectAreaStudios(northAreaStudios)}
                            >
                              エリア選択
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {northAreaStudios.map((studio) => (
                              <Button
                                key={studio.id}
                                variant={selectedStudios.includes(studio.id) ? "default" : "outline"}
                                size="sm"
                                className="h-8 px-2 text-xs font-normal justify-center"
                                onClick={() => handleStudioChange(studio.id, !selectedStudios.includes(studio.id))}
                              >
                                {studio.name}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* 東海・関西エリア */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-muted-foreground">WEST AREA │ 東海・関西</h4>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 px-2 text-xs" 
                              onClick={() => handleSelectAreaStudios(westAreaStudios)}
                            >
                              エリア選択
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {westAreaStudios.map((studio) => (
                              <Button
                                key={studio.id}
                                variant={selectedStudios.includes(studio.id) ? "default" : "outline"}
                                size="sm"
                                className="h-8 px-2 text-xs font-normal justify-center"
                                onClick={() => handleStudioChange(studio.id, !selectedStudios.includes(studio.id))}
                              >
                                {studio.name}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* 中国・四国・九州エリア */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-muted-foreground">SOUTH AREA │ 中国・四国・九州</h4>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 px-2 text-xs" 
                              onClick={() => handleSelectAreaStudios(southAreaStudios)}
                            >
                              エリア選択
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            {southAreaStudios.map((studio) => (
                              <Button
                                key={studio.id}
                                variant={selectedStudios.includes(studio.id) ? "default" : "outline"}
                                size="sm"
                                className="h-8 px-2 text-xs font-normal justify-center"
                                onClick={() => handleStudioChange(studio.id, !selectedStudios.includes(studio.id))}
                              >
                                {studio.name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            {/* インストラクター選択 */}
            <div className="border border-border rounded-lg bg-card">
              <Button
                variant="ghost"
                onClick={() => setIsInstructorOpen(!isInstructorOpen)}
                className={`flex w-full justify-between items-center px-3 h-12 hover:bg-accent rounded-lg ${
                  isInstructorOpen ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="font-medium">インストラクター</div>
                  <Badge 
                    variant="secondary" 
                    className={`bg-muted text-muted-foreground border-border text-xs h-5 px-2 min-w-[60px] ${selectedInstructors.length > 0 ? 'visible' : 'invisible'}`}
                  >
                    {selectedInstructors.length > 0 ? `${selectedInstructors.length}件選択` : '0件選択'}
                  </Badge>
                </div>
                <div className="flex items-center justify-center w-5 h-5">
                  {isInstructorOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </Button>
              <Collapsible open={isInstructorOpen}>
                <CollapsibleContent>
                  <div className="p-3">
                    {/* 選択されたインストラクターの表示 */}
                    {selectedInstructors.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-2">選択中のインストラクター ({selectedInstructors.length}名)</h5>
                        <div className="flex flex-wrap gap-1">
                          {selectedInstructors.map((instructorId) => {
                            const instructor = instructors.find(i => i.id === instructorId);
                            return instructor ? (
                              <Badge 
                                key={instructorId}
                                variant="secondary" 
                                className="bg-muted text-muted-foreground px-2 py-1 flex items-center gap-1"
                              >
                                {instructor.name}
                                <button
                                  onClick={() => handleInstructorChange(instructorId, false)}
                                  className="ml-1 hover:bg-muted-foreground/20 rounded p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 mb-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-sm" 
                        onClick={handleSelectAllInstructors}
                      >
                        すべて選択
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-sm" 
                        onClick={handleClearAllInstructors}
                      >
                        すべて解除
                      </Button>
                      {favoriteInstructors.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 px-3 text-sm flex items-center gap-1" 
                          onClick={handleSelectFavoriteInstructors}
                        >
                          <Heart className="h-3 w-3" />
                          お気に入り
                        </Button>
                      )}
                    </div>
                    
                    {/* 検索ボックス */}
                    <div className="mb-3">
                      <Input
                        placeholder="インストラクター名で検索..."
                        value={instructorSearch}
                        onChange={(e) => setInstructorSearch(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    
                    <ScrollArea className="h-[250px]">
                      <div className="grid grid-cols-3 gap-1">
                        {filteredInstructors.map((instructor) => (
                          <Button
                            key={instructor.id}
                            variant={selectedInstructors.includes(instructor.id) ? "default" : "outline"}
                            size="sm"
                            className="h-8 px-2 text-xs font-normal justify-center"
                            onClick={() => handleInstructorChange(instructor.id, !selectedInstructors.includes(instructor.id))}
                          >
                            {instructor.name}
                          </Button>
                        ))}
                      </div>
                      {filteredInstructors.length === 0 && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          該当するインストラクターが見つかりません
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
          
          {/* お気に入り一括選択 */}
          {(favoriteStudios.length > 0 || favoriteInstructors.length > 0) && (
            <div className="border-t pt-4">
              <div className="border border-border rounded-lg bg-card">
                <div className="p-3">
                  <h4 className="text-sm font-medium mb-3">お気に入りから一括選択</h4>
                  <div className="space-y-2">
                    {(favoriteStudios.length > 0 || favoriteInstructors.length > 0) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full h-9 px-4 flex items-center gap-2 justify-center" 
                        onClick={handleSelectAllFavorites}
                      >
                        <Heart className="h-3 w-3" />
                        すべてのお気に入りを選択
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full h-9 px-4 flex items-center gap-2 justify-center bg-accent text-accent-foreground hover:bg-accent/80" 
                      onClick={() => onNavigate?.('user-settings')}
                    >
                      お気に入りを編集
                    </Button>
                  </div>
                  {(favoriteStudios.length > 0 || favoriteInstructors.length > 0) ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      お気に入りに登録したスタジオやインストラクターを検索条件に追加できます
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">
                      お気に入りを登録すると、検索条件に一括追加できます
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 mt-6">
            <Button className="flex-1 h-12" onClick={handleSearch}>
              検索
            </Button>
            <Button 
              variant={showInterestedList ? "default" : "outline"}
              className="h-12 px-3 flex-shrink-0 flex items-center gap-2"
              onClick={toggleInterestedList}
              disabled={interestedLessons.length === 0}
            >
              <BookmarkPlus className="h-4 w-4" />
              <span className="text-sm">気になるリスト</span>
              {interestedLessons.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-muted text-muted-foreground text-xs h-5 px-1.5">
                  {interestedLessons.length}
                </Badge>
              )}
            </Button>
          </div>
          
          {interestedLessons.length === 0 && (
            <div className="text-center text-sm text-muted-foreground mt-2">
              気になるリストが空の場合、ボタンは無効になります
            </div>
          )}
        </CardContent>
      </Card>

      {/* 検索結果または初期状態 */}
      {(hasSearched || showInterestedList) ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {showInterestedList ? (
                  <>気になるリスト ({filteredLessons.length}件)</>
                ) : (
                  <>検索結果 ({filteredLessons.length}件)</>
                )}
              </span>
              {interestedLessons.length > 0 && !showInterestedList && (
                <Badge variant="secondary" className="ml-2">
                  気になる: {interestedLessons.length}件
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="flex min-w-max">
                {dates.map((dateInfo, index) => {
                  const lessons = getLessonsForDate(dateInfo.date);
                  return (
                    <div key={index} className="flex-shrink-0 w-[150px] border-r border-border last:border-r-0">
                      {/* 日付ヘッダー */}
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
                              <div className="relative">
                                <div className="text-sm mb-1 text-muted-foreground">
                                  {lesson.time}
                                </div>
                                <div className="mb-1">
                                  <span className={`program-name ${getProgramClass(lesson.program)}`}>
                                    {lesson.program} {lesson.name}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <span>{lesson.instructor}</span>
                                </div>
                                
                                {/* 予約番号エリア（予約済みの場合のみ表示） */}
                                <div className="reservation-number mt-1 min-h-[20px] text-sm font-normal">
                                  {lesson.status === 'reserved' && lesson.reservationNumber ? lesson.reservationNumber : ''}
                                </div>
                                
                                {/* スタジオ情報（右下） */}
                                <div className="absolute bottom-0 right-0 text-xs text-muted-foreground flex items-center gap-1">
                                  <span>{lesson.studio}({lesson.studioCode})</span>
                                  {interestedLessons.includes(lesson.id.toString()) && (
                                    <BookmarkPlus className="h-3 w-3 text-blue-500 fill-current" />
                                  )}
                                </div>
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
            
            {/* 検索結果が0件の場合のメッセージ */}
            {filteredLessons.length === 0 && (hasSearched || showInterestedList) && (
              <div className="p-4 text-center bg-muted/20 rounded-lg mt-4">
                <p className="text-muted-foreground text-sm">
                  {showInterestedList ? "気になるリストに登録されたレッスンがありません" : "検索条件に一致するレッスンが見つかりませんでした"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground text-[12px]">
              条件を設定して検索してください
            </p>
            {interestedLessons.length > 0 && (
              <p className="mt-2 text-[12px] text-muted-foreground">
                または「気になるリスト」ボタンで登録済みレッスンを表示
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 気になるリスト登録確認モーダル */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader className="text-center">
            <DialogTitle>
              {selectedLesson && interestedLessons.includes(selectedLesson.id.toString()) 
                ? "気になるリスト削除確認" 
                : "気になるリスト登録確認"
              }
            </DialogTitle>
            <DialogDescription className="sr-only">
              レッスンを気になるリストに登録または削除する確認画面
            </DialogDescription>
          </DialogHeader>
          
          {selectedLesson && (
            <div className="space-y-4">
              {/* レッスン情報カード */}
              <div className="bg-muted rounded-lg p-4 text-center space-y-3">
                <div className="text-muted-foreground">
                  {selectedLesson.date}({selectedLesson.day}) {selectedLesson.time}
                </div>
                
                <div>
                  <Badge className={`program-name ${getProgramClass(selectedLesson.program)} text-sm px-3 py-1`}>
                    {selectedLesson.program} {selectedLesson.name}
                  </Badge>
                </div>
                
                <div className="text-muted-foreground">
                  {selectedLesson.instructor}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {selectedLesson.studio} ({selectedLesson.studioCode})
                </div>
              </div>

              {/* 確認テキスト */}
              <div className="text-center py-2">
                {interestedLessons.includes(selectedLesson.id.toString()) 
                  ? "このレッスンを気になるリストから削除しますか？"
                  : "このレッスンを気になるリストに登録しますか？"
                }
              </div>

              {/* アクションボタン */}
              <div className="space-y-3">
                <Button 
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    handleAddToInterested(selectedLesson.id.toString());
                    setIsModalOpen(false);
                  }}
                >
                  {interestedLessons.includes(selectedLesson.id.toString()) 
                    ? "削除する" 
                    : "登録する"
                  }
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full h-12 bg-background border border-border hover:bg-muted"
                  onClick={() => setIsModalOpen(false)}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}