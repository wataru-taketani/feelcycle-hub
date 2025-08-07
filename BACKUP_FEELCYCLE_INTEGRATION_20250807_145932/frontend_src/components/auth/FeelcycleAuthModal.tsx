'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';

interface FeelcycleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (feelcycleData: any) => void;
  userId: string;
}

export default function FeelcycleAuthModal({
  isOpen,
  onClose,
  onSuccess,
  userId
}: FeelcycleAuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // ポーリング制御用のRef（再レンダリング時に初期化されない）
  const pollingRef = useRef<{
    isActive: boolean;
    count: number;
    timeoutId: NodeJS.Timeout | null;
  }>({
    isActive: false,
    count: 0,
    timeoutId: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/feelcycle/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email: email.trim(),
          password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ログインに失敗しました');
      }

      const result = await response.json();
      console.log('FEELCYCLE認証レスポンス:', result);
      
      if (result.status === 'processing') {
        // 非同期処理の場合：ポーリングで完了を待機
        setIsSuccess(true);
        
        // 既存のポーリングを停止
        if (pollingRef.current.timeoutId) {
          clearTimeout(pollingRef.current.timeoutId);
          pollingRef.current.timeoutId = null;
        }
        
        // ポーリング初期化
        pollingRef.current.isActive = true;
        pollingRef.current.count = 0;
        const maxPolls = 20; // 3秒 × 20回 = 最大60秒
        
        const checkAuthStatus = async () => {
          // ポーリングが非アクティブの場合は停止
          if (!pollingRef.current.isActive) {
            console.log('🛑 ポーリング停止済み');
            return;
          }
          
          try {
            pollingRef.current.count++;
            const currentCount = pollingRef.current.count;
            console.log(`🔄 認証状況確認中... (${currentCount}/${maxPolls})`);
            
            const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/feelcycle/auth/status?userId=${userId}`);
            const statusData = await statusResponse.json();
            
            if (statusData.linked && statusData.data) {
              // 認証完了 - ポーリング停止
              pollingRef.current.isActive = false;
              if (pollingRef.current.timeoutId) {
                clearTimeout(pollingRef.current.timeoutId);
                pollingRef.current.timeoutId = null;
              }
              console.log('✅ FEELCYCLE認証完了:', statusData.data);
              onSuccess(statusData.data);
              handleClose();
            } else if (currentCount >= maxPolls) {
              // タイムアウト - ポーリング停止
              pollingRef.current.isActive = false;
              if (pollingRef.current.timeoutId) {
                clearTimeout(pollingRef.current.timeoutId);
                pollingRef.current.timeoutId = null;
              }
              console.error('❌ 認証処理がタイムアウトしました');
              setError('認証処理に時間がかかっています。しばらく後に再度お試しください。');
              setIsSuccess(false);
              setIsLoading(false);
            } else {
              // まだ処理中：3秒後に再確認
              console.log(`⏳ ${currentCount}回目完了、3秒後に再確認`);
              pollingRef.current.timeoutId = setTimeout(checkAuthStatus, 3000);
            }
          } catch (pollError) {
            console.error('❌ 認証状況確認エラー:', pollError);
            const currentCount = pollingRef.current.count;
            if (currentCount >= maxPolls) {
              pollingRef.current.isActive = false;
              if (pollingRef.current.timeoutId) {
                clearTimeout(pollingRef.current.timeoutId);
                pollingRef.current.timeoutId = null;
              }
              setError('認証状況の確認に失敗しました。再度お試しください。');
              setIsSuccess(false);
              setIsLoading(false);
            } else {
              // エラーの場合は5秒後に再確認
              console.log(`⚠️ エラー発生、5秒後に再試行 (${currentCount}/${maxPolls})`);
              pollingRef.current.timeoutId = setTimeout(checkAuthStatus, 5000);
            }
          }
        };
        
        // 1秒後にポーリング開始
        console.log('🚀 ポーリング開始予定: 1秒後');
        pollingRef.current.timeoutId = setTimeout(checkAuthStatus, 1000);
        
      } else if (result.status === 'completed') {
        // 同期処理完了の場合（デバッグモード）
        setIsSuccess(true);
        setTimeout(() => {
          onSuccess(result.data);
          handleClose();
        }, 1000);
      }

    } catch (err) {
      console.error('FEELCYCLE認証エラー:', err);
      
      // より分かりやすいエラーメッセージに変換
      let errorMessage = '認証に失敗しました。';
      
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = 'サーバーとの通信に失敗しました。インターネット接続を確認してください。';
        } else if (err.message.includes('401') || err.message.includes('認証') || err.message.includes('AUTHENTICATION_FAILED')) {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません。アカウントロック防止のため、正確な情報をご確認ください。';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'サーバーの応答がタイムアウトしました。しばらく後に再試行してください。';
        } else {
          errorMessage = `エラー: ${err.message}`;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // ポーリング完全停止
    pollingRef.current.isActive = false;
    if (pollingRef.current.timeoutId) {
      clearTimeout(pollingRef.current.timeoutId);
      pollingRef.current.timeoutId = null;
    }
    pollingRef.current.count = 0;
    
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError(null);
    setIsSuccess(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            FEELCYCLEアカウント連携
          </DialogTitle>
          <DialogDescription>
            FEELCYCLEサイトのログイン情報を入力してください。
            <br />
            所属店舗・会員種別・予約状況・受講履歴を自動取得できます。
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-green-100 p-3">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="font-medium text-green-800">認証に成功しました</h3>
              <p className="text-sm text-green-600 mt-1">
                マイページ情報を取得中...しばらくお待ちください
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block mb-1.5 text-sm font-medium">メールアドレス</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="FEELCYCLE登録のメールアドレス"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-1.5 text-sm font-medium">パスワード</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="FEELCYCLEログインパスワード"
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    認証中...
                  </>
                ) : (
                  '連携する'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>セキュリティについて:</strong>
            <br />
            パスワードは暗号化してAWS Secrets Managerに安全に保存されます。
            <br />
            複数回ログインに失敗するとアカウントロックされる可能性があるため、正確な情報を入力してください。
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}