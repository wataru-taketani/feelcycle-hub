import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, PutSecretValueCommand, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { randomUUID } from 'crypto';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';
import { User, UserCredentials } from '../types/index.js';

/**
 * ユーザー管理サービス
 */
export class UserService {
  private dynamodb: DynamoDBDocumentClient;
  private secretsManager: SecretsManagerClient;
  private usersTableName: string;
  private secretArn: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
    this.dynamodb = DynamoDBDocumentClient.from(dynamoClient);
    this.secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
    
    this.usersTableName = process.env.USERS_TABLE_NAME || '';
    this.secretArn = process.env.USER_CREDENTIALS_SECRET_ARN || '';
    
    if (!this.usersTableName || !this.secretArn) {
      throw new Error('Missing required environment variables');
    }
  }

  /**
   * 新規ユーザー作成
   */
  async createUser(userData: {
    email: string;
    password: string;
    planType: User['planType'];
    lineUserId?: string;
    displayName?: string;
    pictureUrl?: string;
  }): Promise<User> {
    const userId = randomUUID();
    const now = new Date().toISOString();
    
    const user: User = {
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
      await this.dynamodb.send(new PutCommand({
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
      
    } catch (error) {
      console.error('Create user error:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * メールアドレスでユーザー検索
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.dynamodb.send(new QueryCommand({
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
      
    } catch (error) {
      console.error('Find by email error:', error);
      throw new Error('Failed to find user by email');
    }
  }

  /**
   * LINE UserIDでユーザー検索
   */
  async findByLineUserId(lineUserId: string): Promise<User | null> {
    try {
      const result = await this.dynamodb.send(new QueryCommand({
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
      
    } catch (error) {
      console.error('Find by LINE user ID error:', error);
      throw new Error('Failed to find user by LINE user ID');
    }
  }

  /**
   * ユーザーIDでユーザー取得
   */
  async findById(userId: string): Promise<User | null> {
    try {
      const result = await this.dynamodb.send(new GetCommand({
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
      
    } catch (error) {
      console.error('Find by ID error:', error);
      throw new Error('Failed to find user by ID');
    }
  }

  /**
   * ユーザー情報更新
   */
  async updateUser(userId: string, updates: Partial<Omit<User, 'userId' | 'createdAt'>>): Promise<User> {
    try {
      const now = new Date().toISOString();
      
      const result = await this.dynamodb.send(new UpdateCommand({
        TableName: this.usersTableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
        },
        UpdateExpression: 'SET updatedAt = :now' + 
          Object.keys(updates).map(key => `, ${key} = :${key}`).join(''),
        ExpressionAttributeValues: {
          ':now': now,
          ...Object.fromEntries(
            Object.entries(updates).map(([key, value]) => [`:${key}`, value])
          ),
        },
        ReturnValues: 'ALL_NEW',
      }));
      
      if (!result.Attributes) {
        throw new Error('User not found');
      }
      
      return this.itemToUser(result.Attributes);
      
    } catch (error) {
      console.error('Update user error:', error);
      throw new Error('Failed to update user');
    }
  }

  /**
   * LINE連携情報保存
   */
  async saveLinkInfo(userId: string, linkInfo: {
    lineUserId: string;
    accessToken: string;
    refreshToken?: string;
  }): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      await this.dynamodb.send(new PutCommand({
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
      
    } catch (error) {
      console.error('Save LINE link info error:', error);
      throw new Error('Failed to save LINE link info');
    }
  }

  /**
   * ユーザー資格情報の更新（公開メソッド）
   */
  async updateUserCredentials(userId: string, password: string): Promise<void> {
    await this.saveUserCredentials(userId, password);
  }

  /**
   * ユーザー資格情報の保存（暗号化）
   */
  private async saveUserCredentials(userId: string, password: string): Promise<void> {
    try {
      const salt = randomBytes(32).toString('hex');
      const hashedPassword = this.hashPassword(password, salt);
      
      const credentials: UserCredentials = {
        userId,
        encryptedPassword: hashedPassword,
        salt,
      };
      
      // Secrets Managerに保存
      await this.secretsManager.send(new PutSecretValueCommand({
        SecretId: this.secretArn,
        SecretString: JSON.stringify({ [userId]: credentials }),
      }));
      
    } catch (error) {
      console.error('Save credentials error:', error);
      throw new Error('Failed to save user credentials');
    }
  }

  /**
   * ユーザー資格情報の検証
   */
  async verifyCredentials(userId: string, password: string): Promise<boolean> {
    try {
      const result = await this.secretsManager.send(new GetSecretValueCommand({
        SecretId: this.secretArn,
      }));
      
      if (!result.SecretString) {
        return false;
      }
      
      const allCredentials = JSON.parse(result.SecretString);
      const userCredentials: UserCredentials = allCredentials[userId];
      
      if (!userCredentials) {
        return false;
      }
      
      const hashedInput = this.hashPassword(password, userCredentials.salt);
      return hashedInput === userCredentials.encryptedPassword;
      
    } catch (error) {
      console.error('Verify credentials error:', error);
      return false;
    }
  }

  /**
   * パスワードハッシュ化
   */
  private hashPassword(password: string, salt: string): string {
    return pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  /**
   * 簡易暗号化（実際はAWS KMSを使用することを推奨）
   */
  private encrypt(text: string): string {
    // 実装簡略化のため、base64エンコードのみ
    // 本番環境ではAWS KMSまたはより強固な暗号化を使用
    return Buffer.from(text).toString('base64');
  }

  /**
   * 簡易復号化
   */
  private decrypt(encryptedText: string): string {
    return Buffer.from(encryptedText, 'base64').toString();
  }

  /**
   * DynamoDBアイテムをUserオブジェクトに変換
   */
  private itemToUser(item: any): User {
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