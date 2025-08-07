const puppeteer = require('puppeteer');

/**
 * シンプルなFEELCYCLEログイン機能
 * 基本的な実装例（約50行）
 */
async function simpleFeelcycleLogin(email, password) {
  console.log('🚀 シンプルFEELCYCLEログイン開始');
  
  let browser;
  try {
    // 1. ブラウザ起動
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 2. ログインページアクセス
    console.log('📱 ログインページアクセス中...');
    await page.goto('https://m.feelcycle.com/mypage/login', {
      waitUntil: 'networkidle2', // SPA対応の重要ポイント
      timeout: 60000
    });
    
    // 3. JavaScript実行完了待機
    console.log('⏳ JavaScript読み込み待機中...');
    await page.waitForFunction(() => {
      return document.readyState === 'complete' && 
             document.querySelector('input[name="email"]') !== null;
    }, { timeout: 30000 });
    
    // 4. フォーム入力
    console.log('📝 ログイン情報入力中...');
    await page.waitForSelector('input[name="email"]', { visible: true });
    await page.type('input[name="email"]', email);
    
    await page.waitForSelector('input[name="password"]', { visible: true });
    await page.type('input[name="password"]', password);
    
    // 5. ログインボタンクリック
    console.log('🔐 ログイン実行中...');
    await page.click('button.btn1');
    
    // 6. 結果待機
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 7. 結果確認
    const currentUrl = page.url();
    const isSuccess = !currentUrl.includes('/login');
    
    console.log(`✅ ログイン${isSuccess ? '成功' : '失敗'}: ${currentUrl}`);
    
    return {
      success: isSuccess,
      url: currentUrl,
      message: isSuccess ? 'ログイン成功' : 'ログイン失敗'
    };
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 使用例
async function testLogin() {
  const result = await simpleFeelcycleLogin(
    'your-email@example.com',  // 実際のメールアドレス
    'your-password'            // 実際のパスワード
  );
  
  console.log('結果:', result);
}

// テスト実行（実際の認証情報が必要）
// testLogin();

module.exports = { simpleFeelcycleLogin };
