const fs = require('fs');
const path = require('path');
const { simpleFeelcycleLogin } = require('./simple-feelcycle-login.js');

/**
 * 認証情報ファイルを使用したFEELCYCLEログインテスト実行
 */

async function runCredentialsTest() {
  console.log('🚀 FEELCYCLE認証情報ファイルテスト');
  console.log('=' .repeat(60));
  
  const credentialsPath = path.join(__dirname, 'credentials.js');
  
  // credentials.jsファイルの存在確認
  if (!fs.existsSync(credentialsPath)) {
    console.log('❌ credentials.js ファイルが見つかりません');
    console.log('');
    console.log('📋 設定手順:');
    console.log('1. credentials.example.js をコピーして credentials.js を作成');
    console.log('2. credentials.js の YOUR_EMAIL と YOUR_PASSWORD を実際の値に変更');
    console.log('3. 再度このスクリプトを実行');
    console.log('');
    console.log('💡 コピーコマンド:');
    console.log('cp credentials.example.js credentials.js');
    return;
  }
  
  try {
    // 認証情報読み込み
    const credentials = require('./credentials.js');
    
    // 設定値検証
    if (!credentials.email || !credentials.password) {
      console.log('❌ 認証情報が設定されていません');
      console.log('credentials.js ファイルを編集してください');
      return;
    }
    
    if (credentials.email.includes('YOUR_EMAIL') || credentials.password.includes('YOUR_PASSWORD')) {
      console.log('❌ プレースホルダーが残っています');
      console.log('credentials.js ファイルの YOUR_EMAIL と YOUR_PASSWORD を実際の値に変更してください');
      return;
    }
    
    // 認証情報表示（マスク済み）
    console.log('✅ 認証情報ファイル読み込み完了');
    console.log('📧 Email:', credentials.email.replace(/(.{3}).*(@.*)/, '$1***$2'));
    console.log('🔑 Password:', '*'.repeat(credentials.password.length));
    console.log('');
    
    // 警告表示
    console.log('🚨 重要な注意事項:');
    console.log('- このテストは1回のみ実行してください');
    console.log('- 複数回失敗するとアカウントロックの可能性があります');
    console.log('- テスト完了後は credentials.js を削除してください');
    console.log('');
    
    // 実行確認
    console.log('⏳ 3秒後にテストを開始します...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // テスト実行
    console.log('🔐 FEELCYCLEログインテスト開始');
    const startTime = Date.now();
    
    const result = await simpleFeelcycleLogin(credentials.email, credentials.password);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // 結果表示
    console.log('');
    console.log('=' .repeat(60));
    console.log('🎯 テスト結果:');
    console.log('実行時間:', duration.toFixed(2), '秒');
    console.log('成功:', result.success ? '✅' : '❌');
    console.log('URL:', result.url);
    console.log('メッセージ:', result.message);
    
    if (result.success) {
      console.log('');
      console.log('🎉 ログイン成功！');
      console.log('✅ FEELCYCLE Hub のログイン機能は正常に動作しています');
      console.log('✅ SPA対応の修正が効果的に働いています');
      console.log('✅ プロダクション環境での使用準備完了');
    } else {
      console.log('');
      console.log('⚠️ ログイン失敗');
      console.log('確認事項:');
      console.log('- メールアドレスとパスワードが正しいか');
      console.log('- アカウントがロックされていないか');
      console.log('- FEELCYCLEサイトに変更がないか');
      
      if (result.error) {
        console.log('エラー詳細:', result.error);
      }
    }
    
    // セキュリティ注意喚起
    console.log('');
    console.log('🔒 セキュリティ注意:');
    console.log('テスト完了後は以下のコマンドで認証情報ファイルを削除してください:');
    console.log('rm credentials.js');
    
  } catch (error) {
    console.error('❌ テスト実行エラー:', error.message);
    console.error('詳細:', error.stack?.split('\n').slice(0, 3).join('\n'));
  }
}

// 実行
if (require.main === module) {
  runCredentialsTest().catch(console.error);
}

module.exports = { runCredentialsTest };
