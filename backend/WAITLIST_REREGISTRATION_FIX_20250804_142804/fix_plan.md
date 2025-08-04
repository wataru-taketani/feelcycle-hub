# Waitlist Re-registration Fix Plan
**Date**: 2025-08-04 14:28 JST
**Issue**: Users cannot re-register for waitlists after cancellation/expiration

## Root Cause Analysis
**File**: `backend/src/services/waitlist-service.ts:32-35`
```typescript
const existingWaitlist = await this.getUserWaitlistForLesson(userId, request);
if (existingWaitlist) {
  throw new Error('このレッスンには既にキャンセル待ち登録済みです。');
}
```

**Problem**: The check doesn't consider waitlist status - even cancelled/expired waitlists block re-registration.

## Current Behavior
- ✅ First registration: Works
- ❌ Re-registration after cancellation: Blocked
- ❌ Re-registration after expiration: Blocked

## Fix Strategy
Modify the check to only block active/paused waitlists, allow re-registration for cancelled/expired.

## Proposed Change
```typescript
const existingWaitlist = await this.getUserWaitlistForLesson(userId, request);
if (existingWaitlist && (existingWaitlist.status === 'active' || existingWaitlist.status === 'paused')) {
  throw new Error('このレッスンには既にキャンセル待ち登録済みです。');
}

// If cancelled/expired waitlist exists, update it instead of creating new
if (existingWaitlist && (existingWaitlist.status === 'cancelled' || existingWaitlist.status === 'expired')) {
  return await this.reactivateWaitlist(existingWaitlist);
}
```

## Risk Assessment
- **Low Risk**: Only affects waitlist creation logic
- **No Data Loss**: Preserves existing waitlist history
- **Backward Compatible**: Existing active waitlists unaffected

## Test Plan
1. Create waitlist → Success
2. Cancel waitlist → Success
3. Re-register same lesson → Should succeed (currently fails)
4. Verify data preservation and status transitions