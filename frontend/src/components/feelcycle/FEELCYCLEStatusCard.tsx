'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, MapPin, User, Calendar, AlertCircle } from 'lucide-react';

interface FEELCYCLEUserData {
  name: string;
  memberType: string;
  homeStudio: string;
  linkedAt: string;
  remainingLessons?: string;
}

interface FEELCYCLEStatusCardProps {
  userData: FEELCYCLEUserData | null;
  onUnlink?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export const FEELCYCLEStatusCard: React.FC<FEELCYCLEStatusCardProps> = ({
  userData,
  onUnlink,
  isLoading = false,
  error
}) => {
  if (isLoading) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userData) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-8 h-8 text-gray-400" />
            <div>
              <p className="text-gray-600">連携情報を取得できませんでした</p>
              <p className="text-sm text-gray-500">しばらく時間をおいて再度お試しください</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getMemberTypeBadgeColor = (memberType: string) => {
    switch (memberType.toLowerCase()) {
      case 'premium':
      case 'プレミアム':
      case 'プレミアム会員':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'regular':
      case 'レギュラー':
      case 'レギュラー会員':
        return 'bg-blue-500 text-white';
      case 'daytime':
      case 'デイタイム':
      case 'デイタイム会員':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          連携完了
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ユーザー情報 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-lg text-gray-900">{userData.name}</p>
              <p className="text-sm text-gray-600">FEELCYCLEアカウント</p>
            </div>
          </div>
          <Badge className={getMemberTypeBadgeColor(userData.memberType)}>
            {userData.memberType}
          </Badge>
        </div>

        {/* 詳細情報 */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center space-x-3 text-gray-700">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm">所属店舗: <span className="font-medium">{userData.homeStudio}</span></span>
          </div>
          
          <div className="flex items-center space-x-3 text-gray-700">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm">連携日時: <span className="font-medium">{formatDate(userData.linkedAt)}</span></span>
          </div>

          {userData.remainingLessons && (
            <div className="flex items-center space-x-3 text-gray-700">
              <CheckCircle className="w-4 h-4 text-gray-500" />
              <span className="text-sm">残レッスン: <span className="font-medium">{userData.remainingLessons}</span></span>
            </div>
          )}
        </div>

        {/* 利用可能機能 */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">利用可能な機能</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              レッスン予約
            </Badge>
            <Badge variant="outline" className="text-xs">
              キャンセル待ち
            </Badge>
            <Badge variant="outline" className="text-xs">
              予約管理
            </Badge>
            <Badge variant="outline" className="text-xs">
              履歴確認
            </Badge>
          </div>
        </div>

        {/* アクションボタン */}
        {onUnlink && (
          <div className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={onUnlink}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              連携を解除
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              ※ 連携を解除すると、FEELCYCLE関連の機能が利用できなくなります
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FEELCYCLEStatusCard;
