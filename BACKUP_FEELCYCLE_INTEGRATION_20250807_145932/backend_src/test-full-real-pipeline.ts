import { RealFeelcycleScraper } from './services/real-scraper';
import { LessonsService } from './services/lessons-service';

async function testFullRealPipeline() {
  console.log('🔍 フルリアルデータパイプラインのテスト');
  console.log('='.repeat(60));

  try {
    const studioCode = 'sjk';
    const date = '2025-07-24';
    
    console.log(`\n📍 Step 1: 実データの取得`);
    console.log(`対象: ${studioCode} - ${date}`);
    
    const lessons = await RealFeelcycleScraper.searchRealLessons(studioCode, date);
    
    console.log(`✅ スクレイピング完了: ${lessons.length}件`);
    
    if (lessons.length > 0) {
      console.log('\n📍 Step 2: DynamoDBへの保存');
      
      // DynamoDBに保存
      const lessonsService = new LessonsService();
      
      for (const lesson of lessons) {
        try {
          await lessonsService.storeLessonData(lesson);
          console.log(`✅ 保存完了: ${lesson.startTime} ${lesson.lessonName}`);
        } catch (error) {
          console.error(`❌ 保存エラー: ${lesson.startTime} ${lesson.lessonName}`, error);
        }
      }
      
      console.log('\n📍 Step 3: 保存データの確認');
      
      // 保存されたデータを確認
      const savedLessons = await lessonsService.getLessonsForStudioAndDate(studioCode, date);
      console.log(`✅ 保存確認: ${savedLessons.length}件`);
      
      if (savedLessons.length > 0) {
        console.log('\n📝 保存されたレッスン:');
        savedLessons.forEach((lesson: any, index: number) => {
          console.log(`  ${index + 1}. ${lesson.startTime}-${lesson.endTime} | ${lesson.lessonName} (${lesson.instructor})`);
        });
        
        // 期待値チェック
        const expectedLesson = savedLessons.find((l: any) => 
          l.startTime === '07:00' && 
          l.lessonName.includes('BB2 NOW 1') && 
          l.instructor.includes('Fuka')
        );
        
        if (expectedLesson) {
          console.log('\n🎉 SUCCESS: 期待値と一致するレッスンがDynamoDBに保存されました！');
          console.log(`詳細: ${expectedLesson.startTime}-${expectedLesson.endTime} ${expectedLesson.lessonName} (${expectedLesson.instructor})`);
        } else {
          console.log('\n❌ 期待値と一致するレッスンが見つかりませんでした');
        }
      } else {
        console.log('\n❌ 保存されたレッスンが見つかりませんでした');
      }
    } else {
      console.log('\n❌ スクレイピングでレッスンが取得できませんでした');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await RealFeelcycleScraper.cleanup();
  }
}

testFullRealPipeline().catch(console.error);