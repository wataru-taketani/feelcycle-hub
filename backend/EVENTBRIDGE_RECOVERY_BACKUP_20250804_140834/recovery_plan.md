# EventBridge Data Refresh Rule Recovery Plan
**Date**: 2025-08-04 14:08 JST
**Issue**: feelcycle-hub-data-refresh-dev rule not executing despite correct configuration

## Problem Analysis
- **Symptom**: No execution since 2025-08-03, despite ENABLED state
- **Scope**: Single rule only, other EventBridge rules working normally
- **Root Cause**: EventBridge internal scheduling issue (confirmed via metric analysis)

## Recovery Strategy
**Safe Approach**: Create new rule with different name, test, then migrate

## Files in this backup
- `all_rules.json` - Complete EventBridge rules list
- `data_refresh_rule.json` - Problem rule configuration
- `data_refresh_targets.json` - Problem rule targets
- `lambda_permissions.json` - Current Lambda permissions
- `monitoring_rule.json` - Working rule for comparison
- `monitoring_targets.json` - Working rule targets

## Rollback Commands
```bash
# If new rule fails, restore original:
aws events put-rule --name feelcycle-hub-data-refresh-dev \
  --schedule-expression "cron(0 18 * * ? *)" \
  --description "Daily refresh of lesson data at 3:00 AM JST (18:00 UTC)" \
  --state ENABLED --region ap-northeast-1

aws events put-targets --rule feelcycle-hub-data-refresh-dev \
  --targets Id=Target0,Arn=arn:aws:lambda:ap-northeast-1:234156130688:function:feelcycle-hub-main-dev,Input='{"source":"eventbridge.dataRefresh","action":"refreshLessonData"}' \
  --region ap-northeast-1
```

## Impact Assessment
- **Low Risk**: Single rule replacement
- **No Impact**: API, frontend, waitlist functions continue normally
- **Manual Backup**: Progressive daily refresh can run manually if needed