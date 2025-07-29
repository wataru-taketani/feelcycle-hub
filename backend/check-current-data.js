/**
 * 現在のDynamoDBデータ状況確認
 */

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';
process.env.STUDIO_BATCH_TABLE_NAME = 'feelcycle-studio-batch-dev';
process.env.USER_LESSONS_TABLE_NAME = 'feelcycle-hub-user-lessons-dev';
process.env.WAITLIST_TABLE_NAME = 'feelcycle-hub-waitlist-dev';
process.env.USERS_TABLE_NAME = 'feelcycle-hub-users-dev';

const { studiosService } = require('./dist/services/studios-service.js');
const { LessonsService } = require('./dist/services/lessons-service.js');

async function checkCurrentData() {
  console.log('📊 現在のDynamoDBデータ状況確認');
  console.log('='.repeat(50));
  
  try {
    // スタジオデータ確認
    const studios = await studiosService.getAllStudios();
    console.log('🏢 スタジオデータ:');
    console.log(`   総数: ${studios.length}スタジオ`);
    
    if (studios.length > 0) {
      const markedStudios = studios.filter(s => s.lastScrapedAt);
      console.log(`   最新マーク付き: ${markedStudios.length}/${studios.length}`);
      
      const sampleStudio = studios[0];
      console.log(`   サンプル: ${sampleStudio.studioName} (${sampleStudio.studioCode})`);
      console.log(`   最終更新: ${sampleStudio.lastUpdated || 'N/A'}`);
      console.log(`   最終スクレイプ: ${sampleStudio.lastScrapedAt || 'N/A'}`);
      
      // 全スタジオリスト表示
      console.log('\n📋 全スタジオリスト:');
      studios.forEach((studio, index) => {
        const mark = studio.lastScrapedAt ? '✅' : '⚪';
        console.log(`   ${mark} ${studio.studioCode}: ${studio.studioName}`);
      });
    }
    
    // レッスンデータ確認
    const lessonsService = new LessonsService();
    
    // 複数スタジオのレッスンデータを確認
    const testStudios = ['ikb', 'sby', 'ssb', 'sdm']; // 池袋、渋谷、心斎橋、汐留
    console.log('\n📚 レッスンデータ確認:');
    
    for (const studioCode of testStudios) {
      try {
        const lessons = await lessonsService.getLessonsForStudioAndDate(studioCode, '2025-07-29');
        console.log(`   ${studioCode}: ${lessons.length}件のレッスン`);
        
        if (lessons.length > 0) {
          const sampleLesson = lessons[0];
          console.log(`      例: ${sampleLesson.startTime} ${sampleLesson.program} (${sampleLesson.instructor})`);
          console.log(`      作成: ${sampleLesson.lastUpdated || 'N/A'}`);
        }
      } catch (error) {
        console.log(`   ${studioCode}: エラー - ${error.message}`);
      }
    }
    
    // データ鮮度確認
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    console.log('\n⏰ データ鮮度:');
    console.log(`   現在日時: ${now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    console.log(`   今日の日付: ${today}`);
    
    const recentStudios = studios.filter(s => {
      if (!s.lastUpdated) return false;
      const updatedDate = new Date(s.lastUpdated);
      const diffHours = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60);
      return diffHours < 24; // 24時間以内
    });
    console.log(`   24時間以内更新: ${recentStudios.length}/${studios.length}スタジオ`);
    
    // バッチ処理状況確認
    const batchProgress = await studiosService.getBatchProgress();
    console.log('\n🔄 バッチ処理状況:');
    console.log(`   完了: ${batchProgress.completed}/${batchProgress.total}`);
    console.log(`   失敗: ${batchProgress.failed}`);
    console.log(`   残り: ${batchProgress.remaining}`);
    console.log(`   処理中: ${batchProgress.processing}`);
    
    // 総合判定
    console.log('\n📊 データ状況総合判定:');
    
    const markedStudiosForCheck = studios.filter(s => s.lastScrapedAt);
    const isUpToDate = studios.length === 37 && markedStudiosForCheck.length === 37;
    const hasRecentLessons = recentStudios.length > 30; // 大部分のスタジオが更新済み
    const batchCompleted = batchProgress.completed === batchProgress.total;
    
    console.log(`   ✅ スタジオ数正常: ${studios.length === 37 ? 'Yes' : 'No'} (${studios.length}/37)`);
    console.log(`   ✅ マーク付き完了: ${markedStudiosForCheck.length === studios.length ? 'Yes' : 'No'} (${markedStudiosForCheck.length}/${studios.length})`);
    console.log(`   ✅ 最近のデータ: ${hasRecentLessons ? 'Yes' : 'No'} (${recentStudios.length}スタジオ)`);
    console.log(`   ✅ バッチ完了: ${batchCompleted ? 'Yes' : 'No'}`);
    
    if (isUpToDate && hasRecentLessons) {
      console.log('\n🎉 最新データが正常に保存されています！');
      console.log('✅ 本番運用準備完了');
    } else {
      console.log('\n⚠️  データ更新が必要な可能性があります');
      console.log('🔧 progressive-daily-refreshの実行を推奨');
    }
    
  } catch (error) {
    console.error('❌ データ確認エラー:', error);
  }
}

checkCurrentData().catch(console.error);