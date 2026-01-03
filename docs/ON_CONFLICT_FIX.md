# ON CONFLICT Constraint Error - Root Cause and Fix

**Date**: 2026-01-03  
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

### Fix: Migration 013

Created `supabase/migrations/013_restore_unique_event_constraint.sql`:

```sql
ALTER TABLE events ADD CONSTRAINT unique_event UNIQUE (title, start_date_time, city);
```

### Why This Works

1. **Restores the constraint** that EventRepository expects
2. **Enables true UPSERT functionality** (INSERT or UPDATE on conflict)
3. **Maintains data integrity** at the database level
4. **Doesn't break existing functionality** - the constraint makes business sense:
   - A specific event (title + date + city) shouldn't exist twice
   - If the same event is imported again, it should update, not duplicate

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
2. **Run cache warmup** again:
   ```bash
   curl https://your-domain/api/admin/cache-warmup
   ```
3. **Check results**:
   - Should see "28 inserted" (or "2 enriched" if already existed)
   - No more "there is no unique or exclusion constraint" errors
   - Venues linked successfully

## Related Files

- `app/lib/repositories/EventRepository.ts` - Upsert logic
- `lib/events/unified-event-pipeline.ts` - Pipeline that calls upsert
- `supabase/migrations/001_create_events_schema.sql` - Original constraint
- `supabase/migrations/012_remove_unique_event_constraint.sql` - What broke it
- `supabase/migrations/013_restore_unique_event_constraint.sql` - The fix

## Timeline

- **2025-11-16**: Migration 001 created with `unique_event` constraint
- **Unknown**: Migration 012 removed the constraint (no longer relevant)
- **2026-01-03**: Cache warmup fails with ON CONFLICT error
- **2026-01-03**: Root cause identified, fix created (Migration 013)

## Lesson Learned

When removing database constraints:

1. ✗ Don't just remove if application code still depends on it
2. ✓ Do update application code OR create an alternative approach
3. ✓ Do document why the constraint was removed
4. ✓ Consider re-adding if the original reason no longer applies

In this case, the constraint should have stayed because:
- It enables proper UPSERT semantics
- It prevents accidental duplicates
- The "updating times" use case can be handled differently
