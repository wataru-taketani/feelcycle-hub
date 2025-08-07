import { DynamoDBClient, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'ap-northeast-1' });
const USER_TABLE = 'feelcycle-hub-users-dev';

/**
 * 既存のユーザーテーブルにFEELCYCLE連携フィールドを追加
 */
async function updateUsersTableSchema() {
  console.log('🔄 既存ユーザーテーブルのスキーマ更新開始...');

  try {
    // 全ユーザーを取得
    const scanCommand = new ScanCommand({
      TableName: USER_TABLE
    });

    const result = await dynamoClient.send(scanCommand);
    const users = result.Items?.map(item => unmarshall(item)) || [];

    console.log(`📊 対象ユーザー数: ${users.length}`);

    // 各ユーザーにFEELCYCLE連携フィールドを追加
    let updatedCount = 0;
    for (const user of users) {
      try {
        // 既にフィールドが存在する場合はスキップ
        if (user.feelcycleAccountLinked !== undefined) {
          console.log(`⏭️  スキップ: ${user.PK} (既に更新済み)`);
          continue;
        }

        const updateCommand = new UpdateItemCommand({
          TableName: USER_TABLE,
          Key: marshall({
            PK: user.PK,
            SK: user.SK
          }),
          UpdateExpression: 'SET feelcycleAccountLinked = :linked, feelcycleLastVerified = :verified',
          ExpressionAttributeValues: marshall({
            ':linked': false,
            ':verified': null
          }),
          ReturnValues: 'UPDATED_NEW'
        });

        await dynamoClient.send(updateCommand);
        updatedCount++;
        console.log(`✅ 更新完了: ${user.PK}`);

      } catch (error) {
        console.error(`❌ 更新エラー: ${user.PK}`, error);
      }
    }

    console.log(`🎉 スキーマ更新完了: ${updatedCount}/${users.length} ユーザー更新`);

  } catch (error) {
    console.error('❌ スキーマ更新エラー:', error);
    throw error;
  }
}

// 実行
if (require.main === module) {
  updateUsersTableSchema().catch(console.error);
}

export { updateUsersTableSchema };