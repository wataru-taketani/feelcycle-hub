import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function checkShibuyaDirect() {
  console.log('🔍 7/30の渋谷のデータ確認（直接クエリ）');
  console.log('='.repeat(60));
  
  const tableName = 'feelcycle-hub-lessons-dev';
  const targetDate = '2025-07-30';
  const studioCode = 'sby'; // 渋谷
  
  try {
    console.log(`\n📍 検索条件:`);
    console.log(`  テーブル: ${tableName}`);
    console.log(`  スタジオ: 渋谷 (${studioCode})`);
    console.log(`  日付: ${targetDate}`);
    
    // 渋谷の7/30のデータをクエリ
    const startDateTime = `${targetDate}T00:00:00+09:00`;
    const endDateTime = `${targetDate}T23:59:59+09:00`;
    
    const result = await docClient.send(new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'studioCode = :studioCode AND lessonDateTime BETWEEN :startDateTime AND :endDateTime',
      ExpressionAttributeValues: {
        ':studioCode': studioCode,
        ':startDateTime': startDateTime,
        ':endDateTime': endDateTime,
      }
    }));
    
    const lessons = result.Items || [];
    console.log(`\n✅ 取得結果: ${lessons.length}件`);
    
    if (lessons.length > 0) {
      console.log(`\n📋 7/30 渋谷のレッスン一覧:`);
      console.log('─'.repeat(90));
      
      // 時間順でソート
      const sortedLessons = lessons.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
      
      sortedLessons.forEach((lesson: any, index) => {
        const availabilityStatus = lesson.isAvailable === 'true' ? '🟢 予約可' : '🔴 満席';
        console.log(`${String(index + 1).padStart(2, ' ')}. ${lesson.startTime}-${lesson.endTime} | ${lesson.lessonName.padEnd(20)} | ${lesson.instructor.padEnd(15)} | ${availabilityStatus}`);
      });
      
      // 統計情報
      const programStats = sortedLessons.reduce((acc: any, lesson: any) => {
        acc[lesson.program] = (acc[lesson.program] || 0) + 1;
        return acc;
      }, {});
      
      const availableCount = sortedLessons.filter((l: any) => l.isAvailable === 'true').length;
      
      console.log('\n📊 統計情報:');
      console.log(`  総レッスン数: ${lessons.length}件`);
      console.log(`  予約可能: ${availableCount}件`);
      console.log(`  満席: ${lessons.length - availableCount}件`);
      console.log(`  プログラム別:`);
      Object.entries(programStats)
        .sort(([,a]: any, [,b]: any) => b - a)
        .forEach(([program, count]) => {
          console.log(`    ${program}: ${count}件`);
        });
        
      // データの更新時刻確認
      const latestUpdate = sortedLessons[0].lastUpdated;
      const updateTime = new Date(latestUpdate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      console.log(`  最終更新: ${updateTime}`);
      
    } else {
      console.log('\n⚠️  該当するレッスンが見つかりませんでした');
      
      // 渋谷のデータがあるか他の日付で確認
      console.log('\n🔍 渋谷のデータがあるか別の日付で確認中...');
      
      // 7/19で確認
      const testResult = await docClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'studioCode = :studioCode AND lessonDateTime BETWEEN :startDateTime AND :endDateTime',
        ExpressionAttributeValues: {
          ':studioCode': studioCode,
          ':startDateTime': '2025-07-19T00:00:00+09:00',
          ':endDateTime': '2025-07-19T23:59:59+09:00',
        }
      }));
      
      if (testResult.Items && testResult.Items.length > 0) {
        console.log(`✅ 渋谷 (${studioCode}) のデータは存在します (7/19: ${testResult.Items.length}件)`);
        console.log('7/30のデータがない可能性があります');
      } else {
        console.log(`❌ 渋谷 (${studioCode}) のデータが見つかりません`);
        
        // 実際にどのスタジオコードがあるか確認
        console.log('\n🔍 実際に存在するスタジオコードを確認中...');
        const scanResult = await docClient.send(new QueryCommand({
          TableName: tableName,
          IndexName: 'DateStudioIndex',
          KeyConditionExpression: 'lessonDate = :date',
          ExpressionAttributeValues: {
            ':date': '2025-07-30'
          },
          ProjectionExpression: 'studioCode',
          Limit: 50
        }));
        
        if (scanResult.Items && scanResult.Items.length > 0) {
          const studioCodes = [...new Set(scanResult.Items.map((item: any) => item.studioCode))];
          console.log(`📋 7/30に存在するスタジオコード:`, studioCodes.sort());
          
          // 渋谷らしきスタジオコードを探す
          const shibuyaLike = studioCodes.filter(code => code.toLowerCase().includes('sh') || code.toLowerCase().includes('si'));
          if (shibuyaLike.length > 0) {
            console.log(`🎯 渋谷らしきスタジオコード:`, shibuyaLike);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ データ確認エラー:', error);
  }
}

checkShibuyaDirect().catch(console.error);