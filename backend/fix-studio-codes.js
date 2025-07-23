const AWS = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, DeleteCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new AWS.DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

const STUDIOS_TABLE = 'feelcycle-hub-studios-dev';

// 正しいスタジオコード対応表（以前のデバッグで確認済み）
const STUDIO_CODE_MAPPING = {
  'sby': 'SBY',           // 渋谷
  'shibuya': 'SBY',       // 重複を統合
  'shinjuku': 'SJK',      // 新宿
  'ginza': 'GNZ',         // 銀座
  'harajuku': 'HRJ',      // 原宿（推定）
  'osaki': 'OSK',         // 大崎（推定）
  'ebisu': 'EBS',         // 恵比寿（推定）
  'odaiba': 'ODB',        // お台場（推定）
  'shimbashi': 'SMB',     // 新橋（推定）
  'roppongi': 'RPG'       // 六本木（推定）
};

async function fixStudioCodes() {
  console.log('🔧 Starting studio codes fix...');
  
  try {
    // 既存のスタジオデータを取得
    const result = await docClient.send(new ScanCommand({
      TableName: STUDIOS_TABLE
    }));
    
    const studios = result.Items || [];
    console.log(`📍 Found ${studios.length} studios to fix`);
    
    // 各スタジオを処理
    for (const studio of studios) {
      const oldCode = studio.studioCode;
      const newCode = STUDIO_CODE_MAPPING[oldCode];
      
      if (!newCode) {
        console.log(`⚠️  No mapping found for: ${oldCode}`);
        continue;
      }
      
      if (oldCode === newCode) {
        console.log(`✅ ${oldCode} already correct`);
        continue;
      }
      
      console.log(`🔄 Updating: ${oldCode} → ${newCode}`);
      
      // 古いレコードを削除
      await docClient.send(new DeleteCommand({
        TableName: STUDIOS_TABLE,
        Key: { studioCode: oldCode }
      }));
      
      // 新しいレコードを挿入
      await docClient.send(new PutCommand({
        TableName: STUDIOS_TABLE,
        Item: {
          ...studio,
          studioCode: newCode,
          lastUpdated: new Date().toISOString()
        }
      }));
      
      console.log(`✅ Updated: ${oldCode} → ${newCode}`);
    }
    
    console.log('🎉 Studio codes fix completed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

fixStudioCodes().catch(console.error);