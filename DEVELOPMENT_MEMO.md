# FEELCYCLE Hub 開発メモ

## 📋 プロジェクト概要

**目的**: FEELCYCLEのレッスン予約サポート（キャンセル待ち監視）
**技術スタック**: 
- Frontend: Next.js + TypeScript + Tailwind CSS + LIFF SDK
- Backend: AWS Lambda + DynamoDB + API Gateway
- Deployment: Netlify (frontend) + AWS CDK (backend)

## 🏗️ アーキテクチャ

### Frontend (Next.js)
- **URL**: https://feelcycle-hub.netlify.app
- **認証**: LINE LIFF SDK (ID: 2007687052-B9Pqw7Zy)
- **機能**: レッスン検索、キャンセル待ち管理、通知履歴

### Backend (AWS Lambda)
- **API Gateway**: https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev
- **Lambda**: Node.js 20.x, ARM64, 15分タイムアウト, 512MB
- **DynamoDB**: 5つのテーブル（users, lessons, waitlist, reservations, history）

## 🔧 開発履歴と重要な修正

### 2025-07-17: リアルデータ化プロジェクト完了

#### 1. スクレイピング最適化
**問題**: 初期実装では1スタジオあたり14リクエスト（各日付別）
**解決**: 1リクエストで全日付データを取得する方式に変更
**効果**: 処理時間を92.9%短縮（約15分 → 約1分）

```typescript
// 修正前: 日付ごとに個別リクエスト
for (const date of dates) {
  await searchLessons(studioCode, date);
}

// 修正後: 1回のリクエストで全日付取得
const allLessons = await searchAllLessons(studioCode);
```

#### 2. 自動更新システム構築
- **EventBridge**: 毎日3:00 AM (JST) に自動実行
- **監視**: CloudWatch Logs でエラー監視
- **データ管理**: TTLによる自動データ削除

#### 3. データ精度向上
**問題**: 座席数など存在しないデータを生成していた
**解決**: 実際にサイトから取得可能なデータのみ使用

```typescript
// 修正前: 想像で座席数を設定
availableSlots: 5,
totalSlots: 20,

// 修正後: サイトから取得不可能なデータはnull
availableSlots: null,
totalSlots: null,
```

### 2025-07-17: Network Error 問題解決

#### 問題の特定
- **症状**: フロントエンドでユーザー登録時にNetwork Error
- **原因**: API エンドポイントの不一致
  - フロントエンド: `https://cscrz3qax3.execute-api.ap-northeast-1.amazonaws.com/dev`
  - バックエンド: `https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev`

#### 解決方法
- `next.config.js`のAPIエンドポイントを正しいURLに修正
- フロントエンドの再ビルドとデプロイが必要

## ⚙️ 設定とコマンド

### 環境変数
```bash
# Backend
USERS_TABLE_NAME=feelcycle-hub-users-dev
LESSONS_TABLE_NAME=feelcycle-hub-lessons-dev
WAITLIST_TABLE_NAME=feelcycle-hub-waitlist-dev

# Frontend
NEXT_PUBLIC_API_BASE_URL=https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev
NEXT_PUBLIC_LIFF_ID=2007687052-B9Pqw7Zy
```

### デプロイコマンド
```bash
# Backend
cd infra
npm run deploy

# Frontend  
cd frontend
npm run build
# Netlifyへ自動デプロイ
```

### データ確認コマンド
```bash
# 特定日付のレッスンデータ確認
cd backend
npx ts-node check-shibuya-direct.ts  # 渋谷7/30
npx ts-node check-kawasaki-0724.ts   # 川崎7/24
```

## 🔍 監視・デバッグ

### ログ確認
- **CloudWatch Logs**: `/aws/lambda/feelcycle-hub-main-dev`
- **Netlify**: デプロイログとファンクションログ
- **ブラウザ**: DevTools Console でLIFF関連エラー

### エラーパターン
1. **Network Error**: エンドポイント不一致
2. **CORS Error**: ヘッダー設定不備
3. **Timeout Error**: Lambda実行時間超過
4. **DynamoDB Error**: テーブル権限不足

## 📦 依存関係

### Backend主要パッケージ
- `puppeteer`: Webスクレイピング
- `@aws-sdk/client-dynamodb`: DynamoDB操作
- `aws-lambda`: Lambda関数

### Frontend主要パッケージ
- `@line/liff`: LINE認証
- `axios`: HTTP通信
- `tailwindcss`: スタイリング
- `js-cookie`: セッション管理

## 🚨 重要な注意点

### 1. データ精度
- **絶対にダミーデータを生成しない**
- FEELCYCLEサイトから取得できないデータは null にする
- 特に座席数は推測・計算しない

### 2. スクレイピング設計
- サイト構造変更に備えた柔軟な実装
- エラー時の graceful degradation
- レート制限を考慮した適切な間隔

### 3. セキュリティ
- LIFF SDKの適切な初期化
- CSP設定でXSS対策
- 認証情報の環境変数管理

## 📈 今後の改善項目

### 短期目標
- [ ] フロントエンド再デプロイ（APIエンドポイント修正）
- [ ] 本格的なキャンセル待ち監視システム実装
- [ ] LINE通知機能の有効化

### 中期目標
- [ ] パフォーマンス最適化
- [ ] エラー監視・アラート強化
- [ ] ユーザビリティ改善

### 長期目標
- [ ] 多店舗対応
- [ ] 予約自動化機能
- [ ] 機械学習による空き予測

## 📞 トラブルシューティング

### よくある問題と解決法

1. **Lambda タイムアウト**
   - 処理時間の長いスクレイピングはタイムアウト値を調整
   - 現在設定: 15分（開発環境）

2. **DynamoDB スロットリング**
   - Pay-per-request モードで自動スケーリング
   - 必要に応じてプロビジョンドモードに変更

3. **LIFF 認証エラー**
   - LIFF ID の確認
   - ドメイン設定の確認
   - SDK バージョン互換性

## 📝 コード規約

### TypeScript
- 型安全性を最優先
- any 型の使用禁止
- 適切なエラーハンドリング

### 命名規則
- ファイル: kebab-case
- 関数・変数: camelCase  
- 定数: UPPER_SNAKE_CASE
- コンポーネント: PascalCase

### Git
- feat/fix/docs/refactor プレフィックス
- 日本語コミットメッセージOK
- プルリクエスト必須（本番環境）

---

**最終更新**: 2025-07-17
**担当者**: Claude + Wataru