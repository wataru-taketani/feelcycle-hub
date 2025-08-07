'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface FEELCYCLEUserData {
  name: string;
  memberType: string;
  homeStudio: string;
  linkedAt: string;
}

interface FEELCYCLEIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // 引数なしに変更
  userId: string;
}

export const FEELCYCLEIntegrationModal: React.FC<FEELCYCLEIntegrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userId
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState<FEELCYCLEUserData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('🚀 FEELCYCLE連携開始');
      
      const response = await fetch('/api/feelcycle/integrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email,
          password
        })
      });

      const data = await response.json();
      console.log('📊 API Response:', data);

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: Integration failed`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Integration failed');
      }

      console.log('✅ FEELCYCLE連携成功');
      setSuccess(true);
      setSuccessData(data.data);
      
      // 2秒後に成功コールバックを呼び出してモーダルを閉じる
      setTimeout(() => {
        onSuccess(); // 引数なしで呼び出し
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('❌ FEELCYCLE連携エラー:', err);
      
      let errorMessage = 'Unknown error occurred';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // エラーメッセージをユーザーフレンドリーに変換
      if (errorMessage.includes('401') || errorMessage.includes('credentials')) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'FEELCYCLEサーバーの応答が遅延しています。しばらく待ってから再試行してください';
      } else if (errorMessage.includes('network')) {
        errorMessage = 'ネットワークエラーが発生しました。インターネット接続を確認してください';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // モーダルが閉じられた後にフォームをリセット
    setTimeout(() => {
      resetForm();
    }, 300);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError('');
    setSuccess(false);
    setSuccessData(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isLoading) {
        handleClose();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <div className="text-lg font-semibold">FEELCYCLEアカウント連携</div>
              <div className="text-sm text-gray-500 font-normal">レッスン予約・管理機能を利用</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {success && successData ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-green-700 mb-3">
              連携完了！
            </h3>
            <div className="space-y-2 text-gray-600">
              <p className="text-lg">
                <span className="font-medium">{successData.name}</span> さん
              </p>
              <p>会員種別: <span className="font-medium">{successData.memberType}</span></p>
              <p>所属店舗: <span className="font-medium">{successData.homeStudio}</span></p>
            </div>
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                FEELCYCLEアカウントの連携が完了しました。<br />
                これで予約・キャンセル待ち機能をご利用いただけます。
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  メールアドレス
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your-email@example.com"
                  required
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  パスワード
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワードを入力"
                    required
                    disabled={isLoading}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 h-11"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="flex-1 h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    連携中...
                  </>
                ) : (
                  '連携する'
                )}
              </Button>
            </div>
          </form>
        )}

        <div className="text-xs text-gray-500 mt-4 space-y-1">
          <p>※ 入力された認証情報は暗号化されて安全に保存されます</p>
          <p>※ FEELCYCLEの利用規約に従ってご利用ください</p>
          <p>※ 連携には数秒から数十秒かかる場合があります</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FEELCYCLEIntegrationModal;
