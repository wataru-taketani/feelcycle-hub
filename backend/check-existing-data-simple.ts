import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function checkExistingDataSimple() {
  console.log('📊 既存DynamoDBデータの状況確認（簡易版）');
  console.log('='.repeat(60));
  
  const tableName = 'feelcycle-hub-lessons-dev';
  
  try {
    console.log('\n📍 既存レッスンデータをスキャン中...');
    
    // 最初の50件をスキャン
    const result = await docClient.send(new ScanCommand({
      TableName: tableName,
      Limit: 50
    }));
    
    const lessons = result.Items || [];
    console.log(`✅ 取得したレッスン数: ${lessons.length}件`);
    
    if (lessons.length > 0) {
      // スタジオ別の集計
      const studioCount = lessons.reduce((acc, lesson: any) => {
        acc[lesson.studioCode] = (acc[lesson.studioCode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // 日付別の集計  
      const dateCount = lessons.reduce((acc, lesson: any) => {
        acc[lesson.lessonDate] = (acc[lesson.lessonDate] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`\\n📊 スタジオ別データ数:`);
      Object.entries(studioCount)
        .sort(([,a], [,b]) => b - a)
        .forEach(([studio, count]) => {
          console.log(`  ${studio}: ${count}件`);
        });
        
      console.log(`\\n📅 日付別データ数:`);
      Object.entries(dateCount)
        .sort(([,a], [,b]) => b - a)
        .forEach(([date, count]) => {
          console.log(`  ${date}: ${count}件`);
        });
        
      console.log(`\\n📝 サンプルレッスンデータ (最初の5件):`);
      lessons.slice(0, 5).forEach((lesson: any, index) => {
        console.log(`  ${index + 1}. ${lesson.studioCode} ${lesson.lessonDate} ${lesson.startTime} ${lesson.lessonName} (${lesson.instructor})`);
      });
      
      // 最新と最古のデータ確認
      const dates = lessons.map((l: any) => l.lessonDate).filter(Boolean).sort();
      if (dates.length > 0) {
        const oldestDate = dates[0];
        const newestDate = dates[dates.length - 1];
        
        console.log(`\\n⏰ データ期間 (サンプルから):`);
        console.log(`  最古: ${oldestDate}`);
        console.log(`  最新: ${newestDate}`);
      }
      
      // TTL情報確認
      const ttlInfo = lessons
        .filter((l: any) => l.ttl)
        .map((l: any) => ({
          ttl: l.ttl,
          expiryDate: new Date((l.ttl as number) * 1000).toISOString().split('T')[0]
        }));
        
      if (ttlInfo.length > 0) {
        const expiryDates = ttlInfo.map(t => t.expiryDate);
        const uniqueExpiryDates = [...new Set(expiryDates)];
        
        console.log(`\\n⏳ TTL情報:`);
        console.log(`  TTL設定済み: ${ttlInfo.length}/${lessons.length}件`);
        console.log(`  有効期限パターン: ${uniqueExpiryDates.sort().join(', ')}`);
      }
      
    } else {
      console.log('\\n✨ DynamoDBに既存データなし（または空）');
    }
    
    // テーブル全体のアイテム数を取得
    console.log('\\n📏 テーブル全体の状況確認中...');
    
    const fullScanResult = await docClient.send(new ScanCommand({
      TableName: tableName,
      Select: 'COUNT'
    }));
    
    console.log(`✅ テーブル全体のアイテム数: ${fullScanResult.Count || 0}件`);
    
  } catch (error) {
    console.error('❌ データ確認エラー:', error);
  }
}

checkExistingDataSimple().catch(console.error);