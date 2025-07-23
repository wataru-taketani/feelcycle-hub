"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineService = void 0;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const axios_1 = __importDefault(require("axios"));
/**
 * LINE API連携サービス
 */
class LineService {
    secretsManager;
    secretArn;
    credentials = null;
    constructor() {
        this.secretsManager = new client_secrets_manager_1.SecretsManagerClient({
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
    async getCredentials() {
        if (this.credentials) {
            return this.credentials;
        }
        try {
            const result = await this.secretsManager.send(new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: this.secretArn,
            }));
            if (!result.SecretString) {
                throw new Error('LINE API credentials not found');
            }
            this.credentials = JSON.parse(result.SecretString);
            return this.credentials;
        }
        catch (error) {
            console.error('Get LINE credentials error:', error);
            throw new Error('Failed to get LINE API credentials');
        }
    }
    /**
     * OAuth認証コードをアクセストークンに交換
     */
    async exchangeCodeForToken(code) {
        try {
            const credentials = await this.getCredentials();
            const response = await axios_1.default.post('https://api.line.me/oauth2/v2.1/token', new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.LINE_REDIRECT_URI || '',
                client_id: credentials.channelAccessToken,
                client_secret: credentials.channelSecret,
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            return response.data;
        }
        catch (error) {
            console.error('Exchange code for token error:', error);
            throw new Error('Failed to exchange code for token');
        }
    }
    /**
     * アクセストークンを使用してユーザー情報を取得
     */
    async getUserInfo(accessToken) {
        try {
            const response = await axios_1.default.get('https://api.line.me/v2/profile', {
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
        }
        catch (error) {
            console.error('Get user info error:', error);
            throw new Error('Failed to get LINE user info');
        }
    }
    /**
     * プッシュメッセージ送信
     */
    async sendPushMessage(userId, message) {
        try {
            const credentials = await this.getCredentials();
            await axios_1.default.post('https://api.line.me/v2/bot/message/push', {
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
        }
        catch (error) {
            console.error('Send push message error:', error);
            throw new Error('Failed to send push message');
        }
    }
    /**
     * リッチメッセージ送信（予約通知用）
     */
    async sendReservationNotification(userId, lessonInfo) {
        try {
            const credentials = await this.getCredentials();
            const message = lessonInfo.isAvailable
                ? `🎉 空きが出ました！\\n\\n📍 ${lessonInfo.studio}\\n📅 ${lessonInfo.date}\\n⏰ ${lessonInfo.time}\\n👨‍🏫 ${lessonInfo.instructor}\\n💪 ${lessonInfo.program}\\n\\n今すぐ予約しましょう！`
                : `✅ 予約が完了しました！\\n\\n📍 ${lessonInfo.studio}\\n📅 ${lessonInfo.date}\\n⏰ ${lessonInfo.time}\\n👨‍🏫 ${lessonInfo.instructor}\\n💪 ${lessonInfo.program}`;
            await axios_1.default.post('https://api.line.me/v2/bot/message/push', {
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
        }
        catch (error) {
            console.error('Send reservation notification error:', error);
            throw new Error('Failed to send reservation notification');
        }
    }
    /**
     * リプライメッセージ送信（Webhook応答用）
     */
    async sendReplyMessage(replyToken, message) {
        try {
            const credentials = await this.getCredentials();
            await axios_1.default.post('https://api.line.me/v2/bot/message/reply', {
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
        }
        catch (error) {
            console.error('Send reply message error:', error);
            throw new Error('Failed to send reply message');
        }
    }
    /**
     * Webhookイベントの署名検証
     */
    async verifyWebhookSignature(body, signature) {
        try {
            const credentials = await this.getCredentials();
            const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
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
        }
        catch (error) {
            console.error('Verify webhook signature error:', error);
            return false;
        }
    }
}
exports.LineService = LineService;
