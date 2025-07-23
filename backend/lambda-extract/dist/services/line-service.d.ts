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
/**
 * LINE API連携サービス
 */
export declare class LineService {
    private secretsManager;
    private secretArn;
    private credentials;
    constructor();
    /**
     * LINE API認証情報を取得
     */
    private getCredentials;
    /**
     * OAuth認証コードをアクセストークンに交換
     */
    exchangeCodeForToken(code: string): Promise<LineTokenResponse>;
    /**
     * アクセストークンを使用してユーザー情報を取得
     */
    getUserInfo(accessToken: string): Promise<LineUserInfo>;
    /**
     * プッシュメッセージ送信
     */
    sendPushMessage(userId: string, message: string): Promise<void>;
    /**
     * リッチメッセージ送信（予約通知用）
     */
    sendReservationNotification(userId: string, lessonInfo: {
        studio: string;
        date: string;
        time: string;
        instructor: string;
        program: string;
        isAvailable: boolean;
    }): Promise<void>;
    /**
     * リプライメッセージ送信（Webhook応答用）
     */
    sendReplyMessage(replyToken: string, message: string): Promise<void>;
    /**
     * Webhookイベントの署名検証
     */
    verifyWebhookSignature(body: string, signature: string): Promise<boolean>;
}
export {};
