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
  console.log('🚀 Working FEELCYCLE認証開始 - アカウントロック防止モード');
  console.log('⚠️ 単一試行ポリシー: ログイン失敗時は自動リトライしません');
  
  let browser: puppeteer.Browser | null = null;
  
  try {
    // 環境検知による適切なブラウザ起動
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isLambda) {
      // Lambda環境: @sparticuz/chromium使用（既存実装と同じ）
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
      // ローカル環境: システム内Chrome使用（macOS対応）
      let executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      try {
        // Chromeインストール確認
        require('fs').accessSync(executablePath);
      } catch {
        // 通常のChromiumパスを試行
        executablePath = '/usr/bin/chromium-browser';
      }
      
      browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    const page = await browser.newPage();
    
    // 1. ログインページアクセス（SPA対応）
    console.log('📱 FEELCYCLEログインページアクセス中...');
    await page.goto('https://m.feelcycle.com/mypage/login', {
      waitUntil: 'networkidle2',  // SPA対応の重要ポイント
      timeout: 60000
    });
    
    // 2. JavaScript実行完了待機（WindSurf成功パターン）
    console.log('⏳ JavaScript読み込み待機中...');
    await page.waitForFunction(() => {
      return document.readyState === 'complete' && 
             document.querySelector('input[name="email"]') !== null;
    }, { timeout: 30000 });
    
    // 3. フォーム入力
    console.log('📝 ログイン情報入力中...');
    await page.waitForSelector('input[name="email"]', { visible: true });
    await page.type('input[name="email"]', email);
    
    await page.waitForSelector('input[name="password"]', { visible: true });
    await page.type('input[name="password"]', password);
    
    // 4. ログインボタンクリック
    console.log('🔐 ログイン実行中...');
    await page.click('button.btn1');
    
    // 5. 結果待機（WindSurfの成功パターンそのまま）
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 6. 結果確認（WindSurfの成功パターンそのまま）
    const currentUrl = page.url();
    const isSuccess = !currentUrl.includes('/login');
    
    console.log(`${isSuccess ? '✅ ログイン成功' : '❌ ログイン失敗'}: ${currentUrl}`);
    
    if (!isSuccess) {
      // アカウントロック防止: 失敗時は即座に処理終了
      console.log('🚨 ログイン失敗検出 - アカウントロック防止のため処理を即座終了');
      console.log('💡 ユーザーには認証情報の再確認を案内');
    }
    
    if (isSuccess) {
      console.log('✅ ログイン成功、マイページ到達');
      console.log('📍 現在のURL:', currentUrl);
      
      // ユーザー情報取得（WindSurfパターン）
      const userInfo = await page.evaluate(() => {
        const info: any = {};
        
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
      
      return {
        success: true,
        url: currentUrl,
        message: 'FEELCYCLE認証成功',
        userInfo
      };
    } else {
      return {
        success: false,
        url: currentUrl,
        message: 'ログイン認証に失敗しました。メールアドレス・パスワードをご確認ください。',
        error: 'AUTHENTICATION_FAILED'
      };
    }
    
  } catch (error) {
    console.error('❌ Working FEELCYCLE認証エラー:', error);
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