'use client';

import { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://feelcycle-hub-main-dev-1157382628.ap-northeast-1.elb.amazonaws.com/feelcycle/auth/verify', {
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

      const feelcycleData = await response.json();
      
      setIsSuccess(true);
      
      // 成功時のUI表示を少し待ってからコールバック実行
      setTimeout(() => {
        onSuccess(feelcycleData);
        handleClose();
      }, 1000);

    } catch (err) {
      console.error('FEELCYCLE認証エラー:', err);
      setError(err instanceof Error ? err.message : '認証に失敗しました。メールアドレスとパスワードを確認してください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
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
                FEELCYCLEアカウント情報を取得中...
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