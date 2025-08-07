# FEELCYCLE Hub アカウント連携機能 - 完全実装ガイド

## 🎯 実装要件

### 機能概要
ユーザー設定ページ（https://feelcycle-hub.netlify.app/settings/）から「FEELCYCLEアカウントを連携する」ボタンを押すと、モーダルまたはフォームが表示され、FEELCYCLEのログイン認証情報（メールアドレス・パスワード）を入力。連携ボタンクリックで実際のFEELCYCLEログインを実行し、成功時にマイページ情報（名前・会員種別・所属店舗）を取得してDBに保存。以降は連携済み状態を表示し、認証情報は今後の処理で再利用する。

## 🏗️ アーキテクチャ

```
Frontend (Next.js) → API Gateway → Lambda → FEELCYCLE Site
                                      ↓
                                  DynamoDB (User Data)
                                      ↓
                                AWS Secrets Manager (Credentials)
```

## 📁 必要なファイル構成

### Backend Files
```
backend/src/
├── handlers/
│   └── feelcycle-integration.ts     # メインAPI handler
├── services/
│   ├── feelcycle-auth-service.ts    # 既存の認証サービス（修正版）
│   └── feelcycle-data-service.ts    # 新規：データ取得サービス
├── utils/
│   ├── encryption.ts               # 認証情報暗号化
│   └── database.ts                 # DynamoDB操作
└── types/
    └── feelcycle.ts                # 型定義
```

### Frontend Files
```
frontend/src/
├── components/
│   ├── FEELCYCLEIntegrationModal.tsx
│   └── FEELCYCLEStatusCard.tsx
├── pages/api/
│   └── feelcycle/
│       ├── integrate.ts
│       └── status.ts
└── hooks/
    └── useFEELCYCLEIntegration.ts
```

## 🔧 実装詳細

### 1. Backend API Handler

**File: `backend/src/handlers/feelcycle-integration.ts`**

```typescript
import { APIGatewayProxyHandler } from 'aws-lambda';
import { authenticateFeelcycleAccount } from '../services/feelcycle-auth-service';
import { extractUserInfo } from '../services/feelcycle-data-service';
import { encryptCredentials } from '../utils/encryption';
import { saveUserFEELCYCLEData } from '../utils/database';

export const integrateAccount: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId, email, password } = JSON.parse(event.body || '{}');
    
    if (!userId || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // 1. FEELCYCLE認証実行
    console.log(`FEELCYCLE連携開始: ${userId}`);
    const authResult = await authenticateFeelcycleAccount(email, password);
    
    if (!authResult.success) {
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          error: 'FEELCYCLE認証失敗',
          details: authResult.error 
        })
      };
    }

    // 2. マイページ情報取得
    const userInfo = await extractUserInfo(email, password);
    
    // 3. 認証情報暗号化保存
    const encryptedCredentials = await encryptCredentials(email, password);
    
    // 4. ユーザーデータ保存
    await saveUserFEELCYCLEData(userId, {
      name: userInfo.name,
      memberType: userInfo.memberType,
      homeStudio: userInfo.homeStudio,
      isLinked: true,
      linkedAt: new Date().toISOString(),
      encryptedCredentials
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          name: userInfo.name,
          memberType: userInfo.memberType,
          homeStudio: userInfo.homeStudio,
          linkedAt: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('FEELCYCLE連携エラー:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};

export const getIntegrationStatus: APIGatewayProxyHandler = async (event) => {
  try {
    const { userId } = event.pathParameters || {};
    
    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User ID required' })
      };
    }

    // DynamoDBからユーザーの連携状態を取得
    const userData = await getUserFEELCYCLEData(userId);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        isLinked: userData?.isLinked || false,
        name: userData?.name,
        memberType: userData?.memberType,
        homeStudio: userData?.homeStudio,
        linkedAt: userData?.linkedAt
      })
    };

  } catch (error) {
    console.error('連携状態取得エラー:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

### 2. データ取得サービス

**File: `backend/src/services/feelcycle-data-service.ts`**

```typescript
import { enhancedFeelcycleLogin } from './enhanced-feelcycle-login';

export interface FEELCYCLEUserInfo {
  name: string;
  memberType: string;
  homeStudio: string;
  remainingLessons?: string;
  email: string;
}

export async function extractUserInfo(email: string, password: string): Promise<FEELCYCLEUserInfo> {
  console.log('FEELCYCLE ユーザー情報取得開始');
  
  const result = await enhancedFeelcycleLogin(email, password, {
    saveHtml: false,
    saveScreenshot: false,
    extractUserInfo: true,
    outputDir: '/tmp'
  });

  if (!result.success) {
    throw new Error(`ユーザー情報取得失敗: ${result.error}`);
  }

  // マイページから詳細情報を抽出
  const userInfo = result.data.userInfo;
  
  return {
    name: extractName(userInfo.name || userInfo.allText),
    memberType: extractMemberType(userInfo.allText),
    homeStudio: extractHomeStudio(userInfo.allText),
    remainingLessons: userInfo.remainingLessons,
    email: email
  };
}

function extractName(text: string): string {
  // "竹谷航　様" のような形式から名前を抽出
  const nameMatch = text.match(/([^\s]+)\s*様/);
  return nameMatch ? nameMatch[1] : 'Unknown';
}

function extractMemberType(text: string): string {
  // 会員種別を抽出（例：プレミアム会員、レギュラー会員など）
  const memberTypePatterns = [
    /プレミアム会員/,
    /レギュラー会員/,
    /デイタイム会員/,
    /学生会員/
  ];
  
  for (const pattern of memberTypePatterns) {
    if (pattern.test(text)) {
      return pattern.source.replace(/[\/\\]/g, '');
    }
  }
  
  return 'Standard';
}

function extractHomeStudio(text: string): string {
  // 所属店舗を抽出
  const studioMatch = text.match(/(銀座|表参道|六本木|恵比寿|新宿|池袋|上野|自由が丘|二子玉川|吉祥寺|立川|町田|横浜|川崎|大宮|船橋|柏|札幌|仙台|名古屋|京都|大阪|神戸|福岡)(?:店|スタジオ)?/);
  return studioMatch ? `${studioMatch[1]}店` : 'Unknown';
}
```

### 3. フロントエンド統合モーダル

**File: `frontend/src/components/FEELCYCLEIntegrationModal.tsx`**

```tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface FEELCYCLEIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
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

      if (!response.ok) {
        throw new Error(data.error || 'Integration failed');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(data.data);
        onClose();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
    setSuccess(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose();
        resetForm();
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            FEELCYCLEアカウント連携
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              連携完了！
            </h3>
            <p className="text-gray-600">
              FEELCYCLEアカウントの連携が完了しました。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !email || !password}
                className="flex-1"
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

        <div className="text-xs text-gray-500 mt-4">
          <p>※ 入力された認証情報は暗号化されて安全に保存されます</p>
          <p>※ FEELCYCLEの利用規約に従ってご利用ください</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### 4. 設定ページ統合

**File: `frontend/src/pages/settings/index.tsx` (修正部分)**

```tsx
import { FEELCYCLEIntegrationModal } from '@/components/FEELCYCLEIntegrationModal';
import { FEELCYCLEStatusCard } from '@/components/FEELCYCLEStatusCard';

export default function SettingsPage() {
  const [showFEELCYCLEModal, setShowFEELCYCLEModal] = useState(false);
  const [feelcycleData, setFEELCYCLEData] = useState(null);
  const [isLinked, setIsLinked] = useState(false);

  // 連携状態を取得
  useEffect(() => {
    const fetchIntegrationStatus = async () => {
      try {
        const response = await fetch(`/api/feelcycle/status/${userId}`);
        const data = await response.json();
        
        if (data.isLinked) {
          setIsLinked(true);
          setFEELCYCLEData(data);
        }
      } catch (error) {
        console.error('連携状態取得エラー:', error);
      }
    };

    if (userId) {
      fetchIntegrationStatus();
    }
  }, [userId]);

  const handleIntegrationSuccess = (data: any) => {
    setIsLinked(true);
    setFEELCYCLEData(data);
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8">設定</h1>
      
      {/* FEELCYCLE連携セクション */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">FEELCYCLE連携</h2>
        
        {isLinked ? (
          <FEELCYCLEStatusCard data={feelcycleData} />
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">
              FEELCYCLEアカウントを連携すると、レッスン予約やキャンセル待ち機能を利用できます。
            </p>
            <Button
              onClick={() => setShowFEELCYCLEModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              FEELCYCLEアカウントを連携する
            </Button>
          </div>
        )}
      </div>

      <FEELCYCLEIntegrationModal
        isOpen={showFEELCYCLEModal}
        onClose={() => setShowFEELCYCLEModal(false)}
        onSuccess={handleIntegrationSuccess}
        userId={userId}
      />
    </div>
  );
}
```

## 🔐 セキュリティ実装

### 認証情報暗号化

**File: `backend/src/utils/encryption.ts`**

```typescript
import * as crypto from 'crypto';

const MASTER_KEY = process.env.FEELCYCLE_MASTER_KEY || 'default-key-change-in-production';

export function encryptCredentials(email: string, password: string) {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(MASTER_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from(email, 'utf8'));
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedPassword: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    email: email
  };
}

export function decryptCredentials(encryptedData: any): { email: string; password: string } {
  const algorithm = 'aes-256-gcm';
  const key = crypto.scryptSync(MASTER_KEY, 'salt', 32);
  
  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAAD(Buffer.from(encryptedData.email, 'utf8'));
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encryptedPassword, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return {
    email: encryptedData.email,
    password: decrypted
  };
}
```

## 🚀 デプロイ設定

### CDK Stack更新

```typescript
// API Gateway routes
api.addRoutes({
  'POST /feelcycle/integrate': {
    function: feelcycleIntegrationFunction,
  },
  'GET /feelcycle/status/{userId}': {
    function: feelcycleStatusFunction,
  },
});

// Environment variables
feelcycleIntegrationFunction.addEnvironment('FEELCYCLE_MASTER_KEY', masterKey.secretValue.toString());
```

## 📋 実装チェックリスト

### Backend
- [ ] feelcycle-integration.ts ハンドラー作成
- [ ] feelcycle-data-service.ts データ取得サービス
- [ ] encryption.ts 暗号化ユーティリティ
- [ ] database.ts DynamoDB操作
- [ ] CDK Stack更新（API routes追加）
- [ ] 環境変数設定（FEELCYCLE_MASTER_KEY）

### Frontend
- [ ] FEELCYCLEIntegrationModal.tsx モーダルコンポーネント
- [ ] FEELCYCLEStatusCard.tsx 状態表示コンポーネント
- [ ] /api/feelcycle/integrate.ts API route
- [ ] /api/feelcycle/status.ts API route
- [ ] settings/index.tsx 設定ページ更新
- [ ] useFEELCYCLEIntegration.ts カスタムフック

### Testing
- [ ] 認証情報入力テスト
- [ ] ログイン成功/失敗テスト
- [ ] データ取得・保存テスト
- [ ] UI状態変更テスト
- [ ] セキュリティテスト

## 🔧 トラブルシューティング

### よくある問題と解決策

1. **認証失敗**: 既存のenhanced-feelcycle-login.jsが正常動作することを確認
2. **タイムアウト**: Lambda関数のタイムアウト設定を60秒以上に設定
3. **CORS エラー**: API Gatewayでの適切なCORS設定
4. **暗号化エラー**: FEELCYCLE_MASTER_KEYの環境変数設定確認

この実装により、完全なFEELCYCLE連携機能が実現できます。
