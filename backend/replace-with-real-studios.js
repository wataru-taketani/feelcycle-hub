const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new AWS.DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STUDIOS_TABLE = 'feelcycle-hub-studios-dev';

// 実際のFEELCYCLEサイトからのスタジオデータ（2025-07-20確認）
const REAL_STUDIOS = [
  { code: 'SPR', name: '札幌', region: 'hokkaido' },
  { code: 'OMY', name: '大宮', region: 'kanto' },
  { code: 'KSG', name: '越谷', region: 'kanto' },
  { code: 'KSW', name: '柏', region: 'kanto' },
  { code: 'KHM', name: '海浜幕張', region: 'kanto' },
  { code: 'FNB', name: '船橋', region: 'kanto' },
  { code: 'GKBS', name: '銀座京橋', region: 'tokyo' },
  { code: 'GNZ', name: '銀座', region: 'tokyo' },
  { code: 'IKB', name: '池袋', region: 'tokyo' },
  { code: 'SJK', name: '新宿', region: 'tokyo' },
  { code: 'UEN', name: '上野', region: 'tokyo' },
  { code: 'NMG', name: '中目黒', region: 'tokyo' },
  { code: 'MCD', name: '町田', region: 'tokyo' },
  { code: 'JYO', name: '自由が丘', region: 'tokyo' },
  { code: 'KCJ', name: '吉祥寺', region: 'tokyo' },
  { code: 'TMC', name: '多摩センター', region: 'tokyo' },
  { code: 'SBY', name: '渋谷', region: 'tokyo' },
  { code: 'SDM', name: '汐留', region: 'tokyo' },
  { code: 'GTD', name: '五反田', region: 'tokyo' },
  { code: 'KWS', name: '川崎', region: 'kanagawa' },
  { code: 'YSC', name: '横須賀中央', region: 'kanagawa' },
  { code: 'KOK', name: '上大岡', region: 'kanagawa' },
  { code: 'YKH', name: '横浜', region: 'kanagawa' },
  { code: 'MKG', name: '武蔵小杉', region: 'kanagawa' },
  { code: 'AZN', name: 'あざみ野', region: 'kanagawa' },
  { code: 'AZNP', name: 'あざみ野Pilates', region: 'kanagawa' },
  { code: 'GIF', name: '岐阜', region: 'chubu' },
  { code: 'SKE', name: '栄', region: 'chubu' },
  { code: 'NGY', name: '名古屋', region: 'chubu' },
  { code: 'KTK', name: '京都河原町', region: 'kansai' },
  { code: 'SSB', name: '心斎橋', region: 'kansai' },
  { code: 'UMDC', name: '梅田茶屋町', region: 'kansai' },
  { code: 'OKBS', name: '大阪京橋', region: 'kansai' },
  { code: 'SMY', name: '三ノ宮', region: 'kansai' },
  { code: 'HSM', name: '広島', region: 'chugoku' },
  { code: 'TKM', name: '高松', region: 'shikoku' },
  { code: 'FTJ', name: '福岡天神', region: 'kyushu' }
];

async function replaceWithRealStudios() {
  console.log('🔧 Replacing DynamoDB with real studio data...');
  
  try {
    // 既存の全スタジオデータを削除
    console.log('🗑️  Clearing existing fake studio data...');
    const existingResult = await docClient.send(new ScanCommand({
      TableName: STUDIOS_TABLE
    }));
    
    for (const studio of existingResult.Items || []) {
      await docClient.send(new DeleteCommand({
        TableName: STUDIOS_TABLE,
        Key: { studioCode: studio.studioCode }
      }));
      console.log(`🗑️  Deleted: ${studio.studioCode}`);
    }
    
    // 実際のスタジオデータを挿入
    console.log('\n✨ Inserting real studio data...');
    for (const studio of REAL_STUDIOS) {
      const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
      
      await docClient.send(new PutCommand({
        TableName: STUDIOS_TABLE,
        Item: {
          studioCode: studio.code,
          studioName: studio.name,
          region: studio.region,
          lastUpdated: new Date().toISOString(),
          ttl: ttl
        }
      }));
      console.log(`✅ Inserted: ${studio.code} - ${studio.name}`);
    }
    
    console.log('\n🎉 Studio data replacement completed!');
    console.log(`📊 Total studios: ${REAL_STUDIOS.length}`);
    
  } catch (error) {
    console.error('❌ Replacement failed:', error);
  }
}

replaceWithRealStudios().catch(console.error);