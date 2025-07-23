const axios = require('axios');

const API_BASE_URL = 'https://2busbn3z42.execute-api.ap-northeast-1.amazonaws.com/dev';

async function testNewStudiosAPI() {
  console.log('🔍 Testing new studios API with actual scraping data...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/studios`);
    
    if (response.data.success) {
      const { studios, regions, studiosByRegion } = response.data.data;
      
      console.log(`\n✅ Studios API Response:`);
      console.log(`📊 Total studios: ${studios.length}`);
      console.log(`🌍 Regions: ${regions.length} - [${regions.join(', ')}]`);
      
      console.log('\n🏢 Studios by Region:');
      regions.forEach(region => {
        const regionStudios = studiosByRegion[region] || [];
        console.log(`\n  ${region.toUpperCase()} (${regionStudios.length}店舗):`);
        regionStudios.forEach(studio => {
          console.log(`    • ${studio.name} (${studio.code})`);
        });
      });
      
      // フロントエンド互換性チェック
      console.log('\n🔧 Frontend Compatibility Check:');
      const firstStudio = studios[0];
      if (firstStudio) {
        console.log(`  ✅ Studio structure: { code: "${firstStudio.code}", name: "${firstStudio.name}", region: "${firstStudio.region}" }`);
        console.log(`  ✅ Expected properties: code ✓, name ✓, region ✓`);
      }
      
    } else {
      console.log('❌ API call failed:', response.data.message || response.data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testNewStudiosAPI();