const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function analyzeStudios() {
  try {
    console.log('🔍 スタジオデータの重複を分析...');
    
    const result = await docClient.send(new ScanCommand({
      TableName: 'feelcycle-hub-studios-dev'
    }));
    
    console.log(`📊 総レコード数: ${result.Items.length}`);
    
    // スタジオ名でグループ化
    const studioGroups = {};
    
    result.Items.forEach(studio => {
      const name = studio.studioName;
      if (!studioGroups[name]) {
        studioGroups[name] = [];
      }
      studioGroups[name].push(studio.studioCode);
    });
    
    console.log(`📈 ユニークなスタジオ名数: ${Object.keys(studioGroups).length}`);
    
    console.log('\n🔄 重複があるスタジオ:');
    Object.entries(studioGroups).forEach(([name, codes]) => {
      if (codes.length > 1) {
        console.log(`  ${name}: ${codes.join(', ')}`);
      }
    });
    
    // 大文字小文字の重複分析
    const codeGroups = {};
    result.Items.forEach(studio => {
      const upperCode = studio.studioCode.toUpperCase();
      if (!codeGroups[upperCode]) {
        codeGroups[upperCode] = [];
      }
      codeGroups[upperCode].push(studio.studioCode);
    });
    
    console.log('\n🔤 大文字小文字の重複:');
    let duplicateCount = 0;
    Object.entries(codeGroups).forEach(([upperCode, codes]) => {
      if (codes.length > 1) {
        console.log(`  ${upperCode}: ${codes.join(', ')}`);
        duplicateCount += codes.length - 1;
      }
    });
    
    console.log(`\n📊 重複による余分なレコード数: ${duplicateCount}`);
    console.log(`✅ 実際のユニークスタジオ数: ${Object.keys(codeGroups).length}`);
    
    // 期待される36スタジオとの比較
    const expectedCount = 36;
    if (Object.keys(codeGroups).length > expectedCount) {
      console.log(`\n⚠️  期待値(${expectedCount})より多い: ${Object.keys(codeGroups).length - expectedCount}個余分`);
    }
  } catch (error) {
    console.log('❌ エラー:', error.message);
  }
}

analyzeStudios();