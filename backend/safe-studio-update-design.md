# 安全なスタジオデータ更新設計

## 現在の問題のある処理フロー

```
スクレイピング → Mark-and-Sweep → 既存データ削除 💥
```

## 提案する安全な処理フロー

```
既存データ保護 → 差分検出 → 必要最小限の更新 ✅
```

---

## 新しいスタジオデータ管理仕様

### 1. データベーススキーマ拡張

```typescript
interface StudioData {
  studioCode: string;           // 既存
  studioName: string;           // 既存  
  region: string;               // 既存
  
  // 新規追加フィールド
  isActive: boolean;            // アクティブ状態（削除の代替）
  lastSeenAt: string;           // 最後に確認された日時
  lastUpdatedAt: string;        // 最後に更新された日時
  dataSource: 'scraping' | 'manual' | 'fallback';  // データソース
  scrapingStatus: 'success' | 'partial' | 'failed'; // スクレイピング状態
}
```

### 2. 安全な更新ロジック

#### Phase 1: 差分検出（削除なし）
```typescript
async safeUpdateStudios(scrapedStudios: StudioData[]): Promise<UpdateResult> {
  const existing = await this.getAllStudios();
  const updates: UpdateOperation[] = [];
  
  // 既存スタジオの状態更新（削除なし）
  for (const studio of existing) {
    const scraped = scrapedStudios.find(s => s.studioCode === studio.studioCode);
    
    if (scraped) {
      // スクレイピング成功: 差分があれば更新
      if (studio.studioName !== scraped.studioName || studio.region !== scraped.region) {
        updates.push({
          type: 'update',
          studioCode: studio.studioCode,
          changes: { studioName: scraped.studioName, region: scraped.region },
          reason: 'data_changed'
        });
      }
      
      // 最終確認日時を更新
      updates.push({
        type: 'status_update', 
        studioCode: studio.studioCode,
        changes: { lastSeenAt: new Date().toISOString(), scrapingStatus: 'success' }
      });
      
    } else {
      // スクレイピング対象外: ステータスのみ更新（削除しない）
      updates.push({
        type: 'status_update',
        studioCode: studio.studioCode, 
        changes: { scrapingStatus: 'not_found_in_scraping' },
        reason: 'not_in_current_scraping'
      });
    }
  }
  
  // 新規スタジオの検出
  for (const scraped of scrapedStudios) {
    const exists = existing.find(s => s.studioCode === scraped.studioCode);
    if (!exists) {
      updates.push({
        type: 'create',
        studioCode: scraped.studioCode,
        data: { ...scraped, isActive: true, dataSource: 'scraping' },
        reason: 'new_studio_detected'
      });
    }
  }
  
  return { updates, deletions: 0 };  // 削除は0件
}
```

#### Phase 2: 新規スタジオの詳細情報取得
```typescript
async enrichNewStudios(newStudios: string[]): Promise<void> {
  for (const studioCode of newStudios) {
    try {
      // スタジオページから詳細情報を取得
      const detailInfo = await this.getStudioDetailFromWebsite(studioCode);
      
      await this.updateStudio(studioCode, {
        region: detailInfo.region,           // 正確な地域情報
        address: detailInfo.address,         // 住所
        openDate: detailInfo.openDate,       // 開店日
        dataSource: 'detail_scraping'
      });
      
    } catch (error) {
      console.warn(`⚠️ Failed to get details for new studio ${studioCode}:`, error);
      // 失敗してもスタジオは保持（削除しない）
    }
  }
}

async getStudioDetailFromWebsite(studioCode: string): Promise<StudioDetail> {
  // https://www.feelcycle.com/studios/${studioCode}/ から詳細取得
  const page = await this.browser.newPage();
  await page.goto(`https://www.feelcycle.com/studios/${studioCode}/`);
  
  const detail = await page.evaluate(() => {
    // スタジオページから地域・住所等を抽出
    return {
      region: document.querySelector('.area-name')?.textContent,
      address: document.querySelector('.address')?.textContent,
      // その他の詳細情報
    };
  });
  
  return detail;
}
```

### 3. 非アクティブスタジオの管理

```typescript
// 削除の代わりに非アクティブ化
async markStudioInactive(studioCode: string, reason: string): Promise<void> {
  await this.updateStudio(studioCode, {
    isActive: false,
    inactiveReason: reason,
    inactiveSince: new Date().toISOString()
  });
  
  console.log(`📍 Studio ${studioCode} marked as inactive: ${reason}`);
  // データは保持されるため復旧可能
}

// 長期間未確認のスタジオを特定（削除はしない）
async identifyStaleStudios(): Promise<string[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const staleStudios = await this.scanStudios({
    FilterExpression: 'lastSeenAt < :cutoff',
    ExpressionAttributeValues: { ':cutoff': thirtyDaysAgo.toISOString() }
  });
  
  return staleStudios.map(s => s.studioCode);
}
```

### 4. 地域情報の安全な管理

```typescript
// 地域情報マッピング（フォールバック用）
const REGION_MAPPING: Record<string, string> = {
  // 関東
  'ykh': '関東', 'sby': '関東', 'sjk': '関東', 'ikb': '関東',
  'gnz': '関東', 'gkbs': '関東', 'sdm': '関東', 'gtd': '関東',
  // ... 他の地域
};

async ensureRegionInfo(studioCode: string): Promise<string> {
  const studio = await this.getStudio(studioCode);
  
  if (studio.region && studio.region !== 'unknown') {
    return studio.region;  // 既存の正確な地域情報を使用
  }
  
  // フォールバック1: 既知のマッピング
  if (REGION_MAPPING[studioCode]) {
    await this.updateStudio(studioCode, { 
      region: REGION_MAPPING[studioCode],
      dataSource: 'fallback_mapping'
    });
    return REGION_MAPPING[studioCode];
  }
  
  // フォールバック2: スタジオページから取得
  try {
    const detail = await this.getStudioDetailFromWebsite(studioCode);
    if (detail.region) {
      await this.updateStudio(studioCode, { 
        region: detail.region,
        dataSource: 'detail_scraping'
      });
      return detail.region;
    }
  } catch (error) {
    console.warn(`⚠️ Failed to get region for ${studioCode}:`, error);
  }
  
  // 最終フォールバック: unknownのまま（削除しない）
  return 'unknown';
}
```

---

## 新しい処理フローの利点

### 🛡️ 安全性
- **データ保護**: スクレイピング失敗でも既存データ保持
- **段階的更新**: 必要最小限の変更のみ実行
- **復旧可能**: 非アクティブ化で削除の代替

### 📊 運用性  
- **状態管理**: isActive, lastSeenAt等でスタジオ状態を追跡
- **データソース記録**: manual, scraping, fallback等を記録
- **監査ログ**: 全ての変更理由を記録

### 🔧 拡張性
- **新規スタジオ対応**: 自動検知 → 詳細情報取得
- **地域情報強化**: 複数ソースからの情報補完
- **柔軟な復旧**: 削除ではなく状態変更で管理

---

## 実装例: 安全なスタジオ更新

```typescript
async safeDailyStudioUpdate(): Promise<void> {
  try {
    // 1. 現在のスクレイピング実行
    const scrapedStudios = await RealFeelcycleScraper.getRealStudios();
    console.log(`🔍 Scraped ${scrapedStudios.length} studios`);
    
    // 2. 安全な差分更新（削除なし）
    const updateResult = await this.safeUpdateStudios(scrapedStudios);
    console.log(`✅ Safe update: ${updateResult.updates.length} changes, 0 deletions`);
    
    // 3. 新規スタジオの詳細情報取得
    const newStudios = updateResult.updates
      .filter(u => u.type === 'create')
      .map(u => u.studioCode);
      
    if (newStudios.length > 0) {
      console.log(`🆕 Enriching ${newStudios.length} new studios`);
      await this.enrichNewStudios(newStudios);
    }
    
    // 4. 古いスタジオの特定（削除はしない）
    const staleStudios = await this.identifyStaleStudios();
    if (staleStudios.length > 0) {
      console.log(`⚠️ Found ${staleStudios.length} stale studios (not deleting)`);
      // 運用チームに通知するのみ
    }
    
  } catch (error) {
    console.error('❌ Studio update failed:', error);
    // エラーでも既存データは保護される
  }
}
```

**この設計なら、今回のような「アホみたいな削除処理」は完全に排除され、データの安全性が大幅に向上します。**