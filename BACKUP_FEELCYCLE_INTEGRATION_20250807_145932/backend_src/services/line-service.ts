import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import axios from 'axios';

interface LineTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

interface LineUserInfo {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LineCredentials {
  channelAccessToken: string;
  channelSecret: string;
}

/**
 * LINE API連携サービス
 */
export class LineService {
  private secretsManager: SecretsManagerClient;
  private secretArn: string;
  private credentials: LineCredentials | null = null;

  constructor() {
    this.secretsManager = new SecretsManagerClient({ 
      region: process.env.AWS_REGION || 'ap-northeast-1' 
    });
    this.secretArn = process.env.LINE_API_SECRET_ARN || '';
    
    if (!this.secretArn) {
      throw new Error('LINE_API_SECRET_ARN environment variable is required');
    }
  }

  /**
   * LINE API認証情報を取得
   */
  private async getCredentials(): Promise<LineCredentials> {
    if (this.credentials) {
      return this.credentials;
    }

    try {
      console.log('🔐 Getting LINE credentials from Secrets Manager...');
      console.log('🔗 Secret ARN:', this.secretArn);
      
      const result = await this.secretsManager.send(new GetSecretValueCommand({
        SecretId: this.secretArn,
      }));

      if (!result.SecretString) {
        throw new Error('LINE API credentials not found');
      }

      console.log('📄 Raw secret string length:', result.SecretString.length);
      this.credentials = JSON.parse(result.SecretString);
      
      console.log('🔍 Retrieved credentials keys:', Object.keys(this.credentials || {}));
      console.log('🔑 Channel Access Token (first 10 chars):', this.credentials?.channelAccessToken?.substring(0, 10) || 'NOT_FOUND');
      console.log('🔐 Channel Secret (first 10 chars):', this.credentials?.channelSecret?.substring(0, 10) || 'NOT_FOUND');
      
      return this.credentials!;

    } catch (error) {
      console.error('Get LINE credentials error:', error);
      throw new Error('Failed to get LINE API credentials');
    }
  }

  /**
   * OAuth認証コードをアクセストークンに交換
   */
  async exchangeCodeForToken(code: string): Promise<LineTokenResponse> {
    try {
      const credentials = await this.getCredentials();
      
      const response = await axios.post('https://api.line.me/oauth2/v2.1/token', 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.LINE_REDIRECT_URI || '',
          client_id: credentials.channelAccessToken,
          client_secret: credentials.channelSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;

    } catch (error) {
      console.error('Exchange code for token error:', error);
      throw new Error('Failed to exchange code for token');
    }
  }

  /**
   * アクセストークンを使用してユーザー情報を取得
   */
  async getUserInfo(accessToken: string): Promise<LineUserInfo> {
    try {
      const response = await axios.get('https://api.line.me/v2/profile', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return {
        userId: response.data.userId,
        displayName: response.data.displayName,
        pictureUrl: response.data.pictureUrl,
        statusMessage: response.data.statusMessage,
      };

    } catch (error) {
      console.error('Get user info error:', error);
      throw new Error('Failed to get LINE user info');
    }
  }

  /**
   * プッシュメッセージ送信
   */
  async sendPushMessage(userId: string, message: string): Promise<void> {
    try {
      const credentials = await this.getCredentials();

      await axios.post('https://api.line.me/v2/bot/message/push', {
        to: userId,
        messages: [{
          type: 'text',
          text: message,
        }],
      }, {
        headers: {
          'Authorization': `Bearer ${credentials.channelAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Push message sent to user: ${userId}`);

    } catch (error) {
      console.error('Send push message error:', error);
      throw new Error('Failed to send push message');
    }
  }

  /**
   * リッチメッセージ送信（予約通知用）
   */
  async sendReservationNotification(userId: string, lessonInfo: {
    studio: string;
    date: string;
    time: string;
    instructor: string;
    program: string;
    isAvailable: boolean;
  }): Promise<void> {
    try {
      const credentials = await this.getCredentials();
      
      const message = lessonInfo.isAvailable
        ? `🎉 空きが出ました！\\n\\n📍 ${lessonInfo.studio}\\n📅 ${lessonInfo.date}\\n⏰ ${lessonInfo.time}\\n👨‍🏫 ${lessonInfo.instructor}\\n💪 ${lessonInfo.program}\\n\\n今すぐ予約しましょう！`
        : `✅ 予約が完了しました！\\n\\n📍 ${lessonInfo.studio}\\n📅 ${lessonInfo.date}\\n⏰ ${lessonInfo.time}\\n👨‍🏫 ${lessonInfo.instructor}\\n💪 ${lessonInfo.program}`;

      await axios.post('https://api.line.me/v2/bot/message/push', {
        to: userId,
        messages: [{
          type: 'text',
          text: message,
        }],
      }, {
        headers: {
          'Authorization': `Bearer ${credentials.channelAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Reservation notification sent to user: ${userId}`);

    } catch (error) {
      console.error('Send reservation notification error:', error);
      throw new Error('Failed to send reservation notification');
    }
  }

  /**
   * リプライメッセージ送信（Webhook応答用）
   */
  async sendReplyMessage(replyToken: string, message: string): Promise<void> {
    try {
      const credentials = await this.getCredentials();

      await axios.post('https://api.line.me/v2/bot/message/reply', {
        replyToken,
        messages: [{
          type: 'text',
          text: message,
        }],
      }, {
        headers: {
          'Authorization': `Bearer ${credentials.channelAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Reply message sent with token: ${replyToken}`);

    } catch (error) {
      console.error('Send reply message error:', error);
      throw new Error('Failed to send reply message');
    }
  }

  /**
   * Webhookイベントの署名検証
   */
  async verifyWebhookSignature(body: string, signature: string): Promise<boolean> {
    try {
      const credentials = await this.getCredentials();
      const crypto = await import('crypto');
      
      console.log('Channel Secret (first 10 chars):', credentials.channelSecret.substring(0, 10));
      console.log('Body for verification:', body);
      console.log('Expected signature:', signature);
      
      const hash = crypto
        .createHmac('sha256', credentials.channelSecret)
        .update(body)
        .digest('base64');
        
      console.log('Calculated signature:', hash);
      console.log('Signatures match:', signature === hash);

      return signature === hash;

    } catch (error) {
      console.error('Verify webhook signature error:', error);
      return false;
    }
  }
}