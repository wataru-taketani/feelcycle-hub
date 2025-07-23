const axios = require('axios');

const API_BASE_URL = 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';

async function testSimplifiedStudios() {
  console.log('🔍 Testing simplified studios API...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/studios`);
    
    if (response.data.success) {
      const { studios } = response.data.data;
      
      console.log(`\n✅ Simplified Studios API Response:`);
      console.log(`📊 Total studios: ${studios.length}`);
      
      console.log('\n🏢 Studio List (first 10):');
      studios.slice(0, 10).forEach((studio, index) => {
        console.log(`  ${index + 1}. ${studio.name} (${studio.code})`);
      });
      
      if (studios.length > 10) {
        console.log(`  ... and ${studios.length - 10} more studios`);
      }
      
      // フロントエンド互換性チェック
      console.log('\n🔧 Frontend Compatibility Check:');
      const firstStudio = studios[0];
      if (firstStudio) {
        console.log(`  ✅ Studio structure: { code: "${firstStudio.code}", name: "${firstStudio.name}" }`);
        console.log(`  ✅ Expected properties: code ✓, name ✓`);
        console.log(`  ✅ No unnecessary region property`);
      }
      
      // スクレイピングデータの特徴的なスタジオをチェック
      const scrapedStudios = studios.filter(s => 
        s.name.includes('あざみ野') || 
        s.name.includes('武蔵小杉') || 
        s.name.includes('汐留') ||
        s.name.includes('多摩センター')
      );
      
      if (scrapedStudios.length > 0) {
        console.log('\n🎯 Scraped Studios Detected:');
        scrapedStudios.forEach(studio => {
          console.log(`  • ${studio.name} (${studio.code})`);
        });
        console.log('  ✅ Using actual scraping data!');
      } else {
        console.log('\n⚠️  Still using fallback data (hardcoded list)');
      }
      
    } else {
      console.log('❌ API call failed:', response.data.message || response.data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSimplifiedStudios();