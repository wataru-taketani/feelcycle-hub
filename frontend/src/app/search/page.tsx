'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Calendar, MapPin, User, ChevronDown, ChevronRight, Heart, X, BookmarkPlus, List } from "lucide-react";
import { toast } from "sonner";
import { getTodayJST, getDateAfterDaysJST, formatDateJST } from '@/utils/dateUtils';
import { fetchProgramsData, getProgramColors } from '@/utils/programsApi';
import { 
  getInterestedLessons, 
  addInterestedLesson, 
  removeInterestedLesson 
} from '@/utils/interestedLessons';
import { getUserSettings } from '@/utils/userSettings';

interface LessonSearchProps {
  onNavigate?: (page: string) => void;
}

interface LessonData {
  studioCode: string;
  studioName?: string;
  lessonDate: string;
  startTime: string;
  lessonName: string;
  instructor: string;
  isAvailable: string;
  program: string;
  lastUpdated: string;
}

interface LessonsByDate {
  [date: string]: LessonData[];
}

interface Studio {
  code: string;
  name: string;
}

interface StudioGroups {
  [groupName: string]: Studio[];
}

export default function SearchPage({ onNavigate }: LessonSearchProps) {
  const { isAuthenticated, apiUser, loading } = useAuth();
  
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
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [lessonsByDate, setLessonsByDate] = useState<LessonsByDate>({});
  const [studioGroups, setStudioGroups] = useState<StudioGroups>({});
  const [studios, setStudios] = useState<Studio[]>([]);
  
  // お気に入りリスト（UserSettingsから取得）
  const userSettings = getUserSettings();
  const favoriteInstructors = userSettings.favoriteInstructors;
  const favoriteStudios = userSettings.favoriteStudios;
  
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchStudios();
      // プログラム色データを事前に取得
      fetchProgramsData().catch(error => {
        console.error('Failed to fetch programs data:', error);
      });
      
      // 気になるリストをlocalStorageから復元
      const savedInterestedLessons = getInterestedLessons();
      console.log('📱 気になるリスト初期化:', {
        savedInterestedLessonsCount: savedInterestedLessons.length,
        savedInterestedLessons: savedInterestedLessons
      });
      setInterestedLessons(savedInterestedLessons);
    }
  }, [isAuthenticated]);

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

  // レッスン検索（複数スタジオ対応、全日程取得）
  const searchLessons = async () => {
    if (selectedStudios.length === 0) {
      toast.success("スタジオを選択してください");
      return;
    }
    
    try {
      setLoadingLessons(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      
      // 複数スタジオの全日程レッスンを取得
      const allLessonsData: LessonsByDate = {};
      
      for (const studioId of selectedStudios) {
        // APIから取得したスタジオリストまたはフォールバックの静的リストから検索
        let studioCode = studioId;
        
        // APIから取得したスタジオグループを優先
        if (Object.keys(studioGroups).length > 0) {
          let found = false;
          Object.values(studioGroups).forEach(studioList => {
            const studio = studioList.find(s => s.code.toLowerCase() === studioId.toLowerCase());
            if (studio) {
              studioCode = studio.code;
              found = true;
            }
          });
          if (!found) {
            console.warn(`Studio not found in API groups: ${studioId}`);
            continue;
          }
        } else {
          // フォールバック：静的スタジオリスト
          const studio = [...eastAreaStudios, ...northAreaStudios, ...westAreaStudios, ...southAreaStudios]
            .find(s => s.id === studioId);
          if (!studio) continue;
          studioCode = studio.code;
        }
        
        console.log(`🔍 Searching lessons for studio: ${studioCode}`);
        
        // 今日から30日間の範囲でレッスンを取得（日本時間）
        const startDate = getTodayJST(); // YYYY-MM-DD
        const endDate = getDateAfterDaysJST(30);
        
        const response = await axios.get(`${apiBaseUrl}/lessons?studioCode=${studioCode}&range=true&startDate=${startDate}&endDate=${endDate}`);
        
        if (response.data.success && response.data.data?.lessonsByDate) {
          // 各スタジオのデータを統合
          Object.keys(response.data.data.lessonsByDate).forEach(date => {
            if (!allLessonsData[date]) {
              allLessonsData[date] = [];
            }
            allLessonsData[date].push(...response.data.data.lessonsByDate[date]);
          });
        }
      }
      
      setLessonsByDate(allLessonsData);
      console.log('✅ Search results loaded:', Object.keys(allLessonsData).length, 'days');
      
    } catch (error) {
      console.error('Error searching lessons:', error);
      toast.error("レッスンの取得に失敗しました");
      setLessonsByDate({});
    } finally {
      setLoadingLessons(false);
    }
  };

  const getProgramClass = (program: string) => {
    if (!program) return 'bg-gray-100 text-gray-700';
    const normalizedProgram = program.toLowerCase().replace(/\s+/g, '');
    const className = `program-${normalizedProgram}`;
    console.log('Program:', program, '-> Class:', className);
    return className;
  };

  const getProgramBackgroundColor = (program: string, programName?: string) => {
    if (!program) return '#f3f4f6';
    const colors = getProgramColors(program, programName);
    return colors.backgroundColor;
  };

  const getProgramTextColor = (program: string, programName?: string) => {
    if (!program) return '#374151';
    const colors = getProgramColors(program, programName);
    return colors.textColor;
  };

  const getLessonItemClass = (lesson: any) => {
    const baseClass = 'w-full lesson-item text-left';
    console.log('Lesson item class for lesson:', lesson.id, 'status:', lesson.status, 'class:', baseClass);
    return baseClass;
  };

  const handleLessonClick = (lesson: any) => {
    setSelectedLesson(lesson);
    setIsModalOpen(true);
  };

  const handleAddToInterested = (lessonId: string) => {
    setInterestedLessons(prev => {
      if (prev.includes(lessonId)) {
        // 削除
        removeInterestedLesson(lessonId);
        toast.success("気になるリストから削除しました");
        return prev.filter(id => id !== lessonId);
      } else {
        // 追加 - selectedLessonから詳細情報を取得
        if (selectedLesson) {
          addInterestedLesson({
            lessonId: lessonId,
            lessonDate: selectedLesson.lessonDate || selectedLesson.date,
            lessonTime: selectedLesson.startTime || selectedLesson.time,
            program: selectedLesson.program,
            instructor: selectedLesson.instructor,
            studioCode: selectedLesson.studioCode,
            studioName: selectedLesson.studio
          });
        }
        toast.success("気になるリストに追加しました");
        return [...prev, lessonId];
      }
    });
  };

  const toggleInterestedList = async () => {
    const newShowState = !showInterestedList;
    setShowInterestedList(newShowState);
    
    if (newShowState) {
      toast.success("気になるリストを表示します");
      // 気になるリスト表示時は常にデータを取得（未検索状態でも実行）
      if (interestedLessons.length > 0) {
        await loadInterestedLessonsData();
      }
    } else {
      toast.success("検索画面に戻ります");
    }
  };

  const loadInterestedLessonsData = async () => {
    console.log('🔄 loadInterestedLessonsData 開始:', {
      apiUser: !!apiUser,
      interestedLessonsLength: interestedLessons.length,
      interestedLessons: interestedLessons
    });
    
    if (!apiUser || interestedLessons.length === 0) {
      console.log('⚠️ loadInterestedLessonsData 早期終了:', { apiUser: !!apiUser, interestedLessonsLength: interestedLessons.length });
      return;
    }

    try {
      setLoadingLessons(true);
      
      // 気になるリストからスタジオと日付を抽出（lessonId形式: studioCode-YYYY-MM-DD-HH:MM）
      const neededRequests = new Set<string>();
      interestedLessons.forEach(lessonKey => {
        const parts = lessonKey.split('-');
        console.log(`🔗 lessonKey解析:`, { lessonKey, parts, partsLength: parts.length });
        
        if (parts.length >= 4) {  // studioCode-YYYY-MM-DD-HH:MM の形式
          const studioCode = parts[0];
          const year = parts[1];
          const month = parts[2];
          const day = parts[3];
          const lessonDate = `${year}-${month}-${day}`;  // YYYY-MM-DD形式に再構築
          const requestKey = `${studioCode}:${lessonDate}`;
          neededRequests.add(requestKey);
          console.log(`➕ リクエスト追加:`, { studioCode, lessonDate, requestKey });
        } else {
          console.warn(`⚠️ 無効なlessonKey形式:`, { lessonKey, parts, expected: 'studioCode-YYYY-MM-DD-HH:MM' });
        }
      });
      
      console.log(`📋 必要なAPIリクエスト:`, {
        neededRequestsArray: Array.from(neededRequests),
        count: neededRequests.size
      });

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
      const allLessonsData: LessonsByDate = {};

      // 必要なスタジオ・日付のデータを並行取得
      const promises = Array.from(neededRequests).map(async (request) => {
        const [studioCode, lessonDate] = request.split(':');
        console.log(`🔗 API呼び出し:`, { studioCode, lessonDate, url: `${apiBaseUrl}/lessons?studioCode=${studioCode}&range=true&startDate=${lessonDate}&endDate=${lessonDate}` });
        
        try {
          const response = await axios.get(`${apiBaseUrl}/lessons?studioCode=${studioCode}&range=true&startDate=${lessonDate}&endDate=${lessonDate}`);
          
          console.log(`📥 API レスポンス (${studioCode}):`, {
            success: response.data.success,
            hasData: !!response.data.data,
            hasLessonsByDate: !!response.data.data?.lessonsByDate,
            lessonsByDateKeys: response.data.data?.lessonsByDate ? Object.keys(response.data.data.lessonsByDate) : 'none',
            status: response.status
          });

          if (response.data.success && response.data.data?.lessonsByDate) {
            Object.keys(response.data.data.lessonsByDate).forEach(date => {
              if (!allLessonsData[date]) {
                allLessonsData[date] = [];
              }
              const lessonsToAdd = response.data.data.lessonsByDate[date];
              console.log(`📅 日付 ${date} に ${lessonsToAdd.length} レッスンを追加`);
              allLessonsData[date].push(...lessonsToAdd);
            });
          } else {
            console.warn(`⚠️ 無効なレスポンス (${studioCode}):`, response.data);
          }
        } catch (error) {
          console.error(`❌ API呼び出しエラー ${studioCode} on ${lessonDate}:`, error);
          if (error.response) {
            console.error('Error response:', error.response.data);
            console.error('Error status:', error.response.status);
          }
        }
      });

      await Promise.all(promises);
      
      console.log('✅ loadInterestedLessonsData 完了:', {
        allLessonsDataKeys: Object.keys(allLessonsData),
        totalLessons: Object.values(allLessonsData).flat().length,
        dataByDate: Object.keys(allLessonsData).map(date => ({
          date,
          count: allLessonsData[date].length
        }))
      });
      
      setLessonsByDate(allLessonsData);
      
    } catch (error) {
      console.error('Error loading interested lessons data:', error);
      toast.error("気になるリストの読み込みに失敗しました");
    } finally {
      setLoadingLessons(false);
    }
  };

  const handleSearch = () => {
    console.log('検索実行', {
      studios: selectedStudios,
      instructors: selectedInstructors
    });
    setHasSearched(true);
    searchLessons();
  };

  const handleStudioChange = (studioId: string, checked: boolean) => {
    console.log('handleStudioChange called:', { studioId, checked });
    if (checked) {
      setSelectedStudios(prev => {
        const newSelected = [...prev, studioId];
        console.log('New selected studios:', newSelected);
        return newSelected;
      });
    } else {
      setSelectedStudios(prev => {
        const newSelected = prev.filter(id => id !== studioId);
        console.log('New selected studios:', newSelected);
        return newSelected;
      });
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
      console.log('🔍 気になるリスト表示モード:', {
        interestedLessonsCount: interestedLessons.length,
        interestedLessons: interestedLessons,
        lessonsByDateKeys: Object.keys(lessonsByDate),
        lessonsByDateCount: Object.keys(lessonsByDate).length,
        loadingLessons: loadingLessons
      });
      
      // ローディング中は空配列を返す
      if (loadingLessons) {
        console.log('⏳ ローディング中のため空配列を返す');
        return [];
      }
      
      // レッスンデータがない場合は空配列を返す
      if (Object.keys(lessonsByDate).length === 0) {
        console.log('⚠️ lessonsByDateが空のため空配列を返す');
        return [];
      }
      
      // 実際のAPIデータから気になるリストを生成
      const allLessons: any[] = [];
      let totalLessonsChecked = 0;
      let matchedLessons = 0;
      
      Object.keys(lessonsByDate).forEach(date => {
        lessonsByDate[date].forEach(lesson => {
          totalLessonsChecked++;
          const lessonKey = `${lesson.studioCode}-${lesson.lessonDate}-${lesson.startTime}`;
          const isMatched = interestedLessons.includes(lessonKey);
          
          if (totalLessonsChecked <= 5) { // 最初の5件のみログ出力
            console.log(`🔍 レッスン照合:`, {
              lessonKey,
              isMatched,
              lesson: { studioCode: lesson.studioCode, lessonDate: lesson.lessonDate, startTime: lesson.startTime, lessonName: lesson.lessonName }
            });
          }
          
          if (isMatched) {
            matchedLessons++;
            // スタジオ名を正しく取得
            let studioDisplayName = lesson.studioCode;
            if (Object.keys(studioGroups).length > 0) {
              Object.values(studioGroups).forEach(studioList => {
                const studioInfo = studioList.find(s => s.code.toLowerCase() === lesson.studioCode.toLowerCase());
                if (studioInfo) {
                  studioDisplayName = studioInfo.name;
                }
              });
            }
            
            allLessons.push({
              ...lesson,
              id: lessonKey,
              date: formatDateForDisplay(lesson.lessonDate),
              day: getDayOfWeek(lesson.lessonDate),
              time: `${lesson.startTime} - ${lesson.endTime || getEndTime(lesson.startTime)}`,
              program: lesson.program,
              name: lesson.lessonName,
              instructor: lesson.instructor,
              studio: studioDisplayName,
              studioCode: lesson.studioCode.toUpperCase(),
              status: lesson.isAvailable === 'true' || lesson.isAvailable === true ? 'available' : 'full',
              reservationNumber: ''
            });
          }
        });
      });
      
      console.log('📊 気になるリスト結果:', {
        totalLessonsChecked,
        matchedLessons,
        allLessonsLength: allLessons.length,
        interestedLessonsArray: interestedLessons
      });
      
      return allLessons;
    }
    
    // 通常の検索モード
    if (!hasSearched) return [];
    
    const allLessons: any[] = [];
    Object.keys(lessonsByDate).forEach(date => {
      lessonsByDate[date].forEach(lesson => {
        // インストラクター条件チェック
        const instructorMatch = selectedInstructors.length === 0 || 
          selectedInstructors.some(instructorId => {
            const instructor = instructors.find(i => i.id === instructorId);
            return instructor?.name === lesson.instructor;
          });
        
        // スタジオは既に選択したものだけを取得済みなのでスタジオフィルタは不要
        // インストラクター条件のみチェック
        if (instructorMatch) {
          // スタジオ名を正しく取得
          let studioDisplayName = lesson.studioCode;
          if (Object.keys(studioGroups).length > 0) {
            Object.values(studioGroups).forEach(studioList => {
              const studioInfo = studioList.find(s => s.code.toLowerCase() === lesson.studioCode.toLowerCase());
              if (studioInfo) {
                studioDisplayName = studioInfo.name;
              }
            });
          }
          
          allLessons.push({
            ...lesson,
            id: `${lesson.studioCode}-${lesson.lessonDate}-${lesson.startTime}`,
            date: formatDateForDisplay(lesson.lessonDate),
            day: getDayOfWeek(lesson.lessonDate),
            time: `${lesson.startTime} - ${lesson.endTime || getEndTime(lesson.startTime)}`,
            program: lesson.program,
            name: lesson.lessonName,
            instructor: lesson.instructor,
            studio: studioDisplayName,
            studioCode: lesson.studioCode.toUpperCase(),
            status: lesson.isAvailable === 'true' || lesson.isAvailable === true ? 'available' : 'full',
            reservationNumber: ''
          });
        }
      });
    });
    
    return allLessons;
  };

  const getLessonsForDate = (date: string) => {
    const filteredLessons = getFilteredLessons();
    return filteredLessons.filter(lesson => lesson.date === date);
  };

  // インストラクター検索フィルター
  const filteredInstructors = instructors.filter(instructor =>
    instructor.name.toLowerCase().includes(instructorSearch.toLowerCase())
  );

  // 日付フォーマット用ヘルパー関数（日本時間対応）
  const formatDateForDisplay = (dateString: string) => {
    // "2025-07-29" -> "7/29"
    const date = new Date(dateString + 'T00:00:00+09:00'); // JST指定
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getDayOfWeek = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00+09:00'); // JST指定
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[date.getDay()];
  };

  const getEndTime = (startTime: string) => {
    // "07:30" -> "08:15" (45分後)
    const [hours, minutes] = startTime.split(':').map(Number);
    const endDate = new Date();
    endDate.setHours(hours, minutes + 45);
    return endDate.toTimeString().slice(0, 5);
  };

  // 動的な日付範囲を生成（実際のデータがある日付のみ）
  const generateDateRange = () => {
    const allDates = Object.keys(lessonsByDate).sort();
    return allDates.map(dateString => ({
      date: formatDateForDisplay(dateString),
      day: getDayOfWeek(dateString),
      fullDate: new Date(dateString)
    }));
  };

  // データがある日付のみ表示
  const dates = generateDateRange();
  const filteredLessons = getFilteredLessons();

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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-sm flex items-center gap-1" 
                        onClick={favoriteStudios.length > 0 ? handleSelectFavoriteStudios : () => onNavigate?.('user-settings')}
                        disabled={favoriteStudios.length === 0}
                      >
                        <Heart className="h-3 w-3" />
                        {favoriteStudios.length > 0 ? 'お気に入り' : 'お気に入り未設定'}
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-4">
                        {/* APIからのスタジオグループがある場合 */}
                        {Object.keys(studioGroups).length > 0 ? (
                          Object.keys(studioGroups).map((groupName) => (
                            <div key={groupName}>
                              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                {groupName}
                              </h4>
                              <div className="grid grid-cols-2 gap-1">
                                {studioGroups[groupName].map((studio) => (
                                  <Button
                                    key={studio.code}
                                    variant={selectedStudios.includes(studio.code.toLowerCase()) ? "default" : "outline"}
                                    size="sm"
                                    className="h-8 px-2 text-xs font-normal justify-start"
                                    onClick={() => {
                                      console.log('Studio button clicked:', studio.code);
                                      handleStudioChange(studio.code.toLowerCase(), !selectedStudios.includes(studio.code.toLowerCase()));
                                    }}
                                  >
                                    {studio.name}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <>
                            {/* フォールバック：静的エリア */}
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
                          </>
                        )}
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 text-sm flex items-center gap-1" 
                        onClick={favoriteInstructors.length > 0 ? handleSelectFavoriteInstructors : () => onNavigate?.('user-settings')}
                        disabled={favoriteInstructors.length === 0}
                      >
                        <Heart className="h-3 w-3" />
                        {favoriteInstructors.length > 0 ? 'お気に入り' : 'お気に入り未設定'}
                      </Button>
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
          <div className="border-t pt-4">
            <div className="border border-border rounded-lg bg-card">
              <div className="p-3">
                <h4 className="text-sm font-medium mb-3">お気に入りから一括選択</h4>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full h-9 px-4 flex items-center gap-2 justify-center" 
                    onClick={handleSelectAllFavorites}
                    disabled={favoriteStudios.length === 0 && favoriteInstructors.length === 0}
                  >
                    <Heart className="h-3 w-3" />
                    {(favoriteStudios.length > 0 || favoriteInstructors.length > 0) ? 'すべてのお気に入りを選択' : 'お気に入りが未設定です'}
                  </Button>
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
          
          <div className="flex gap-2 mt-6">
            <Button 
              className="flex-1 h-12" 
              onClick={handleSearch}
              disabled={selectedStudios.length === 0 || loadingLessons}
            >
              {loadingLessons ? '検索中...' : '検索'}
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
          
          {selectedStudios.length === 0 && (
            <div className="text-center text-sm text-muted-foreground mt-2">
              スタジオを選択してから検索してください
            </div>
          )}
          {interestedLessons.length === 0 && (
            <div className="text-center text-sm text-muted-foreground mt-2">
              気になるリストが空の場合、ボタンは無効になります
            </div>
          )}
        </CardContent>
      </Card>

      {/* 検索結果、気になるリスト、または初期状態 */}
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
                                  <div className="text-xs font-medium rounded px-2 py-1" style={{
                                    backgroundColor: getProgramBackgroundColor(lesson.program, lesson.name),
                                    color: getProgramTextColor(lesson.program, lesson.name)
                                  }}>
                                    {lesson.name || `${lesson.program} レッスン`}
                                  </div>
                                </div>
                                <div className="text-sm font-medium">
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
            {filteredLessons.length === 0 && (hasSearched || showInterestedList) && !loadingLessons && (
              <div className="p-4 text-center bg-muted/20 rounded-lg mt-4">
                <p className="text-muted-foreground text-sm">
                  {showInterestedList ? "気になるリストに登録されたレッスンがありません" : "検索条件に一致するレッスンが見つかりませんでした"}
                </p>
              </div>
            )}
            
            {/* ローディング状態 */}
            {loadingLessons && (hasSearched || showInterestedList) && (
              <div className="p-8 text-center">
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                  <p className="text-[12px] text-muted-foreground">
                    {showInterestedList ? "気になるリストを読み込み中..." : "レッスン検索中..."}
                  </p>
                </div>
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
                  <div className={`inline-block text-sm font-medium rounded px-3 py-1 ${getProgramClass(selectedLesson.program)}`}>
                    {selectedLesson.name}
                  </div>
                </div>
                
                <div className="font-medium">
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