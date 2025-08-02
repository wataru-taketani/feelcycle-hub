'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Heart, X } from "lucide-react";
import axios from 'axios';

export interface Studio {
  id?: string;    // ローカルデータ用（小文字）
  code: string;   // API データ用（大文字）
  name: string;   // 表示名
}

export interface StudioGroups {
  [groupName: string]: Studio[];
}

interface StudioGridProps {
  mode: 'search' | 'favorites';
  selectedStudios: string[];
  onStudioChange: (studioId: string, selected: boolean) => void;
  showAreaSelection?: boolean;
  showFavoriteIntegration?: boolean;
  favoriteStudios?: string[];
  onSelectFavorites?: () => void;
}

// フォールバック用静的データ（検索画面と同じ）
const eastAreaStudios: Studio[] = [
  { id: 'gkbs', name: '銀座京橋', code: 'GKBS' },
  { id: 'gnz', name: '銀座', code: 'GNZ' },
  { id: 'gtd', name: '五反田', code: 'GTD' },
  { id: 'ikb', name: '池袋', code: 'IKB' },
  { id: 'sjk', name: '新宿', code: 'SJK' },
  { id: 'sby', name: '渋谷', code: 'SBY' },
  { id: 'tky', name: '東京', code: 'TKY' },
  { id: 'kcy', name: '恵比寿', code: 'KCY' },
  { id: 'kcj', name: '吉祥寺', code: 'KCJ' },
  { id: 'kws', name: '川崎', code: 'KWS' },
  { id: 'ykh', name: '横浜', code: 'YKH' },
  { id: 'ksy', name: '越谷', code: 'KSY' },
];

const northAreaStudios: Studio[] = [
  { id: 'spr', name: '札幌', code: 'SPR' },
];

const westAreaStudios: Studio[] = [
  { id: 'ngy', name: '名古屋', code: 'NGY' },
  { id: 'ssb', name: '心斎橋', code: 'SSB' },
  { id: 'smy', name: '三ノ宮', code: 'SMY' },
];

const southAreaStudios: Studio[] = [
  { id: 'hsm', name: '広島', code: 'HSM' },
  { id: 'ftj', name: '福岡天神', code: 'FTJ' },
];

const defaultStudioGroups: StudioGroups = {
  'EAST AREA │ 関東': eastAreaStudios,
  'NORTH AREA │ 北海道': northAreaStudios,
  'WEST AREA │ 東海・関西': westAreaStudios,
  'SOUTH AREA │ 中国・四国・九州': southAreaStudios,
};

export default function StudioGrid({
  mode,
  selectedStudios,
  onStudioChange,
  showAreaSelection = false,
  showFavoriteIntegration = false,
  favoriteStudios = [],
  onSelectFavorites,
}: StudioGridProps) {
  const [studioGroups, setStudioGroups] = useState<StudioGroups>(defaultStudioGroups);
  const [isFromApi, setIsFromApi] = useState(false);

  // APIからスタジオデータを取得
  useEffect(() => {
    async function fetchStudios() {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';
        const response = await axios.get(`${apiBaseUrl}/studios`, { timeout: 5000 });
        
        if (response.data.success && response.data.data.studioGroups) {
          setStudioGroups(response.data.data.studioGroups);
          setIsFromApi(true);
        }
      } catch (error) {
        console.warn('Failed to fetch studios from API, using static data:', error);
        setIsFromApi(false);
      }
    }

    fetchStudios();
  }, []);

  // スタジオIDの正規化（APIデータは大文字コード、ローカルデータは小文字id）
  const normalizeStudioId = (studio: Studio): string => {
    return isFromApi ? studio.code.toLowerCase() : (studio.id || studio.code.toLowerCase());
  };

  // エリア別選択ハンドラー
  const handleSelectAreaStudios = (areaStudios: Studio[]) => {
    const areaStudioIds = areaStudios.map(studio => normalizeStudioId(studio));
    areaStudioIds.forEach(studioId => {
      if (!selectedStudios.includes(studioId)) {
        onStudioChange(studioId, true);
      }
    });
  };

  // 全選択・全解除ハンドラー
  const handleSelectAll = () => {
    const allStudioIds = Object.values(studioGroups)
      .flat()
      .map(studio => normalizeStudioId(studio));
    
    allStudioIds.forEach(studioId => {
      if (!selectedStudios.includes(studioId)) {
        onStudioChange(studioId, true);
      }
    });
  };

  const handleClearAll = () => {
    selectedStudios.forEach(studioId => {
      onStudioChange(studioId, false);
    });
  };

  return (
    <div className="space-y-4">
      {/* 選択済みスタジオ表示 */}
      {selectedStudios.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">
            {mode === 'favorites' ? '現在のお気に入り' : '選択中のスタジオ'} ({selectedStudios.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedStudios.map((studioId) => {
              // 選択されたスタジオの情報を取得
              let studioInfo: Studio | undefined;
              for (const groupStudios of Object.values(studioGroups)) {
                studioInfo = groupStudios.find(studio => 
                  normalizeStudioId(studio) === studioId
                );
                if (studioInfo) break;
              }

              return (
                <Badge
                  key={studioId}
                  variant="secondary"
                  className="flex items-center gap-1 h-8 px-3"
                >
                  {studioInfo?.name || studioId}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => onStudioChange(studioId, false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* 選択済みスタジオと操作ボタンの視覚的分離 */}
      {selectedStudios.length > 0 && <Separator />}

      {/* 操作ボタン群 */}
      <div className="flex flex-wrap gap-2">
        {showAreaSelection && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="h-8 px-3 text-xs"
            >
              すべて選択
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="h-8 px-3 text-xs"
            >
              すべて解除
            </Button>
          </>
        )}
        
        {showFavoriteIntegration && favoriteStudios.length > 0 && onSelectFavorites && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectFavorites}
            className="h-8 px-3 text-xs flex items-center gap-1"
          >
            <Heart className="w-3 h-3" />
            お気に入りを選択
          </Button>
        )}
      </div>

      {/* 地域別スタジオ選択 */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {Object.entries(studioGroups).map(([groupName, groupStudios]) => (
            <div key={groupName}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">{groupName}</h4>
                {showAreaSelection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAreaStudios(groupStudios)}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    エリア選択
                  </Button>
                )}
              </div>
              
              <div className={`grid gap-2 ${isFromApi ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {groupStudios.map((studio) => {
                  const studioId = normalizeStudioId(studio);
                  const isSelected = selectedStudios.includes(studioId);
                  
                  return (
                    <Button
                      key={studioId}
                      variant={isSelected ? "default" : "outline"}
                      className={`h-8 px-2 text-xs font-normal justify-center transition-all duration-150 ${
                        isSelected 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                      onClick={() => onStudioChange(studioId, !isSelected)}
                    >
                      {studio.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}