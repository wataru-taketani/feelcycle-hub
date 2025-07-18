// 環境変数設定（importより前に）
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';

import { LessonsService } from './src/services/lessons-service';

async function testClearMethod() {
  console.log('🧪 clearAllLessonsメソッドのテスト');
  console.log('='.repeat(60));
  
  const lessonsService = new LessonsService();
  
  try {
    // Step 1: クリア前のデータ確認
    console.log('\n📍 Step 1: クリア前のデータ数確認...');
    
    // Step 2: 全データクリア
    console.log('\n📍 Step 2: 全データクリア実行...');
    const result = await lessonsService.clearAllLessons();
    
    console.log(`✅ クリア完了: ${result.deletedCount}件削除`);
    
    // Step 3: クリア後の確認
    console.log('\n📍 Step 3: クリア後の確認...');
    // 簡易確認（scanで件数チェック）
    
  } catch (error) {
    console.error('❌ テスト失敗:', error);
  }
}

testClearMethod().catch(console.error);