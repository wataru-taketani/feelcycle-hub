import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  DynamoDBClient, 
  DeleteItemCommand, 
  UpdateItemCommand 
} from '@aws-sdk/client-dynamodb';
import { 
  SecretsManagerClient, 
  DeleteSecretCommand 
} from '@aws-sdk/client-secrets-manager';
import { 
  authenticateFeelcycleAccountEnhanced, 
  checkFeelcycleAccountStatusEnhanced 
} from '../services/feelcycle-auth-service';

/**
 * FEELCYCLE アカウント連携API Handler
 * フロントエンドからの連携リクエストを処理
 */

interface IntegrationRequest {
  userId: string;
  email: string;
  password: string;
}

interface IntegrationResponse {
  success: boolean;
  data?: {
    name: string;
    memberType: string;
    homeStudio: string;
    linkedAt: string;
  };
  error?: string;
  details?: string;
}

/**
 * FEELCYCLE アカウント連携実行
 * POST /api/feelcycle/integrate
 */
export async function integrateAccount(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('🚀 FEELCYCLE連携API呼び出し開始');
  
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // OPTIONS request handling
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // リクエストボディの解析
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Request body is required' 
        })
      };
    }

    const { userId, email, password }: IntegrationRequest = JSON.parse(event.body);
    
    // 必須フィールドの検証
    if (!userId || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Missing required fields: userId, email, password' 
        })
      };
    }

    // メールアドレス形式の簡易検証
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid email format' 
        })
      };
    }

    console.log(`FEELCYCLE連携処理開始: ${userId}, Email: ${email.replace(/(.{3}).*(@.*)/, '$1***$2')}`);

    // 既存の認証サービスを使用してFEELCYCLE連携実行
    const authResult = await authenticateFeelcycleAccountEnhanced(userId, email, password);
    
    if (!authResult.success) {
      console.error('FEELCYCLE認証失敗:', authResult);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'FEELCYCLE認証に失敗しました',
          details: 'Authentication failed' 
        })
      };
    }

    console.log('✅ FEELCYCLE連携成功');

    // 成功レスポンス
    const response: IntegrationResponse = {
      success: true,
      data: {
        name: 'FEELCYCLEユーザー', // 名前は別途取得が必要
        memberType: authResult.data?.membershipType || 'Standard',
        homeStudio: authResult.data?.homeStudio || 'Unknown',
        linkedAt: authResult.data?.connectedAt || new Date().toISOString()
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('FEELCYCLE連携API エラー:', error);
    
    // エラーの種類に応じた適切なレスポンス
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        statusCode = 408;
        errorMessage = 'Request timeout - FEELCYCLEサーバーの応答が遅延しています';
      } else if (error.message.includes('network')) {
        statusCode = 503;
        errorMessage = 'Network error - FEELCYCLEサーバーに接続できません';
      } else if (error.message.includes('credentials')) {
        statusCode = 401;
        errorMessage = 'Invalid credentials - 認証情報が正しくありません';
      }
    }

    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

/**
 * FEELCYCLE 連携状態取得
 * GET /api/feelcycle/status/{userId}
 */
export async function getIntegrationStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('📊 FEELCYCLE連携状態取得API呼び出し');
  
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // OPTIONS request handling
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { userId } = event.pathParameters || {};
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'User ID is required' 
        })
      };
    }

    console.log(`連携状態確認: ${userId}`);

    // 既存の認証サービスを使用して連携状態を確認
    const statusResult = await checkFeelcycleAccountStatusEnhanced(userId);
    
    const response = {
      success: true,
      isLinked: statusResult.linked,
      data: statusResult.linked ? {
        name: statusResult.data?.name,
        memberType: statusResult.data?.membershipType,
        homeStudio: statusResult.data?.homeStudio,
        linkedAt: statusResult.data?.lastUpdated
      } : null
    };

    console.log(`✅ 連携状態取得完了: ${statusResult.linked ? '連携済み' : '未連携'}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('連携状態取得API エラー:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

/**
 * FEELCYCLE 連携解除
 * DELETE /api/feelcycle/unlink/{userId}
 */
export async function unlinkAccount(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('🔓 FEELCYCLE連携解除API呼び出し');
  
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // OPTIONS request handling
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { userId } = event.pathParameters || {};
    
    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'User ID is required' 
        })
      };
    }

    console.log(`連携解除処理: ${userId}`);

    // DynamoDB設定
    const tableName = process.env.FEELCYCLE_DATA_TABLE || 'feelcycle-hub-user-feelcycle-data-dev';
    const usersTableName = process.env.USER_TABLE || 'feelcycle-hub-users-dev';
    
    const dynamoDb = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

    try {
      // 1. FEELCYCLEデータテーブルからユーザーデータを削除
      console.log(`FEELCYCLEデータ削除: ${tableName}`);
      const deleteFeelcycleDataCommand = new DeleteItemCommand({
        TableName: tableName,
        Key: {
          userId: { S: userId }
        }
      });
      await dynamoDb.send(deleteFeelcycleDataCommand);

      // 2. ユーザーテーブルの連携ステータスを更新
      console.log(`ユーザーステータス更新: ${usersTableName}`);
      const updateUserCommand = new UpdateItemCommand({
        TableName: usersTableName,
        Key: {
          PK: { S: `USER#${userId}` },
          SK: { S: 'PROFILE' }
        },
        UpdateExpression: 'SET feelcycleAccountLinked = :linked REMOVE feelcycleLastVerified',
        ExpressionAttributeValues: {
          ':linked': { BOOL: false }
        }
      });
      await dynamoDb.send(updateUserCommand);

      // 3. Secrets Manager からの認証情報削除
      // 注意: 個別ユーザーの認証情報はuserIdをキーとして保存されていると仮定
      try {
        console.log(`Secrets Manager認証情報削除: feelcycle-user-credentials-${userId}`);
        const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });
        
        const deleteSecretCommand = new DeleteSecretCommand({
          SecretId: `feelcycle-user-credentials-${userId}`,
          ForceDeleteWithoutRecovery: true
        });
        
        await secretsManager.send(deleteSecretCommand);
        console.log('✅ Secrets Manager認証情報削除完了');
      } catch (secretError) {
        // Secret が存在しない場合はエラーではない
        console.log('ℹ️ Secrets Manager削除スキップ (存在しないか既に削除済み)');
      }

      console.log('✅ FEELCYCLE連携解除完了');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          message: 'FEELCYCLE連携を解除しました',
          timestamp: new Date().toISOString()
        })
      };

    } catch (dbError) {
      console.error('データベース操作エラー:', dbError);
      throw new Error(`Database operation failed: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`);
    }

  } catch (error) {
    console.error('連携解除API エラー:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

// Lambda関数のエクスポート
export { integrateAccount as integrate };
export { getIntegrationStatus as status };
export { unlinkAccount as unlink };
