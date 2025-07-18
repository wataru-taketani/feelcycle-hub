import { RealFeelcycleScraper } from './services/real-scraper';
import { lessonsService } from './services/lessons-service';

async function getShinjukuLessons() {
  console.log('🚴‍♀️ 新宿スタジオ 2025年7月24日のレッスン取得');
  console.log('='.repeat(60));

  try {
    // 新宿のスタジオコードを確認（一般的にはsjkまたはshinjuku）
    console.log('\n📍 Step 1: スタジオリスト取得...');
    const studios = await RealFeelcycleScraper.getRealStudios();
    
    // 新宿を探す
    const shinjukuStudio = studios.find(s => 
      s.name.includes('新宿') || 
      s.code === 'sjk' || 
      s.code === 'shinjuku' ||
      s.code === 'snj'
    );
    
    if (!shinjukuStudio) {
      console.log('❌ 新宿スタジオが見つかりません');
      console.log('利用可能なスタジオ:');
      studios.slice(0, 10).forEach((studio, index) => {
        console.log(`  ${index + 1}. ${studio.name} (${studio.code})`);
      });
      return;
    }

    console.log(`✅ 新宿スタジオ見つかりました: ${shinjukuStudio.name} (${shinjukuStudio.code})`);

    // レッスンデータ取得
    console.log('\n📋 Step 2: 2025-07-24のレッスンデータ取得...');
    const lessons = await RealFeelcycleScraper.searchRealLessons(shinjukuStudio.code, '2025-07-24');
    
    console.log(`✅ ${lessons.length}件のレッスンを取得しました`);

    if (lessons.length > 0) {
      // DynamoDBに保存
      console.log('\n💾 Step 3: DynamoDBに保存中...');
      for (let i = 0; i < lessons.length; i++) {
        await lessonsService.storeLessonData(lessons[i]);
        if ((i + 1) % 20 === 0) {
          console.log(`  ${i + 1}/${lessons.length} 件保存完了...`);
        }
      }

      // 全レッスン表示
      console.log('\n📋 新宿スタジオ 7/24 全レッスン一覧:');
      console.log('='.repeat(80));
      
      lessons.forEach((lesson, index) => {
        const status = lesson.isAvailable === 'true' ? '🟢 空きあり' : '🔴 満席';
        console.log(`${index + 1}. ${lesson.startTime}-${lesson.endTime} | ${lesson.lessonName}`);
        console.log(`   講師: ${lesson.instructor} | プログラム: ${lesson.program} | ${status}`);
        console.log(`   空き: ${lesson.availableSlots}/${lesson.totalSlots}席`);
        console.log('');
      });

      // サマリー
      const availableCount = lessons.filter(l => l.isAvailable === 'true').length;
      const programCounts = lessons.reduce((acc, lesson) => {
        acc[lesson.program] = (acc[lesson.program] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📊 サマリー:');
      console.log(`  総レッスン数: ${lessons.length}件`);
      console.log(`  空きあり: ${availableCount}件`);
      console.log(`  満席: ${lessons.length - availableCount}件`);
      console.log(`  プログラム別: ${Object.entries(programCounts).map(([p, c]) => `${p}:${c}件`).join(', ')}`);

    } else {
      console.log('❌ レッスンが見つかりませんでした');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    await RealFeelcycleScraper.cleanup();
    console.log('\n🧹 ブラウザクリーンアップ完了');
  }
}

getShinjukuLessons().catch(console.error);