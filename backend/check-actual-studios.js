const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'ap-northeast-1' });
const docClient = DynamoDBDocumentClient.from(client);

async function getActualStudios() {
  console.log('🔍 DynamoDB Studiosテーブルからスクレイピングで取得された実際のスタジオ一覧を確認中...');
  
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'feelcycle-hub-studios-dev',
    }));

    const studios = result.Items || [];
    console.log(`\n📊 取得されたスタジオ数: ${studios.length}`);
    
    if (studios.length > 0) {
      console.log('\n📍 実際にスクレイピングされたスタジオ一覧:');
      console.log('=' .repeat(80));
      
      // 地域別にグループ化
      const studiosByRegion = studios.reduce((acc, studio) => {
        const region = studio.region || 'unknown';
        if (!acc[region]) acc[region] = [];
        acc[region].push(studio);
        return acc;
      }, {});
      
      Object.keys(studiosByRegion).sort().forEach(region => {
        console.log(`\n🌍 ${region.toUpperCase()} (${studiosByRegion[region].length}店舗):`);
        studiosByRegion[region]
          .sort((a, b) => a.studioName.localeCompare(b.studioName))
          .forEach(studio => {
            const status = studio.batchStatus || 'unknown';
            const lastProcessed = studio.lastProcessed ? 
              new Date(studio.lastProcessed).toLocaleString('ja-JP') : 
              '未処理';
            console.log(`  • ${studio.studioName} (${studio.studioCode}) - ${status} - ${lastProcessed}`);
          });
      });
      
      // 処理状況サマリー
      console.log('\n📈 処理状況サマリー:');
      console.log('=' .repeat(50));
      const statusCounts = studios.reduce((acc, studio) => {
        const status = studio.batchStatus || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}店舗`);
      });
      
    } else {
      console.log('⚠️  スタジオデータが見つかりません');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

getActualStudios();