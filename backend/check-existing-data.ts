import { LessonsService } from './src/services/lessons-service';

async function checkExistingData() {
  console.log('📊 既存DynamoDBデータの状況確認');
  console.log('='.repeat(60));
  
  const lessonsService = new LessonsService();
  
  try {
    // 利用可能なレッスンを取得（制限付き）
    console.log('\n📍 既存レッスンデータをサンプル取得中...');
    const existingLessons = await lessonsService.getAvailableLessons(50);
    
    console.log(`✅ 取得したレッスン数: ${existingLessons.length}件`);
    
    if (existingLessons.length > 0) {
      // スタジオ別の集計
      const studioCount = existingLessons.reduce((acc, lesson) => {
        acc[lesson.studioCode] = (acc[lesson.studioCode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // 日付別の集計  
      const dateCount = existingLessons.reduce((acc, lesson) => {
        acc[lesson.lessonDate] = (acc[lesson.lessonDate] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`\n📊 スタジオ別データ数 (上位10件):`);
      Object.entries(studioCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([studio, count]) => {
          console.log(`  ${studio}: ${count}件`);
        });
        
      console.log(`\n📅 日付別データ数 (上位10件):`);
      Object.entries(dateCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([date, count]) => {
          console.log(`  ${date}: ${count}件`);
        });
        
      console.log(`\n📝 サンプルレッスンデータ (最初の5件):`);
      existingLessons.slice(0, 5).forEach((lesson, index) => {
        console.log(`  ${index + 1}. ${lesson.studioCode} ${lesson.lessonDate} ${lesson.startTime} ${lesson.lessonName} (${lesson.instructor})`);
      });
      
      // 最新と最古のデータ確認
      const dates = existingLessons.map(l => l.lessonDate).sort();
      const oldestDate = dates[0];
      const newestDate = dates[dates.length - 1];
      
      console.log(`\n⏰ データ期間:`);
      console.log(`  最古: ${oldestDate}`);
      console.log(`  最新: ${newestDate}`);
      
      // TTL情報確認
      const ttlInfo = existingLessons
        .filter(l => l.ttl)
        .map(l => ({
          ttl: l.ttl,
          expiryDate: new Date((l.ttl as number) * 1000).toISOString().split('T')[0]
        }));
        
      if (ttlInfo.length > 0) {
        const expiryDates = ttlInfo.map(t => t.expiryDate);
        const uniqueExpiryDates = [...new Set(expiryDates)];
        
        console.log(`\n⏳ TTL情報:`);
        console.log(`  TTL設定済み: ${ttlInfo.length}/${existingLessons.length}件`);
        console.log(`  有効期限パターン: ${uniqueExpiryDates.sort().join(', ')}`);
      }
      
    } else {
      console.log('\n✨ DynamoDBに既存データなし（または空）');
    }
    
  } catch (error) {
    console.error('❌ データ確認エラー:', error);
  }
}

checkExistingData().catch(console.error);