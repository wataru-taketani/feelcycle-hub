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

## Phase 3 完了: 本番リリース (2025-08-02)

### 本番デプロイ状況
- ✅ Lambda関数更新: `feelcycle-hub-main-dev` (LastModified: 2025-08-02T10:27:13.000+0000)
- ✅ API Gateway: `/user/preferences/favorites` エンドポイント稼働
- ✅ DynamoDB: `feelcycle-hub-user-settings-dev` テーブル運用中
- ✅ フロントエンド: Netlify自動デプロイ完了 (https://feelcycle-hub.netlify.app/)
- ✅ Git: main ブランチにコミット・プッシュ完了

### 最終検証結果

#### バックエンド本番稼働確認
```bash
✅ GET /user/preferences/favorites (200 OK - 即座レスポンス)
✅ PUT /user/preferences/favorites (保存成功)
✅ 既存APIエンドポイント無影響 (/studios 正常動作)
✅ DynamoDB永続化機能確認済み
```

#### フロントエンド本番確認
```bash
✅ Netlify本番サイト稼働中 (200 OK)
✅ 自動デプロイパイプライン動作
✅ ビルド成功・型安全性確保
✅ バックワード互換性維持
```

### 重要な実装ポイント
1. **ゼロダウンタイム実現**: 既存機能を維持しながら新機能追加
2. **段階的移行戦略**: LocalStorage → ハイブリッド → 完全サーバー管理
3. **フォールバック設計**: API障害時の自動復旧機能
4. **データ整合性**: マージロジックによる重複排除

### 運用監視事項
- DynamoDB read/write capacity監視
- Lambda関数実行時間・エラー率
- フロントエンド同期ステータス
- ユーザー体験品質メトリクス

**✅ お気に入り機能サーバーサイド統合: 本番リリース完了**

## Phase 2.1: スタジオUI統一化対応 (2025-08-02)

### 要件
https://feelcycle-hub.netlify.app/settings/ のお気に入りスタジオ表示をレッスン検索画面と同じ表示形式に統一

### 実装概要
レッスン検索画面のスタジオ選択UIを分析し、再利用可能な共通コンポーネント化を実施。

### 実装されたファイル

#### 新規作成
- ✅ `frontend/src/components/shared/StudioGrid.tsx` - 共通スタジオ選択コンポーネント

#### 更新
- ✅ `frontend/src/app/settings/page.tsx` - 新しい共通コンポーネント使用に更新

### 技術的改善点

#### 1. UI統一化
- **地域別グループ化**: EAST AREA │ 関東、WEST AREA │ 東海・関西等
- **3列グリッドレイアウト**: 検索画面と同じ表示形式
- **エリア選択機能**: 地域ごとの一括選択ボタン追加
- **折りたたみ式デザイン**: Collapsibleコンポーネントで省スペース化

#### 2. データソース統一
- **API優先取得**: `/studios` エンドポイントからの動的データ
- **フォールバック機能**: 静的データによる安全な表示
- **データ正規化**: APIデータ（大文字コード）とローカルデータ（小文字id）の統一処理

#### 3. 機能拡張
- **選択状態表示**: Badge componentによる視覚的フィードバック
- **一括操作**: 「すべて選択」「すべて解除」「エリア選択」機能
- **検索統合**: 既存のお気に入り連携機能との親和性

### コンポーネント設計

#### StudioGrid Props
```typescript
interface StudioGridProps {
  mode: 'search' | 'favorites';           // 使用コンテキスト
  selectedStudios: string[];              // 選択済みスタジオID配列
  onStudioChange: (id: string, selected: boolean) => void;  // 選択変更ハンドラー
  showAreaSelection?: boolean;            // エリア選択ボタン表示
  showFavoriteIntegration?: boolean;      // お気に入り連携ボタン表示
  favoriteStudios?: string[];             // お気に入りスタジオID配列
  onSelectFavorites?: () => void;         // お気に入り一括選択ハンドラー
}
```

#### 車輪の再発明を避けた設計
- 検索画面の実装ロジックを詳細分析
- 既存のCollapsible、Badge、ScrollAreaコンポーネント活用
- 既存のスタジオデータ取得・表示パターンを踏襲

### 安全性確保
- ✅ バックアップ作成: `BACKUP_STUDIO_UI_UNIFICATION_20250802_*`
- ✅ 既存機能保持: 設定画面の他機能に影響なし
- ✅ フォールバック機能: API障害時の安全な表示
- ✅ ビルド確認: 型安全性・コンパイル成功確認

### ユーザーエクスペリエンス向上
1. **一貫性**: 検索画面とお気に入り設定で同じUI体験
2. **効率性**: エリア別一括選択で設定作業の簡素化
3. **視認性**: 地域別グループ化で日本全国スタジオの整理された表示
4. **操作性**: 折りたたみ式で画面スペースの有効活用

### 開発メモ更新
- レッスン検索画面のスタジオ選択実装の詳細分析完了
- 共通コンポーネント化によるコード再利用率向上
- 地域別グループ化ロジックの統一実現
- 将来的な新スタジオ追加・地域拡大への対応基盤構築

**✅ スタジオUI統一化: 実装完了**

## Phase 2.2: スタジオボタン視覚フィードバック改善 (2025-08-02)

### 問題点
- 選択されたスタジオボタンの視認性不良（白文字で見づらい）
- 選択時の背景色変化タイミングの遅延
- 不要な折りたたみ機能による操作性の複雑化

### 実装された改善

#### 1. 折りたたみ機能削除
- Collapsibleコンポーネントを削除
- 常時展開表示でアクセシビリティ向上
- シンプルな固定ヘッダー形式に変更

#### 2. 選択状態の視覚フィードバック強化
```typescript
// 改善前: 基本的なvariant切り替えのみ
variant={isSelected ? "default" : "outline"}

// 改善後: 明示的なスタイリングと即座反映
className={`transition-all duration-150 ${
  isSelected 
    ? "bg-primary text-primary-foreground hover:bg-primary/90" 
    : "hover:bg-accent hover:text-accent-foreground"
}`}
```

#### 3. パフォーマンス改善
- 不要なstate削除（`isStudioOpen`）
- Import削除（Collapsible関連）
- バンドルサイズ削減（14.5kB → 13.7kB）

### 技術的改善点

#### 即座の視覚フィードバック
- `transition-all duration-150` による高速トランジション
- 明示的な`bg-primary`/`text-primary-foreground`指定
- ホバー状態の適切な差別化

#### アクセシビリティ向上
- 常時表示による操作性向上
- 選択状態の明確な視覚的区別
- カラーコントラストの改善

### 安全性確保
- ✅ バックアップ作成: `BACKUP_STUDIO_BUTTON_FIX_20250802_*`
- ✅ 既存機能保持: 他の設定項目への影響なし
- ✅ ビルド確認: 型安全性・パフォーマンス改善確認

**✅ スタジオボタン視覚フィードバック改善: 実装完了**

## Phase 2.3: タブボタン選択状態の視認性改善 (2025-08-02)

### 追加問題の発見
設定画面のお気に入りタブ（「スタジオ」「インストラクター」切り替え）の選択状態が白背景で視認性が悪い問題を発見。

### 実装された改善

#### TabsTriggerの選択状態スタイリング強化
```typescript
// 改善前: デフォルトのタブスタイリング
<TabsTrigger value="studios" className="flex items-center gap-2">

// 改善後: 明示的な選択状態スタイリング
<TabsTrigger 
  value="studios" 
  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
>
```

#### 技術的詳細
- `data-[state=active]:bg-primary` - 選択時に黒背景適用
- `data-[state=active]:text-primary-foreground` - 選択時に白文字適用
- スタジオ・インストラクター両タブに統一適用

### 安全性確保
- ✅ バックアップ作成: `BACKUP_TABS_STYLING_FIX_20250802_*`
- ✅ 既存機能保持: タブ切り替え機能への影響なし
- ✅ ビルド確認: スタイリング競合なし確認

### 統一されたUI体験
これで設定画面内の全ての選択可能要素（タブ、スタジオボタン）が一貫した視覚フィードバックを提供:
- 選択状態: 黒背景 + 白文字
- 非選択状態: アウトライン + 通常文字色
- 即座反映: transition効果による滑らかな状態変化

**✅ タブボタン選択状態視認性改善: 実装完了**

## Phase 2.4: 不要なスタジオヘッダー削除 (2025-08-02)

### 重複UI要素の削除
タブ内のスタジオコンテンツで不要なヘッダー（「スタジオ」ラベル + バッジ）を削除。タブ自体に「スタジオ (3)」と表示されているため重複。

### 実装された改善

#### ヘッダー要素の完全削除
```typescript
// 削除前: 重複するヘッダー表示
<div className="flex items-center gap-2">
  <MapPin className="w-4 h-4" />
  <span className="font-medium">スタジオ</span>
  {selectedStudios.length > 0 && (
    <Badge variant="secondary" className="ml-2">
      {selectedStudios.length}
    </Badge>
  )}
</div>

// 削除後: ヘッダーなしでコンテンツ直接表示
<div className="space-y-4">
  {/* 選択済みスタジオ表示から開始 */}
```

#### コード最適化
- 不要な`MapPin`アイコンインポート削除
- 重複するバッジ表示削除（タブに統一）
- インデントレベル最適化

### UI簡素化効果
1. **視覚的重複排除**: タブタイトルとコンテンツ内ヘッダーの二重表示解消
2. **垂直スペース効率化**: 不要なヘッダー分のスペース削減
3. **情報階層明確化**: タブがコンテンツのタイトル役割を担当

### 技術的改善
- コンポーネントの責任範囲明確化
- 不要なインポート削除によるバンドル最適化
- シンプルなDOM構造による描画パフォーマンス向上

**✅ 不要なスタジオヘッダー削除: 実装完了**

## Phase 2.5: タブ選択時の背景色を白に変更 (2025-08-02)

### 要件
タブの選択状態の背景色を黒から白に変更して視認性を改善。

### 実装された変更

#### タブ選択状態のスタイリング変更
```typescript
// 変更前: 黒背景 + 白文字
className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"

// 変更後: 白背景 + 通常文字色 + ボーダー
className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-border"
```

#### 技術的詳細
- `data-[state=active]:bg-background` - 選択時に白背景適用
- `data-[state=active]:text-foreground` - 選択時に通常の文字色適用
- `data-[state=active]:border-border` - 選択時にボーダー追加で区別

### 視覚的改善効果
1. **可読性向上**: 白背景により文字が読みやすく
2. **UI一貫性**: 他の白背景要素との統一感
3. **アクセシビリティ**: コントラスト比の改善

### 設計思想の統一
- **タブ**: 白背景で選択状態を表現
- **スタジオボタン**: 黒背景で選択状態を表現
- 用途に応じた適切な視覚的フィードバック

**✅ タブ選択時の背景色変更: 実装完了**

## 🚧 進行中の開発 - FEELCYCLE Account Integration (2025-08-03)

### FEELCYCLEアカウント連携機能実装完了 ✅

**目的**: FEELCYCLEサイトのマイページ情報を自動取得し、ユーザーの所属店舗・会員種別・予約状況・受講履歴を統合管理

**要件実現状況**:
- ✅ 所属店舗・会員種別フィールドの条件表示（連携前は非表示）
- ✅ FEELCYCLEアカウント連携ボタン・モーダル実装
- ✅ ID（メールアドレス）・パスワード入力フォーム
- ✅ 単一ログイン検証（自動リトライなし、アカウントロック防止）
- ✅ パスワード暗号化・AWS Secrets Manager保存
- ✅ マイページ情報永続化・DynamoDB保存
- ✅ 90日TTL設定・自動データ削除

### 実装アーキテクチャ

#### フロントエンド
```
/src/components/auth/FeelcycleAuthModal.tsx
├── メール・パスワード入力フォーム
├── バリデーション・エラーハンドリング
├── 認証成功・進行状態表示
└── セキュリティ注意事項

/src/app/settings/page.tsx
├── 連携状態に応じた条件分岐UI
├── 連携済み: 所属店舗・会員種別表示
└── 未連携: 連携ボタン・モーダル起動
```

#### バックエンド
```
/src/services/feelcycle-auth-service.ts
├── Puppeteer + Chromium ログイン検証
├── crypto.createCipher パスワード暗号化
├── AWS Secrets Manager 認証情報保存
├── マイページ情報スクレイピング
└── DynamoDB データ永続化

/src/handlers/feelcycle-auth.ts
├── POST /feelcycle/auth/verify (ログイン認証)
├── GET /feelcycle/auth/status (連携状況確認)
├── バリデーション・エラー分類
└── CORS対応・セキュリティヘッダー
```

#### インフラストラクチャ
```
AWS DynamoDB
├── feelcycle-hub-user-feelcycle-data-dev (新規作成)
├── TTL 90日設定
└── ユーザー情報・予約・受講履歴保存

AWS Secrets Manager
├── feelcycle-user-credentials (新規作成)
└── 暗号化パスワード・ソルト保存

Lambda Environment Variables
├── FEELCYCLE_DATA_TABLE
├── FEELCYCLE_CREDENTIALS_SECRET
└── USER_TABLE (既存テーブル拡張)
```

### データスキーマ設計

#### feelcycle-hub-user-feelcycle-data-dev
```typescript
interface FeelcycleUserData {
  userId: string;                        // LINE userId (PK)
  feelcycleEmail: string;                // FEELCYCLEログインメール
  lastUpdated: string;                   // 最終更新日時
  homeStudio: string;                    // 所属店舗
  membershipType: string;                // 会員種別
  currentReservations: ReservationItem[]; // 現在の予約状況
  lessonHistory: LessonHistoryItem[];    // 受講履歴
  dataScrapedAt: string;                 // データ取得日時
  ttl: number;                          // 90日後自動削除
}
```

#### feelcycle-hub-users-dev 拡張
```typescript
// 新規フィールド追加 (2/2 ユーザー更新完了)
feelcycleAccountLinked: boolean;        // FEELCYCLE連携済みフラグ
feelcycleLastVerified: string;          // 最終検証日時
```

### セキュリティ実装

#### パスワード保護
- **暗号化**: crypto.createCipher('aes256') + ランダムソルト
- **保存場所**: AWS Secrets Manager (KMS暗号化)
- **アクセス制御**: Lambda実行ロールのみ参照可能

#### アカウント保護
- **単一試行ポリシー**: ログイン失敗時の自動リトライなし
- **エラーハンドリング**: 適切なエラーメッセージ・ステータスコード
- **タイムアウト**: 30秒でタイムアウト・エラー通知

### テスト・デプロイ結果

#### Lambda Function Update
```bash
✅ feelcycle-hub-main-dev 更新成功
✅ Handler: dist/handlers/main.handler
✅ Environment Variables: 17項目設定
✅ Code Size: 199,043 bytes
```

#### API Endpoint Test
```bash
✅ GET /feelcycle/auth/status テスト成功
✅ レスポンス: {"success":true,"linked":false,"data":null}
✅ CORS Headers: 正常設定
✅ Error Handling: 正常動作
```

#### Database Setup
```bash
✅ DynamoDB テーブル作成: feelcycle-hub-user-feelcycle-data-dev
✅ TTL設定: ttl フィールド・90日自動削除
✅ Secrets Manager: feelcycle-user-credentials 作成
✅ ユーザーテーブル拡張: 2/2 ユーザー更新完了
```

#### Frontend Build
```bash
✅ Next.js Build: 成功
✅ TypeScript Compilation: エラーなし
✅ Bundle Size: 179kB (settings page)
✅ Static Generation: 11/11 pages
```

### バックアップ管理

**作成済みバックアップ**:
```
BACKUP_FEELCYCLE_AUTH_INTEGRATION_20250803_121700/
├── README.md (実装詳細・技術仕様)
├── auth/FeelcycleAuthModal.tsx
├── page.tsx (設定画面)
├── feelcycle-auth-service.ts
└── feelcycle-auth.ts
```

### 技術的ハイライト

#### 1. スクレイピング最適化
- **Lambda対応**: Chromium実行可能ファイル・メモリ管理
- **ブラウザ偽装**: User-Agent設定・リアルブラウザ模倣
- **エラー耐性**: ネットワーク・タイムアウト・要素取得エラー対応

#### 2. データ整合性
- **型安全性**: TypeScript interface定義・コンパイル時チェック
- **バリデーション**: 入力検証・メール形式チェック
- **永続化戦略**: DynamoDB項目更新・部分取得対応

#### 3. ユーザビリティ
- **即座フィードバック**: ローディング状態・成功アニメーション
- **エラー通知**: 分かりやすいメッセージ・復旧手順案内
- **セキュリティ透明性**: 暗号化・保存方法の明示

### 運用監視項目

#### 成功率監視
- [ ] FEELCYCLE ログイン成功率
- [ ] データ取得完了率  
- [ ] API レスポンス時間

#### セキュリティ監視
- [ ] Secrets Manager アクセスログ
- [ ] 異常なログイン試行パターン
- [ ] DynamoDB データ整合性

#### ユーザー体験監視
- [ ] モーダル完了率
- [ ] エラー発生頻度
- [ ] サポート問い合わせ傾向

### 将来拡張計画

#### Phase 2: 動的データ更新
- [ ] 定期的なマイページ情報同期（日次・週次）
- [ ] 予約状況変更の自動検知・通知
- [ ] 受講履歴の増分取得・ページネーション対応

#### Phase 3: 高度な機能統合
- [ ] feelcycle-hub レッスン検索との連携
- [ ] お気に入りインストラクター・スタジオ自動設定
- [ ] 受講パターン分析・レコメンデーション機能

#### Phase 4: 運用最適化
- [ ] エラー自動復旧・リトライ機能
- [ ] CloudWatch Logs・アラート統合
- [ ] パフォーマンス監視・最適化

## FEELCYCLEアカウント連携デバッグ・問題解決記録 (2025-08-03)

### 発生した問題と根本原因

#### 1. ChromiumのWebSocket接続エラー
**症状**: `Protocol error (Target.setDiscoverTargets): Target closed`、`socket hang up`
**根本原因**: 
- Lambda環境でのChromium起動設定が不適切
- @sparticuz/chromiumの設定パラメータが最適化されていない
- メモリ不足によるプロセス強制終了

**解決策**:
```typescript
// 修正前: 基本的な設定のみ
browser = await puppeteer.launch({
  args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
  defaultViewport: { width: 1280, height: 720 },
  executablePath,
  headless: true,
});

// 修正後: Lambda環境最適化
browser = await puppeteer.launch({
  args: [
    ...chromium.args,
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-plugins',
    '--disable-images',
    '--single-process',
    '--memory-pressure-off',
    '--max_old_space_size=4096',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding'
  ],
  defaultViewport: { width: 1280, height: 720 },
  executablePath,
  headless: true,
  timeout: 60000
});
```

#### 2. FEELCYCLEログインURL間違い（404エラー）
**症状**: `<!DOCTYPE html><title>404 Not Found</title>`
**根本原因**: 
- **開発者（Claude）が勝手にURL `https://www.feelcycle.com/feelcycle_reserve/my_page_login.php` を推測・創作した**
- FEELCYCLEの実際のログインURLを事前調査せずに、ありそうなURLパターンで実装
- 外部サービスのURL構造を憶測で決めつけた重大なミス

**解決策**:
```typescript
// 修正前: 勝手に推測した間違ったURL（404エラー）
await page.goto('https://www.feelcycle.com/feelcycle_reserve/my_page_login.php', {
  waitUntil: 'networkidle2',
  timeout: 30000
});

// 修正後: WebSearchで調査して発見した正しいURL
await page.goto('https://m.feelcycle.com/mypage/login', {
  waitUntil: 'networkidle2',
  timeout: 30000
});
```

#### 3. セレクター検出の脆弱性
**症状**: `Waiting for selector 'input[name="email"]' failed: Waiting failed: 10000ms exceeded`
**根本原因**:
- 単一セレクターへの過度な依存
- フロントエンドの動的変更に対する対応不足
- フォールバック機能の欠如

**解決策**:
```typescript
// 修正前: 固定セレクター
await page.waitForSelector('input[name="email"]', { timeout: 10000 });

// 修正後: 包括的フォールバック
const emailSelectors = [
  'input[name="email"]',
  'input[name="Email"]', 
  'input[type="email"]',
  'input[id="email"]',
  '#email',
  '#login_email',
  'input[placeholder*="メール"]',
  // ... 多数のフォールバック
];

let emailInput = null;
for (const selector of emailSelectors) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 });
    emailInput = selector;
    console.log('有効なメールセレクター発見:', selector);
    break;
  } catch (e) {
    console.log('セレクター無効:', selector);
  }
}
```

### 技術的反省点

#### 1. 外部サービスのURL構造を推測で実装した重大ミス
**問題**: FEELCYCLEの実際のURLを調査せず、勝手に推測して実装した
**改善**: 
- **実装前に必ずWebSearchやブラウザで実際のURLを確認する**
- スクレイピング対象サイトの事前調査を必須工程にする
- 外部サービス依存機能では憶測を排除し、事実確認を徹底する

#### 2. Lambda環境での動作検証不足
**問題**: ローカル環境では動作するがLambda環境で失敗
**改善**:
- CI/CDパイプラインでのLambda環境テスト自動化
- Chromium/Puppeteerの環境別設定パターン標準化
- メモリ使用量・実行時間の事前ベンチマーク

#### 3. エラーハンドリングの不備
**問題**: 根本原因特定に時間がかかった
**改善**:
- 段階別詳細ログ出力の標準実装
- エラー分類とフォールバック戦略の明文化
- デバッグ情報（HTML出力、スクリーンショット）の自動取得

### 開発プロセスの改善案

#### 1. スクレイピング機能開発標準手順
```
1. 対象サイト構造調査・ドキュメント化
2. 複数環境（ローカル・Lambda）での動作確認
3. セレクター・URL変更対応のフォールバック実装
4. 段階的エラーハンドリング・ログ出力
5. 外部変更検知の監視システム構築
```

#### 2. Lambda関数開発ベストプラクティス
```
1. メモリ・タイムアウト制限を考慮した設計
2. 環境別設定パラメータの標準化
3. 依存関係（Layer、パッケージ）の事前検証
4. ローカル→Lambda環境の段階的デプロイ
```

### 学んだ教訓

1. **憶測での実装は絶対にダメ**: 外部サービスのURL・構造は必ず事前調査する
2. **環境差異の重要性**: ローカル開発環境とLambda本番環境の設定差異は大きな影響を与える
3. **包括的エラーハンドリングの価値**: 詳細なログ出力により問題特定時間を大幅短縮
4. **フォールバック機能の必要性**: 単一依存ではなく複数の代替手段を常に準備
5. **自分の間違いを認める重要性**: 「システム変更」ではなく「実装ミス」は素直に認める

### 今後の予防策

- [ ] FEELCYCLEサイト構造の月次監視
- [ ] Chromium/Puppeteer設定の環境別テンプレート化
- [ ] スクレイピング機能の自動健全性チェック
- [ ] 外部サービス変更検知アラートシステム

## タイムアウト最適化対応 (2025-08-03)

### 発生していた問題
フロントエンドから「サーバーとの通信に失敗しました。インターネット接続を確認してください。」エラーが継続発生

### 根本原因
- **Lambda関数のタイムアウト**: 初期設定900秒（15分）でAPI Gateway制限30秒を超過
- **Puppeteer処理の長時間実行**: Chromium起動・ページロード・セレクター検出で30秒以上要していた
- **API Gateway制約**: 最大29秒でタイムアウトのため、Lambda側で30秒以内完了が必要

### 実装した最適化

#### 1. Lambda関数タイムアウト設定変更
```bash
# 変更前: 900秒（15分）
# 変更後: 30秒
aws lambda update-function-configuration --function-name feelcycle-hub-main-dev --timeout 30
```

#### 2. Puppeteer設定の大幅最適化
```typescript
// Chromium起動タイムアウト短縮
timeout: 15000  // 30秒 → 15秒

// ページ読み込み戦略変更
waitUntil: 'domcontentloaded'  // 'networkidle2' → 'domcontentloaded'
timeout: 15000  // 30秒 → 15秒

// セレクター検出タイムアウト大幅短縮
{ timeout: 500 }  // 2000ms → 500ms

// ナビゲーション待機最適化
{ waitUntil: 'domcontentloaded', timeout: 10000 }  // networkidle2 30秒 → domcontentloaded 10秒
```

#### 3. エラーハンドリング戦略
- **早期失敗**: 長時間処理の代わりに明確なエラーメッセージ
- **タイムアウト明示**: ユーザーに適切な再試行案内
- **段階的処理**: 要素検出失敗時の包括的フォールバック

### 技術的決定事項

#### waitUntil戦略の変更理由
- **networkidle2**: ネットワーク活動停止まで待機（時間がかかる）
- **domcontentloaded**: DOM構築完了で継続（最小限の待機）
- **結果**: ページ相互作用開始までの時間を大幅短縮

#### セレクター検出の高速化
- **以前**: 各セレクターで2秒待機 → 全体で数十秒
- **現在**: 各セレクターで0.5秒待機 → 全体で数秒
- **フォールバック**: 複数セレクターで高い成功率維持

### 期待される効果
1. **フロントエンドエラー解消**: API Gateway制限内での処理完了
2. **ユーザー体験向上**: より早いレスポンス時間
3. **システム安定性**: タイムアウトによる不明エラーの削減

### 監視すべき指標
- [ ] FEELCYCLE認証API成功率
- [ ] 平均レスポンス時間（目標: 15秒以内）
- [ ] フロントエンド通信エラー発生率
- [ ] Lambda実行時間・メモリ使用量

### 今後の改善案
- [ ] さらなるChromium最適化（ヘッドレスモード強化）
- [ ] キャッシュ機能実装（認証セッション再利用）
- [ ] 非同期処理分離（即座レスポンス + バックグラウンド処理）

**✅ タイムアウト最適化対応: 実装完了**

**✅ FEELCYCLEアカウント連携機能: 基本実装完了（重要な学習事項含む）**

## 次のステップ（将来的な改善案）
- [ ] CloudWatch Logsとの連携強化
- [ ] Slackアラート機能追加
- [ ] スタジオ別成功率監視
- [ ] レッスン予約機能との連携
- [ ] スタジオ営業時間・休業日情報の取得

---

**プロジェクト完了日**: 2025-07-29 (レッスンデータ取得システム)  
**FEELCYCLEアカウント連携完了日**: 2025-08-03  
**ステータス**: 本番運用準備完了 ✅  
**最終確認**: 全37スタジオ・5,180+レッスンデータ取得成功 + FEELCYCLE認証基盤構築完了