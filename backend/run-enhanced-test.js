const fs = require('fs');
const path = require('path');
const { enhancedFeelcycleLogin } = require('./enhanced-feelcycle-login.js');

/**
 * Enhanced FEELCYCLEログインテスト実行
 * マイページ情報取得・保存機能付き
 */

async function runEnhancedTest() {
  console.log('🚀 Enhanced FEELCYCLE マイページ情報取得テスト');
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
      return;
    }
    
    if (credentials.email.includes('YOUR_EMAIL') || credentials.password.includes('YOUR_PASSWORD')) {
      console.log('❌ プレースホルダーが残っています');
      return;
    }
    
    // 認証情報表示（マスク済み）
    console.log('✅ 認証情報ファイル読み込み完了');
    console.log('📧 Email:', credentials.email.replace(/(.{3}).*(@.*)/, '$1***$2'));
    console.log('🔑 Password:', '*'.repeat(credentials.password.length));
    console.log('');
    
    // Enhanced テスト設定
    const testOptions = {
      saveHtml: true,           // HTMLファイル保存
      saveScreenshot: true,     // スクリーンショット保存
      extractUserInfo: true,    // ユーザー情報抽出
      outputDir: './mypage-data' // 出力ディレクトリ
    };
    
    console.log('🔧 テスト設定:');
    console.log('- HTML保存:', testOptions.saveHtml ? '✅' : '❌');
    console.log('- スクリーンショット保存:', testOptions.saveScreenshot ? '✅' : '❌');
    console.log('- ユーザー情報抽出:', testOptions.extractUserInfo ? '✅' : '❌');
    console.log('- 出力ディレクトリ:', testOptions.outputDir);
    console.log('');
    
    // 警告表示
    console.log('🚨 重要な注意事項:');
    console.log('- このテストはマイページの個人情報を取得します');
    console.log('- 保存されたファイルには個人情報が含まれる可能性があります');
    console.log('- テスト完了後は必要に応じてファイルを削除してください');
    console.log('');
    
    // 実行確認
    console.log('⏳ 3秒後にEnhancedテストを開始します...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Enhanced テスト実行
    console.log('🔐 Enhanced FEELCYCLEログイン＆マイページ取得開始');
    const startTime = Date.now();
    
    const result = await enhancedFeelcycleLogin(
      credentials.email, 
      credentials.password, 
      testOptions
    );
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // 結果表示
    console.log('');
    console.log('=' .repeat(60));
    console.log('🎯 Enhanced テスト結果:');
    console.log('実行時間:', duration.toFixed(2), '秒');
    console.log('成功:', result.success ? '✅' : '❌');
    
    if (result.success) {
      console.log('URL:', result.url);
      console.log('タイムスタンプ:', result.timestamp);
      
      console.log('');
      console.log('📁 保存されたファイル:');
      if (result.data.htmlPath) {
        const htmlStats = fs.statSync(result.data.htmlPath);
        console.log(`- HTML: ${result.data.htmlPath} (${(htmlStats.size / 1024).toFixed(1)} KB)`);
      }
      if (result.data.screenshotPath) {
        const screenshotStats = fs.statSync(result.data.screenshotPath);
        console.log(`- スクリーンショット: ${result.data.screenshotPath} (${(screenshotStats.size / 1024).toFixed(1)} KB)`);
      }
      if (result.data.jsonPath) {
        const jsonStats = fs.statSync(result.data.jsonPath);
        console.log(`- ユーザー情報JSON: ${result.data.jsonPath} (${(jsonStats.size / 1024).toFixed(1)} KB)`);
      }
      
      console.log('');
      console.log('👤 取得されたユーザー情報:');
      if (result.data.userInfo) {
        console.log('- ページタイトル:', result.data.userInfo.pageTitle || '未取得');
        console.log('- ユーザー名:', result.data.userInfo.name || '未取得');
        console.log('- 残レッスン:', result.data.userInfo.remainingLessons || '未取得');
        console.log('- メニュー項目数:', result.data.userInfo.menuItems?.length || 0);
        
        if (result.data.userInfo.menuItems && result.data.userInfo.menuItems.length > 0) {
          console.log('- 主要メニュー:');
          result.data.userInfo.menuItems.slice(0, 5).forEach(item => {
            console.log(`  • ${item.text}`);
          });
        }
      }
      
      console.log('');
      console.log('🔗 発見されたリンク:');
      if (result.data.availableLinks && result.data.availableLinks.length > 0) {
        result.data.availableLinks.forEach(link => {
          console.log(`- ${link.text}: ${link.href}`);
        });
      }
      
      console.log('');
      console.log('🎉 Enhanced テスト成功！');
      console.log('✅ ログイン機能正常動作');
      console.log('✅ マイページ情報取得成功');
      console.log('✅ ファイル保存完了');
      console.log('✅ ユーザー情報抽出完了');
      
    } else {
      console.log('');
      console.log('⚠️ Enhanced テスト失敗');
      console.log('エラー:', result.error);
    }
    
    // セキュリティ注意喚起
    console.log('');
    console.log('🔒 セキュリティ注意:');
    console.log('1. credentials.js を削除: rm credentials.js');
    console.log('2. 必要に応じて mypage-data/ ディレクトリも削除');
    console.log('3. 保存されたファイルには個人情報が含まれている可能性があります');
    
  } catch (error) {
    console.error('❌ Enhanced テスト実行エラー:', error.message);
    console.error('詳細:', error.stack?.split('\n').slice(0, 3).join('\n'));
  }
}

// 実行
if (require.main === module) {
  runEnhancedTest().catch(console.error);
}

module.exports = { runEnhancedTest };
