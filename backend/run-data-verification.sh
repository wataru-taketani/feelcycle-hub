#!/bin/bash

# 環境変数設定（dev環境用）
export AWS_REGION=ap-northeast-1
export STUDIOS_TABLE_NAME=feelcycle-hub-studios-dev
export LESSONS_TABLE_NAME=feelcycle-hub-lessons-dev
export STUDIO_BATCH_TABLE_NAME=feelcycle-studio-batch-dev
export USER_LESSONS_TABLE_NAME=feelcycle-hub-user-lessons-dev
export WAITLIST_TABLE_NAME=feelcycle-hub-waitlist-dev
export USERS_TABLE_NAME=feelcycle-hub-users-dev

echo "📊 データ検証実行"
echo "環境変数設定確認:"
echo "  LESSONS_TABLE_NAME: $LESSONS_TABLE_NAME"
echo ""

node simple-data-verification.js