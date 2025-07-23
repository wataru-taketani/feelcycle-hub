const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function findExtraStudio() {
  try {
    console.log('🔍 余分なスタジオを特定...');
    
    // 正しい36スタジオのリスト（ユーザー提供）
    const correctStudios = [
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
    
    console.log(`📝 正しいスタジオ数: ${correctStudios.length}`);
    
    // DynamoDBから取得
    const result = await docClient.send(new ScanCommand({
      TableName: 'feelcycle-hub-studios-dev'
    }));
    
    // 重複除去
    const studioGroups = {};
    result.Items.forEach(studio => {
      const name = studio.studioName;
      if (!studioGroups[name]) {
        studioGroups[name] = [];
      }
      studioGroups[name].push(studio.studioCode);
    });
    
    const actualStudioNames = Object.keys(studioGroups).sort();
    const correctStudioNames = correctStudios.map(s => s.name).sort();
    
    console.log(`📊 DBにあるユニークスタジオ数: ${actualStudioNames.length}`);
    
    // 余分なスタジオを検出
    console.log('\n❌ 正しいリストにないスタジオ:');
    actualStudioNames.forEach(name => {
      if (!correctStudioNames.includes(name)) {
        console.log(`  • ${name} (コード: ${studioGroups[name].join(', ')})`);
      }
    });
    
    // 不足しているスタジオを検出
    console.log('\n⚠️  DBにないスタジオ:');
    correctStudioNames.forEach(name => {
      if (!actualStudioNames.includes(name)) {
        console.log(`  • ${name}`);
      }
    });
    
    console.log('\n📋 すべてのDBスタジオ:');
    actualStudioNames.forEach(name => {
      const codes = studioGroups[name];
      const isCorrect = correctStudioNames.includes(name);
      const status = isCorrect ? '✅' : '❌';
      console.log(`  ${status} ${name} (${codes.join(', ')})`);
    });
    
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }
}

findExtraStudio();