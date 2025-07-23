const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function testDirectStudios() {
  console.log('🔍 スクレイピングデータを直接処理してフロントエンド形式で出力...');
  
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'feelcycle-hub-studios-dev',
    }));

    const allStudios = result.Items || [];
    console.log(`Retrieved ${allStudios.length} studios from DB`);
    
    // 地域マッピング
    const regionMap = {
      'TOKYO': 'tokyo',
      'KANAGAWA': 'kanagawa', 
      'KANTO': 'saitama',
      'KANSAI': 'osaka',
      'CHUBU': 'aichi',
      'KYUSHU': 'fukuoka',
      'HOKKAIDO': 'hokkaido',
      'CHUGOKU': 'hiroshima',
      'SHIKOKU': 'kagawa'
    };
    
    const mapRegion = (studioCode, studioName) => {
      if (studioName.includes('札幌')) return 'hokkaido';
      if (studioName.includes('仙台')) return 'miyagi';
      if (studioName.includes('横浜') || studioName.includes('川崎') || studioName.includes('武蔵') || studioName.includes('あざみ')) return 'kanagawa';
      if (studioName.includes('大宮') || studioName.includes('越谷')) return 'saitama';
      if (studioName.includes('柏') || studioName.includes('船橋') || studioName.includes('海浜幕張')) return 'chiba';
      if (studioName.includes('名古屋') || studioName.includes('栄') || studioName.includes('岐阜')) return 'aichi';
      if (studioName.includes('京都')) return 'kyoto';
      if (studioName.includes('梅田') || studioName.includes('心斎橋') || (studioName.includes('京橋') && studioName.includes('大阪'))) return 'osaka';
      if (studioName.includes('三ノ宮')) return 'hyogo';
      if (studioName.includes('福岡') || studioName.includes('天神')) return 'fukuoka';
      if (studioName.includes('広島')) return 'hiroshima';
      if (studioName.includes('高松')) return 'kagawa';
      
      return 'tokyo';
    };
    
    // 重複除去（大文字版を優先）
    const studioMap = new Map();
    allStudios.forEach(studio => {
      const key = studio.studioName;
      const existing = studioMap.get(key);
      // 大文字のスタジオコードまたは地域情報がある方を優先
      if (!existing || (studio.studioCode === studio.studioCode.toUpperCase()) || (studio.region && studio.region !== 'unknown')) {
        const mappedRegion = studio.region && studio.region !== 'unknown' ? 
          regionMap[studio.region] || studio.region : 
          mapRegion(studio.studioCode, studio.studioName);
          
        studioMap.set(key, {
          code: studio.studioCode,
          name: studio.studioName,
          region: mappedRegion
        });
      }
    });
    
    const studios = Array.from(studioMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
      
    console.log(`\n📊 Processed studios: ${studios.length}`);
    
    // 地域別に分類
    const regions = [...new Set(studios.map(s => s.region))].sort();
    const studiosByRegion = regions.reduce((acc, region) => {
      acc[region] = studios.filter(s => s.region === region);
      return acc;
    }, {});
    
    console.log(`🌍 Regions: ${regions.length} - [${regions.join(', ')}]`);
    
    console.log('\n🏢 Studios by Region:');
    regions.forEach(region => {
      const regionStudios = studiosByRegion[region] || [];
      console.log(`\n  ${region.toUpperCase()} (${regionStudios.length}店舗):`);
      regionStudios.forEach(studio => {
        console.log(`    • ${studio.name} (${studio.code})`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDirectStudios();