import { SecretsManagerClient, GetSecretValueCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import * as crypto from 'crypto';
import * as puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const secretsClient = new SecretsManagerClient({ region: 'ap-northeast-1' });
const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });

const USER_TABLE = process.env.USER_TABLE || 'feelcycle-hub-users-dev';
const FEELCYCLE_DATA_TABLE = process.env.FEELCYCLE_DATA_TABLE || 'feelcycle-hub-user-feelcycle-data-dev';
const FEELCYCLE_CREDENTIALS_SECRET = process.env.FEELCYCLE_CREDENTIALS_SECRET || 'feelcycle-user-credentials';

// 暗号化マスターキー（環境変数またはAWS KMSから取得）
const MASTER_KEY = process.env.FEELCYCLE_MASTER_KEY || 'feelcycle-default-master-key-2024';

interface FeelcycleCredentials {
  email: string;
  encryptedPassword: string;
  salt: string;
  iv: string;
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

/**
 * 修正されたパスワード暗号化・復号システム
 * Windserf指摘の設計欠陥を修正：マスターキー使用方式
 */
function encryptPassword(password: string): { encryptedPassword: string; salt: string; iv: string } {
  const salt = crypto.randomBytes(32).toString('hex'); // 256-bit salt
  const iv = crypto.randomBytes(16); // 128-bit IV for AES
  
  // マスターキーとソルトからキーを導出（originalPasswordは不要）
  const key = crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, 32, 'sha256');
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encryptedPassword: encrypted,
    salt,
    iv: iv.toString('hex')
  };
}

function decryptPassword(encryptedPassword: string, salt: string, iv: string): string {
  try {
    if (!encryptedPassword || !salt || !iv) {
      throw new Error('Missing required decryption parameters');
    }
    
    // マスターキーとソルトからキーを再生成（originalPasswordは不要）
    const key = crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, 32, 'sha256');
    const ivBuffer = Buffer.from(iv, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
    
    let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Enhanced password decryption failed');
    throw new Error('Authentication credentials are invalid');
  }
}

// レート制限チェック（DynamoDBベース - 本番推奨）
const authAttempts = new Map<string, { count: number; lastAttempt: number }>();

/**
 * 強化版FEELCYCLE認証システム
 * GeminiとWindserf提案を統合した包括的修正
 */
async function verifyFeelcycleLoginEnhanced(email: string, password: string): Promise<{
  success: boolean;
  userInfo?: any;
  error?: string;
}> {
  // 入力値検証
  if (!email || !password) {
    return {
      success: false,
      error: 'メールアドレスとパスワードを入力してください'
    };
  }

  // レート制限チェック（1時間に5回まで）
  const attemptKey = email.toLowerCase();
  const now = Date.now();
  const hourAgo = now - (60 * 60 * 1000);

  const attempts = authAttempts.get(attemptKey);
  if (attempts) {
    if (attempts.lastAttempt < hourAgo) {
      authAttempts.delete(attemptKey);
    } else if (attempts.count >= 5) {
      console.warn(`Rate limit exceeded for email: ${email}`);
      return {
        success: false,
        error: 'しばらく時間をおいてから再度お試しください'
      };
    }
  }

  const currentAttempts = attempts || { count: 0, lastAttempt: 0 };
  currentAttempts.count += 1;
  currentAttempts.lastAttempt = now;
  authAttempts.set(attemptKey, currentAttempts);

  let browser: puppeteer.Browser | null = null;

  try {
    console.log('Enhanced FEELCYCLEログイン検証開始', { email });

    // 環境別ブラウザ起動（Gemini提案対応）
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    console.log('実行環境:', isLambda ? 'Lambda' : 'Local');

    if (isLambda) {
      console.log('Lambda環境でChromium起動中...');
      const executablePath = await chromium.executablePath();
      if (!executablePath) {
        throw new Error('@sparticuz/chromium executablePath is invalid');
      }
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: { width: 1280, height: 720 },
        executablePath,
        headless: true,
        timeout: 60000,
      });
    } else {
      console.log('ローカル環境でPuppeteer起動中...');

      // ローカル環境でのChrome実行パス検出（Gemini提案）
      let executablePath;
      try {
        const fs = require('fs');
        const possiblePaths = [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium'
        ];

        for (const path of possiblePaths) {
          if (fs.existsSync(path)) {
            executablePath = path;
            console.log('Chrome実行パス発見:', executablePath);
            break;
          }
        }

        if (!executablePath) {
          throw new Error('Chrome実行パスが見つかりません');
        }
      } catch (error) {
        console.error('Chrome実行パス検出エラー:', error);
        throw new Error('ローカル環境でのChrome実行パスが見つかりません。Google Chromeをインストールしてください。');
      }

      browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    console.log('ブラウザ起動成功');
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('FEELCYCLEログインページに移動中...');
    await page.goto('https://m.feelcycle.com/mypage/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    console.log('ログインページロード完了');

    // モーダル検出・表示待機（Gemini提案の概念を診断結果で修正）
    console.log('ログインモーダルの検出と表示待機中...');
    try {
      // 診断結果に基づく正確なモーダルセレクタ
      await page.waitForSelector('[class*="modal"]', { visible: true, timeout: 10000 });
      console.log('✅ ログインモーダル発見');
      
      // モーダルが完全に読み込まれるまで少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (modalError) {
      console.log('⚠️  モーダル検出タイムアウト、通常フォームとして処理続行');
    }

    // 診断結果に基づく簡略化されたセレクタ使用（Windserf提案対応）
    console.log('フォーム要素の検出開始...');
    
    // デバッグ: ページ内の全input要素をリストアップ
    try {
      const allInputs = await page.$$eval('input', (inputs) => 
        inputs.map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          className: input.className,
          placeholder: input.placeholder
        }))
      );
      console.log('🔍 ページ内の全input要素:', JSON.stringify(allInputs, null, 2));
    } catch (debugError) {
      console.log('⚠️  input要素のデバッグ情報取得失敗:', debugError);
    }
    
    // メールアドレス入力（87個→1個に簡略化）
    console.log('メールアドレス入力中...');
    const emailSelector = 'input[name="email"]'; // 診断で確認済み
    try {
      await page.waitForSelector(emailSelector, { visible: true, timeout: 15000 });
      await page.type(emailSelector, email);
      console.log('✅ メールアドレス入力完了');
    } catch (emailError: unknown) {
      console.log('❌ メールアドレス入力失敗:', emailError instanceof Error ? emailError.message : String(emailError));
      // 代替セレクターを試行
      const altEmailSelectors = ['input[type="email"]', 'input[id*="email"]', 'input[name*="mail"]'];
      for (const altSelector of altEmailSelectors) {
        try {
          console.log(`🔄 代替セレクター試行: ${altSelector}`);
          await page.waitForSelector(altSelector, { visible: true, timeout: 3000 });
          await page.type(altSelector, email);
          console.log(`✅ 代替セレクターで入力成功: ${altSelector}`);
          break;
        } catch (altError) {
          console.log(`❌ 代替セレクター失敗: ${altSelector}`);
        }
      }
    }

    // パスワード入力（29個→1個に簡略化）
    console.log('パスワード入力中...');
    const passwordSelector = 'input[name="password"]'; // 診断で確認済み
    try {
      await page.waitForSelector(passwordSelector, { visible: true, timeout: 5000 });
      await page.type(passwordSelector, password);
      console.log('✅ パスワード入力完了');
    } catch (passwordError: unknown) {
      console.log('❌ パスワード入力失敗:', passwordError instanceof Error ? passwordError.message : String(passwordError));
      // 代替セレクターを試行
      const altPasswordSelectors = ['input[type="password"]', 'input[id*="password"]', 'input[name*="pass"]'];
      for (const altSelector of altPasswordSelectors) {
        try {
          console.log(`🔄 代替パスワードセレクター試行: ${altSelector}`);
          await page.waitForSelector(altSelector, { visible: true, timeout: 3000 });
          await page.type(altSelector, password);
          console.log(`✅ 代替セレクターでパスワード入力成功: ${altSelector}`);
          break;
        } catch (altError) {
          console.log(`❌ 代替パスワードセレクター失敗: ${altSelector}`);
        }
      }
    }

    console.log('ログイン情報入力完了');

    // デバッグ: ページ内の全button要素をリストアップ
    try {
      const allButtons = await page.$$eval('button', (buttons) => 
        buttons.map(button => ({
          className: button.className,
          id: button.id,
          textContent: button.textContent?.trim(),
          type: button.type
        }))
      );
      console.log('🔍 ページ内の全button要素:', JSON.stringify(allButtons, null, 2));
    } catch (debugError) {
      console.log('⚠️  button要素のデバッグ情報取得失敗:', debugError);
    }

    // ログインボタンクリック（30個→1個に簡略化）
    console.log('ログインボタンクリック中...');
    const loginButtonSelector = 'button.btn1'; // 診断で確認済み
    try {
      await page.waitForSelector(loginButtonSelector, { visible: true, timeout: 5000 });
    } catch (buttonError: unknown) {
      console.log('❌ ログインボタン検出失敗:', buttonError instanceof Error ? buttonError.message : String(buttonError));
      // 代替セレクターを試行
      const altButtonSelectors = ['button[type="submit"]', 'input[type="submit"]', 'button:contains("ログイン")', '.btn', '.submit'];
      for (const altSelector of altButtonSelectors) {
        try {
          console.log(`🔄 代替ボタンセレクター試行: ${altSelector}`);
          await page.waitForSelector(altSelector, { visible: true, timeout: 3000 });
          console.log(`✅ 代替ボタンセレクター検出成功: ${altSelector}`);
          break;
        } catch (altError) {
          console.log(`❌ 代替ボタンセレクター失敗: ${altSelector}`);
        }
      }
    }

    // 動的待機処理（Windserf提案：setTimeout削除）
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
      page.click(loginButtonSelector)
    ]);
    console.log('ログインボタンクリック完了、ページ遷移待機完了');

    // ログイン結果確認
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);

    if (currentUrl.includes('/mypage/login')) {
      // ログイン失敗の詳細確認
      const errorElement = await page.$('.error_message, .error, [class*="error"]').catch(() => null);
      const errorMessage = errorElement ? await page.evaluate(el => el.textContent, errorElement).catch(() => null) : null;
      console.warn('ログイン失敗:', errorMessage || '不明なエラー');
      return {
        success: false,
        error: 'メールアドレスまたはパスワードが正しくありません。'
      };
    }

    if (currentUrl.includes('/mypage') && !currentUrl.includes('/mypage/login')) {
      console.log('ログイン成功 - マイページ情報取得開始');
      const userInfo = await scrapeUserInfoEnhanced(page);
      return {
        success: true,
        userInfo
      };
    }

    return {
      success: false,
      error: 'ログイン後のページ遷移が不明です。'
    };

  } catch (error) {
    console.error('Enhanced FEELCYCLEログイン検証中に致命的なエラーが発生しました:', error);
    return {
      success: false,
      error: 'ログイン検証中に予期せぬ問題が発生しました。サイトの構造が変更された可能性があります。'
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 強化版マイページスクレイピング
 * 最新のFEELCYCLE構造に対応
 */
async function scrapeUserInfoEnhanced(page: puppeteer.Page): Promise<{
  homeStudio: string;
  membershipType: string;
  currentReservations: ReservationItem[];
  lessonHistory: LessonHistoryItem[];
  scrapedAt: string;
}> {
  try {
    const basicInfo = {
      homeStudio: '',
      membershipType: '',
      currentReservations: [] as ReservationItem[],
      lessonHistory: [] as LessonHistoryItem[],
      scrapedAt: new Date().toISOString()
    };

    // 会員情報取得（複数パターン対応）
    try {
      const membershipSelectors = [
        '.user-info .membership', // 新構造想定
        '.member-info',
        '.membership-type',
        '.right_box div', // 現在の構造
        '[class*="member"]',
        '[class*="subscription"]'
      ];

      let membershipFound = false;
      for (const selector of membershipSelectors) {
        try {
          const membershipText = await page.$eval(selector, el => el.textContent?.trim() || '');
          if (membershipText && membershipText.length > 0) {
            console.log(`会員情報取得成功 (${selector}):`, membershipText);
            
            // テキストから情報を抽出
            if (membershipText.includes('/')) {
              const parts = membershipText.split('/').map(part => part.trim());
              if (parts.length >= 2) {
                basicInfo.membershipType = parts[0];
                basicInfo.homeStudio = parts[1];
                membershipFound = true;
                break;
              }
            } else {
              basicInfo.membershipType = membershipText;
              membershipFound = true;
              break;
            }
          }
        } catch (selectorError) {
          console.log(`会員情報セレクタ無効 (${selector})`);
        }
      }

      if (!membershipFound) {
        console.log('⚠️  会員情報の取得に失敗、フォールバック処理');
        basicInfo.membershipType = '取得失敗';
        basicInfo.homeStudio = '取得失敗';
      }

    } catch (error) {
      console.log('会員情報取得エラー:', error);
      basicInfo.membershipType = '取得失敗';
      basicInfo.homeStudio = '取得失敗';
    }

    // 予約状況取得（更新版）
    try {
      const reservationSelectors = [
        '.reservation-list .reservation-item', // 新構造想定
        '.current-reservations .item',
        '.reservation-item',
        '.booking-item',
        '[class*="reservation"]',
        '[class*="booking"]'
      ];

      for (const selector of reservationSelectors) {
        try {
          const reservations = await page.$$eval(selector, els => 
            els.map(el => ({
              date: el.querySelector('.date, [class*="date"]')?.textContent?.trim() || '',
              time: el.querySelector('.time, [class*="time"]')?.textContent?.trim() || '',
              studio: el.querySelector('.studio, [class*="studio"]')?.textContent?.trim() || '',
              program: el.querySelector('.program, [class*="program"]')?.textContent?.trim() || '',
              instructor: el.querySelector('.instructor, [class*="instructor"]')?.textContent?.trim() || ''
            }))
          );
          
          if (reservations.length > 0) {
            basicInfo.currentReservations = reservations;
            console.log(`✅ 予約情報取得成功: ${reservations.length}件`);
            break;
          }
        } catch (selectorError) {
          console.log(`予約情報セレクタ無効 (${selector})`);
        }
      }
    } catch (error) {
      console.log('予約情報取得エラー:', error);
    }

    console.log('Enhanced マイページ情報取得完了:', basicInfo);
    return basicInfo;

  } catch (error) {
    console.error('Enhanced マイページ情報取得エラー:', error);
    throw error;
  }
}

// Secrets Managerから認証情報を取得（修正版）
async function getStoredCredentials(userId: string): Promise<FeelcycleCredentials | null> {
  try {
    if (!userId) {
      console.error('Invalid userId provided to getStoredCredentials');
      return null;
    }

    const command = new GetSecretValueCommand({
      SecretId: FEELCYCLE_CREDENTIALS_SECRET
    });
    
    const response = await secretsClient.send(command);
    if (!response.SecretString) {
      console.warn('No secret string found in AWS Secrets Manager');
      return null;
    }
    
    const secrets = JSON.parse(response.SecretString);
    const credentials = secrets[userId] || null;
    
    if (credentials) {
      console.log(`Retrieved credentials for user: ${userId}`);
    }
    
    return credentials;
  } catch (error) {
    console.error('Failed to retrieve credentials from Secrets Manager');
    if (error instanceof Error) {
      console.debug('Debug info:', error.message);
    }
    return null;
  }
}

// Secrets Managerに認証情報を保存（修正版）
async function storeCredentials(userId: string, email: string, password: string): Promise<void> {
  try {
    if (!userId || !email || !password) {
      throw new Error('Missing required parameters for credential storage');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

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
      console.log('Creating new secret in AWS Secrets Manager');
    }

    // パスワードを暗号化（修正版）
    const { encryptedPassword, salt, iv } = encryptPassword(password);
    
    // 新しい認証情報を追加
    const updatedSecrets = {
      ...existingSecrets,
      [userId]: {
        email,
        encryptedPassword,
        salt,
        iv,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
      }
    };

    const updateCommand = new UpdateSecretCommand({
      SecretId: FEELCYCLE_CREDENTIALS_SECRET,
      SecretString: JSON.stringify(updatedSecrets)
    });

    await secretsClient.send(updateCommand);
    console.log(`Enhanced credentials stored successfully for user: ${userId}`);
  } catch (error) {
    console.error('Failed to store enhanced credentials in Secrets Manager');
    if (error instanceof Error) {
      console.debug('Debug info:', error.message);
    }
    throw new Error('Failed to save authentication credentials');
  }
}

// DynamoDBにFEELCYCLEデータを保存（修正版）
async function saveFeeelcycleDataEnhanced(userId: string, email: string, userInfo: {
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
    console.log(`Enhanced FEELCYCLEデータを保存しました: ${userId}`);

    // ユーザーテーブルの連携フラグも更新
    await updateUserFeelcycleStatus(userId, true);

  } catch (error) {
    console.error('Enhanced FEELCYCLEデータ保存エラー:', error);
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
    console.log(`Enhanced ユーザー連携ステータス更新: ${userId} -> ${linked}`);
  } catch (error) {
    console.error('Enhanced ユーザー連携ステータス更新エラー:', error);
    throw error;
  }
}

/**
 * バックグラウンド認証（保存済み認証情報を使用）
 * Windserf提案：復号機能の実装
 */
export async function backgroundAuthenticateFeelcycleAccount(userId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    console.log(`Background FEELCYCLE認証開始: ${userId}`);

    // 保存済み認証情報を取得
    const credentials = await getStoredCredentials(userId);
    if (!credentials) {
      return {
        success: false,
        error: 'Stored credentials not found'
      };
    }

    // パスワードを復号（修正版：originalPasswordは不要）
    const decryptedPassword = decryptPassword(
      credentials.encryptedPassword,
      credentials.salt,
      credentials.iv
    );

    // 認証実行
    const verificationResult = await verifyFeelcycleLoginEnhanced(credentials.email, decryptedPassword);
    
    if (!verificationResult.success) {
      return {
        success: false,
        error: verificationResult.error
      };
    }

    // データ更新
    await saveFeeelcycleDataEnhanced(userId, credentials.email, verificationResult.userInfo);

    return {
      success: true,
      data: {
        homeStudio: verificationResult.userInfo?.homeStudio || '',
        membershipType: verificationResult.userInfo?.membershipType || '',
        currentReservations: verificationResult.userInfo?.currentReservations || [],
        lastUpdated: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error(`Background FEELCYCLE認証エラー [${userId}]:`, error);
    return {
      success: false,
      error: 'Background authentication failed'
    };
  }
}

// メイン関数：Enhanced FEELCYCLE認証統合処理
export async function authenticateFeelcycleAccountEnhanced(userId: string, email: string, password: string) {
  try {
    console.log(`Enhanced FEELCYCLE認証開始: ${userId}`);

    // 1. ログイン検証（修正版）
    console.log('ステップ1: Enhanced ログイン検証開始');
    const verificationResult = await verifyFeelcycleLoginEnhanced(email, password);
    console.log('ステップ1結果:', JSON.stringify(verificationResult, null, 2));
    
    if (!verificationResult.success) {
      console.error('Enhanced ログイン検証失敗:', verificationResult.error);
      throw new Error(verificationResult.error || 'ログイン認証に失敗しました');
    }

    // 2. 認証情報をSecrets Managerに保存（修正版）
    console.log('ステップ2: Enhanced Secrets Manager保存開始');
    await storeCredentials(userId, email, password);
    console.log('ステップ2完了: Enhanced Secrets Manager保存成功');

    // 3. 取得した情報をDynamoDBに保存（修正版）
    console.log('ステップ3: Enhanced DynamoDB保存開始');
    await saveFeeelcycleDataEnhanced(userId, email, verificationResult.userInfo);
    console.log('ステップ3完了: Enhanced DynamoDB保存成功');

    console.log(`Enhanced FEELCYCLE認証完了: ${userId}`);

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
    console.error(`Enhanced FEELCYCLE認証エラー [${userId}]:`, error);
    throw error;
  }
}

// 既存の認証情報チェック（修正版）
export async function checkFeelcycleAccountStatusEnhanced(userId: string): Promise<{
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
    console.error('Enhanced FEELCYCLE連携状況確認エラー:', error);
    return { linked: false };
  }
}

// 既存関数との互換性維持（デフォルトエクスポート）
export const authenticateFeelcycleAccount = authenticateFeelcycleAccountEnhanced;
export const checkFeelcycleAccountStatus = checkFeelcycleAccountStatusEnhanced;