// 環境変数設定
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';

import { LessonsService } from './src/services/lessons-service';

async function checkShibuya0730() {
  console.log('🔍 7/30の渋谷のデータ確認');
  console.log('='.repeat(60));
  
  const lessonsService = new LessonsService();
  
  try {
    const targetDate = '2025-07-30';
    const studioCode = 'sby'; // 渋谷のスタジオコード
    
    console.log(`\n📍 検索条件:`);
    console.log(`  スタジオ: 渋谷 (${studioCode})`);
    console.log(`  日付: ${targetDate}`);
    
    // 渋谷の7/30のレッスンを取得
    const lessons = await lessonsService.getLessonsForStudioAndDate(studioCode, targetDate);
    
    console.log(`\n✅ 取得結果: ${lessons.length}件`);
    
    if (lessons.length > 0) {
      console.log(`\n📋 7/30 渋谷のレッスン一覧:`);
      console.log('─'.repeat(80));
      
      // 時間順でソート
      const sortedLessons = lessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      sortedLessons.forEach((lesson, index) => {
        const availabilityStatus = lesson.isAvailable === 'true' ? '🟢 予約可' : '🔴 満席';
        console.log(`${String(index + 1).padStart(2, ' ')}. ${lesson.startTime}-${lesson.endTime} | ${lesson.lessonName.padEnd(20)} | ${lesson.instructor.padEnd(15)} | ${availabilityStatus} (${lesson.availableSlots}/${lesson.totalSlots})`);
      });
      
      // 統計情報
      const programStats = sortedLessons.reduce((acc, lesson) => {
        acc[lesson.program] = (acc[lesson.program] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const availableCount = sortedLessons.filter(l => l.isAvailable === 'true').length;
      
      console.log('\n📊 統計情報:');
      console.log(`  総レッスン数: ${lessons.length}件`);
      console.log(`  予約可能: ${availableCount}件`);
      console.log(`  満席: ${lessons.length - availableCount}件`);
      console.log(`  プログラム別:`);
      Object.entries(programStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([program, count]) => {
          console.log(`    ${program}: ${count}件`);
        });
        
      // データの更新時刻確認
      const latestUpdate = sortedLessons[0].lastUpdated;
      const updateTime = new Date(latestUpdate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
      console.log(`  最終更新: ${updateTime}`);
      
    } else {
      console.log('\n⚠️  該当するレッスンが見つかりませんでした');
      
      // 渋谷のスタジオコードが正しいか確認
      console.log('\n🔍 渋谷のデータがあるか別の日付で確認...');
      
      const allShibuyaLessons = await lessonsService.getLessonsForStudioAndDate(studioCode, '2025-07-19');
      if (allShibuyaLessons.length > 0) {
        console.log(`✅ 渋谷 (${studioCode}) のデータは存在します (7/19: ${allShibuyaLessons.length}件)`);
        console.log('7/30のデータがない可能性があります');
      } else {
        console.log(`❌ 渋谷 (${studioCode}) のデータが見つかりません`);
        console.log('スタジオコードが違う可能性があります');
      }
    }
    
  } catch (error) {
    console.error('❌ データ確認エラー:', error);
  }
}

checkShibuya0730().catch(console.error);