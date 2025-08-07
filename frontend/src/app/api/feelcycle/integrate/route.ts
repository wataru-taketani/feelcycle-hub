import { NextRequest, NextResponse } from 'next/server';

/**
 * FEELCYCLE アカウント連携API
 * POST /api/feelcycle/integrate
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';

export async function POST(request: NextRequest) {
  console.log('🚀 FEELCYCLE連携API呼び出し (Frontend)');

  try {
    // リクエストボディを取得
    const body = await request.json();
    const { userId, email, password } = body;

    // 必須フィールドの検証
    if (!userId || !email || !password) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: userId, email, password' 
        },
        { status: 400 }
      );
    }

    console.log(`FEELCYCLE連携リクエスト: ${userId}, Email: ${email.replace(/(.{3}).*(@.*)/, '$1***$2')}`);

    console.log('🔧 Environment check:', { 
      nodeEnv: process.env.NODE_ENV,
      apiUrl: API_BASE_URL 
    });

    // バックエンドAPIに転送
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    const backendResponse = await fetch(`${API_BASE_URL}/feelcycle/auth/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        email,
        password
      })
    });

    const backendData = await backendResponse.json();
    console.log('📊 Backend Response:', { 
      status: backendResponse.status, 
      success: backendData.success 
    });

    // バックエンドのレスポンスをそのまま返す
    return NextResponse.json(
      backendData,
      { status: backendResponse.status }
    );

  } catch (error) {
    console.error('❌ FEELCYCLE連携API エラー (Frontend):', error);
    
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
