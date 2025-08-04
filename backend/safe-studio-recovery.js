/**
 * 安全なスタジオデータ復旧スクリプト
 * 破損したスタジオデータを段階的に復旧
 */

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: 'ap-northeast-1' });

// 信頼できるスタジオマッピングデータ（FEELCYCLEサイトから確認済み）
const STUDIO_MAPPING = {
  // 致命的破損の4スタジオ（studioName: NULL）
  'ykh': { name: '横浜', region: '関東' },
  'nmg': { name: '仲目黒', region: '関東' },  
  'sjk': { name: '新宿', region: '関東' },
  'jyo': { name: '自由が丘', region: '関東' },
  
  // 既存スタジオの地域情報補完
  'azn': { name: 'あざみ野', region: '関東' },
  'aznp': { name: 'あざみ野Pilates', region: '関東' },
  'fnb': { name: '船橋', region: '関東' },
  'gkbs': { name: '銀座京橋', region: '関東' },
  'gnz': { name: '銀座', region: '関東' },
  'gtd': { name: '五反田', region: '関東' },
  'ikb': { name: '池袋', region: '関東' },
  'kcj': { name: '吉祥寺', region: '関東' },
  'khm': { name: '海浜幕張', region: '関東' },
  'kok': { name: '上大岡', region: '関東' },
  'ksg': { name: '越谷', region: '関東' },
  'ksw': { name: '柏', region: '関東' },
  'kws': { name: '川崎', region: '関東' },
  'mcd': { name: '町田', region: '関東' },
  'mkg': { name: '武蔵小杉', region: '関東' },
  'omy': { name: '大宮', region: '関東' },
  'sby': { name: '渋谷', region: '関東' },
  'sdm': { name: '汐留', region: '関東' },
  'tmc': { name: '多摩センター', region: '関東' },
  'uen': { name: '上野', region: '関東' },
  'ysc': { name: '横須賀中央', region: '関東' },
  
  // 東海・関西・その他
  'ngy': { name: '名古屋', region: '東海' },
  'gif': { name: '岐阜', region: '東海' },
  'ske': { name: '栄', region: '東海' },
  'ktk': { name: '京都河原町', region: '関西' },
  'okbs': { name: '大阪京橋', region: '関西' },
  'smy': { name: '三ノ宮', region: '関西' },
  'ssb': { name: '心斎橋', region: '関西' },
  'umdc': { name: '梅田茶屋町', region: '関西' },
  'ftj': { name: '福岡天神', region: '九州' },
  'hsm': { name: '広島', region: '中国' },
  'spr': { name: '札幌', region: '北海道' },
  'tkm': { name: '高松', region: '四国' }
};

async function createBackup() {
  console.log('📋 Creating safety backup...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    const result = await dynamodb.scan({
      TableName: 'feelcycle-hub-studios-dev'
    }).promise();
    
    require('fs').writeFileSync(
      `studio-backup-${timestamp}.json`, 
      JSON.stringify(result.Items, null, 2)
    );
    
    console.log(`✅ Backup created: studio-backup-${timestamp}.json`);
    return true;
  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    return false;
  }
}

async function recoverCriticalStudios() {
  console.log('🚨 Phase 1: Recovering 4 critical studios with NULL studioName...');
  
  const criticalStudios = ['ykh', 'nmg', 'sjk', 'jyo'];
  
  for (const studioCode of criticalStudios) {
    const studioInfo = STUDIO_MAPPING[studioCode];
    if (!studioInfo) {
      console.error(`❌ No mapping found for ${studioCode}`);
      continue;
    }
    
    try {
      console.log(`🔧 Recovering ${studioCode}: ${studioInfo.name} (${studioInfo.region})`);
      
      await dynamodb.update({
        TableName: 'feelcycle-hub-studios-dev',
        Key: { studioCode },
        UpdateExpression: 'SET studioName = :name, #r = :region, batchStatus = :status, lastUpdated = :updated',
        ExpressionAttributeNames: { '#r': 'region' },
        ExpressionAttributeValues: {
          ':name': studioInfo.name,
          ':region': studioInfo.region,
          ':status': 'pending',
          ':updated': new Date().toISOString()
        }
      }).promise();
      
      console.log(`✅ ${studioCode} recovered successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to recover ${studioCode}:`, error);
    }
  }
}

async function verifyRecovery() {
  console.log('🔍 Verifying recovery...');
  
  try {
    const result = await dynamodb.scan({
      TableName: 'feelcycle-hub-studios-dev',
      ProjectionExpression: 'studioCode, studioName, #r, batchStatus',
      ExpressionAttributeNames: { '#r': 'region' }
    }).promise();
    
    const nullStudios = result.Items.filter(item => !item.studioName);
    const nullRegions = result.Items.filter(item => !item.region);
    
    console.log(`📊 Recovery status:`);
    console.log(`   • Studios with NULL name: ${nullStudios.length}`);
    console.log(`   • Studios with NULL region: ${nullRegions.length}`);
    
    if (nullStudios.length > 0) {
      console.log('❌ Still have NULL studioName:', nullStudios.map(s => s.studioCode));
    }
    
    return nullStudios.length === 0;
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

async function main() {
  console.log('🛡️  Safe Studio Recovery - Phase 1: Critical Studios');
  console.log('='.repeat(60));
  
  // Safety backup
  const backupSuccess = await createBackup();
  if (!backupSuccess) {
    console.error('❌ Cannot proceed without backup');
    process.exit(1);
  }
  
  // Recover critical studios
  await recoverCriticalStudios();
  
  // Verify recovery
  const success = await verifyRecovery();
  
  if (success) {
    console.log('✅ Phase 1 completed successfully');
    console.log('📋 Next: Run Phase 2 to fix remaining region data');
  } else {
    console.log('❌ Phase 1 incomplete, manual intervention may be needed');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { STUDIO_MAPPING, recoverCriticalStudios, verifyRecovery };