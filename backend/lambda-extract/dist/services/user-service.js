"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const crypto_1 = require("crypto");
const crypto_2 = require("crypto");
/**
 * ユーザー管理サービス
 */
class UserService {
    dynamodb;
    secretsManager;
    usersTableName;
    secretArn;
    constructor() {
        const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
        this.dynamodb = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
        this.secretsManager = new client_secrets_manager_1.SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
        this.usersTableName = process.env.USERS_TABLE_NAME || '';
        this.secretArn = process.env.USER_CREDENTIALS_SECRET_ARN || '';
        if (!this.usersTableName || !this.secretArn) {
            throw new Error('Missing required environment variables');
        }
    }
    /**
     * 新規ユーザー作成
     */
    async createUser(userData) {
        const userId = (0, crypto_1.randomUUID)();
        const now = new Date().toISOString();
        const user = {
            userId,
            email: userData.email,
            planType: userData.planType,
            lineUserId: userData.lineUserId,
            displayName: userData.displayName,
            pictureUrl: userData.pictureUrl,
            createdAt: now,
            updatedAt: now,
        };
        try {
            // パスワードをハッシュ化して保存
            await this.saveUserCredentials(userId, userData.password);
            // ユーザー情報をDynamoDBに保存
            await this.dynamodb.send(new lib_dynamodb_1.PutCommand({
                TableName: this.usersTableName,
                Item: {
                    PK: `USER#${userId}`,
                    SK: 'PROFILE',
                    GSI1PK: `EMAIL#${userData.email}`,
                    GSI2PK: userData.lineUserId ? `LINE#${userData.lineUserId}` : undefined,
                    ...user,
                },
                ConditionExpression: 'attribute_not_exists(PK)', // 重複防止
            }));
            console.log(`User created: ${userId}`);
            return user;
        }
        catch (error) {
            console.error('Create user error:', error);
            throw new Error('Failed to create user');
        }
    }
    /**
     * メールアドレスでユーザー検索
     */
    async findByEmail(email) {
        try {
            const result = await this.dynamodb.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.usersTableName,
                IndexName: 'EmailIndex',
                KeyConditionExpression: 'GSI1PK = :email',
                ExpressionAttributeValues: {
                    ':email': `EMAIL#${email}`,
                },
            }));
            if (!result.Items || result.Items.length === 0) {
                return null;
            }
            const item = result.Items[0];
            return this.itemToUser(item);
        }
        catch (error) {
            console.error('Find by email error:', error);
            throw new Error('Failed to find user by email');
        }
    }
    /**
     * LINE UserIDでユーザー検索
     */
    async findByLineUserId(lineUserId) {
        try {
            const result = await this.dynamodb.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.usersTableName,
                IndexName: 'LineUserIndex',
                KeyConditionExpression: 'GSI2PK = :lineUserId',
                ExpressionAttributeValues: {
                    ':lineUserId': `LINE#${lineUserId}`,
                },
            }));
            if (!result.Items || result.Items.length === 0) {
                return null;
            }
            const item = result.Items[0];
            return this.itemToUser(item);
        }
        catch (error) {
            console.error('Find by LINE user ID error:', error);
            throw new Error('Failed to find user by LINE user ID');
        }
    }
    /**
     * ユーザーIDでユーザー取得
     */
    async findById(userId) {
        try {
            const result = await this.dynamodb.send(new lib_dynamodb_1.GetCommand({
                TableName: this.usersTableName,
                Key: {
                    PK: `USER#${userId}`,
                    SK: 'PROFILE',
                },
            }));
            if (!result.Item) {
                return null;
            }
            return this.itemToUser(result.Item);
        }
        catch (error) {
            console.error('Find by ID error:', error);
            throw new Error('Failed to find user by ID');
        }
    }
    /**
     * ユーザー情報更新
     */
    async updateUser(userId, updates) {
        try {
            const now = new Date().toISOString();
            const result = await this.dynamodb.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.usersTableName,
                Key: {
                    PK: `USER#${userId}`,
                    SK: 'PROFILE',
                },
                UpdateExpression: 'SET updatedAt = :now' +
                    Object.keys(updates).map(key => `, ${key} = :${key}`).join(''),
                ExpressionAttributeValues: {
                    ':now': now,
                    ...Object.fromEntries(Object.entries(updates).map(([key, value]) => [`:${key}`, value])),
                },
                ReturnValues: 'ALL_NEW',
            }));
            if (!result.Attributes) {
                throw new Error('User not found');
            }
            return this.itemToUser(result.Attributes);
        }
        catch (error) {
            console.error('Update user error:', error);
            throw new Error('Failed to update user');
        }
    }
    /**
     * LINE連携情報保存
     */
    async saveLinkInfo(userId, linkInfo) {
        try {
            const now = new Date().toISOString();
            await this.dynamodb.send(new lib_dynamodb_1.PutCommand({
                TableName: this.usersTableName,
                Item: {
                    PK: `USER#${userId}`,
                    SK: 'LINE',
                    lineUserId: linkInfo.lineUserId,
                    accessToken: this.encrypt(linkInfo.accessToken),
                    refreshToken: linkInfo.refreshToken ? this.encrypt(linkInfo.refreshToken) : undefined,
                    connectedAt: now,
                    lastActiveAt: now,
                },
            }));
            // ユーザープロファイルにlineUserIdを追加
            await this.updateUser(userId, {
                lineUserId: linkInfo.lineUserId
            });
            console.log(`LINE link info saved for user: ${userId}`);
        }
        catch (error) {
            console.error('Save LINE link info error:', error);
            throw new Error('Failed to save LINE link info');
        }
    }
    /**
     * ユーザー資格情報の更新（公開メソッド）
     */
    async updateUserCredentials(userId, password) {
        await this.saveUserCredentials(userId, password);
    }
    /**
     * ユーザー資格情報の保存（暗号化）
     */
    async saveUserCredentials(userId, password) {
        try {
            const salt = (0, crypto_2.randomBytes)(32).toString('hex');
            const hashedPassword = this.hashPassword(password, salt);
            const credentials = {
                userId,
                encryptedPassword: hashedPassword,
                salt,
            };
            // Secrets Managerに保存
            await this.secretsManager.send(new client_secrets_manager_1.PutSecretValueCommand({
                SecretId: this.secretArn,
                SecretString: JSON.stringify({ [userId]: credentials }),
            }));
        }
        catch (error) {
            console.error('Save credentials error:', error);
            throw new Error('Failed to save user credentials');
        }
    }
    /**
     * ユーザー資格情報の検証
     */
    async verifyCredentials(userId, password) {
        try {
            const result = await this.secretsManager.send(new client_secrets_manager_1.GetSecretValueCommand({
                SecretId: this.secretArn,
            }));
            if (!result.SecretString) {
                return false;
            }
            const allCredentials = JSON.parse(result.SecretString);
            const userCredentials = allCredentials[userId];
            if (!userCredentials) {
                return false;
            }
            const hashedInput = this.hashPassword(password, userCredentials.salt);
            return hashedInput === userCredentials.encryptedPassword;
        }
        catch (error) {
            console.error('Verify credentials error:', error);
            return false;
        }
    }
    /**
     * パスワードハッシュ化
     */
    hashPassword(password, salt) {
        return (0, crypto_2.pbkdf2Sync)(password, salt, 100000, 64, 'sha512').toString('hex');
    }
    /**
     * 簡易暗号化（実際はAWS KMSを使用することを推奨）
     */
    encrypt(text) {
        // 実装簡略化のため、base64エンコードのみ
        // 本番環境ではAWS KMSまたはより強固な暗号化を使用
        return Buffer.from(text).toString('base64');
    }
    /**
     * 簡易復号化
     */
    decrypt(encryptedText) {
        return Buffer.from(encryptedText, 'base64').toString();
    }
    /**
     * DynamoDBアイテムをUserオブジェクトに変換
     */
    itemToUser(item) {
        return {
            userId: item.userId,
            email: item.email,
            planType: item.planType,
            lineUserId: item.lineUserId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
        };
    }
}
exports.UserService = UserService;
