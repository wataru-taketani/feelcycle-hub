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
    console.log('FEELCYCLEログイン検証開始');
    
    // Puppeteer設定（Lambda環境対応）
    const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    if (isLambda) {
      browser = await puppeteer.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: { width: 1280, height: 720 },
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // ログインページへ移動
    await page.goto('https://www.feelcycle.com/feelcycle_reserve/my_page_login.php', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('ログインページロード完了');

    // ログインフォームに入力
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    await page.type('input[name="email"]', email);
    await page.type('input[name="password"]', password);

    console.log('ログイン情報入力完了');

    // ログインボタンをクリック
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('input[type="submit"]')
    ]);

    console.log('ログインボタンクリック完了');

    // ログイン結果確認
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);

    if (currentUrl.includes('my_page_login.php')) {
      // ログイン失敗（同じページにリダイレクト）
      const errorMessage = await page.$eval('.error', el => el.textContent || 'ログインに失敗しました').catch(() => 'ログインに失敗しました');
      return {
        success: false,
        error: errorMessage
      };
    }

    if (currentUrl.includes('my_page.php') || currentUrl.includes('mypage')) {
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

    // 所属店舗を取得
    try {
      basicInfo.homeStudio = await page.$eval('.studio-info', el => el.textContent?.trim() || '').catch(() => '取得失敗');
    } catch (error) {
      console.log('所属店舗情報取得失敗');
    }

    // 会員種別を取得
    try {
      basicInfo.membershipType = await page.$eval('.membership-type', el => el.textContent?.trim() || '').catch(() => '取得失敗');
    } catch (error) {
      console.log('会員種別情報取得失敗');
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