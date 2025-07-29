/**
 * 越谷スタジオの8/4データ確認
 */

const { LessonsService } = require('./dist/services/lessons-service.js');

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';

async function checkKoshigayaData() {
  const lessonsService = new LessonsService();
  
  try {
    console.log('🏢 越谷スタジオ (ksy) - 2025-08-04 のレッスンデータ');
    console.log('='.repeat(60));
    
    const koshigayaLessons = await lessonsService.getLessonsForStudioAndDate('ksy', '2025-08-04');
    
    if (koshigayaLessons.length === 0) {
      console.log('❌ 越谷スタジオの8/4データが見つかりません');
      
      // 越谷スタジオの他の日のデータを確認
      console.log('\n📅 越谷スタジオの他の日のデータを確認...');
      const dateRange = ['2025-08-01', '2025-08-02', '2025-08-03', '2025-08-05', '2025-08-06'];
      
      for (const date of dateRange) {
        const lessons = await lessonsService.getLessonsForStudioAndDate('ksy', date);
        console.log(`  ${date}: ${lessons.length}件`);
      }
      
    } else {
      console.log(`✅ 越谷スタジオ 8/4のレッスン数: ${koshigayaLessons.length}件\n`);
      
      // レッスンデータを時間順でソート
      koshigayaLessons.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      // 全レッスン詳細表示
      koshigayaLessons.forEach((lesson, index) => {
        console.log(`${index + 1}. ${lesson.startTime} - ${lesson.lessonName}`);
        console.log(`   インストラクター: ${lesson.instructor}`);
        console.log(`   プログラム: ${lesson.program}`);
        console.log(`   空席状況: ${lesson.isAvailable === 'true' ? '✅ 空席あり' : '❌ 満席'}`);
        console.log(`   最終更新: ${lesson.lastUpdated}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ データ取得エラー:', error);
    process.exit(1);
  }
}

checkKoshigayaData();