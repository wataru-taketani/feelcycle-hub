/**
 * LINE通知機能のテスト
 * テスト用データを使用して通知機能をテスト
 */
import { LineNotificationService } from './src/services/line-notification-service';

async function testLineNotification() {
  console.log('🧪 Starting LINE notification test...');
  
  const lineService = new LineNotificationService();
  
  // テスト用のユーザーID（開発環境のテストユーザー）
  const testUserId = 'e95c2ed9-ff3d-4350-bab5-0dcb3be44abc';
  
  // テスト用のレッスン情報
  const lessonInfo = {
    studioName: 'FEELCYCLE SHIBUYA',
    lessonDate: '2025-07-24',
    startTime: '20:30',
    endTime: '21:15',
    lessonName: 'BB1 BRIT 2024',
    instructor: 'TARO'
  };

  try {
    console.log('📱 Sending test LINE notification...');
    console.log('👤 User ID:', testUserId);
    console.log('📋 Lesson info:', lessonInfo);
    
    await lineService.sendWaitlistAvailabilityNotification(testUserId, lessonInfo);
    
    console.log('✅ LINE notification sent successfully!');
    
  } catch (error) {
    console.error('❌ LINE notification test failed:', error);
    
    // エラーの詳細をログ出力
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw error;
  }
}

// メイン実行
if (require.main === module) {
  testLineNotification()
    .then(() => {
      console.log('🎉 LINE notification test passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 LINE notification test failed!', error);
      process.exit(1);
    });
}