import { lessonsService } from './services/lessons-service';

async function verifyShinjukuData() {
  console.log('🔍 新宿スタジオ 7/24 DynamoDB保存データの詳細確認');
  console.log('='.repeat(70));

  try {
    // DynamoDBから新宿スタジオのデータを取得
    const lessons = await lessonsService.getLessonsForStudioAndDate('sjk', '2025-07-24');
    
    console.log(`✅ DynamoDBから ${lessons.length} 件のレッスンデータを取得`);
    
    if (lessons.length > 0) {
      // 時間順にソート
      const sortedLessons = lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      console.log('\n📋 新宿スタジオ 2025-07-24 保存済みデータ詳細:');
      console.log('='.repeat(80));
      
      sortedLessons.forEach((lesson, index) => {
        const status = lesson.isAvailable === 'true' ? '🟢 予約可' : '🔴 満席';
        
        console.log(`${(index + 1).toString().padStart(3)}. ${lesson.startTime}-${lesson.endTime}`);
        console.log(`     レッスン名: ${lesson.lessonName}`);
        console.log(`     講師: ${lesson.instructor}`);
        console.log(`     プログラム: ${lesson.program}`);
        console.log(`     空席状況: ${lesson.availableSlots}/${lesson.totalSlots}席 ${status}`);
        console.log(`     データ更新: ${lesson.lastUpdated}`);
        console.log(`     スタジオコード: ${lesson.studioCode}`);
        console.log(`     レッスン日時: ${lesson.lessonDateTime}`);
        console.log('     ─'.repeat(60));
      });

      // 統計情報
      console.log('\n📊 保存データ統計:');
      const availableCount = sortedLessons.filter(l => l.isAvailable === 'true').length;
      const programStats = sortedLessons.reduce((acc, lesson) => {
        acc[lesson.program] = (acc[lesson.program] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const instructorStats = sortedLessons.reduce((acc, lesson) => {
        acc[lesson.instructor] = (acc[lesson.instructor] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`  📅 対象日: 2025-07-24`);
      console.log(`  🏢 スタジオ: 新宿 (sjk)`);
      console.log(`  📊 総レッスン数: ${sortedLessons.length}件`);
      console.log(`  🟢 予約可能: ${availableCount}件`);
      console.log(`  🔴 満席: ${sortedLessons.length - availableCount}件`);
      
      console.log(`\n  🏷️ プログラム別:`);
      Object.entries(programStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([program, count]) => {
          console.log(`     ${program}: ${count}件`);
        });
      
      console.log(`\n  👥 講師別レッスン数:`);
      Object.entries(instructorStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([instructor, count]) => {
          console.log(`     ${instructor}: ${count}件`);
        });

      // 時間帯分析
      const timeSlots = {
        '朝 (07:00-09:59)': 0,
        '午前 (10:00-11:59)': 0,
        '昼 (12:00-14:59)': 0,
        '午後 (15:00-17:59)': 0,
        '夜 (18:00-22:15)': 0
      };

      sortedLessons.forEach(lesson => {
        const hour = parseInt(lesson.startTime.split(':')[0]);
        if (hour >= 7 && hour < 10) timeSlots['朝 (07:00-09:59)']++;
        else if (hour >= 10 && hour < 12) timeSlots['午前 (10:00-11:59)']++;
        else if (hour >= 12 && hour < 15) timeSlots['昼 (12:00-14:59)']++;
        else if (hour >= 15 && hour < 18) timeSlots['午後 (15:00-17:59)']++;
        else if (hour >= 18 && hour <= 22) timeSlots['夜 (18:00-22:15)']++;
      });

      console.log(`\n  ⏰ 時間帯別:`);
      Object.entries(timeSlots).forEach(([timeSlot, count]) => {
        console.log(`     ${timeSlot}: ${count}件`);
      });

    } else {
      console.log('❌ 新宿スタジオ 7/24 のデータが見つかりません');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

verifyShinjukuData().catch(console.error);