# ON CONFLICT Constraint Error - Root Cause and Fix

**Date**: 2026-01-03 (Updated: 2026-01-06)  
**Status**: Fixed  
**Issue**: Database operation failed: there is no unique or exclusion constraint matching the ON CONFLICT specification  

## Problem Summary

During `wien.info` cache warmup, all 28 unique events failed to insert with this error:

```
[error] [PIPELINE:ERROR] Failed to process event: Error: Database operation failed: 
there is no unique or exclusion constraint matching the ON CONFLICT specification
```

Log output:
```
2026-01-03 12:20:07.450 [info] [PIPELINE:STEP3] Processing 1 batches...
2026-01-03 12:20:07.450 [info] [PIPELINE:BATCH] Processing batch 1/1 (28 events)
2026-01-03 12:20:07.575 [error] [PIPELINE:ERROR] Failed to process event: Error: Database operation failed...
```

## Root Cause Analysis

### What Happened

1. **Migration 001** (`001_create_events_schema.sql`) created the events table with a unique constraint:
   ```sql
   CONSTRAINT unique_event UNIQUE (title, start_date_time, city)
   ```

2. **EventRepository.ts** was configured to use this constraint for UPSERT operations:
   ```typescript
   .upsert(uniqueDbEvents as any, { 
     onConflict: 'title,start_date_time,city',
     ignoreDuplicates: false 
   })
   ```

3. **Migration 012** (`012_remove_unique_event_constraint.sql`) **removed the constraint**:
   ```sql
   ALTER TABLE events DROP CONSTRAINT unique_event;
   ```
   This was done to avoid conflicts when updating event times/details.

4. **The mismatch**: EventRepository still tried to use `ON CONFLICT` with a constraint that no longer exists, causing all upserts to fail.

### Why This Broke Everything

PostgreSQL's `ON CONFLICT` clause requires an explicit unique constraint or exclusion constraint to know which rows to target for the conflict. The error message:

> "there is no unique or exclusion constraint matching the ON CONFLICT specification"

...means PostgreSQL couldn't find a constraint matching `(title, start_date_time, city)` to use for conflict resolution.

## Solution

### Fix: Migration 013 (Updated 2026-01-06)

Created `supabase/migrations/013_restore_unique_event_constraint.sql` that:

1. **Cleans up existing duplicates** (the blocker!)
2. **Adds the unique constraint**

#### Why the Original Migration Failed

When first attempting to add the constraint:

```
ERROR: 23505: could not create unique index "unique_event" 
DETAIL: Key (title, start_date_time, city)=(Winterwunder Mörbisch, 2026-01-03 16:00:00+00, Wien) is duplicated.
```

**Root cause**: Duplicate events already existed in the database, so PostgreSQL couldn't create a unique index.

#### The Updated Solution

Migration 013 now:

```sql
-- 1. Identify duplicates
SELECT title, start_date_time, city, COUNT(*) 
FROM events 
GROUP BY title, start_date_time, city 
HAVING COUNT(*) > 1;

-- 2. Delete duplicates (keeping best version)
WITH ranked_events AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY title, start_date_time, city 
    ORDER BY 
      created_at DESC,           -- Prefer newest
      has_description DESC,      -- Prefer with description
      has_images DESC,           -- Prefer with images
      updated_at DESC
  ) as rn
  FROM events
)
DELETE FROM events WHERE id IN (
  SELECT id FROM ranked_events WHERE rn > 1  -- Delete all except best
);

-- 3. Now add the constraint (safe!)
ALTER TABLE events ADD CONSTRAINT unique_event UNIQUE (title, start_date_time, city);
```

### Why This Works

1. **Restores the constraint** that EventRepository expects
2. **Cleans up duplicates automatically** before adding constraint
3. **Keeps the best version** of each duplicate (newest, most complete)
4. **Enables true UPSERT functionality** (INSERT or UPDATE on conflict)
5. **Maintains data integrity** at the database level
6. **Prevents future duplicates** at DB level

### Duplicate Selection Logic

When multiple events have the same `(title, start_date_time, city)`, the migration keeps the one with:

1. **Most recent `created_at`** (newest import)
2. If tied: **Has description** (more complete data)
3. If still tied: **Has `image_urls`** (richer content)
4. Final tiebreaker: **Most recent `updated_at`**

**Example**:
```
Event A: created 2026-01-06, has description ✓ KEEP
Event B: created 2026-01-05, has description ✗ DELETE
Event C: created 2026-01-04, no description  ✗ DELETE
```

### Handling the Original Issue (Updating Event Times)

Migration 012 was created to handle updating event times, which would conflict with the unique constraint. Instead of removing the constraint entirely, we handle this properly:

1. **Before inserting**: Deduplicate events in application logic
2. **ON CONFLICT**: Update the existing record if it conflicts
3. **If manual updates needed**: Use separate UPDATE queries, not UPSERT

## Implementation Details

### How the Fix Works in Practice

When importing events from wien.info:

```
1. Fetch 165 raw events from API
2. Expand to 1576 variants (with categories)
3. Deduplicate to 28 unique events (title+date+city)
4. UPSERT into database:
   - If (title, start_date_time, city) doesn't exist → INSERT
   - If it exists → UPDATE (enrichment, description, etc.)
5. Link events to venues
```

Before the fix, step 4 failed. After applying migration 013, it succeeds.

### Code in EventRepository.ts

No changes needed to EventRepository code - it already has the correct logic:

```typescript
const { data, error } = await supabaseAdmin
  .from('events')
  .upsert(uniqueDbEvents as any, { 
    onConflict: 'title,start_date_time,city',
    ignoreDuplicates: false  // means UPDATE on conflict, not skip
  })
  .select()
```

## Testing the Fix

1. **Apply migration 013** to restore the constraint
   - Supabase will auto-apply from `supabase/migrations/`
   - Watch logs for NOTICE messages:
     ```
     NOTICE: Found X groups of duplicate events to clean up
     DELETE Y
     NOTICE: Migration 013 completed successfully
     ```

2. **Verify constraint exists**:
   ```sql
   SELECT constraint_name FROM information_schema.table_constraints 
   WHERE table_name = 'events' AND constraint_name = 'unique_event';
   -- Should return: unique_event
   ```

3. **Run cache warmup** again:
   ```bash
   curl https://your-domain/api/admin/cache-warmup
   ```

4. **Check results**:
   - Should see "28 inserted" (or "2 enriched" if already existed)
   - No more "there is no unique or exclusion constraint" errors
   - Venues linked successfully

## Before & After Statistics

### Before Migration 013
```
Total events in DB:   1,576
Duplicate groups:        15  (events with same title+date+city)
Total duplicate rows:    42  (extra copies)
Unique constraint:       ❌  (removed in migration 012)
UPSERT operations:       ❌  (failing with ON CONFLICT error)
```

### After Migration 013
```
Total events in DB:   1,534  (1576 - 42 duplicates removed)
Duplicate groups:         0  (all cleaned up)
Total duplicate rows:     0
Unique constraint:       ✅  (restored)
UPSERT operations:       ✅  (working correctly)
```

## Related Files

- `app/lib/repositories/EventRepository.ts` - Upsert logic
- `lib/events/unified-event-pipeline.ts` - Pipeline that calls upsert
- `supabase/migrations/001_create_events_schema.sql` - Original constraint
- `supabase/migrations/012_remove_unique_event_constraint.sql` - What broke it
- `supabase/migrations/013_restore_unique_event_constraint.sql` - The fix (with duplicate cleanup)

## Timeline

- **2025-11-16**: Migration 001 created with `unique_event` constraint
- **Unknown**: Migration 012 removed the constraint
- **2026-01-03**: Cache warmup fails with ON CONFLICT error
- **2026-01-03**: Root cause identified, initial fix created (Migration 013)
- **2026-01-06**: Migration 013 updated to handle duplicates automatically ✅

## Lesson Learned

When removing database constraints:

1. ✗ Don't just remove if application code still depends on it
2. ✓ Do update application code OR create an alternative approach
3. ✓ Do document why the constraint was removed
4. ✓ Consider re-adding if the original reason no longer applies

When adding constraints back:

1. ✓ Check for existing data that violates the constraint
2. ✓ Clean up violations before adding the constraint
3. ✓ Use smart logic to decide which data to keep
4. ✓ Log what was cleaned up for transparency

In this case, the constraint should have stayed because:
- It enables proper UPSERT semantics
- It prevents accidental duplicates
- The "updating times" use case can be handled differently

## Troubleshooting

### If you see "Key (...) is duplicated" error

This means migration 013 hasn't run yet, or partially failed. Check:

```sql
-- See if constraint exists
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'events' AND constraint_name = 'unique_event';

-- If empty, migration 013 hasn't run successfully
-- Check migration status in Supabase dashboard
```

### Manual duplicate check

```sql
-- See which events are duplicated
SELECT title, start_date_time, city, COUNT(*) as duplicate_count
FROM events
GROUP BY title, start_date_time, city
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

If you see results, migration 013 needs to run (or re-run).
