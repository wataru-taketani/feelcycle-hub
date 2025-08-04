import { SecretsManagerClient, GetSecretValueCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import * as crypto from 'crypto';
import * as puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

// @sparticuz/chromium のみを使用（chrome-aws-lambdaは非推奨）

const secretsClient = new SecretsManagerClient({ region: 'ap-northeast-1' });
const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });

const USER_TABLE = process.env.USER_TABLE || 'feelcycle-hub-users-dev';
const FEELCYCLE_DATA_TABLE = process.env.FEELCYCLE_DATA_TABLE || 'feelcycle-hub-user-feelcycle-data-dev';
const FEELCYCLE_CREDENTIALS_SECRET = process.env.FEELCYCLE_CREDENTIALS_SECRET || 'feelcycle-user-credentials';

interface FeelcycleCredentials {
  email: string;
  encryptedPassword: string;
  salt: string;
  createdAt: string;
  lastUsed: string;
}

interface FeelcycleUserData {
  userId: string;
  feelcycleEmail: string;
  lastUpdated: string;
  homeStudio: string;
  membershipType: string;
  currentReservations: ReservationItem[];
  lessonHistory: LessonHistoryItem[];
  dataScrapedAt: string;
  ttl: number;
}

interface ReservationItem {
  date: string;
  time: string;
  studio: string;
  program: string;
  instructor: string;
}

interface LessonHistoryItem {
  date: string;
  time: string;
  studio: string;
  program: string;
  instructor: string;
}

// パスワードの暗号化/復号化
function encryptPassword(password: string, salt?: string): { encryptedPassword: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const cipher = crypto.createCipher('aes256', usedSalt);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return { encryptedPassword: encrypted, salt: usedSalt };
}

function decryptPassword(encryptedPassword: string, salt: string): string {
  const decipher = crypto.createDecipher('aes256', salt);
  let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Secrets Managerから認証情報を取得
async function getStoredCredentials(userId: string): Promise<FeelcycleCredentials | null> {
  try {
    const command = new GetSecretValueCommand({
      SecretId: FEELCYCLE_CREDENTIALS_SECRET
    });
    
    const response = await secretsClient.send(command);
    if (!response.SecretString) return null;
    
    const secrets = JSON.parse(response.SecretString);
    return secrets[userId] || null;
  } catch (error) {
    console.error('認証情報取得エラー:', error);
    return null;
  }
}

// Secrets Managerに認証情報を保存
async function storeCredentials(userId: string, email: string, password: string): Promise<void> {
  try {
    // 既存のシークレットを取得
    let existingSecrets = {};
    try {
      const getCommand = new GetSecretValueCommand({
        SecretId: FEELCYCLE_CREDENTIALS_SECRET
      });
      const response = await secretsClient.send(getCommand);
      if (response.SecretString) {
        existingSecrets = JSON.parse(response.SecretString);
      }
    } catch (error) {
      console.log('新規シークレット作成');
    }

    // パスワードを暗号化
    const { encryptedPassword, salt } = encryptPassword(password);
    
    // 新しい認証情報を追加
    const updatedSecrets = {
      ...existingSecrets,
      [userId]: {
        email,
        encryptedPassword,
        salt,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      }
    };

    const updateCommand = new UpdateSecretCommand({
      SecretId: FEELCYCLE_CREDENTIALS_SECRET,
      SecretString: JSON.stringify(updatedSecrets)
    });

    await secretsClient.send(updateCommand);
    console.log(`認証情報を保存しました: ${userId}`);
  } catch (error) {
    console.error('認証情報保存エラー:', error);
    throw error;
  }
}

// FEELCYCLEサイトでログイン検証
async function verifyFeelcycleLogin(email: string, password: string): Promise<{
  success: boolean;
  userInfo?: any;
  error?: string;
}> {
  let browser: puppeteer.Browser | null = null;
  
  try {
    console.log('FEELCYCLEログイン検証開始', { email });
    
    // Puppeteer設定（Lambda環境対応）
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    console.log('Lambda環境:', isLambda);
    
    if (isLambda) {
      console.log('Lambda環境でChromium起動中...');
      try {
        // まずchrome-aws-lambdaレイヤーを試す（確実性重視）
        console.log('chrome-aws-lambdaレイヤーでの起動を試行中...');
        const chromeAwsLambdaPath = '/opt/chrome/chrome';
        
        browser = await puppeteer.launch({
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images',
            '--single-process',
            '--memory-pressure-off',
            '--max_old_space_size=4096',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-default-apps',
            '--disable-extensions-http-throttling',
            '--disable-component-extensions-with-background-pages',
            '--disable-background-networking',
            '--no-default-browser-check',
            '--no-first-run',
            '--disable-sync',
            '--disable-translate',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
          ],
          defaultViewport: { width: 1280, height: 720 },
          executablePath: chromeAwsLambdaPath,
          headless: true,
          timeout: 15000
        });
        console.log('Lambda環境でChromium起動成功 (chrome-aws-lambda)');
      } catch (chromeAwsLambdaError) {
        console.error('chrome-aws-lambda起動エラー:', chromeAwsLambdaError);
        try {
          // フォールバック: @sparticuz/chromiumを試す
          console.log('@sparticuz/chromiumでの起動を試行中...');
          const executablePath = await chromium.executablePath();
          console.log('Chromium実行パス:', executablePath);
          
          // executablePathが無効な場合は例外を投げる
          if (!executablePath || executablePath === 'undefined') {
            throw new Error('@sparticuz/chromium executablePath is invalid: ' + executablePath);
          }
          
          browser = await puppeteer.launch({
            args: [
              ...chromium.args,
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-gpu',
              '--disable-extensions',
              '--disable-plugins',
              '--disable-images',
              '--single-process',
              '--memory-pressure-off',
              '--max_old_space_size=4096',
              '--disable-background-timer-throttling',
              '--disable-renderer-backgrounding',
              '--disable-default-apps',
              '--disable-extensions-http-throttling',
              '--disable-component-extensions-with-background-pages',
              '--disable-background-networking',
              '--no-default-browser-check',
              '--no-first-run',
              '--disable-sync',
              '--disable-translate',
              '--disable-features=TranslateUI',
              '--disable-ipc-flooding-protection'
            ],
            defaultViewport: { width: 1280, height: 720 },
            executablePath,
            headless: true,
            timeout: 15000
          });
          console.log('Lambda環境でChromium起動成功 (@sparticuz/chromium)');
        } catch (sparticzError) {
          console.error('@sparticuz/chromium起動エラー:', sparticzError);
          throw new Error('Lambda環境でChromiumの起動に失敗しました。スクレイピング機能は現在利用できません。');
        }
      }
    } else {
      console.log('ローカル環境でPuppeteer起動中...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    console.log('ブラウザ起動成功');

    // ページ作成とユーザーエージェント設定
    console.log('新しいページを作成中...');
    const page = await browser.newPage();
    console.log('ページ作成完了');
    
    // コンソールエラーをキャプチャ
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('ページコンソールエラー:', msg.text());
      }
    });
    
    // ネットワークエラーをキャプチャ  
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`HTTP エラー: ${response.status()} ${response.url()}`);
      }
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    console.log('ユーザーエージェント設定完了');

    // ログインページへ移動 (2025年更新: 新しいマイページURL)
    console.log('FEELCYCLEログインページに移動中...');
    try {
      await page.goto('https://m.feelcycle.com/mypage/login', {
        waitUntil: 'domcontentloaded',
        timeout: 30000  // 30秒に増加
      });
      console.log('ログインページロード完了');
    } catch (navigationError) {
      console.error('ナビゲーションエラー:', navigationError);
      
      // 代替URLを試行
      console.log('代替URL https://www.feelcycle.com/mypage/login を試行中...');
      try {
        await page.goto('https://www.feelcycle.com/mypage/login', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        console.log('代替URLでのログインページロード完了');
      } catch (altError) {
        console.error('代替URLでもエラー:', altError);
        throw new Error('FEELCYCLEログインページへのアクセスに失敗しました');
      }
    }

    // デバッグ用: ページのHTMLを取得して要素を調査
    const pageTitle = await page.title();
    console.log('ページタイトル:', pageTitle);
    
    const pageUrl = await page.url();
    console.log('実際のURL:', pageUrl);
    
    // フォーム要素を調査（拡張版）
    const emailSelectors = [
      'input[name="email"]',
      'input[name="mail"]',
      'input[name="user_id"]',
      'input[name="userId"]',
      'input[name="login_id"]',
      'input[name="loginId"]',
      'input[type="email"]',
      'input[type="text"]',
      'input[id="email"]',
      'input[id="mail"]',
      'input[id="user_id"]',
      'input[id="login_id"]',
      '#email',
      '#mail',
      '#user_id',
      '#login_id',
      'input[placeholder*="メール"]',
      'input[placeholder*="mail"]',
      'input[placeholder*="ID"]',
      'input[placeholder*="ユーザー"]',
      'input[class*="email"]',
      'input[class*="mail"]',
      'input[class*="login"]',
      'input[class*="user"]',
      '.email-input',
      '.mail-input',
      '.login-input',
      '.user-input'
    ];
    
    // ページの完全読み込みを待機
    console.log('ページ読み込み完了を待機中...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3秒待機
    
    // FEELCYCLEログインモーダルの表示を待機
    console.log('ログインモーダルの表示を待機中...');
    try {
      await page.waitForSelector('#login_modal', { timeout: 5000 });
      console.log('ログインモーダル発見');
      
      // モーダルコンテンツの表示を待機
      await page.waitForSelector('#login_modal .modalContent', { timeout: 3000 });
      console.log('モーダルコンテンツ表示完了');
    } catch (modalError) {
      console.log('モーダル検出エラー（直接フォーム検索に進行）:', modalError instanceof Error ? modalError.message : 'Unknown error');
    }
    
    // 実際のDOM構造を調査
    const inputElements = await page.$$eval('input', inputs => 
      inputs.map(input => ({
        type: input.type,
        name: input.name || 'none',
        id: input.id || 'none',
        placeholder: input.placeholder || 'none',
        className: input.className || 'none'
      }))
    );
    console.log('発見された全input要素:', JSON.stringify(inputElements, null, 2));

    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 1000 }); // 1秒に変更
        emailInput = selector;
        console.log('有効なメールセレクター発見:', selector);
        break;
      } catch (e) {
        console.log('セレクター無効:', selector);
      }
    }
    
    if (!emailInput) {
      // ページのHTMLをログ出力してデバッグ
      const htmlContent = await page.content();
      console.log('ページHTML抜粋 (最初の5000文字):');
      console.log(htmlContent.substring(0, 5000));
      
      // フォーム要素の詳細調査
      const formElements = await page.$$eval('form', forms => 
        forms.map(form => ({
          action: form.action,
          method: form.method,
          inputs: Array.from(form.querySelectorAll('input')).map(input => ({
            type: input.type,
            name: input.name,
            id: input.id,
            placeholder: input.placeholder,
            className: input.className
          }))
        }))
      );
      console.log('フォーム要素詳細:', JSON.stringify(formElements, null, 2));
      
      throw new Error('メール入力フィールドが見つかりません。ページ構造が変更された可能性があります。');
    }

    // ログインフォームに入力
    console.log('メール入力開始...');
    await page.type(emailInput, email);
    
    // パスワード入力フィールドを探す（拡張版）
    const passwordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[name="passwd"]',
      'input[name="pass"]',
      'input[name="pwd"]',
      'input[name="Password"]',
      'input[name="PASSWORD"]',
      'input[id="password"]',
      'input[id="passwd"]',
      'input[id="pass"]',
      'input[id="pwd"]',
      'input[id="Password"]',
      '#password',
      '#passwd',
      '#pass',
      '#pwd',
      '#Password',
      '#login_password',
      'input[name="login_password"]',
      'input[name="user_password"]',
      'input[placeholder*="パスワード"]',
      'input[placeholder*="password"]',
      'input[placeholder*="Password"]',
      'input[class*="password"]',
      'input[class*="pass"]',
      '.password-input',
      '.pass-input',
      '.pwd-input'
    ];
    
    let passwordInput = null;
    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 300 });
        passwordInput = selector;
        console.log('有効なパスワードセレクター発見:', selector);
        break;
      } catch (e) {
        console.log('セレクター無効:', selector);
      }
    }
    
    if (!passwordInput) {
      throw new Error('パスワード入力フィールドが見つかりません。');
    }
    
    console.log('パスワード入力開始...');
    await page.type(passwordInput, password);

    console.log('ログイン情報入力完了');

    // ログインボタンを探す（拡張版）
    const submitSelectors = [
      'input[type="submit"]',
      'button[type="submit"]',
      'button',
      'input[value*="ログイン"]',
      'input[value*="login"]',
      'input[value*="Login"]',
      'input[value*="送信"]',
      'input[value*="submit"]',
      'button[class*="btn"]',
      'button[class*="button"]',
      'button[class*="login"]',
      'button[class*="submit"]',
      '.btn',
      '.button',
      '.login-btn',
      '.login-button', 
      '.submit-btn',
      '.submit-button',
      '#login-button',
      '#login_button',
      '#login-btn',
      '#submit',
      '#submit-btn',
      'input[name="login"]',
      'button[name="login"]',
      'button[name="submit"]',
      'form button',
      'form input[type="submit"]',
      '[role="button"]'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 300 });
        submitButton = selector;
        console.log('有効なログインボタンセレクター発見:', selector);
        break;
      } catch (e) {
        console.log('ボタンセレクター無効:', selector);
      }
    }
    
    if (!submitButton) {
      throw new Error('ログインボタンが見つかりません。');
    }

    // ログインボタンをクリック
    console.log('ログインボタンクリック中...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
      page.click(submitButton)
    ]);

    console.log('ログインボタンクリック完了');

    // ログイン結果確認
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);

    if (currentUrl.includes('/mypage/login')) {
      // ログイン失敗（同じページにリダイレクト）
      const errorMessage = await page.$eval('.error', el => el.textContent || 'ログインに失敗しました').catch(() => 'ログインに失敗しました');
      return {
        success: false,
        error: errorMessage
      };
    }

    if (currentUrl.includes('/mypage') && !currentUrl.includes('/mypage/login')) {
      console.log('ログイン成功 - マイページ情報取得開始');
      
      // マイページ情報を取得
      const userInfo = await scrapeUserInfo(page);
      
      return {
        success: true,
        userInfo
      };
    }

    return {
      success: false,
      error: 'ログイン後のページ遷移が不明です'
    };

  } catch (error) {
    console.error('ログイン検証エラー:', error);
    return {
      success: false,
      error: `ログイン検証中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// マイページから情報を取得
async function scrapeUserInfo(page: puppeteer.Page): Promise<{
  homeStudio: string;
  membershipType: string;
  currentReservations: ReservationItem[];
  lessonHistory: LessonHistoryItem[];
  scrapedAt: string;
}> {
  try {
    // 基本情報を取得
    const basicInfo = {
      homeStudio: '',
      membershipType: '',
      currentReservations: [] as ReservationItem[],
      lessonHistory: [] as LessonHistoryItem[],
      scrapedAt: new Date().toISOString()
    };

    // 会員種別・所属店舗を取得（right_boxセクションから）
    try {
      const membershipInfo = await page.$eval('.right_box div', el => el.textContent?.trim() || '').catch(() => '');
      console.log('取得した会員情報:', membershipInfo);
      
      if (membershipInfo && membershipInfo.includes('/')) {
        const parts = membershipInfo.split('/').map(part => part.trim());
        if (parts.length >= 2) {
          basicInfo.membershipType = parts[0]; // マンスリーメンバー30
          basicInfo.homeStudio = parts[1];     // 銀座（GNZ）
          console.log('✅ 会員種別:', basicInfo.membershipType);
          console.log('✅ 所属店舗:', basicInfo.homeStudio);
        }
      }
      
      // フォールバック: 他のセレクターも試行
      if (!basicInfo.membershipType || basicInfo.membershipType === '取得失敗') {
        const fallbackSelectors = [
          '.membership-info',
          '.member-type', 
          '[class*="member"]',
          '[class*="subscription"]'
        ];
        
        for (const selector of fallbackSelectors) {
          try {
            const text = await page.$eval(selector, el => el.textContent?.trim() || '');
            if (text) {
              basicInfo.membershipType = text;
              console.log('✅ フォールバック会員種別:', text);
              break;
            }
          } catch (e) {
            console.log('フォールバックセレクター無効:', selector);
          }
        }
      }
      
    } catch (error) {
      console.log('会員情報取得失敗:', error);
      basicInfo.membershipType = '取得失敗';
      basicInfo.homeStudio = '取得失敗';
    }

    // 予約状況を取得（簡易版）
    try {
      basicInfo.currentReservations = await page.$$eval('.reservation-item', els => 
        els.map(el => ({
          date: el.querySelector('.date')?.textContent?.trim() || '',
          time: el.querySelector('.time')?.textContent?.trim() || '',
          studio: el.querySelector('.studio')?.textContent?.trim() || '',
          program: el.querySelector('.program')?.textContent?.trim() || '',
          instructor: el.querySelector('.instructor')?.textContent?.trim() || ''
        }))
      ).catch(() => []);
    } catch (error) {
      console.log('予約情報取得失敗');
    }

    console.log('マイページ情報取得完了:', basicInfo);
    return basicInfo;

  } catch (error) {
    console.error('マイページ情報取得エラー:', error);
    throw error;
  }
}

// DynamoDBにFEELCYCLEデータを保存
async function saveFeeelcycleData(userId: string, email: string, userInfo: {
  homeStudio: string;
  membershipType: string;
  currentReservations: ReservationItem[];
  lessonHistory: LessonHistoryItem[];
  scrapedAt: string;
}): Promise<void> {
  try {
    const feelcycleData: FeelcycleUserData = {
      userId,
      feelcycleEmail: email,
      lastUpdated: new Date().toISOString(),
      homeStudio: userInfo.homeStudio || '',
      membershipType: userInfo.membershipType || '',
      currentReservations: userInfo.currentReservations || [],
      lessonHistory: userInfo.lessonHistory || [],
      dataScrapedAt: new Date().toISOString(),
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90日後に自動削除
    };

    const command = new PutItemCommand({
      TableName: FEELCYCLE_DATA_TABLE,
      Item: marshall(feelcycleData)
    });

    await dynamoClient.send(command);
    console.log(`FEELCYCLEデータを保存しました: ${userId}`);

    // ユーザーテーブルの連携フラグも更新
    await updateUserFeelcycleStatus(userId, true);

  } catch (error) {
    console.error('FEELCYCLEデータ保存エラー:', error);
    throw error;
  }
}

// ユーザーテーブルの連携ステータス更新
async function updateUserFeelcycleStatus(userId: string, linked: boolean): Promise<void> {
  try {
    const command = new UpdateItemCommand({
      TableName: USER_TABLE,
      Key: marshall({ userId }),
      UpdateExpression: 'SET feelcycleAccountLinked = :linked, feelcycleLastVerified = :timestamp',
      ExpressionAttributeValues: marshall({
        ':linked': linked,
        ':timestamp': new Date().toISOString()
      })
    });

    await dynamoClient.send(command);
    console.log(`ユーザー連携ステータス更新: ${userId} -> ${linked}`);
  } catch (error) {
    console.error('ユーザー連携ステータス更新エラー:', error);
    throw error;
  }
}

// メイン関数：FEELCYCLE認証統合処理
export async function authenticateFeelcycleAccount(userId: string, email: string, password: string) {
  try {
    console.log(`FEELCYCLE認証開始: ${userId}`);

    // 1. ログイン検証
    const verificationResult = await verifyFeelcycleLogin(email, password);
    
    if (!verificationResult.success) {
      throw new Error(verificationResult.error || 'ログイン認証に失敗しました');
    }

    // 2. 認証情報をSecrets Managerに保存
    await storeCredentials(userId, email, password);

    // 3. 取得した情報をDynamoDBに保存
    await saveFeeelcycleData(userId, email, verificationResult.userInfo);

    console.log(`FEELCYCLE認証完了: ${userId}`);

    return {
      success: true,
      data: {
        homeStudio: verificationResult.userInfo?.homeStudio || '',
        membershipType: verificationResult.userInfo?.membershipType || '',
        currentReservations: verificationResult.userInfo?.currentReservations || [],
        connectedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error(`FEELCYCLE認証エラー [${userId}]:`, error);
    throw error;
  }
}

// 既存の認証情報チェック
export async function checkFeelcycleAccountStatus(userId: string): Promise<{
  linked: boolean;
  data?: any;
}> {
  try {
    const command = new GetItemCommand({
      TableName: FEELCYCLE_DATA_TABLE,
      Key: marshall({ userId })
    });

    const response = await dynamoClient.send(command);
    
    if (response.Item) {
      const data = unmarshall(response.Item);
      return {
        linked: true,
        data: {
          homeStudio: data.homeStudio,
          membershipType: data.membershipType,
          lastUpdated: data.lastUpdated,
          currentReservations: data.currentReservations
        }
      };
    }

    return { linked: false };

  } catch (error) {
    console.error('FEELCYCLE連携状況確認エラー:', error);
    return { linked: false };
  }
}