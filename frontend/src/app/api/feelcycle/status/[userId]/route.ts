import { NextRequest, NextResponse } from 'next/server';

/**
 * FEELCYCLE 連携状態取得API
 * GET /api/feelcycle/status/[userId]
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';

export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  console.log('📊 FEELCYCLE連携状態取得API呼び出し (Frontend)');

  try {
    const { userId } = params;

    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User ID is required' 
        },
        { status: 400 }
      );
    }

    console.log(`連携状態確認: ${userId}`);

    // 開発環境での認証バイパス（認証トークンがない場合も含む）
    const authToken = process.env.FEELCYCLE_API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN;
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.NEXT_PUBLIC_API_BASE_URL?.includes('localhost') ||
                         API_BASE_URL.includes('localhost') ||
                         !authToken; // 認証トークンがない場合は開発環境として扱う
    
    console.log('🔧 Environment check (status):', { 
      isDevelopment, 
      nodeEnv: process.env.NODE_ENV,
      apiUrl: API_BASE_URL 
    });
    
    // 開発環境では一時的にモックレスポンスを返す
    if (isDevelopment) {
      console.log('🚧 Development mode: Returning mock status');
      return NextResponse.json(
        {
          success: true,
          isLinked: true,
          data: {
            name: '開発テストユーザー',
            memberType: 'フルタイム',
            homeStudio: '銀座スタジオ',
            linkedAt: new Date().toISOString()
          }
        },
        { status: 200 }
      );
    }

    // バックエンドAPIにリクエスト
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // 開発環境では認証をスキップ、本番環境では適切な認証ヘッダーを追加
    if (!isDevelopment) {
      // 本番環境では認証トークンを追加
      const authToken = process.env.FEELCYCLE_API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN;
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('🔐 Production mode: Adding auth token (status)');
      } else {
        console.warn('⚠️ Production mode: No auth token found (status)');
      }
    }
    
    const backendResponse = await fetch(`${API_BASE_URL}/feelcycle/status/${userId}`, {
      method: 'GET',
      headers
    });

    const backendData = await backendResponse.json();
    console.log('📊 Backend Response:', { 
      status: backendResponse.status, 
      isLinked: backendData.isLinked 
    });

    // バックエンドのレスポンスをそのまま返す
    return NextResponse.json(
      backendData,
      { status: backendResponse.status }
    );

  } catch (error) {
    console.error('❌ FEELCYCLE連携状態取得API エラー (Frontend):', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// CORS対応
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
