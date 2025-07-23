/**
 * 実際のFEELCYCLEサイトからスタジオコードを取得してテスト
 */
import { RealFeelcycleScraper } from './services/real-scraper';

async function testRealStudios() {
  try {
    console.log('🚴‍♀️ Fetching real studio codes from FEELCYCLE website...');
    
    const studios = await RealFeelcycleScraper.getRealStudios();
    
    console.log(`\n✅ Found ${studios.length} studios:`);
    studios.forEach((studio, index) => {
      console.log(`${index + 1}. Code: "${studio.code}" | Name: "${studio.name}"`);
    });
    
    // 特に銀座・川崎のコードを確認
    const ginza = studios.find(s => s.name.includes('銀座'));
    const kawasaki = studios.find(s => s.name.includes('川崎'));
    
    console.log('\n🔍 Target studios:');
    if (ginza) console.log(`銀座: Code="${ginza.code}" Name="${ginza.name}"`);
    if (kawasaki) console.log(`川崎: Code="${kawasaki.code}" Name="${kawasaki.name}"`);
    
    await RealFeelcycleScraper.cleanup();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await RealFeelcycleScraper.cleanup();
  }
}

testRealStudios();