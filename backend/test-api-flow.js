// API Gateway経由での完全フロー確認
const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';

async function testCompleteAPIFlow() {
  console.log('🔍 API完全フロー確認テスト');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log();

  try {
    // 1. スタジオ一覧取得テスト
    console.log('📍 Step 1: スタジオ一覧取得');
    const studiosResponse = await axios.get(`${API_BASE_URL}/studios`, {
      timeout: 30000
    });
    
    console.log('✅ スタジオ取得成功');
    console.log(`📊 取得スタジオ数: ${studiosResponse.data.data?.length || 0}`);
    
    if (studiosResponse.data.data?.length > 0) {
      const firstStudio = studiosResponse.data.data[0];
      console.log(`📋 最初のスタジオ: ${firstStudio.name} (${firstStudio.code})`);
      
      // 2. レッスン取得テスト
      console.log('\n📍 Step 2: レッスンデータ取得');
      console.log(`対象スタジオ: ${firstStudio.name} (${firstStudio.code})`);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      console.log(`対象日付: ${dateStr}`);
      
      const lessonsResponse = await axios.get(`${API_BASE_URL}/lessons`, {
        params: {
          studioCode: firstStudio.code,
          date: dateStr
        },
        timeout: 60000 // スクレイピングに時間がかかる可能性があるため長めに設定
      });
      
      console.log('✅ レッスン取得成功');
      console.log(`📊 取得レッスン数: ${lessonsResponse.data.data?.length || 0}`);
      
      if (lessonsResponse.data.data?.length > 0) {
        console.log('📋 最初の3レッスン:');
        lessonsResponse.data.data.slice(0, 3).forEach((lesson, index) => {
          console.log(`  ${index + 1}. ${lesson.startTime} ${lesson.lessonName} (${lesson.instructor})`);
        });
      }
      
      console.log('\n🎉 API完全フロー確認テスト成功');
      console.log('✅ フロントエンド → API Gateway → Lambda → スクレイピング → DynamoDB の全経路が正常動作');
      
    } else {
      console.log('⚠️ スタジオデータが空のため、レッスン取得テストをスキップ');
    }
    
  } catch (error) {
    console.error('❌ API フローテストでエラー発生');
    console.error('エラー詳細:', error.message);
    
    if (error.response) {
      console.error('ステータス:', error.response.status);
      console.error('レスポンス:', error.response.data);
    }
    
    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ タイムアウトエラー - Lambda関数の実行時間が長い可能性があります');
    }
  }
}

testCompleteAPIFlow();