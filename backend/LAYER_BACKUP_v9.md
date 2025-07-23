# Lambda Layer v9 バックアップ記録

## バックアップ作成日時
2025-07-18

## バックアップ場所
`/Users/wataru/Projects/feelcycle-hub/backend/layers/shared/nodejs.backup.v9`

## 現在の動作状況
✅ **完全に動作中**
- 日次スクレイピング: 正常動作
- データ取得: 複数スタジオで実証済み
- Lambda Layer サイズ: 6.79MB (制限内)

## 含まれる依存関係 (package.json)
```json
{
  "name": "feelcycle-hub-shared-layer",
  "version": "1.0.0",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.614.0",
    "@aws-sdk/client-secrets-manager": "^3.614.0",
    "@aws-sdk/lib-dynamodb": "^3.614.0",
    "@sparticuz/chromium": "^138.0.0",
    "axios": "^1.7.2",
    "cheerio": "^1.0.0-rc.12",
    "puppeteer-core": "^21.11.0"
  }
}
```

## 成功している使用パターン
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

## 実証済み動作確認
- 渋谷スタジオ (sby): 7/30データ10件取得成功
- 川崎スタジオ (kws): 7/24データ10件取得成功
- 汐留スタジオ (sio): 7/22データ11件取得成功

## 重要注意事項
**このバックアップは絶対に削除しない**
- このバージョンは完全に動作することが実証済み
- 何らかの問題が発生した場合の復旧ポイント
- 新しい変更を行う際の参照基準

## 復旧手順（必要時）
```bash
# 現在の構成をバックアップ
cp -r nodejs nodejs.backup.current

# v9構成に復旧
rm -rf nodejs
cp -r nodejs.backup.v9 nodejs

# CDKで再デプロイ
npm run deploy
```

---
**作成者**: Claude  
**目的**: 動作する構成の完全保護