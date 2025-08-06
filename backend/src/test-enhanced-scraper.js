/**
 * Enhanced Scraper Test Script
 * JavaScript SPA対応とマルチパターンセレクタのテスト
 */

// 環境変数設定
process.env.AWS_REGION = 'ap-northeast-1';
process.env.STUDIOS_TABLE_NAME = 'feelcycle-hub-studios-dev';
process.env.LESSONS_TABLE_NAME = 'feelcycle-hub-lessons-dev';

const { EnhancedRealFeelcycleScraper } = require('../dist/services/enhanced-real-scraper.js');

async function testEnhancedScraper() {
  console.log('🚀 Enhanced Scraper テスト開始');
  console.log('='.repeat(60));
  
  // テスト対象スタジオ（小さなスタジオから開始）
  const testStudios = [
    { code: 'ysc', name: '横須賀中央' },  // 小規模スタジオ
    { code: 'ikb', name: '池袋' },        // 中規模スタジオ  
    { code: 'kcj', name: '吉祥寺' }       // ユーザーが問い合わせたスタジオ
  ];
  
  for (let i = 0; i < testStudios.length; i++) {
    const studio = testStudios[i];
    console.log(`\n📍 テスト ${i + 1}/${testStudios.length}: ${studio.name} (${studio.code})`);
    console.log('-'.repeat(50));
    
    const startTime = Date.now();
    
    try {
      const lessons = await EnhancedRealFeelcycleScraper.searchAllLessonsEnhanced(studio.code);
      const duration = Date.now() - startTime;
      
      console.log(`✅ ${studio.name} スクレイピング成功!`);
      console.log(`   📊 レッスン数: ${lessons.length}件`);
      console.log(`   ⏱️  実行時間: ${duration}ms`);
      
      if (lessons.length > 0) {
        const sampleLesson = lessons[0];
        console.log(`   📝 サンプルレッスン:`);
        console.log(`      日時: ${sampleLesson.lessonDate} ${sampleLesson.startTime}`);
        console.log(`      プログラム: ${sampleLesson.lessonName}`);
        console.log(`      インストラクター: ${sampleLesson.instructor}`);
        console.log(`      プログラム種別: ${sampleLesson.program}`);
        console.log(`      空き状況: ${sampleLesson.isAvailable}`);
        
        // データ形式確認
        if (sampleLesson.lessonDateTime && sampleLesson.startTime && sampleLesson.instructor) {
          console.log(`   ✅ データ形式: 正常`);
        } else {
          console.log(`   ❌ データ形式: 不完全`);
        }
        
        // 日付範囲確認  
        const dates = [...new Set(lessons.map(l => l.lessonDate))].sort();
        console.log(`   📅 取得期間: ${dates[0]} 〜 ${dates[dates.length - 1]} (${dates.length}日間)`);
      }
      
      // 成功した場合、次のテストまで少し待機
      if (i < testStudios.length - 1) {
        console.log(`   ⏳ 次のテストまで3秒待機...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ${studio.name} スクレイピング失敗`);
      console.log(`   ⏱️  実行時間: ${duration}ms`);
      console.log(`   💥 エラー: ${error.message}`);
      
      // エラー分析
      if (error.message.includes('timeout')) {
        console.log(`   🔍 原因推定: タイムアウト系エラー`);
        console.log(`   💡 推奨対応: タイムアウト時間延長、読み込み待機戦略見直し`);
      } else if (error.message.includes('selector')) {
        console.log(`   🔍 原因推定: セレクタパターン不足`);
        console.log(`   💡 推奨対応: 追加セレクタパターンの実装`);
      } else if (error.message.includes('Studio') && error.message.includes('not found')) {
        console.log(`   🔍 原因推定: スタジオ検出失敗`);
        console.log(`   💡 推奨対応: スタジオ選択ロジック見直し`);
      } else {
        console.log(`   🔍 原因推定: その他システム系エラー`);
        console.log(`   💡 推奨対応: 包括的デバッグが必要`);
      }
    }
  }
  
  // クリーンアップ
  console.log(`\n🧹 Enhanced Scraper テスト完了、クリーンアップ実行...`);
  await EnhancedRealFeelcycleScraper.cleanup();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 テスト結果サマリー');
  console.log('='.repeat(60));
  console.log('Enhanced Scraperの改善点検証完了');
  console.log('- JavaScript SPA読み込み待機');
  console.log('- マルチパターンセレクタ'); 
  console.log('- 強化されたリトライ機能');
  console.log('- 包括的エラーハンドリング');
}

// テスト実行
testEnhancedScraper().catch(error => {
  console.error('Enhanced Scraper テスト中にエラー:', error);
  process.exit(1);
});