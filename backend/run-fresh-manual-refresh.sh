#!/bin/bash

# 環境変数設定（dev環境用）
export AWS_REGION=ap-northeast-1
export STUDIOS_TABLE_NAME=feelcycle-hub-studios-dev
export LESSONS_TABLE_NAME=feelcycle-hub-lessons-dev
export STUDIO_BATCH_TABLE_NAME=feelcycle-studio-batch-dev
export USER_LESSONS_TABLE_NAME=feelcycle-hub-user-lessons-dev
export WAITLIST_TABLE_NAME=feelcycle-hub-waitlist-dev
export USERS_TABLE_NAME=feelcycle-hub-users-dev

echo "🚀 フレッシュ手動スクレイピング実行準備"
echo "環境変数設定:"
echo "  AWS_REGION: $AWS_REGION"
echo "  STUDIOS_TABLE_NAME: $STUDIOS_TABLE_NAME"
echo "  LESSONS_TABLE_NAME: $LESSONS_TABLE_NAME"
echo ""

echo "📦 TypeScriptビルド実行..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ ビルド成功"
    echo ""
    echo "🔄 バッチ状態リセット（フレッシュスタート）..."
    
    # Create a simple script to reset batch statuses and run
    cat > temp-fresh-run.js << 'EOF'
const { progressiveDailyRefresh } = require('./dist/scripts/progressive-daily-refresh.js');
const { studiosService } = require('./dist/services/studios-service.js');

async function runFreshBatch() {
  try {
    console.log('🔄 Resetting all batch statuses for fresh run...');
    await studiosService.resetAllBatchStatuses();
    console.log('✅ Batch statuses reset');
    
    console.log('\n🚀 Starting fresh batch execution...');
    const result = await progressiveDailyRefresh();
    console.log('✅ Batch execution completed');
    console.log('Result:', result);
    
  } catch (error) {
    console.error('❌ Fresh batch execution failed:', error);
    process.exit(1);
  }
}

runFreshBatch();
EOF
    
    echo "🔄 フレッシュ日次バッチ実行開始..."
    node temp-fresh-run.js
    
    # Clean up
    rm temp-fresh-run.js
    
else
    echo "❌ ビルド失敗"
    exit 1
fi