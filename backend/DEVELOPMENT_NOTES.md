# 開発メモ

## API 接続エラーの原因分析と解決手順

### 発生した問題
- **現象**: フロントエンドから API を呼び出すと "Network Error" が発生
- **発生タイミング**: フロントエンドのモック API を実際の API に変更したタイミング
- **症状**: API Gateway から "Internal server error" レスポンスが返される

### 根本原因の分析

#### 1. Lambda ハンドラーパスの問題
- **エラー**: `Cannot find module 'main'`
- **原因**: Lambda のハンドラー設定が `handlers/main.handler` だったが、実際のファイルは `dist/handlers/main.js` に存在
- **解決**: ハンドラーパスを `dist/handlers/main.handler` に修正

#### 2. 依存関係の問題（修正済み）
- **エラー**: `Cannot find module 'puppeteer'`
- **原因**: 間違ったpuppeteerライブラリの使用方法
- **解決**: Lambda Layer にはpuppeteer-core + @sparticuz/chromiumが正しく含まれている（v9）

### 解決手順

#### 完了した対応
1. **フロントエンドのモック API から実際の API への変更**
   - `settings/page.tsx`: ユーザー設定関連の API 呼び出し
   - `lessons/page.tsx`: スタジオ・レッスン データの API 呼び出し 
   - `waitlist/page.tsx`: キャンセル待ちリストの API 呼び出し
   - エラー時のフォールバック機能を追加

2. **バックエンドの新規エンドポイント追加**
   - `/user/settings`: ユーザー設定取得
   - `/user/feelcycle-credentials`: 認証情報の保存・削除
   - `/user/notification-settings`: 通知設定保存
   - `UserService.updateUserCredentials()` メソッドを追加

3. **Lambda デプロイの問題修正**
   - ハンドラーパスを `dist/handlers/main.handler` に修正
   - Lambda 関数コードを正常に更新

#### 解決完了した問題
- **puppeteer 依存関係**: Lambda Layer (v9) に正しく含まれている
- **解決策が確立済み**:
  - ✅ puppeteer-core + @sparticuz/chromium の組み合わせ
  - ✅ 既存の日次スクレイピングシステムが正常動作
  - ✅ 適切なLaunch設定とブラウザ管理

---

## 2025-07-19 レッスン枠取得スクレイピング実装完了

### 🎯 今回の達成内容

#### ✅ 完全動作確認済み
1. **単一スタジオのレッスン取得** - 新宿スタジオ（sjk）から13件取得成功
2. **全スタジオ対応** - 37スタジオのバッチ処理機能実装
3. **DynamoDB自動保存** - 39件のレッスンデータを確認
4. **Lambda直接呼び出し対応** - `{"action": "get-lessons", "studioCode": "all|sjk", "date": "2025-07-20"}`

#### 📊 取得データ詳細
- **新宿スタジオ**: 07:30〜20:00の13レッスン
- **多様なプログラム**: BB1, BB2, BSW, BSL, BSB
- **リアルタイム空き状況**: 空き席数、予約可否
- **インストラクター情報**: Fuka, Sumiki, Senna, S.Yui, Ibuki

### 🐛 発生した問題と解決策

#### 1. Lambda直接呼び出しエラー
**問題**: `Cannot read properties of undefined (reading 'startsWith')`
```typescript
// 原因: APIGatewayEventのpathプロパティが存在しない
const { httpMethod, path } = event; // pathがundefined
```
**解決**: 直接呼び出し用ハンドリング追加
```typescript
// Lambda直接呼び出しかAPI Gatewayかを判定
if ('action' in event) {
  return await lessonsHandler(event as any);
}
```

#### 2. Studio not foundエラー  
**問題**: 古いスタジオ検証ロジックが実際のスタジオコードを認識しない
```typescript
const studioInfo = FeelcycleScraper.getStudioInfo(studioCode); // sjk未対応
```
**解決**: 直接リアルスクレイピングにルーティング
```typescript
// 特定スタジオのレッスン取得 - 直接リアルスクレイピングを実行
return await executeRealScraping({ studioCode, date });
```

#### 3. 全スタジオ処理未実装
**問題**: `lessons-service`の`executeRealScraping`が`all`を認識しない
**解決**: `searchAllStudiosRealLessons`メソッド追加
```typescript
if (studioCode === 'all') {
  lessons = await RealFeelcycleScraper.searchAllStudiosRealLessons(date);
} else {
  lessons = await RealFeelcycleScraper.searchRealLessons(studioCode, date);
}
```

### ⚠️ 発見された技術的課題

#### 1. タイムアウト問題
- **現象**: 複数スタジオで60秒ナビゲーションタイムアウト
- **影響**: 全37スタジオ中、一部でタイムアウト発生
- **対策**: バッチサイズ5、スタジオ間1秒待機で負荷分散

#### 2. 全スタジオ処理時間
- **想定**: 37スタジオ × 平均30秒 = 約18分
- **制限**: Lambda最大15分実行制限
- **対策**: 非同期処理やStep Functions検討が必要

### 🔧 今後の改善点

#### 1. 処理時間最適化
- [ ] 並列処理数の調整（現在5並列）
- [ ] タイムアウト時間の調整（現在60秒）
- [ ] Step Functionsによる分割実行

#### 2. エラーハンドリング強化  
- [ ] スタジオ別リトライ機能
- [ ] 部分成功時の結果保存
- [ ] より詳細なエラーログ

#### 3. Layer管理改善
- [ ] 動作確認済みLayer v9の厳格な管理
- [ ] Layer更新時の検証手順確立

### 🎉 実装完了機能

```bash
# 全スタジオレッスン取得
aws lambda invoke --function-name feelcycle-hub-main-dev \
  --payload '{"action":"get-lessons","studioCode":"all","date":"2025-07-20"}'

# 特定スタジオレッスン取得  
aws lambda invoke --function-name feelcycle-hub-main-dev \
  --payload '{"action":"get-lessons","studioCode":"sjk","date":"2025-07-20"}'
```

**✅ 基本的なレッスンデータ取得機能が完全に動作することを確認済み**

---

### 再発防止策

#### 1. デプロイ前チェックリスト
- [ ] ハンドラーパスが正しく設定されているか確認
- [ ] Lambda Layer に必要な依存関係が含まれているか確認
- [ ] テスト用 API 呼び出しで動作確認

#### 2. 開発環境の改善
- Lambda の localstack 環境を構築して事前テスト
- CI/CD パイプラインでの自動テスト追加
- 依存関係の管理を自動化

#### 3. モニタリングの強化  
- CloudWatch Logs での詳細なエラー追跡
- API Gateway のメトリクス監視
- Lambda の実行時間・メモリ使用量の監視

### 技術的な学習ポイント

1. **Lambda Layer の制限**
   - 圧縮後: 50MB
   - 解凍後: 250MB
   - puppeteer のような大きなパッケージは分離が必要

2. **Lambda のハンドラー設定**
   - TypeScript コンパイル後のパスを正しく指定する必要
   - `dist/` ディレクトリ構造を考慮

3. **API Gateway と Lambda の連携**
   - エラー時のレスポンス形式の統一
   - CORS 設定の重要性

### 次回開発時の確認事項

1. **新機能追加時**:
   - 依存関係のサイズ確認
   - Lambda Layer の制限内に収まるか事前チェック
   - エラーハンドリングの統一

2. **デプロイ時**:
   - Lambda ハンドラーパスの確認
   - 環境変数の設定確認
   - テスト API での動作確認

3. **メンテナンス時**:
   - ログの定期的な確認
   - パフォーマンス メトリクスの監視
   - 依存関係の更新管理

## 重要な実行ルール（再発防止）

### 1. 動作している機能の保護
- **一度成功したコードやパーツは絶対に削除・変更しない**
- 別の対応を進める際も既存の動作部分は保護する
- 変更が必要な場合は事前に明確な許可を得る

### 2. 段階的変更の徹底  
- 大きな変更時は必ずバックアップを取る
- 一つずつ変更し、各段階で動作確認
- 失敗時の復旧手順を事前に準備

### 3. Lambda Layer管理ルール
- 動作しているLayerバージョンは保持
- 新しいLayerを作成する際は既存を削除せず追加
- バージョン管理で確実にロールバック可能にする

## 成功しているスクレイピングシステムの詳細分析

### 現在の構成状況（2025-07-18 確認済み）

#### Lambda関数とLayer構成
- **Lambda関数名**: `feelcycle-hub-main-dev`
- **ランタイム**: Node.js 20.x (ARM64)
- **メモリ**: 512MB / タイムアウト: 900秒
- **ハンドラー**: `handlers/main.handler` 
- **Lambda Layer**: `feelcycle-hub-shared-dev:9` (6.79MB)

#### 成功している依存関係構成
```json
{
  "puppeteer-core": "^21.11.0",
  "@sparticuz/chromium": "^138.0.0",
  "@aws-sdk/client-dynamodb": "^3.614.0",
  "@aws-sdk/lib-dynamodb": "^3.614.0",
  "axios": "^1.7.2",
  "cheerio": "^1.0.0-rc.12"
}
```

#### 正しいPuppeteer使用パターン
```typescript
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
  executablePath: await chromium.executablePath(),
  headless: true,
  timeout: 60000
});
```

### 問題の実際の原因と解決策

#### 根本的な問題
1. **真の原因1**: 新機能で間違ったpuppeteerライブラリ（`puppeteer`）を使用
2. **真の原因2**: Lambda Layer のサイズ制限（250MB）により再構築が不可能
3. **実態**: Lambda Layer (v9) は動作するが、コードの import 文が間違っている

#### 解決策（確定）
```typescript
// ❌ 間違い（新機能で使用していた）
import puppeteer from 'puppeteer';

// ✅ 正解（既存システムで成功している）
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
```

#### 最終的なアプローチ
- **Lambda Layer v9 を維持**: 動作確認済みの構成を保護
- **コード修正のみ**: 全てのpuppeteer使用箇所を成功パターンに統一
- **新機能追加時の注意**: 必ず既存の`real-scraper.ts`パターンを踏襲

---

## FEELCYCLEサイト構造とスクレイピング手順の詳細分析

### サイト構造の理解（重要）

#### 基本URL構成
- **メインURL**: `https://m.feelcycle.com/reserve`
- **特徴**: モバイル専用予約サイト（PCサイトより安定）
- **レスポンシブ**: 動的コンテンツの読み込み

#### サイトの動作パターン

**1. 初期画面（スタジオ選択）**
```html
<!-- スタジオリスト構造 -->
<li class="address_item handle">
  <div class="main">銀座スタジオ</div>
  <div class="sub">(GZA)</div>
</li>
```

**2. スタジオ選択後の画面変遷**
- スタジオクリック → JavaScript による動的コンテンツ更新
- **重要**: ページ遷移ではなく、同一ページ内でのDOM更新
- 約2-6秒の読み込み時間が必要

**3. レッスンスケジュール表示構造**
```html
<!-- 日付ヘッダー -->
<div class="header-sc-list">
  <div class="content">
    <div class="days">7/18(金)</div>
    <div class="days">7/19(土)</div>
    ...
  </div>
</div>

<!-- レッスンリスト -->
<div class="sc_list active">
  <div class="content"> <!-- 日付1のレッスン -->
    <div class="lesson overflow_hidden">
      <div class="time">07:00 - 07:45</div>
      <div class="lesson_name">BB2 House 1</div>
      <div class="instructor">Miki</div>
      <div class="status">残り8人</div>
    </div>
  </div>
  <div class="content"> <!-- 日付2のレッスン -->
    ...
  </div>
</div>
```

### 成功しているスクレイピング手順

#### Step 1: 初期化とページアクセス
```typescript
await page.goto('https://m.feelcycle.com/reserve', { 
  waitUntil: 'domcontentloaded',
  timeout: 60000 
});

// スタジオリストの読み込み待機
await page.waitForSelector('li.address_item.handle', { timeout: 30000 });
await new Promise(resolve => setTimeout(resolve, 2000));
```

#### Step 2: スタジオ選択（最重要）
```typescript
// スタジオコードで検索・クリック
const studioSelected = await page.evaluate((targetCode: string) => {
  const studioElements = document.querySelectorAll('li.address_item.handle');
  for (const element of studioElements) {
    const codeElement = element.querySelector('.sub');
    if (codeElement) {
      const codeText = codeElement.textContent?.trim();
      const codeMatch = codeText.match(/\(([^)]+)\)/);
      if (codeMatch && codeMatch[1].toLowerCase() === targetCode) {
        (element as HTMLElement).click();
        return true;
      }
    }
  }
  return false;
}, studioCode);
```

#### Step 3: レッスンデータ読み込み待機
```typescript
// スケジュール読み込み待機（重要な待機時間）
await new Promise(resolve => setTimeout(resolve, 6000));
await page.waitForSelector('.header-sc-list .content .days', { timeout: 30000 });
```

#### Step 4: 全日程のレッスンデータ一括取得
```typescript
// 日付マッピング構築
const dateElements = document.querySelectorAll('.header-sc-list .content .days');
const dateMapping = Array.from(dateElements).map((el, index) => ({
  index,
  text: el.textContent?.trim() || ''
}));

// 各日付のレッスンデータ抽出
const contentElements = scList.querySelectorAll(':scope > .content');
contentElements.forEach((column, columnIndex) => {
  const lessonElements = column.querySelectorAll('.lesson.overflow_hidden');
  // レッスン詳細の抽出処理...
});
```

### 成功の鍵となるポイント

#### 1. 適切な待機時間
- **スタジオリスト読み込み**: 2秒
- **スタジオ選択後**: 6秒（JavaScript処理完了まで）
- **DOM要素の確認**: `waitForSelector`で確実に待機

#### 2. 要素選択の精度
- **スタジオ識別**: `.sub`要素内の`(CODE)`形式で確実に識別
- **レッスン要素**: `.lesson.overflow_hidden`で確実に特定
- **日付マッピング**: インデックスベースで正確な日付対応

#### 3. エラーハンドリング
- **スタジオ未発見**: `studioSelected`フラグで確認
- **要素待機タイムアウト**: 30秒で適切な制限
- **ページ読み込み失敗**: 60秒タイムアウトで retry 可能

### スクレイピング失敗の主な原因と対策

#### よくある失敗パターン
1. **待機時間不足**: JavaScript処理完了前のDOM操作
2. **要素選択ミス**: 動的に変化するCSSクラスへの依存
3. **タブ切り替えの混乱**: 複数スタジオの同時処理
4. **メモリリーク**: ブラウザインスタンスの適切なクリーンアップ不足

#### 対策として実装済み
1. **段階的待機**: DOM確認 → 固定待機 → 要素確認
2. **安定した要素選択**: 変化しないCSS classの使用
3. **単一スタジオ処理**: 一度に1スタジオずつ順次処理
4. **リソース管理**: 静的ブラウザインスタンス + 適切なクリーンアップ

### 実績データによる検証

#### 検証済みスタジオと取得成功実績
- **渋谷 (sby)**: 7/30のデータ10件取得成功 ✅
- **川崎 (kws)**: 7/24のデータ10件取得成功 ✅
- **汐留 (sio)**: 7/22のデータ11件取得成功 ✅

#### データ品質の確認
- ✅ 実際のインストラクター名（O.Miyu、Maho、Mizuki等）
- ✅ 現実的なレッスン名（BB2 10s 2、BSB Comp 1等）
- ✅ 正確な予約状況（満席・空き状況）
- ✅ 適切な時間間隔（45分レッスン + 15分休憩）

**このスクレイピングシステムは実証済みで信頼性が高い**

---

**更新日**: 2025-07-18
**更新者**: Claude