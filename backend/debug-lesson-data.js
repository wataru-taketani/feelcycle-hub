/**
 * レッスンデータの詳細調査
 */

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';
process.env.STUDIO_BATCH_TABLE_NAME = 'feelcycle-studio-batch-dev';
process.env.USER_LESSONS_TABLE_NAME = 'feelcycle-hub-user-lessons-dev';
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USERS_TABLE_NAME = 'feelcycle-hub-users-dev';

const { LessonsService } = require('./dist/services/lessons-service.js');

async function checkDetailedLessonData() {
  console.log('📚 詳細レッスンデータ調査');
  console.log('='.repeat(60));
  
  const lessonsService = new LessonsService();
  const studioCode = 'ikb'; // 池袋で詳細確認
  const today = '2025-07-29';
  
  try {
    const lessons = await lessonsService.getLessonsForStudioAndDate(studioCode, today);
    console.log(`${studioCode}の${today}データ: ${lessons.length}件`);
    
    if (lessons.length > 0) {
      console.log('\n最初の3件のデータ内容:');
      lessons.slice(0, 3).forEach((lesson, index) => {
        console.log(`--- レッスン ${index + 1} ---`);
        console.log(`lessonId: ${lesson.lessonId || 'undefined'}`);
        console.log(`studioCode: ${lesson.studioCode || 'undefined'}`);
        console.log(`lessonDate: ${lesson.lessonDate || 'undefined'}`);
        console.log(`lessonTime: ${lesson.lessonTime || 'undefined'}`);
        console.log(`programName: ${lesson.programName || 'undefined'}`);
        console.log(`instructorName: ${lesson.instructorName || 'undefined'}`);
        console.log(`availableSpots: ${lesson.availableSpots || 'undefined'}`);
        console.log(`createdAt: ${lesson.createdAt || 'undefined'}`);
        console.log('Raw data:', JSON.stringify(lesson, null, 2));
        console.log('');
      });
    } else {
      console.log('レッスンデータが見つかりません');
    }
    
    // 他の日付のデータも確認
    console.log('\n他の日付のデータ確認:');
    const dates = ['2025-07-30', '2025-07-31', '2025-08-01'];
    for (const date of dates) {
      const dateLessons = await lessonsService.getLessonsForStudioAndDate(studioCode, date);
      console.log(`  ${date}: ${dateLessons.length}件`);
      if (dateLessons.length > 0) {
        const sample = dateLessons[0];
        console.log(`    例: ${sample.lessonTime || 'N/A'} ${sample.programName || 'N/A'}`);
      }
    }
    
    // 全体のレッスン数確認
    console.log('\n全体データ確認:');
    const allLessons = await lessonsService.getAllLessons();
    console.log(`総レッスン数: ${allLessons.length}件`);
    
    if (allLessons.length > 0) {
      console.log('サンプルデータ (最初の1件):');
      const sample = allLessons[0];
      console.log('Raw sample:', JSON.stringify(sample, null, 2));
    }
    
  } catch (error) {
    console.error('エラー:', error.message);
    console.error('Stack:', error.stack);
  }
}

checkDetailedLessonData().catch(console.error);