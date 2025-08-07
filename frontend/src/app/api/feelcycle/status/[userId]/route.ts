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

    console.log('🔧 Environment check (status):', { 
      nodeEnv: process.env.NODE_ENV,
      apiUrl: API_BASE_URL 
    });

    // バックエンドAPIにリクエスト
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    const backendResponse = await fetch(`${API_BASE_URL}/feelcycle/auth/status?userId=${userId}`, {
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
