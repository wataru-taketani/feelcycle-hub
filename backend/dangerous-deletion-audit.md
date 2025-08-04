# 🚨 危険な削除処理の包括的調査結果

## 概要
システム全体で発見された「不適切な削除処理」のパターンを調査し、今回のスタジオデータ破損の根本原因とリスク評価を実施。

---

## 🔥 **最も危険な削除処理 (HIGH RISK)**

### 1. `clearAllLessons()` - 全レッスンデータ削除
**場所**: 
- `services/lessons-service.ts:clearAllLessons()`
- `scripts/daily-data-refresh.ts:clearAllLessons()`  
- `scripts/split-daily-refresh.ts:clearLessonsData()`

**危険度**: 🚨 **CRITICAL**
```typescript
// 5000+件の全レッスンデータを無条件削除
const scanResult = await docClient.send(new ScanCommand({
  TableName: LESSONS_TABLE_NAME,
  ProjectionExpression: 'studioCode, lessonDateTime'
}));

const deletePromises = scanResult.Items.map((item: any) => 
  docClient.send(new DeleteCommand({
    TableName: LESSONS_TABLE_NAME,
    Key: { 
      studioCode: item.studioCode, 
      lessonDateTime: item.lessonDateTime 
    }
  }))
);
```

**問題点**:
- バックアップなしの一括削除
- 失敗時の復旧手段なし
- Progressive Daily Refreshで**DISABLED**されているが、他のスクリプトでは有効

**影響範囲**: 全レッスンデータ（5000+件）の完全消失リスク

---

### 2. `deleteStudio()` + Mark-and-Sweep - スタジオ削除
**場所**: `services/studios-service.ts:safeRefreshStudiosFromScraping()`

**危険度**: 🚨 **HIGH**  
```typescript
// マークされていない（古い）スタジオを削除
if (!lastScrapedAt || lastScrapedAt !== refreshTimestamp) {
  console.log(`🗑️  Removing outdated studio: ${studio.studioName} (${studio.studioCode})`);
  await this.deleteStudio(studio.studioCode);  // 💥 完全削除
  removed++;
}
```

**問題点**:
- スクレイピング失敗時に既存スタジオが「古い」と判定され削除
- 今回の横浜等4スタジオ削除の**直接的原因**
- `getRealStudios()`がスクレイピング失敗→既存スタジオが削除対象に

**影響範囲**: スタジオ情報の完全消失（studioName, region等）

---

### 3. `REMOVE` UpdateExpression - 部分データ削除
**場所**: `services/studios-service.ts` 複数箇所

**危険度**: 🔶 **MEDIUM**
```typescript
// retryCount, lastErrorを削除
updateExpressions.push('REMOVE retryCount, lastError');

// lastProcessed, batchStatusを削除  
UpdateExpression: 'REMOVE lastProcessed, batchStatus'
```

**問題点**:
- 意図的な削除だが、batchStatus削除によりバッチ処理対象外に
- エラー履歴削除により問題の追跡が困難

**影響範囲**: バッチ処理制御とトラブルシューティング情報の喪失

---

## ⚠️ **中程度のリスク削除処理 (MEDIUM RISK)**

### 4. 期限切りデータのクリーンアップ
**場所**: 
- `cleanup-old-waitlists.ts`
- `handlers/monitoring.ts:cleanupExpiredWaitlists()`

**危険度**: 🔶 **MEDIUM**
```typescript
// 期限切りウェイトリストの削除
await docClient.send(new DeleteCommand({
  TableName: WAITLIST_TABLE_NAME,
  Key: { userId: entry.userId, waitlistId: entry.waitlistId }
}));
```

**問題点**:
- 期限判定ロジックのバグで有効データが削除される可能性
- 削除前の詳細ログなし

**影響範囲**: ユーザーのウェイトリスト設定消失

---

### 5. ユーザー認証情報削除
**場所**: `handlers/auth.ts:deleteFeelcycleCredentials()`

**危険度**: 🔶 **MEDIUM**
```typescript
// FEELCYCLE認証情報の削除
// DELETE /user/feelcycle-credentials エンドポイント
```

**問題点**:
- ユーザー要求による削除だが、復旧手段なし
- 削除前の確認プロセス不明

**影響範囲**: ユーザーのFEELCYCLE連携機能完全停止

---

## 🟢 **適切な削除処理 (LOW RISK)**

### 6. 開発用テーブル削除
**場所**: `create-batch-table.ts`
```typescript
if (shouldDelete && process.env.NODE_ENV !== 'production') {
  await client.send(new DeleteTableCommand({ TableName }));
}
```
**評価**: ✅ 適切（本番環境除外、明示的条件）

### 7. ブラウザリソースクリーンアップ
**場所**: `services/real-scraper.ts:cleanup()`
```typescript
// Puppeteerブラウザインスタンスの終了
await this.browser.close();
```
**評価**: ✅ 適切（リソース解放、必須処理）

---

## 🔍 **根本原因分析**

### 今回のスタジオデータ破損の因果関係

1. **トリガー**: `getRealStudios()`でスクレイピング部分失敗
   ```typescript
   // region: 'unknown'で不完全データ取得
   ```

2. **Mark-and-Sweep発動**: `safeRefreshStudiosFromScraping()`
   ```typescript
   // 不完全データで既存スタジオを「古い」と誤判定
   if (!lastScrapedAt || lastScrapedAt !== refreshTimestamp) {
     await this.deleteStudio(studio.studioCode);  // 💥 削除実行
   }
   ```

3. **自動復旧の誤動作**: Auto Recovery Serviceが"Fallback used"
   - スタジオデータ削除後の状態を「安全な縮退」と誤認
   - 必要なデータの復旧を行わず、削除状態を維持

4. **連鎖的影響**: 
   - `studioName: null` → バッチ処理対象外
   - `region: unknown` → 地域情報破損  
   - `batchStatus: null` → Progressive Daily Refresh停止

---

## 🛡️ **リスク軽減策・予防対策**

### 即座に実装すべき対策

#### 1. 削除処理の安全化
```typescript
// 危険な削除処理に安全弁を追加
async deleteStudio(studioCode: string, safetyCheck: boolean = true): Promise<void> {
  if (safetyCheck) {
    // バックアップ作成
    const backup = await this.getStudio(studioCode);
    await this.createStudioBackup(backup);
    
    // 削除前検証
    if (!this.validateDeletionSafety(studioCode)) {
      throw new Error(`Studio deletion safety check failed: ${studioCode}`);
    }
  }
  
  await docClient.send(new DeleteCommand({...}));
}
```

#### 2. Mark-and-Sweep の条件厳格化
```typescript
// スクレイピング成功率に基づく安全判定
if (scrapingSuccessRate < 0.8) {  // 80%未満は危険
  console.log('⚠️ Scraping success rate too low, skipping deletions');
  return { deleted: 0, errors: ['Scraping success rate below safety threshold'] };
}
```

#### 3. Progressive Daily Refresh の削除処理完全無効化
```typescript
// PERMANENT DISABLE: clearAllLessons() 
// 理由: データ全消失の高リスク、代替手段（Mark-and-Sweep）で十分
// if (NEW_DAILY_RUN) {
//   await lessonService.clearAllLessons();  // 💀 NEVER ENABLE
// }
```

### 中長期的改善策

#### 1. 削除処理の監査ログ強化
- 削除前後のデータスナップショット保存
- 削除理由と承認者の記録
- 削除データの自動復旧機能

#### 2. 段階的削除プロセス
1. **論理削除**: `deleted: true`フラグ設定
2. **猶予期間**: 7日間の復旧可能期間
3. **物理削除**: 手動承認後の最終削除

#### 3. リアルタイム整合性監視
- スタジオ数の異常減少検知アラート
- 重要フィールド（studioName, region）の欠如検知
- 自動バックアップとロールバック機能

---

## 📊 **リスク評価サマリー**

| 削除処理 | リスク | 影響範囲 | 緊急度 | 対策状況 |
|---------|-------|---------|---------|----------|
| `clearAllLessons()` | 🚨 CRITICAL | 全レッスン | 即時 | 一部無効化済み |
| `deleteStudio()` Mark-and-Sweep | 🚨 HIGH | スタジオ情報 | 即時 | **要対策** |
| `REMOVE` UpdateExpression | 🔶 MEDIUM | バッチ制御 | 中期 | 監視強化 |
| 期限切りクリーンアップ | 🔶 MEDIUM | ユーザー設定 | 中期 | ログ改善 |
| ユーザー認証削除 | 🔶 MEDIUM | 連携機能 | 低 | 確認手順追加 |

---

## ✅ **推奨アクション**

### Phase 1: 緊急対策（即時実装）
1. **Mark-and-Sweep削除の一時停止**
2. **clearAllLessons()の完全無効化**  
3. **削除処理の事前バックアップ必須化**

### Phase 2: 安全性強化（1週間以内）
1. **削除前安全性チェック実装**
2. **スクレイピング成功率に基づく削除制御**
3. **リアルタイム監視アラート設定**

### Phase 3: 根本的改善（1ヶ月以内）
1. **論理削除システム導入**
2. **自動復旧機能実装**
3. **削除監査ログシステム構築**

**今回のデータ破損は、Mark-and-Sweep削除ロジックとスクレイピング部分失敗の組み合わせが主原因。削除処理の安全化が最優先課題。**