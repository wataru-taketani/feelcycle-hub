import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function checkKawasaki0724() {
  console.log('🔍 7/24の川崎のデータ確認');
  console.log('='.repeat(60));
  
  const tableName = 'feelcycle-hub-lessons-dev';
  const targetDate = '2025-07-24';
  const studioCode = 'kws'; // 川崎
  
  try {
    console.log(`\n📍 検索条件:`);
    console.log(`  テーブル: ${tableName}`);
    console.log(`  スタジオ: 川崎 (${studioCode})`);
    console.log(`  日付: ${targetDate}`);
    
    // 川崎の7/24のデータをクエリ
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
      console.log(`\n📋 7/24 川崎のレッスン一覧:`);
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
      const fullCount = sortedLessons.filter((l: any) => l.isAvailable === 'false').length;
      
      console.log('\n📊 統計情報:');
      console.log(`  総レッスン数: ${lessons.length}件`);
      console.log(`  予約可能: ${availableCount}件`);
      console.log(`  満席: ${fullCount}件`);
      console.log(`  プログラム別:`);
      Object.entries(programStats)
        .sort(([,a]: any, [,b]: any) => b - a)
        .forEach(([program, count]) => {
          console.log(`    ${program}: ${count}件`);
        });
      
      // 人気インストラクター（レッスン数順）
      const instructorStats = sortedLessons.reduce((acc: any, lesson: any) => {
        acc[lesson.instructor] = (acc[lesson.instructor] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`  インストラクター別:`);
      Object.entries(instructorStats)
        .sort(([,a]: any, [,b]: any) => b - a)
        .forEach(([instructor, count]) => {
          console.log(`    ${instructor}: ${count}件`);
        });
        
      // データの更新時刻確認
      const latestUpdate = sortedLessons[0].lastUpdated;
      const updateTime = new Date(latestUpdate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      console.log(`  最終更新: ${updateTime}`);
      
      // 特に注目すべきレッスン
      console.log('\n🎯 注目レッスン:');
      const morningLessons = sortedLessons.filter((l: any) => l.startTime < '10:00');
      const eveningLessons = sortedLessons.filter((l: any) => l.startTime >= '18:00');
      const fullLessons = sortedLessons.filter((l: any) => l.isAvailable === 'false');
      
      if (morningLessons.length > 0) {
        console.log(`  朝のレッスン: ${morningLessons.length}件`);
        morningLessons.forEach((lesson: any) => {
          console.log(`    ${lesson.startTime} ${lesson.lessonName} (${lesson.instructor})`);
        });
      }
      
      if (eveningLessons.length > 0) {
        console.log(`  夜のレッスン: ${eveningLessons.length}件`);
        eveningLessons.forEach((lesson: any) => {
          console.log(`    ${lesson.startTime} ${lesson.lessonName} (${lesson.instructor})`);
        });
      }
      
      if (fullLessons.length > 0) {
        console.log(`  満席レッスン: ${fullLessons.length}件`);
        fullLessons.forEach((lesson: any) => {
          console.log(`    ${lesson.startTime} ${lesson.lessonName} (${lesson.instructor})`);
        });
      }
      
    } else {
      console.log('\n⚠️  該当するレッスンが見つかりませんでした');
      
      // 川崎のデータがあるか他の日付で確認
      console.log('\n🔍 川崎のデータがあるか別の日付で確認中...');
      
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
        console.log(`✅ 川崎 (${studioCode}) のデータは存在します (7/19: ${testResult.Items.length}件)`);
        console.log('7/24のデータがない可能性があります');
      } else {
        console.log(`❌ 川崎 (${studioCode}) のデータが見つかりません`);
      }
    }
    
  } catch (error) {
    console.error('❌ データ確認エラー:', error);
  }
}

checkKawasaki0724().catch(console.error);