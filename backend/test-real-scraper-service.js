// RealFeelcycleScraperサービスの動作確認
const { RealFeelcycleScraper } = require('./dist/services/real-scraper');

async function testRealScraperService() {
  console.log('🔍 RealFeelcycleScraper サービステスト');
  console.log('='.repeat(50));
  
  try {
    console.log('📊 getRealStudios() テスト中...');
    
    // まずスタジオ一覧を取得してみる
    const studios = await RealFeelcycleScraper.getRealStudios();
    
    console.log('✅ スタジオ取得成功');
    console.log(`📍 取得されたスタジオ数: ${studios.length}`);
    
    if (studios.length > 0) {
      console.log('📋 最初の3スタジオ:');
      studios.slice(0, 3).forEach((studio, index) => {
        console.log(`  ${index + 1}. ${studio.name} (${studio.code}) - ${studio.region}`);
      });
    }
    
    console.log('✅ RealFeelcycleScraper サービスが正常に動作しています');
    
  } catch (error) {
    console.error('❌ エラー発生:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // ブラウザのクリーンアップ
    try {
      await RealFeelcycleScraper.cleanup();
      console.log('🧹 ブラウザクリーンアップ完了');
    } catch (cleanupError) {
      console.error('⚠️ クリーンアップエラー:', cleanupError.message);
    }
  }
}

testRealScraperService();