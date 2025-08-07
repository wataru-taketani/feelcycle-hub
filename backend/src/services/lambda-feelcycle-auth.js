const puppeteer = require('puppeteer-core');

/**
 * Lambda環境対応 FEELCYCLEシンプル認証
 * WindSurfの成功実装をLambda環境に特化
 */
async function lambdaFeelcycleAuth(email, password) {
  console.log('🚀 Lambda FEELCYCLE認証開始');
  console.log('📧 Email:', email.replace(/(.{3}).*(@.*)/, '$1***$2'));
  
  let browser;
  try {
    // Lambda環境検知
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    console.log('🏷️ 実行環境:', isLambda ? 'AWS Lambda' : 'Local');
    
    if (isLambda) {
      // Lambda環境: @sparticuz/chromium使用
      console.log('🐧 Lambda環境 - @sparticuz/chromium を使用');
      const chromium = require('@sparticuz/chromium');
      
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-plugins',
          '--single-process',
          '--no-zygote'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
      });
    } else {
      // ローカル環境: WindSurfと同じ設定
      console.log('💻 ローカル環境 - 標準設定');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    console.log('✅ ブラウザ起動成功');
    const page = await browser.newPage();
    
    // ログインページアクセス
    console.log('📱 ログインページアクセス中...');
    await page.goto('https://m.feelcycle.com/mypage/login', {
      waitUntil: 'networkidle2',
      timeout: 20000  // Lambda用に短縮
    });
    
    // JavaScript実行完了待機
    console.log('⏳ JavaScript読み込み待機中...');
    await page.waitForFunction(() => {
      return document.readyState === 'complete' && 
             document.querySelector('input[name="email"]') !== null;
    }, { timeout: 15000 });  // Lambda用に短縮
    
    // フォーム入力
    console.log('📝 ログイン情報入力中...');
    await page.waitForSelector('input[name="email"]', { visible: true, timeout: 5000 });
    await page.type('input[name="email"]', email);
    
    await page.waitForSelector('input[name="password"]', { visible: true, timeout: 5000 });
    await page.type('input[name="password"]', password);
    
    // ログインボタンクリック
    console.log('🔐 ログイン実行中...');
    await page.click('button.btn1');
    
    // 結果待機（WindSurfと同じ）
    console.log('⌛ 結果待機中...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 結果確認（WindSurfと同じ）
    const currentUrl = page.url();
    const isSuccess = !currentUrl.includes('/login');
    
    console.log(`${isSuccess ? '✅ ログイン成功' : '❌ ログイン失敗'}: ${currentUrl}`);
    
    // 成功時の追加情報取得
    let userInfo = null;
    if (isSuccess) {
      console.log('👤 ユーザー情報取得中...');
      try {
        userInfo = await page.evaluate(() => {
          const info = {};
          
          // ユーザー名取得
          const nameSelectors = [
            '.user-name',
            '.member-name', 
            '[class*="name"]',
            'h1', 'h2', 'h3'
          ];
          
          for (const selector of nameSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent && element.textContent.trim()) {
              info.name = element.textContent.trim();
              break;
            }
          }
          
          info.pageTitle = document.title;
          info.url = window.location.href;
          info.timestamp = new Date().toISOString();
          
          return info;
        });
        console.log('✅ ユーザー情報取得完了:', userInfo.name || 'Unknown');
      } catch (error) {
        console.log('⚠️ ユーザー情報取得失敗:', error.message);
      }
    }
    
    return {
      success: isSuccess,
      url: currentUrl,
      message: isSuccess ? 'ログイン成功' : 'ログイン失敗',
      userInfo: userInfo
    };
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔚 ブラウザ終了');
    }
  }
}

/**
 * 既存システムとの互換性ラッパー
 */
async function authenticateFeelcycleAccountLambda(userId, email, password) {
  console.log(`🚀 Lambda FEELCYCLE認証開始: ${userId}`);
  
  try {
    const verificationResult = await lambdaFeelcycleAuth(email, password);
    
    if (!verificationResult.success) {
      throw new Error(verificationResult.error || verificationResult.message);
    }
    
    return {
      success: true,
      data: {
        homeStudio: '取得成功',
        membershipType: '認証完了',
        currentReservations: [],
        connectedAt: new Date().toISOString(),
        userInfo: verificationResult.userInfo
      }
    };
    
  } catch (error) {
    console.error(`❌ Lambda FEELCYCLE認証エラー [${userId}]:`, error);
    throw error;
  }
}

module.exports = {
  lambdaFeelcycleAuth,
  authenticateFeelcycleAccountLambda
};