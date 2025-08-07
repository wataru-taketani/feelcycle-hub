import * as puppeteer from 'puppeteer-core';
// @ts-ignore
import chromium from '@sparticuz/chromium';

/**
 * 動作確認済みFEELCYCLE認証サービス
 * WindSurfの成功実装をTypeScript + Lambda環境に適応
 */

interface LoginResult {
  success: boolean;
  url?: string;
  message?: string;
  error?: string;
  userInfo?: any;
}

/**
 * シンプル・確実なFEELCYCLEログイン機能
 * @param email FEELCYCLEメールアドレス
 * @param password FEELCYCLEパスワード
 */
export async function verifyFeelcycleLogin(email: string, password: string): Promise<LoginResult> {
  console.log('🚀 シンプルFEELCYCLE認証開始');
  
  let browser: puppeteer.Browser | null = null;
  
  try {
    // WindSurfと同じシンプルなブラウザ起動（Lambda用は後で調整）
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isLambda) {
      // Lambda環境
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--hide-scrollbars',
          '--disable-web-security',
        ],
        defaultViewport: { width: 1280, height: 720 },
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      // ローカル環境: WindSurfと同じシンプル設定
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    const page = await browser.newPage();
    
    // WindSurfと同じ処理流れ
    console.log('📱 ログインページアクセス中...');
    await page.goto('https://m.feelcycle.com/mypage/login', {
      waitUntil: 'networkidle2', // SPA対応の重要ポイント
      timeout: 60000
    });
    
    console.log('⏳ JavaScript読み込み待機中...');
    await page.waitForFunction(() => {
      return document.readyState === 'complete' && 
             document.querySelector('input[name="email"]') !== null;
    }, { timeout: 30000 });
    
    console.log('📝 ログイン情報入力中...');
    await page.waitForSelector('input[name="email"]', { visible: true });
    await page.type('input[name="email"]', email);
    
    await page.waitForSelector('input[name="password"]', { visible: true });
    await page.type('input[name="password"]', password);
    
    console.log('🔐 ログイン実行中...');
    await page.click('button.btn1');
    
    // 結果待機
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 結果確認
    const currentUrl = page.url();
    const isSuccess = !currentUrl.includes('/login');
    
    console.log(`✅ ログイン${isSuccess ? '成功' : '失敗'}: ${currentUrl}`);
    
    // WindSurfと同じシンプルな返却値
    return {
      success: isSuccess,
      url: currentUrl,
      message: isSuccess ? 'ログイン成功' : 'ログイン失敗'
    };
    
  } catch (error) {
    console.error('❌ エラー:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 既存システムとの互換性のためのラッパー
 */
export async function authenticateFeelcycleAccountWorking(
  userId: string, 
  email: string, 
  password: string
) {
  console.log(`Working FEELCYCLE認証開始: ${userId}`);
  
  try {
    const verificationResult = await verifyFeelcycleLogin(email, password);
    
    if (!verificationResult.success) {
      throw new Error(verificationResult.error || verificationResult.message);
    }
    
    return {
      success: true,
      data: {
        homeStudio: '取得成功', // 必要に応じて詳細取得を追加
        membershipType: '認証完了',
        currentReservations: [],
        connectedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error(`Working FEELCYCLE認証エラー [${userId}]:`, error);
    throw error;
  }
}