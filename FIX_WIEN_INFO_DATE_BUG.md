# FIX: Wien.info Date Bug - VieVinum Duplicate Key Error

## Problem Summary

The wien.info importer creates duplicate events with **incorrect dates** for multi-day events like "VieVinum 2026".

**Root Cause**: In `app/lib/sources/wienInfo.ts`, function `pickDateTimeWithinWindow()` returns the **scraper run date** (`fromISO`) instead of the **actual event date** (`event.startDate`).

## The Bug

**File**: `app/lib/sources/wienInfo.ts`
**Line**: ~389

### Current (Buggy) Code:

```typescript
function pickDateTimeWithinWindow(
  event: WienInfoEvent,
  fromISO: string,
  toISO: string
): { date: string; time: string } {
  const from = new Date(fromISO + 'T00:00:00');
  const to = new Date(toISO + 'T23:59:59');

  const extractTimeOrAllDay = (isoDateTime?: string): string => {
    if (!isoDateTime || !isoDateTime.includes('T')) return 'ganztags';
    const hhmm = isoDateTime.split('T')[1]?.split(/[+Z]/)[0]?.slice(0, 5) || '';
    if (!/^\d{2}:\d{2}$/.test(hhmm)) return 'ganztags';
    if (hhmm === '00:00' || hhmm === '00:01') return 'ganztags';
    return hhmm;
  };

  // 1) dates[]: first instance within window
  if (Array.isArray(event.dates) && event.dates.length > 0) {
    for (const dateTime of event.dates) {
      const dt = new Date(dateTime);
      if (dt >= from && dt <= to) {
        const date = dateTime.split('T')[0];
        const time = extractTimeOrAllDay(dateTime);
        return { date, time };
      }
    }
  }

  // 2) range intersects window -> BUG IS HERE!
  if (event.startDate) {
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
    if (start <= to && end >= from) {
      const time = extractTimeOrAllDay(event.startDate);
      return { date: fromISO, time };  // ← BUG: Returns fromISO instead of event.startDate!
    }
  }

  // 3) fallbacks
  if (Array.isArray(event.dates) && event.dates.length > 0) {
    const [d] = event.dates[0].split('T');
    const time = extractTimeOrAllDay(event.dates[0]);
    return { date: d, time };
  }

  if (event.startDate) {
    const [d] = event.startDate.split('T');
    const time = extractTimeOrAllDay(event.startDate);
    return { date: d, time };
  }

  return { date: '', time: '' };
}
```

## The Fix

### Change Line ~389:

**FROM:**
```typescript
return { date: fromISO, time };  // ← BUG
```

**TO:**
```typescript
const [eventDate] = event.startDate.split('T');
return { date: eventDate, time };  // ← FIXED: Use actual event date
```

### Complete Fixed Section:

```typescript
// 2) range intersects window -> use actual event start date
if (event.startDate) {
  const start = new Date(event.startDate);
  const end = event.endDate ? new Date(event.endDate) : new Date(event.startDate);
  if (start <= to && end >= from) {
    const time = extractTimeOrAllDay(event.startDate);
    const [eventDate] = event.startDate.split('T');  // ← FIX: Extract actual event date
    return { date: eventDate, time };  // ← Return event's date, not fromISO
  }
}
```

## Why This Fix Works

### Before Fix:
```
VieVinum 2026:
  API returns: startDate = "2026-05-16T13:00:00"
  Scraper runs: fromISO = "2026-01-06"
  Bug returns: { date: "2026-01-06", time: "13:00" }
  Database: Event saved with WRONG date (Jan 6 instead of May 16)
  Result: 11 duplicate entries with different dates ❌
```

### After Fix:
```
VieVinum 2026:
  API returns: startDate = "2026-05-16T13:00:00"
  Scraper runs: fromISO = "2026-01-06"
  Fix returns: { date: "2026-05-16", time: "13:00" }
  Database: Event saved with CORRECT date (May 16)
  Result: 1 entry with correct date ✅
```

## Testing

### 1. Apply the Fix

Edit `app/lib/sources/wienInfo.ts` line ~389 as shown above.

### 2. Clean Up Existing Duplicates

Run Migration 013 (which handles duplicates):

```bash
supa db reset
```

Or manually:

```sql
-- Delete all VieVinum entries except the correct one (May 16, 2026)
DELETE FROM events 
WHERE title = 'VieVinum 2026' 
  AND start_date_time != '2026-05-16 13:00:00+00';
```

### 3. Run Cache Warmup

```bash
curl https://your-domain/api/admin/cache-warmup
```

### 4. Verify

```sql
SELECT title, start_date_time, COUNT(*) as count
FROM events
WHERE title = 'VieVinum 2026'
GROUP BY title, start_date_time
ORDER BY start_date_time;
```

**Expected Result:**
```
title            | start_date_time      | count
VieVinum 2026    | 2026-05-16 13:00:00  | 1
```

Only **1 entry** with the **correct date** (May 16, 2026).

## Impact

This bug affects **all multi-day events** that:
1. Have `startDate` and `endDate` (but no `dates[]` array)
2. Span multiple days (e.g., exhibitions, festivals, recurring shows)

Without this fix:
- ❌ Each time the scraper runs, a new duplicate is created with the **current date**
- ❌ Users see events on **wrong dates**
- ❌ Unique constraint violations on every import
- ❌ Cache warmup fails

With the fix:
- ✅ Events are imported with their **actual dates**
- ✅ No duplicates
- ✅ Unique constraint works correctly
- ✅ Users see events on correct dates
- ✅ Cache warmup succeeds

## Detailed Analysis

See `wien_info_date_bug_analysis.md` for:
- Complete root cause analysis
- Step-by-step breakdown of what happens
- Database state before/after
- Alternative solutions considered
- Testing strategy
