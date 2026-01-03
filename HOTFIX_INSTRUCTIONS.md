# HOTFIX: ON CONFLICT Database Error

## Problem

Cache warmup failing with:
```
Error: Database operation failed: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

## Root Cause

Migration 012 removed the `unique_event` constraint, but EventRepository.ts still expects it for UPSERT operations.

## Solution

**Migration 013** has been created to restore the constraint.

### Steps to Apply

1. **Deploy the migration** (automatic via Supabase)
   - The migration file `013_restore_unique_event_constraint.sql` is in `supabase/migrations/`
   - Supabase will auto-detect and apply it

2. **Verify the migration was applied**
   ```sql
   -- Check that the constraint exists
   SELECT * FROM information_schema.table_constraints 
   WHERE table_name = 'events' AND constraint_name = 'unique_event';
   ```
   Should return one row.

3. **Run cache warmup again**
   ```bash
   curl https://your-domain/api/admin/cache-warmup
   ```

4. **Expected result**
   ```
   [info] [PIPELINE:SUMMARY] Events: XX inserted, Y enriched/updated, Z duplicates skipped, 0 failed
   ```

## What Changed

- **Before**: 28 events failed (all with same error)
- **After**: 28 events successfully inserted (or updated if already existed)

## Why This Fix Works

1. Restores the `(title, start_date_time, city)` unique constraint
2. Enables `ON CONFLICT` in UPSERT operations
3. Prevents actual duplicates at the database level
4. Maintains data integrity

## For Development

If you need to apply this locally:

```bash
# Reset local database
supa reset

# Or manually apply the migration
psql $DATABASE_URL < supabase/migrations/013_restore_unique_event_constraint.sql
```

## Monitoring

Watch for these indicators:
- ✅ Cache warmup completes without errors
- ✅ Event count increases during imports
- ✅ Duplicate events are updated, not skipped
- ✅ No more "ON CONFLICT" errors in logs

## Timeline

- Migration created: 2026-01-03
- Applied to production: [TBD]
- Verified working: [TBD]

See `docs/ON_CONFLICT_FIX.md` for detailed analysis.
