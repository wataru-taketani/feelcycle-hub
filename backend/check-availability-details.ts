import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function checkAvailabilityDetails() {
  console.log('🔍 予約可能席数の詳細確認');
  console.log('='.repeat(60));
  
  const tableName = 'feelcycle-hub-lessons-dev';
  
  try {
    // 川崎の7/24データを例に詳細確認
    const result = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'studioCode = :studioCode AND lessonDateTime BETWEEN :startDateTime AND :endDateTime',
      ExpressionAttributeValues: {
        ':studioCode': 'kws',
        ':startDateTime': '2025-07-24T00:00:00+09:00',
        ':endDateTime': '2025-07-24T23:59:59+09:00',
      }
    }));
    
    const lessons = result.Items || [];
    
    console.log(`\n📋 川崎 7/24の予約状況詳細:`);
    console.log('─'.repeat(90));
    
    lessons.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
      .forEach((lesson: any, index) => {
        console.log(`${String(index + 1).padStart(2, ' ')}. ${lesson.startTime} ${lesson.lessonName.padEnd(20)}`);
        console.log(`    isAvailable: "${lesson.isAvailable}"`);
        console.log(`    availableSlots: ${lesson.availableSlots}`);
        console.log(`    totalSlots: ${lesson.totalSlots}`);
        console.log(`    表示: ${lesson.isAvailable === 'true' ? '🟢 予約可' : '🔴 満席'} (${lesson.availableSlots}/${lesson.totalSlots})`);
        console.log('');
      });
    
    // 統計
    const availableStats = lessons.reduce((acc: any, lesson: any) => {
      const key = `${lesson.availableSlots}/${lesson.totalSlots}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 予約状況の分布:');
    Object.entries(availableStats)
      .sort(([,a]: any, [,b]: any) => b - a)
      .forEach(([ratio, count]) => {
        console.log(`  ${ratio}: ${count}件`);
      });
    
    // 実際のスクレイピング処理での値設定を確認
    console.log('\n🔍 スクレイピング処理での席数設定:');
    console.log('real-scraper.tsで設定された値:');
    console.log('  availableSlots: lesson.statusText ? extractAvailableSlots(lesson.statusText) : (lesson.isAvailable ? 5 : 0)');
    console.log('  totalSlots: 20 (固定値)');
    console.log('');
    console.log('つまり:');
    console.log('  - statusTextがある場合: 実際の残席数を抽出');
    console.log('  - statusTextがない場合: 予約可能なら5、満席なら0');
    console.log('  - 総席数は常に20で固定');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkAvailabilityDetails().catch(console.error);