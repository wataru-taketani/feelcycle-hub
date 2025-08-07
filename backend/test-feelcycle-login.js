const { simpleFeelcycleLogin } = require('./simple-feelcycle-login.js');
const readline = require('readline');

/**
 * 安全なFEELCYCLEログインテスト
 * アカウントロック防止のため1回のみ実行
 */

// 方法1: 環境変数を使用（推奨）
async function testWithEnvVars() {
  console.log('🔐 環境変数からの認証情報テスト');
  
  const email = process.env.FEELCYCLE_EMAIL;
  const password = process.env.FEELCYCLE_PASSWORD;
  
  if (!email || !password) {
    console.log('❌ 環境変数が設定されていません');
    console.log('設定方法:');
    console.log('export FEELCYCLE_EMAIL="your-email@example.com"');
    console.log('export FEELCYCLE_PASSWORD="your-password"');
    return null;
  }
  
  console.log('✅ 環境変数から認証情報を取得');
  console.log('📧 Email:', email.replace(/(.{3}).*(@.*)/, '$1***$2'));
  
  return await simpleFeelcycleLogin(email, password);
}

// 方法2: 対話式入力（セキュア）
async function testWithInteractiveInput() {
  console.log('🔐 対話式認証情報入力');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('📧 FEELCYCLEメールアドレス: ', (email) => {
      // パスワードは非表示で入力
      process.stdout.write('🔑 パスワード: ');
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      let password = '';
      process.stdin.on('data', async (char) => {
        char = char.toString();
        
        if (char === '\r' || char === '\n') {
          // Enter押下
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          rl.close();
          
          console.log('✅ 認証情報入力完了');
          console.log('📧 Email:', email.replace(/(.{3}).*(@.*)/, '$1***$2'));
          
          const result = await simpleFeelcycleLogin(email, password);
          resolve(result);
          
        } else if (char === '\u0003') {
          // Ctrl+C
          process.exit();
        } else if (char === '\u007f') {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          // 通常文字
          password += char;
          process.stdout.write('*');
        }
      });
    });
  });
}

// 方法3: コマンドライン引数
async function testWithArgs() {
  console.log('🔐 コマンドライン引数からのテスト');
  
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('❌ 引数が不足しています');
    console.log('使用方法: node test-feelcycle-login.js your-email@example.com your-password');
    return null;
  }
  
  const [email, password] = args;
  console.log('✅ コマンドライン引数から認証情報を取得');
  console.log('📧 Email:', email.replace(/(.{3}).*(@.*)/, '$1***$2'));
  
  return await simpleFeelcycleLogin(email, password);
}

// メイン実行関数
async function runSingleTest() {
  console.log('🚨 重要: このテストは1回のみ実行してください');
  console.log('🔒 複数回失敗するとアカウントロックの可能性があります');
  console.log('=' .repeat(60));
  
  let result = null;
  
  // 実行方法の選択
  console.log('認証情報の入力方法を選択してください:');
  console.log('1. 環境変数 (推奨・最もセキュア)');
  console.log('2. 対話式入力 (セキュア)');
  console.log('3. コマンドライン引数 (非推奨・履歴に残る)');
  
  const method = process.env.TEST_METHOD || '1';
  
  switch (method) {
    case '1':
      result = await testWithEnvVars();
      break;
    case '2':
      result = await testWithInteractiveInput();
      break;
    case '3':
      result = await testWithArgs();
      break;
    default:
      console.log('❌ 無効な方法です');
      return;
  }
  
  if (result) {
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 テスト結果:');
    console.log('成功:', result.success ? '✅' : '❌');
    console.log('URL:', result.url);
    console.log('メッセージ:', result.message);
    
    if (result.success) {
      console.log('🎉 ログイン成功！機能は正常に動作しています');
    } else {
      console.log('⚠️ ログイン失敗。以下を確認してください:');
      console.log('- メールアドレスとパスワードが正しいか');
      console.log('- アカウントがロックされていないか');
      console.log('- FEELCYCLEサイトに変更がないか');
    }
    
    if (result.error) {
      console.log('エラー詳細:', result.error);
    }
  }
}

// 実行
if (require.main === module) {
  runSingleTest().catch(console.error);
}

module.exports = { 
  testWithEnvVars, 
  testWithInteractiveInput, 
  testWithArgs,
  runSingleTest 
};
