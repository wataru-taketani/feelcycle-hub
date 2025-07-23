import { User } from '../types/index.js';
/**
 * ユーザー管理サービス
 */
export declare class UserService {
    private dynamodb;
    private secretsManager;
    private usersTableName;
    private secretArn;
    constructor();
    /**
     * 新規ユーザー作成
     */
    createUser(userData: {
        email: string;
        password: string;
        planType: User['planType'];
        lineUserId?: string;
        displayName?: string;
        pictureUrl?: string;
    }): Promise<User>;
    /**
     * メールアドレスでユーザー検索
     */
    findByEmail(email: string): Promise<User | null>;
    /**
     * LINE UserIDでユーザー検索
     */
    findByLineUserId(lineUserId: string): Promise<User | null>;
    /**
     * ユーザーIDでユーザー取得
     */
    findById(userId: string): Promise<User | null>;
    /**
     * ユーザー情報更新
     */
    updateUser(userId: string, updates: Partial<Omit<User, 'userId' | 'createdAt'>>): Promise<User>;
    /**
     * LINE連携情報保存
     */
    saveLinkInfo(userId: string, linkInfo: {
        lineUserId: string;
        accessToken: string;
        refreshToken?: string;
    }): Promise<void>;
    /**
     * ユーザー資格情報の更新（公開メソッド）
     */
    updateUserCredentials(userId: string, password: string): Promise<void>;
    /**
     * ユーザー資格情報の保存（暗号化）
     */
    private saveUserCredentials;
    /**
     * ユーザー資格情報の検証
     */
    verifyCredentials(userId: string, password: string): Promise<boolean>;
    /**
     * パスワードハッシュ化
     */
    private hashPassword;
    /**
     * 簡易暗号化（実際はAWS KMSを使用することを推奨）
     */
    private encrypt;
    /**
     * 簡易復号化
     */
    private decrypt;
    /**
     * DynamoDBアイテムをUserオブジェクトに変換
     */
    private itemToUser;
}
