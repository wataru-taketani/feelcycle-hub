#!/bin/bash

# Safe Studio Recovery - Phase 1: Critical Studios
# 致命的破損の4スタジオ（studioName: NULL）を安全に復旧

echo "🛡️  Safe Studio Recovery - Phase 1: Critical Studios"
echo "============================================================"

# Safety backup
echo "📋 Creating safety backup..."
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="studio-backup-${TIMESTAMP}.json"

aws dynamodb scan --table-name feelcycle-hub-studios-dev > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "❌ Backup creation failed. Aborting."
    exit 1
fi

echo ""
echo "🚨 Phase 1: Recovering 4 critical studios with NULL studioName..."

# Critical studio mappings (simplified approach)
STUDIOS="ykh:横浜:関東 nmg:仲目黒:関東 sjk:新宿:関東 jyo:自由が丘:関東"

# Recover each critical studio
for studio_entry in $STUDIOS; do
    IFS=':' read -r studio_code studio_name region <<< "$studio_entry"
    
    echo "🔧 Recovering $studio_code: $studio_name ($region)"
    
    aws dynamodb update-item \
        --table-name feelcycle-hub-studios-dev \
        --key "{\"studioCode\":{\"S\":\"$studio_code\"}}" \
        --update-expression "SET studioName = :name, #r = :region, batchStatus = :status, lastUpdated = :updated" \
        --expression-attribute-names "{\"#r\":\"region\"}" \
        --expression-attribute-values "{
            \":name\":{\"S\":\"$studio_name\"},
            \":region\":{\"S\":\"$region\"},
            \":status\":{\"S\":\"pending\"},
            \":updated\":{\"S\":\"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"}
        }"
    
    if [ $? -eq 0 ]; then
        echo "✅ $studio_code recovered successfully"
    else
        echo "❌ Failed to recover $studio_code"
    fi
    
    echo ""
done

echo "🔍 Verifying recovery..."

# Check for remaining NULL studioName
NULL_STUDIOS=$(aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --filter-expression "attribute_not_exists(studioName) OR studioName = :null" \
    --expression-attribute-values '{":null":{"S":""}}' \
    --select COUNT \
    --output text --query 'Count')

if [ "$NULL_STUDIOS" -eq 0 ]; then
    echo "✅ Phase 1 completed successfully - No more NULL studioName"
    echo "📋 Ready for Phase 2: Region data recovery"
else
    echo "⚠️  Still have $NULL_STUDIOS studios with NULL studioName"
    echo "Listing remaining NULL studios:"
    aws dynamodb scan \
        --table-name feelcycle-hub-studios-dev \
        --filter-expression "attribute_not_exists(studioName) OR studioName = :null" \
        --expression-attribute-values '{":null":{"S":""}}' \
        --projection-expression "studioCode" \
        --output text --query 'Items[].studioCode.S'
fi

echo ""
echo "📊 Current status summary:"
aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --projection-expression "studioCode, studioName, #r, batchStatus" \
    --expression-attribute-names '{"#r":"region"}' \
    --output text \
    --query 'Items[?studioCode.S==`ykh` || studioCode.S==`nmg` || studioCode.S==`sjk` || studioCode.S==`jyo`].[studioCode.S,studioName.S,region.S,batchStatus.S]' | \
    sort