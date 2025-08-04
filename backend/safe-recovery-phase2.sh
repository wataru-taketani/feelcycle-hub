#!/bin/bash

# Safe Studio Recovery - Phase 2: Region Information Recovery
# 全37スタジオの地域情報を復旧

echo "🛡️  Safe Studio Recovery - Phase 2: Region Recovery"
echo "=========================================================="

# Complete studio mappings with correct regions
STUDIOS="
azn:あざみ野:関東
aznp:あざみ野Pilates:関東
fnb:船橋:関東
ftj:福岡天神:九州
gif:岐阜:東海
gkbs:銀座京橋:関東
gnz:銀座:関東
gtd:五反田:関東
hsm:広島:中国
ikb:池袋:関東
jyo:自由が丘:関東
kcj:吉祥寺:関東
khm:海浜幕張:関東
kok:上大岡:関東
ksg:越谷:関東
ksw:柏:関東
ktk:京都河原町:関西
kws:川崎:関東
mcd:町田:関東
mkg:武蔵小杉:関東
ngy:名古屋:東海
nmg:仲目黒:関東
okbs:大阪京橋:関西
omy:大宮:関東
sby:渋谷:関東
sdm:汐留:関東
sjk:新宿:関東
ske:栄:東海
smy:三ノ宮:関西
spr:札幌:北海道
ssb:心斎橋:関西
tkm:高松:四国
tmc:多摩センター:関東
uen:上野:関東
umdc:梅田茶屋町:関西
ykh:横浜:関東
ysc:横須賀中央:関東
"

echo "🔍 Checking current region status..."

# Count studios with NULL or "unknown" region
NULL_REGIONS=$(aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --filter-expression "attribute_not_exists(#r) OR #r = :null OR #r = :unknown" \
    --expression-attribute-names '{"#r":"region"}' \
    --expression-attribute-values '{":null":{"S":""},":unknown":{"S":"unknown"}}' \
    --select COUNT \
    --output text --query 'Count')

echo "📊 Studios with NULL region: $NULL_REGIONS"
echo ""

if [ "$NULL_REGIONS" -eq 0 ]; then
    echo "✅ All studios already have region information"
    exit 0
fi

echo "🔧 Updating region information for all studios..."

# Process each studio
for studio_entry in $STUDIOS; do
    # Skip empty lines
    if [ -z "$studio_entry" ]; then
        continue
    fi
    
    IFS=':' read -r studio_code studio_name region <<< "$studio_entry"
    
    # Skip if any field is empty
    if [ -z "$studio_code" ] || [ -z "$studio_name" ] || [ -z "$region" ]; then
        continue
    fi
    
    echo "🔧 Updating $studio_code ($studio_name) → $region"
    
    aws dynamodb update-item \
        --table-name feelcycle-hub-studios-dev \
        --key "{\"studioCode\":{\"S\":\"$studio_code\"}}" \
        --update-expression "SET #r = :region, lastUpdated = :updated" \
        --expression-attribute-names '{"#r":"region"}' \
        --expression-attribute-values "{
            \":region\":{\"S\":\"$region\"},
            \":updated\":{\"S\":\"$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")\"}
        }" \
        --condition-expression "attribute_exists(studioCode)"
    
    if [ $? -eq 0 ]; then
        echo "   ✅ Updated"
    else
        echo "   ❌ Failed"
    fi
done

echo ""
echo "🔍 Verifying region recovery..."

# Check for remaining NULL or "unknown" regions
REMAINING_NULL=$(aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --filter-expression "attribute_not_exists(#r) OR #r = :null OR #r = :unknown" \
    --expression-attribute-names '{"#r":"region"}' \
    --expression-attribute-values '{":null":{"S":""},":unknown":{"S":"unknown"}}' \
    --select COUNT \
    --output text --query 'Count')

if [ "$REMAINING_NULL" -eq 0 ]; then
    echo "✅ Phase 2 completed successfully - All studios have region information"
    echo "📋 Ready for Phase 3: Batch status normalization"
else
    echo "⚠️  Still have $REMAINING_NULL studios with NULL region"
fi

echo ""
echo "📊 Region distribution:"
aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --projection-expression "#r" \
    --expression-attribute-names '{"#r":"region"}' \
    --output text --query 'Items[].region.S' | \
    sort | uniq -c | sort -nr

echo ""
echo "📋 Sample verification (first 10 studios):"
aws dynamodb scan \
    --table-name feelcycle-hub-studios-dev \
    --projection-expression "studioCode, studioName, #r" \
    --expression-attribute-names '{"#r":"region"}' \
    --limit 10 \
    --output table