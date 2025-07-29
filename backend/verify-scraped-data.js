/**
 * 取得したスクレイピングデータの検証
 */

const { LessonsService } = require('./dist/services/lessons-service.js');

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';

async function verifyScrapedData() {
  const lessonsService = new LessonsService();
  
  try {
    console.log('📊 スクレイピングデータ検証開始');
    console.log('='.repeat(50));
    
    // 1. 全体統計
    console.log('\n📈 全体統計:');
    const stats = await lessonsService.getLessonStats();
    console.log(`  - 総レッスン数: ${stats.total}`);
    console.log(`  - スタジオ数: ${stats.studioCount}`);
    console.log(`  - 日付範囲: ${stats.dateRange.start} 〜 ${stats.dateRange.end}`);
    
    // 2. 汐留スタジオ詳細データ
    console.log('\n🏢 汐留スタジオ詳細:');
    const sdmLessons = await lessonsService.getLessonsForStudio('sdm');
    console.log(`  - 汐留レッスン数: ${sdmLessons.length}`);
    
    if (sdmLessons.length > 0) {
      // 日付別集計
      const lessonsByDate = sdmLessons.reduce((acc, lesson) => {
        acc[lesson.lessonDate] = (acc[lesson.lessonDate] || 0) + 1;
        return acc;
      }, {});
      
      console.log('  - 日付別レッスン数:');
      Object.entries(lessonsByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([date, count]) => {
          console.log(`    ${date}: ${count}件`);
        });
      
      // サンプルレッスンデータ表示
      console.log('\n📝 サンプルレッスンデータ (最初の3件):');
      sdmLessons.slice(0, 3).forEach((lesson, index) => {
        console.log(`  ${index + 1}. ${lesson.lessonDate} ${lesson.startTime}`);
        console.log(`     レッスン: ${lesson.lessonName}`);
        console.log(`     インストラクター: ${lesson.instructor}`);
        console.log(`     空席状況: ${lesson.isAvailable === 'true' ? '空席あり' : '満席'}`);
        console.log(`     プログラム: ${lesson.program}`);
        console.log(`     更新日時: ${lesson.lastUpdated}`);
        console.log('');
      });
    }
    
    // 3. データ品質チェック
    console.log('🔍 データ品質チェック:');
    let qualityIssues = 0;
    
    // 必須フィールドチェック
    const requiredFields = ['studioCode', 'lessonDate', 'startTime', 'lessonName', 'instructor'];
    for (const lesson of sdmLessons) {
      for (const field of requiredFields) {
        if (!lesson[field]) {
          console.log(`  ⚠️  欠損データ: ${field} が空です`);
          qualityIssues++;
        }
      }
      
      // 日付形式チェック
      if (lesson.lessonDate && !lesson.lessonDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.log(`  ⚠️  日付形式エラー: ${lesson.lessonDate}`);
        qualityIssues++;
      }
      
      // 時刻形式チェック
      if (lesson.startTime && !lesson.startTime.match(/^\d{2}:\d{2}$/)) {
        console.log(`  ⚠️  時刻形式エラー: ${lesson.startTime}`);
        qualityIssues++;
      }
    }
    
    if (qualityIssues === 0) {
      console.log('  ✅ データ品質: 問題なし');
    } else {
      console.log(`  ⚠️  品質問題: ${qualityIssues}件`);
    }
    
    console.log('\n✅ データ検証完了');
    
  } catch (error) {
    console.error('❌ データ検証でエラー:', error);
    process.exit(1);
  }
}

verifyScrapedData();