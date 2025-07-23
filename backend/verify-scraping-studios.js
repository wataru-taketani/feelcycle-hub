const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function verifyScrapingStudios() {
  console.log('🔍 スクレイピングで取得されたスタジオデータの検証...');
  
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'feelcycle-hub-studios-dev',
    }));

    const allStudios = result.Items || [];
    console.log(`📊 DynamoDB内のスタジオ数: ${allStudios.length}`);
    
    // 実際のFEELCYCLEサイトから取得されるべきスタジオ（HTMLに基づく）
    const expectedStudios = [
      { name: '札幌', code: 'SPR' },
      { name: '大宮', code: 'OMY' },
      { name: '越谷', code: 'KSG' },
      { name: '柏', code: 'KSW' },
      { name: '海浜幕張', code: 'KHM' },
      { name: '船橋', code: 'FNB' },
      { name: '銀座京橋', code: 'GKBS' },
      { name: '銀座', code: 'GNZ' },
      { name: '池袋', code: 'IKB' },
      { name: '新宿', code: 'SJK' },
      { name: '上野', code: 'UEN' },
      { name: '中目黒', code: 'NMG' },
      { name: '町田', code: 'MCD' },
      { name: '自由が丘', code: 'JYO' },
      { name: '吉祥寺', code: 'KCJ' },
      { name: '多摩センター', code: 'TMC' },
      { name: '渋谷', code: 'SBY' },
      { name: '汐留', code: 'SDM' },
      { name: '五反田', code: 'GTD' },
      { name: '川崎', code: 'KWS' },
      { name: '横須賀中央', code: 'YSC' },
      { name: '上大岡', code: 'KOK' },
      { name: '横浜', code: 'YKH' },
      { name: '武蔵小杉', code: 'MKG' },
      { name: 'あざみ野', code: 'AZN' },
      { name: 'あざみ野Pilates', code: 'AZNP' },
      { name: '岐阜', code: 'GIF' },
      { name: '栄', code: 'SKE' },
      { name: '名古屋', code: 'NGY' },
      { name: '京都河原町', code: 'KTK' },
      { name: '心斎橋', code: 'SSB' },
      { name: '梅田茶屋町', code: 'UMDC' },
      { name: '大阪京橋', code: 'OKBS' },
      { name: '三ノ宮', code: 'SMY' },
      { name: '広島', code: 'HSM' },
      { name: '高松', code: 'TKM' },
      { name: '福岡天神', code: 'FTJ' }
    ];
    
    console.log(`🎯 期待されるスタジオ数（HTMLベース）: ${expectedStudios.length}`);
    
    console.log('\n📋 スクレイピングデータの検証:');
    let foundCount = 0;
    let missingStudios = [];
    
    expectedStudios.forEach(expected => {
      const found = allStudios.find(studio => 
        studio.studioName === expected.name || 
        studio.studioCode === expected.code ||
        studio.studioCode === expected.code.toLowerCase()
      );
      
      if (found) {
        foundCount++;
        console.log(`  ✅ ${expected.name} (${expected.code}) - Found as: ${found.studioName} (${found.studioCode})`);
      } else {
        missingStudios.push(expected);
        console.log(`  ❌ ${expected.name} (${expected.code}) - Missing`);
      }
    });
    
    console.log(`\n📊 検証結果:`);
    console.log(`  Found: ${foundCount}/${expectedStudios.length} studios`);
    console.log(`  Success Rate: ${((foundCount / expectedStudios.length) * 100).toFixed(1)}%`);
    
    if (missingStudios.length > 0) {
      console.log(`\n⚠️  Missing Studios (${missingStudios.length}):`);
      missingStudios.forEach(studio => {
        console.log(`    • ${studio.name} (${studio.code})`);
      });
    }
    
    // 重複除去処理のテスト
    console.log('\n🔧 重複除去処理をテスト...');
    const studioMap = new Map();
    allStudios.forEach(studio => {
      const key = studio.studioName;
      const existing = studioMap.get(key);
      // 大文字のスタジオコードを優先
      if (!existing || studio.studioCode === studio.studioCode.toUpperCase()) {
        studioMap.set(key, {
          code: studio.studioCode,
          name: studio.studioName
        });
      }
    });
    
    const uniqueStudios = Array.from(studioMap.values())
      .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`📊 重複除去後のスタジオ数: ${uniqueStudios.length}`);
    
    // 実際のAPIレスポンス形式で出力
    console.log('\n📤 APIレスポンス形式:');
    console.log(JSON.stringify({
      success: true,
      data: {
        studios: uniqueStudios.slice(0, 5) // 最初の5件のみ表示
      }
    }, null, 2));
    
    if (uniqueStudios.length >= 30) {
      console.log('\n✅ 充分なスタジオデータが取得されています！');
      console.log('   実際のスクレイピングデータを使用できます。');
    } else {
      console.log('\n⚠️  スタジオデータが不足しています。');
      console.log('   スクレイピング処理の確認が必要です。');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyScrapingStudios();