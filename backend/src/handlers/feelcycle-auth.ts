import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticateFeelcycleAccountWorking } from '../services/working-feelcycle-auth-service';
import { authenticateFeelcycleAccount, checkFeelcycleAccountStatus, unlinkFeelcycleAccount } from '../services/enhanced-feelcycle-auth-service';
// Lambda専用のシンプル実装（デバッグ用に残す）
const { authenticateFeelcycleAccountLambda } = require('../services/lambda-feelcycle-auth.js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('FEELCYCLE認証ハンドラー開始:', event.httpMethod, event.path);

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const path = event.path;
    const method = event.httpMethod;

    // POST /feelcycle/auth/verify - ログイン認証
    if (method === 'POST' && path.includes('/feelcycle/auth/verify')) {
      return await handleVerifyAuth(event);
    }

    // GET /feelcycle/auth/status - 連携状況確認
    if (method === 'GET' && path.includes('/feelcycle/auth/status')) {
      return await handleCheckStatus(event);
    }

    // DELETE /feelcycle/auth/unlink/{userId} - 連携解除
    if (method === 'DELETE' && path.includes('/feelcycle/auth/unlink/')) {
      return await handleUnlinkAuth(event);
    }

    // POST /feelcycle/auth/unlink - 連携解除（代替エンドポイント）
    if (method === 'POST' && path.includes('/feelcycle/auth/unlink')) {
      return await handleUnlinkAuth(event);
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Endpoint not found',
        availableEndpoints: [
          'POST /feelcycle/auth/verify',
          'GET /feelcycle/auth/status',
          'DELETE /feelcycle/auth/unlink/{userId}'
        ]
      })
    };

  } catch (error) {
    console.error('FEELCYCLE認証ハンドラーエラー:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

// ログイン認証処理
async function handleVerifyAuth(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { userId, email, password } = body;

    // バリデーション
    if (!userId || !email || !password) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required fields',
          required: ['userId', 'email', 'password']
        })
      };
    }

    // メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Invalid email format'
        })
      };
    }

    console.log(`FEELCYCLE認証開始（同期テスト）: ${userId} (${email})`);

    // デバッグ用：Lambda専用シンプル実装でテスト
    if (userId.startsWith('debug-')) {
      console.log('🔍 デバッグモード: Lambda専用シンプル実装テスト');
      try {
        const result = await authenticateFeelcycleAccountLambda(userId, email, password);
        console.log(`✅ FEELCYCLE認証完了（同期）: ${userId}`, JSON.stringify(result, null, 2));
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            status: 'completed',
            message: 'FEELCYCLE認証が完了しました',
            userId: userId,
            data: result,
            timestamp: new Date().toISOString()
          })
        };
      } catch (error) {
        console.error(`❌ FEELCYCLE認証失敗（同期）: ${userId}`);
        console.error('エラー詳細:', error);
        console.error('エラースタック:', error instanceof Error ? error.stack : 'No stack trace');
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            status: 'failed',
            message: error instanceof Error ? error.message : 'Unknown error',
            userId: userId,
            timestamp: new Date().toISOString()
          })
        };
      }
    }

    // 本番処理：永続化するEnhanced実装を使用
    // DynamoDB/Secrets Managerへ保存し、ステータスAPIと整合するようにする
    console.log('🚀 Enhanced認証実行開始（DynamoDB保存あり）');
    const result = await authenticateFeelcycleAccount(userId, email, password);

    console.log(`✅ FEELCYCLE認証完了: ${userId}`, JSON.stringify(result, null, 2));

    return {
      statusCode: 200, // OK - 処理完了
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        status: 'completed',
        message: 'FEELCYCLE認証が完了しました',
        userId: userId,
        data: result.data,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('FEELCYCLE認証エラー:', error);
    
    // エラーメッセージの分類
    let statusCode = 500;
    let errorMessage = '認証処理中にエラーが発生しました';

    if (error instanceof Error) {
      if (error.message.includes('ログイン') || error.message.includes('認証')) {
        statusCode = 401;
        errorMessage = error.message;
      } else if (error.message.includes('timeout') || error.message.includes('network')) {
        statusCode = 503;
        errorMessage = 'FEELCYCLEサイトへの接続がタイムアウトしました。しばらく後に再試行してください。';
      }
    }

    return {
      statusCode,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      })
    };
  }
}

// 連携状況確認処理
async function handleCheckStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.queryStringParameters?.userId;

    if (!userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing userId parameter'
        })
      };
    }

    console.log(`FEELCYCLE連携状況確認: ${userId}`);

    const status = await checkFeelcycleAccountStatus(userId);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        linked: status.linked,
        data: status.data || null
      })
    };

  } catch (error) {
    console.error('FEELCYCLE連携状況確認エラー:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to check status',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

// 連携解除処理
async function handleUnlinkAuth(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    let userId: string;

    // DELETEリクエストの場合はパスからuserIdを抽出
    if (event.httpMethod === 'DELETE') {
      const pathParts = event.path.split('/');
      userId = pathParts[pathParts.length - 1];
    } 
    // POSTリクエストの場合はボディからuserIdを取得
    else if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      userId = body.userId;
    } else {
      userId = '';
    }

    if (!userId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'User ID is required'
        })
      };
    }

    console.log(`FEELCYCLE連携解除開始: ${userId}`);

    const result = await unlinkFeelcycleAccount(userId);

    console.log(`✅ FEELCYCLE連携解除完了: ${userId}`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: 'FEELCYCLE連携を解除しました',
        userId: userId,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('FEELCYCLE連携解除エラー:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to unlink account',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}