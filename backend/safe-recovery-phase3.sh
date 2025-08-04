#!/bin/bash

# Safe Studio Recovery - Phase 3: Batch Status Normalization
# 全スタジオのbatchStatusを'pending'に正常化してバッチ処理を再開可能にする

echo "🛡️  Safe Studio Recovery - Phase 3: Batch Status Normalization"
echo "================================================================="

echo "🔍 Checking current batchStatus distribution..."

# Count different batch statuses
PENDING_COUNT=$(aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --filter-expression "batchStatus = :pending" \
    --expression-attribute-values '{":pending":{"S":"pending"}}' \
    --select COUNT \
    --output text --query 'Count')

FAILED_COUNT=$(aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --filter-expression "batchStatus = :failed" \
    --expression-attribute-values '{":failed":{"S":"failed"}}' \
    --select COUNT \
    --output text --query 'Count')

NULL_COUNT=$(aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --filter-expression "attribute_not_exists(batchStatus)" \
    --select COUNT \
    --output text --query 'Count')

TOTAL_COUNT=$(aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --select COUNT \
    --output text --query 'Count')

echo "📊 Current batchStatus distribution:"
echo "   • pending: $PENDING_COUNT"
echo "   • failed:  $FAILED_COUNT"
echo "   • NULL:    $NULL_COUNT"
echo "   • Total:   $TOTAL_COUNT"
echo ""

if [ "$PENDING_COUNT" -eq "$TOTAL_COUNT" ]; then
    echo "✅ All studios already have 'pending' status"
    echo "📋 Ready to start Progressive Daily Refresh"
    exit 0
fi

echo "🔧 Normalizing batchStatus to 'pending' for all studios..."

# Get all studio codes
STUDIO_CODES=$(aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --projection-expression "studioCode" \
    --output text --query 'Items[].studioCode.S')

# Update each studio to pending status
for studio_code in $STUDIO_CODES; do
    echo "🔧 Setting $studio_code → pending"
    
    aws dynamodb update-item \
        --table-name feelcycle-hub-studios-dev \
        --key "{\"studioCode\":{\"S\":\"$studio_code\"}}" \
        --update-expression "SET batchStatus = :status, lastUpdated = :updated REMOVE retryCount, lastError" \
        --expression-attribute-values "{
            \":status\":{\"S\":\"pending\"},
            \":updated\":{\"S\":\"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"}
        }" \
        --condition-expression "attribute_exists(studioCode)" > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Updated"
    else
        echo "   ❌ Failed"
    fi
done

echo ""
echo "🔍 Verifying batch status normalization..."

# Check final pending count
FINAL_PENDING=$(aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --filter-expression "batchStatus = :pending" \
    --expression-attribute-values '{":pending":{"S":"pending"}}' \
    --select COUNT \
    --output text --query 'Count')

if [ "$FINAL_PENDING" -eq "$TOTAL_COUNT" ]; then
    echo "✅ Phase 3 completed successfully - All $TOTAL_COUNT studios have 'pending' status"
    echo "📋 System ready for Progressive Daily Refresh"
else
    echo "⚠️  Only $FINAL_PENDING/$TOTAL_COUNT studios have 'pending' status"
fi

echo ""
echo "📊 Final status verification:"
aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --projection-expression "batchStatus" \
    --output text --query 'Items[].batchStatus.S' | \
    sort | uniq -c

echo ""
echo "🔍 Sample verification (Yokohama and other critical studios):"
aws dynamodb batch-get-item \
    --request-items '{
        "feelcycle-hub-studios-dev": {
            "Keys": [
                {"studioCode": {"S": "ykh"}},
                {"studioCode": {"S": "sjk"}},
                {"studioCode": {"S": "sby"}},
                {"studioCode": {"S": "nmg"}},
                {"studioCode": {"S": "jyo"}}
            ],
            "ProjectionExpression": "studioCode, studioName, #r, batchStatus",
            "ExpressionAttributeNames": {"#r": "region"}
        }
    }' \
    --output table

echo ""
echo "🎯 Next step: Test Progressive Daily Refresh"
echo "   Command: node manual-daily-batch.js"
echo "   Or test single studio: node -e \"const scraper = require('./dist/services/real-scraper'); scraper.RealFeelcycleScraper.searchAllLessons('ykh').then(console.log);\""