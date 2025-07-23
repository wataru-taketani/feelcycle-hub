# FEELCYCLE HUB 開発メモ

## 📋 プロジェクト概要
FEELCYCLE（フィットネススタジオ）のレッスン予約を効率化するWebアプリケーション。  
リアルタイムでのキャンセル待ち監視とLINE通知機能を提供。

## 🏗️ アーキテクチャ
### フロントエンド
- **技術**: Next.js 14, TypeScript, Tailwind CSS
- **デプロイ**: Netlify
- **URL**: https://feelcycle-hub.netlify.app/

### バックエンド  
- **技術**: AWS Lambda (Node.js 20.x), TypeScript
- **API**: API Gateway REST API
- **データベース**: DynamoDB (複数テーブル構成)
- **認証**: LINE Login
- **通知**: LINE Messaging API
- **監視**: EventBridge + CloudWatch

### インフラ
- **IaC**: AWS CDK
- **リージョン**: ap-northeast-1 (東京)

## 📚 主要機能

### ✅ 実装完了
1. **レッスン検索・表示**
   - スタジオ・日付別のレッスン一覧
   - リアルタイムの空席状況表示
   - レッスン詳細情報

2. **キャンセル待ち管理**
   - レッスンのキャンセル待ち登録
   - 状態管理（active/paused/notified）
   - 一括操作（再開・一時停止・削除）

3. **リアルタイム監視システム**
   - EventBridge による1分間隔の自動監視
   - Puppeteer を使ったWebスクレイピング
   - 効率的なスタジオ別バッチ処理

4. **LINE通知機能** ✅
   - 空席検出時の即座の通知
   - LINE Login による認証
   - LINE Messaging API 連携
   - **テスト確認済み**: 2025/7/22 正常にテスト通知が送信されることを確認

5. **ユーザー管理**
   - LINE認証によるログイン
   - ユーザー別のキャンセル待ち管理

### ⚠️ 現在の課題・バグ
1. **[HIGH] キャンセル待ち登録の500エラー**
   - 状況: 新規登録時に Internal Server Error が発生
   - 原因: 調査中（日付変更による影響の可能性）
   - 影響: 基本機能が使用不可

2. **[MEDIUM] UIの不具合**
   - 再開機能の失敗
   - 予約サイトリンクの不正
   - 終了済みタブでのアプリケーションエラー

3. **[LOW] スクレイピングの不安定性**
   - Puppeteer の TargetCloseError の頻発
   - Lambda環境でのブラウザインスタンス管理

## 🔧 技術的な実装詳細

### DynamoDB テーブル構成
```
feelcycle-hub-waitlist-dev
├── PK: userId, SK: waitlistId (composite key)
├── GSI: StatusLessonDateTimeIndex (status, lessonDateTime)
└── 属性: studioCode, lessonDate, startTime, lessonName, instructor, etc.

feelcycle-hub-users-dev  
├── PK: userId
└── 属性: lineUserId, displayName, settings, etc.

feelcycle-hub-lessons-dev
feelcycle-hub-studios-dev  
feelcycle-hub-reservations-dev
feelcycle-hub-lesson-history-dev
```

### Lambda Functions
- **メイン関数**: `feelcycle-hub-main-dev`
  - API Gateway のリクエストハンドリング
  - EventBridge イベント処理
  - waitlist監視の実行

### EventBridge Rules
- **waitlist-monitor-rule**: 1分間隔でwaitlist監視を実行

### Secrets Manager
```json
feelcycle-hub/line-api/dev:
{
  "channelAccessToken": "cnWYtLMsAgp0CmUAkFVg2ujd1mvfRv1IOFHl4JHcJgyY2JQ1XEMaKkBqji+OcWpRO/vduKuWxKjrZBF11Msi5VFyss1G7BysarEJkhBEPUA0ymyRrIwIhQin13hifJ228JFhFt/XTd3EljzHm3bjAgdB04t89/1O/w1cDnyilFU=",
  "channelSecret": "62724874405c817405d43f7171b455f2",
  "botUserId": "Ud1382f998e1fa87c37b4f916600ff962"
}

feelcycle-hub/user-credentials/dev:
{
  // FEELCYCLE公式サイトのログイン認証情報
}
```

## 🚨 開発ルール・注意事項

### 必須ルール
1. **テストの徹底**: 機能変更時は必ず動作テストを実施
2. **バックアップ**: 本番データを扱うため、重要な変更前にはバックアップを取る
3. **段階的デプロイ**: 一度に大きな変更をせず、小さな単位で確認
4. **ログ確認**: エラー発生時は CloudWatch Logs を必ず確認
5. **パラメータチェック**: LINE APIなどの認証情報は正確性を必ず検証

### デプロイフロー
```bash
# バックエンド
cd backend/
npm run build
zip -r lambda-function.zip dist/
aws lambda update-function-code --function-name feelcycle-hub-main-dev --zip-file fileb://lambda-function.zip

# インフラ（必要に応じて）  
cd ../infra/
npm run deploy
```

## 📝 今後のタスク

### 🔥 緊急対応
- [ ] キャンセル待ち登録500エラーの原因調査・修正
- [ ] 日付変更に対する堅牢なシステム設計の実装

### 🎯 優先度高
- [ ] UIバグの修正（再開機能、リンク、エラーハンドリング）
- [ ] スクレイピングの安定性向上
- [ ] エラーログの改善・監視強化

### 🔮 将来対応
- [ ] レスポンシブデザインの改善
- [ ] パフォーマンス最適化
- [ ] テスト自動化
- [ ] 多言語対応

## 🐛 デバッグ情報

### よく使うコマンド
```bash
# Lambda ログ確認
aws logs tail "/aws/lambda/feelcycle-hub-main-dev" --since 10m

# Lambda 関数テスト
aws lambda invoke --function-name feelcycle-hub-main-dev --payload file://test-payload.json response.json

# DynamoDB テーブル確認  
aws dynamodb scan --table-name feelcycle-hub-waitlist-dev --limit 5
```

### トラブルシューティング
1. **500エラー発生時**
   - CloudWatch Logs でスタックトレースを確認
   - DynamoDB のアクセス権限を確認
   - 環境変数の設定を確認

2. **LINE通知が届かない**
   - Secrets Manager の認証情報を確認
   - ユーザーのLINE User ID を確認
   - LINE API のレスポンスログを確認

3. **スクレイピングエラー**
   - Lambda のメモリ・タイムアウト設定を確認
   - Puppeteer の設定を確認（--no-sandbox等）

## 📊 重要なメトリクス
- **Lambda実行時間**: 通常30-60秒（スクレイピング含む）
- **DynamoDB読み書き**: 監視1回あたり数十回のアクセス
- **LINE API呼び出し**: 通知1回あたり1リクエスト
- **スケジュール頻度**: 1分間隔での監視実行

## 🔒 セキュリティ考慮事項
- すべての認証情報は Secrets Manager で管理
- Lambda 実行ロールは最小権限の原則
- CORS設定でオリジンを制限
- ユーザー入力のサニタイゼーション実装

---
最終更新: 2025年7月22日
作成者: Claude Code Assistant