# FEELCYCLE Hub - 開発メモ

## プロジェクト概要
FEELCYCLE公式サイトから最新のレッスンデータを自動取得し、ユーザーに提供するサービス

## 完成状況 ✅ 本番運用準備完了
- ✅ 全37スタジオのスクレイピング機能実装済み
- ✅ AWS Lambda + DynamoDB本番環境対応完了
- ✅ EventBridge日次スケジュール実行（毎日3:00 AM JST）
- ✅ 自動復旧システム実装・テスト完了
- ✅ 安全なDB更新（Mark-and-Sweep）機能実装
- ✅ レッスンデータ5,180+件取得・保存完了
- ✅ データ品質確認・表示ロジック修正完了

## システム設計

### アーキテクチャ
```
EventBridge (3:00 AM JST)
    ↓
AWS Lambda (progressive-daily-refresh)
    ↓
DynamoDB (studios, lessons, batch-status)
    ↓
Next.js Frontend
```

### 重要な設計決定事項

#### 1. Progressive Daily Refresh戦略
- **一度に1スタジオずつ処理**してLambdaタイムアウト回避
- バッチ処理状況をDynamoDBで管理
- 自動的に次のスタジオへチェーン実行

#### 2. 安全なDB更新 - Mark-and-Sweep方式
- **Mark Phase**: 新データに`lastScrapedAt`タイムスタンプ付与
- **Sweep Phase**: マークされていない古いデータを削除
- エラー時の巻き戻し・復旧機能付き

#### 3. 自動復旧システム
- エラーパターン別復旧戦略
- 無人運用での自動復旧機能
- システムヘルスチェック機能

## ファイル構成

### 本番システム
- `src/scripts/progressive-daily-refresh.ts` - メインバッチ処理
- `src/services/studios-service.ts` - スタジオデータ管理
- `src/services/lessons-service.ts` - レッスンデータ管理
- `src/services/real-scraper.ts` - FEELCYCLEサイトスクレイピング
- `src/services/auto-recovery-service.ts` - 自動復旧システム

### テスト・検証用
- `manual-daily-batch.js` - 手動バッチ実行スクリプト
- `check-current-data.js` - データ状況確認スクリプト
- `test-auto-recovery.js` - 自動復旧機能テスト
- `direct-all-studios-scraper.js` - 全スタジオ直接スクレイピング

## DynamoDB テーブル設計

### feelcycle-hub-studios-dev
```
{
  studioCode: string (PK),
  studioName: string,
  region: string,
  lastUpdated: string,
  lastScrapedAt: string,  // Mark-and-Sweep用
  batchStatus: string,    // pending/processing/completed/failed
  retryCount: number,     // エラー時再試行回数
  lastError: string       // 最後のエラーメッセージ
}
```

### feelcycle-hub-lessons-dev
```
{
  lessonId: string (PK),
  studioCode: string,
  lessonDate: string,
  lessonTime: string,
  programName: string,
  instructorName: string,
  availableSpots: number,
  createdAt: string
}
```

## 実行状況

### 最終テスト結果 (2025-07-29)
```
🎉 100% success rate: 37/37 studios processed successfully
📊 Total lessons: 5,180+ lessons across all studios
✅ Auto-recovery system: 100% test success rate
✅ Database cleanup: 74 → 37 studios (duplicates removed)
```

### 本番環境確認事項
- ✅ Lambda実行環境でChromium正常動作確認
- ✅ EventBridge日時スケジュール設定完了
- ✅ DynamoDB読み書き権限設定完了
- ✅ エラー発生時の自動復旧動作確認

## 運用方法

### 日次自動実行
```bash
# EventBridgeが毎日3:00 AM JSTに自動実行
# 手動実行の場合（開発・テスト用）
node manual-daily-batch.js
```

### データ確認
```bash
# 現在のデータ状況確認
node check-current-data.js

# 自動復旧機能テスト
node test-auto-recovery.js
```

### トラブルシューティング
```bash
# 全スタジオ強制再スクレイピング（緊急時）
node direct-all-studios-scraper.js
```

## 重要な学習事項

### 1. 本番環境での注意点
- Lambda環境ではChromium実行可能ファイルのパス設定が重要
- メモリ使用量管理とガベージコレクション
- スクレイピング間隔の適切な調整

### 2. エラーハンドリング
- ネットワークエラー、タイムアウト、スクレイピング失敗への対応
- データベース接続エラーからの自動復旧
- 部分失敗時の状態管理

### 3. スケーラビリティ
- Progressive処理による大量データ対応
- DynamoDBの効率的な読み書きパターン
- Lambda実行時間制限内での確実な処理

### 4. データ品質管理の重要性
- **問題**: check-current-data.jsで間違ったフィールド名参照
  - `lesson.lessonTime` → 正しくは `lesson.startTime`
  - `lesson.programName` → 正しくは `lesson.program`
  - `lesson.instructorName` → 正しくは `lesson.instructor`
- **影響**: 「undefined undefined」表示でデータ異常と誤認
- **対策**: TypeScript型定義とフィールド名の一貫性確保
- **学習**: 表面的な確認だけでなく、実データ構造の詳細検証が必要

## 次のステップ（将来的な改善案）
- [ ] CloudWatch Logsとの連携強化
- [ ] Slackアラート機能追加
- [ ] スタジオ別成功率監視
- [ ] レッスン予約機能との連携
- [ ] スタジオ営業時間・休業日情報の取得

---

**プロジェクト完了日**: 2025-07-29  
**ステータス**: 本番運用準備完了 ✅  
**最終確認**: 全37スタジオ・5,180+レッスンデータ取得成功