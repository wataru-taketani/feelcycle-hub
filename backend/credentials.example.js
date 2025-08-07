/**
 * FEELCYCLE認証情報設定ファイル
 * 
 * 使用方法:
 * 1. このファイルをコピーして credentials.js として保存
 * 2. 下記の YOUR_EMAIL と YOUR_PASSWORD を実際の値に変更
 * 3. テスト実行: node run-test.js
 * 4. テスト完了後、credentials.js を削除（セキュリティのため）
 */

module.exports = {
  // あなたのFEELCYCLEメールアドレスを入力してください
  email: 'YOUR_EMAIL@example.com',
  
  // あなたのFEELCYCLEパスワードを入力してください  
  password: 'YOUR_PASSWORD',
  
  // テスト設定
  testConfig: {
    // 1回のみ実行（アカウントロック防止）
    singleRun: true,
    
    // 詳細ログ出力
    verbose: true,
    
    // タイムアウト設定（秒）
    timeout: 60
  }
};

/*
セキュリティ注意事項:
- このファイルには実際のパスワードが含まれます
- テスト完了後は必ず削除してください
- Gitにコミットしないでください（.gitignoreに追加済み）
*/
