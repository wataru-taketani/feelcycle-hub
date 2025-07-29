#!/bin/bash

# 環境変数設定（dev環境用）
export AWS_REGION=ap-northeast-1
export STUDIOS_TABLE_NAME=feelcycle-hub-studios-dev
export LESSONS_TABLE_NAME=feelcycle-hub-lessons-dev
export STUDIO_BATCH_TABLE_NAME=feelcycle-studio-batch-dev
export USER_LESSONS_TABLE_NAME=feelcycle-hub-user-lessons-dev
export WAITLIST_TABLE_NAME=feelcycle-hub-waitlist-dev
export USERS_TABLE_NAME=feelcycle-hub-users-dev

echo "🚀 手動スクレイピング実行準備"
echo "環境変数設定:"
echo "  AWS_REGION: $AWS_REGION"
echo "  STUDIOS_TABLE_NAME: $STUDIOS_TABLE_NAME"
echo "  LESSONS_TABLE_NAME: $LESSONS_TABLE_NAME"
echo "  STUDIO_BATCH_TABLE_NAME: $STUDIO_BATCH_TABLE_NAME"
echo "  USER_LESSONS_TABLE_NAME: $USER_LESSONS_TABLE_NAME"
echo "  WAITLIST_TABLE_NAME: $WAITLIST_TABLE_NAME"
echo "  USERS_TABLE_NAME: $USERS_TABLE_NAME"
echo ""

echo "📦 TypeScriptビルド実行..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ ビルド成功"
    echo ""
    echo "🔄 日次バッチ手動実行開始..."
    node dist/scripts/progressive-daily-refresh.js
else
    echo "❌ ビルド失敗"
    exit 1
fi