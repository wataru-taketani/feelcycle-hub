# 🚨 LIFF 認証エラー緊急修正手順

## 問題の詳細
- **現象**: LIFF初期化でNetwork Errorが発生
- **原因**: LINE LIFF アプリ設定とコード側の不整合
- **URL解析**: `liffClientId=2007687052` (サフィックス欠落)

## 根本原因
LINE Developer Console の LIFF アプリ設定で以下のいずれかが間違っている：

1. **LIFF ID自体が間違っている**
2. **Endpoint URL設定が間違っている**
3. **LIFF アプリが削除/無効化されている**

## 緊急修正手順

### 1. LINE Developer Console での確認
1. https://developers.line.biz/console/ にアクセス
2. FEELCYCLE Hub プロジェクトを選択
3. LIFF タブを確認
4. LIFF ID `2007687052-B9Pqw7Zy` の存在確認

### 2. LIFF アプリ設定の確認項目
- **LIFF ID**: `2007687052-B9Pqw7Zy`
- **Endpoint URL**: `https://feelcycle-hub.netlify.app`
- **Scope**: `profile` `openid`
- **Bot link feature**: 設定に応じて

### 3. 設定が間違っている場合の修正
- Endpoint URLを `https://feelcycle-hub.netlify.app` に修正
- 必要に応じてLIFF IDを再生成

### 4. 新しいLIFF IDが必要な場合
以下のファイルを更新：
- `netlify.toml`
- `frontend/next.config.js`
- `frontend/src/lib/liff.ts`
- `DEVELOPMENT_MEMO.md`

## 一時的な回避策
開発環境バイパスを有効化：
```typescript
// AuthContext.tsx の initializeAuth() で強制的にlocalhostチェックを無効化
if (true) { // 強制的に開発モードに
  console.log('🚨 Emergency bypass activated');
  // モックユーザーでログイン
}
```

## 検証方法
1. LINE Developer Console で設定確認
2. `https://liff.line.me/2007687052-B9Pqw7Zy` に直接アクセス
3. 正常にリダイレクトされるか確認
