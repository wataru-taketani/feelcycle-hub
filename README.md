# FEELCYCLE Hub

FEELCYCLEユーザーのレッスン予約・管理体験を向上させるサポートサービス

## 機能

- レッスンキャンセル待ち通知
- 自動予約機能  
- 受講履歴分析
- 残レッスン数表示

## 技術スタック

- **Backend**: AWS Lambda (Node.js 20) + API Gateway
- **Frontend**: Next.js 14 (Static Export) + Netlify
- **Database**: DynamoDB
- **Infrastructure**: AWS CDK
- **Notification**: LINE Messaging API

## セットアップ

### 前提条件

- Node.js 20+
- AWS CLI設定済み
- LINE Developers Console アカウント

### インストール

```bash
npm run setup
```

### 開発サーバー起動

```bash
npm run dev
```

### デプロイ

```bash
# インフラ
cd infra
npm run deploy

# フロントエンド（Netlify経由）
cd frontend
npm run export
```

## プロジェクト構成

```
feelcycle-hub/
├─ backend/         # Lambda functions
├─ frontend/        # Next.js static site
├─ infra/          # AWS CDK
├─ docs/           # Documentation
└─ scripts/        # Utility scripts
```

## 開発

- [要件定義](./docs/requirements.md)
- [技術仕様](./docs/technical-spec.md)  
- [API仕様](./docs/openapi.yaml)

## コスト管理

月額上限: 1,000円（AWS Budgets監視）

詳細: [コスト試算](./docs/cost.md)