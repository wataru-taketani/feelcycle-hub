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

## 🚧 進行中の開発 (2025-08-02)

### 設定画面お気に入り機能本番化
**目的**: https://feelcycle-hub.netlify.app/settings/ のお気に入り機能を本番化

**現状分析**:
- ✅ LocalStorageベースのお気に入り機能実装済み
- ✅ インストラクター・スタジオ選択UI完成
- ✅ 通知設定管理機能あり
- ❌ サーバーサイド保存なし（デバイス間同期不可）

**実装済みインフラ**:
- ✅ DynamoDB `feelcycle-hub-user-settings-dev` テーブル作成
- ✅ Lambda環境変数 `USER_SETTINGS_TABLE` 設定済み
- ✅ API Gateway `/user-settings` エンドポイント作成
- ✅ user-settings.ts ハンドラー実装済み
- ⚠️ ルーティング調整必要

**決定した方針**: 選択肢B（フルサーバー移行）- 拡張性重視設計

**現状分析結果** (2025-08-02 詳細調査完了):
- 🔍 既存 `/user-lessons/favorites` = レッスン単位お気に入り（競合なし）
- 🎯 新機能 = インストラクター・スタジオお気に入り（全く別機能）
- ✅ 現在の設定画面 = LocalStorageベース（API無依存）
- ✅ リスク評価 = 非常に低い（新機能追加のため）

**段階的移行計画**:

### Phase 1: 新API実装（既存システム無影響）
```
新規追加:
- /auth/feelcycle/credentials    # FEELCYCLE認証情報
- /user/preferences/notifications # 通知設定  
- /user/preferences/favorites     # インストラクター・スタジオお気に入り
- /user/profile                  # プロフィール情報

既存保持:
- /user-lessons/favorites        # レッスンお気に入り（無変更）
- /auth/line/*                   # LINE認証（無変更）
```

### Phase 2: フロントエンド統合
```
- LocalStorage → サーバーサイド移行
- 設定画面のAPI統合
- データ移行ロジック実装
```

### Phase 3: 旧エンドポイント非推奨化（将来）
```
- auth.ts内のuser関連機能を段階的非推奨
- 完全移行後に旧エンドポイント削除
```

### 重要ルール確認済み
- ✅ 作業単位でのバックアップ必須
- ✅ 開発メモ更新必須
- ✅ 段階的移行で安全性確保
- ✅ 既存機能への影響ゼロ確認済み

## Phase 2 完了: フロントエンド統合実装 (2025-08-02)

### 実装概要
LocalStorageベースのお気に入り機能をサーバーサイドAPIと統合し、ハイブリッド管理システムを構築。

### 実装されたファイル

#### フロントエンド
- ✅ `frontend/src/services/userPreferencesApi.ts` - サーバーサイドAPI統合サービス
- ✅ `frontend/src/utils/userSettings.ts` - LocalStorage + サーバー統合ユーティリティ
- ✅ `frontend/src/app/settings/page.tsx` - 設定画面のサーバー統合対応

#### 実装した機能
1. **サーバーサイドAPI統合サービス**
   ```typescript
   fetchUserFavorites(userId): Promise<ServerUserFavorites | null>
   saveUserFavorites(userId, favorites): Promise<boolean>
   syncUserFavorites(userId, localFavorites): Promise<ServerUserFavorites | null>
   checkApiAvailability(): Promise<boolean>
   ```

2. **ハイブリッド管理機能**
   - LocalStorageとサーバーの自動同期
   - オフライン時のLocalStorageフォールバック
   - 重複排除マージロジック
   - 非同期エラーハンドリング

3. **ユーザーエクスペリエンス向上**
   - 同期ステータス表示（同期中/完了/エラー/ローカル）
   - 即座のローカル更新 + バックグラウンド同期
   - API障害時の安全なフォールバック

### 統合テスト結果

#### バックエンドAPI
```bash
✅ GET /user/preferences/favorites?userId=test-user-001
✅ PUT /user/preferences/favorites (保存成功)
✅ DynamoDB永続化確認
```

#### フロントエンド
```bash
✅ npm run build (コンパイル成功)
✅ TypeScript型安全性確認
✅ 既存機能の互換性保持
```

#### データベース確認
```bash
✅ DynamoDB: feelcycle-hub-user-settings-dev
✅ テストデータ正常保存・取得
✅ 既存テーブルとの分離確認
```

### 安全性確保
- ✅ バックアップ作成: `BACKUP_PHASE2_FRONTEND_20250802_*`
- ✅ 段階的実装: LocalStorage → ハイブリッド → フル統合
- ✅ フォールバック機能: API障害時の自動切り替え
- ✅ エラーハンドリング: 非破壊的エラー処理

### デプロイメント準備
- ✅ `lambda-deployment-favorites-integration.zip` 作成済み
- ✅ user-settings.tsコンパイル確認
- ✅ main.tsルーティング更新済み

### 移行戦略の実現
**フェーズ1**: サーバーサイドAPI実装 (✅完了)
**フェーズ2**: フロントエンド統合実装 (✅完了)
**フェーズ3**: 本番リリース・最終検証 (次期予定)

### 技術的ハイライト
1. **ゼロダウンタイム移行**: 既存LocalStorage機能を保持しつつ段階的サーバー統合
2. **レジリエンス設計**: API障害時の自動フォールバック機能
3. **データ整合性**: 重複排除機能付きマージロジック
4. **開発者体験**: TypeScript型安全性とエラーハンドリング

### 次期課題
- [ ] 通知設定のサーバー統合 (`/user/preferences/notifications`)
- [ ] FEELCYCLE認証情報管理 (`/auth/feelcycle/credentials`)
- [ ] プロフィール統合機能 (`/user/profile`)
- [ ] 本番環境での負荷テスト

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