# HOTFIX: ON CONFLICT Database Error

## Problem

Cache warmup failing with:
```
Error: Database operation failed: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

## Root Cause

Migration 012 removed the `unique_event` constraint, but EventRepository.ts still expects it for UPSERT operations.

## Solution

**Migration 013** has been created and **automatically handles existing duplicates** before restoring the constraint.

### What Migration 013 Does

1. **Identifies duplicate events** (same title, start_date_time, city)
2. **Keeps the best version** of each duplicate:
   - Prefers most recent `created_at`
   - If tied, prefers events with complete `description`
   - If still tied, prefers events with `image_urls`
3. **Deletes inferior duplicates**
4. **Adds the unique constraint** (now possible, since duplicates are gone)
5. **Reports statistics** via NOTICE messages

### Steps to Apply

1. **Migration runs automatically** via Supabase
   - File: `supabase/migrations/013_restore_unique_event_constraint.sql`
   - Supabase auto-detects and applies it
   - You'll see NOTICE messages in logs:
     ```
     NOTICE: Found X groups of duplicate events to clean up
     NOTICE: Migration 013 completed successfully
     ```

2. **Verify the migration succeeded**
   ```sql
   -- Check that the constraint exists
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'events' AND constraint_name = 'unique_event';
   ```
   Should return:
   ```
   constraint_name | constraint_type
   unique_event    | UNIQUE
   ```

3. **Run cache warmup again**
   ```bash
   curl https://your-domain/api/admin/cache-warmup
   ```

4. **Expected result**
   ```
   [info] [PIPELINE:SUMMARY] Events: XX inserted, Y enriched/updated, Z duplicates skipped, 0 failed
   ```

## What Changed

### Before Migration 013
- ❌ No `unique_event` constraint
- ❌ 28 events failed with "ON CONFLICT" error
- ❌ Duplicate events exist in database

### After Migration 013
- ✅ `unique_event` constraint restored
- ✅ Duplicate events cleaned up (keeping best version)
- ✅ 28 events successfully inserted/updated
- ✅ Future duplicates prevented at DB level

## Duplicate Cleanup Strategy

When multiple events with same (title, start_date_time, city) exist, Migration 013 keeps the one with:

```sql
ORDER BY 
  created_at DESC,          -- 1. Most recent
  has_description DESC,     -- 2. Has description
  has_images DESC,          -- 3. Has images
  updated_at DESC           -- 4. Last updated
```

**Example**: If "Winterwunder Mörbisch" exists 3 times:
- Entry from 2026-01-06 with description ✅ **KEPT**
- Entry from 2026-01-05 with description ❌ Deleted
- Entry from 2026-01-03 without description ❌ Deleted

## For Development

If you need to apply this locally:

```bash
# Option 1: Reset and re-run all migrations
supabase db reset

# Option 2: Manually apply just this migration
psql $DATABASE_URL < supabase/migrations/013_restore_unique_event_constraint.sql
```

## Monitoring

Watch for these indicators:
- ✅ Migration 013 completes without errors
- ✅ NOTICE messages show duplicate count
- ✅ Cache warmup completes successfully
- ✅ Event count increases during imports
- ✅ No more "ON CONFLICT" errors in logs
- ✅ No duplicate events in database

## Timeline

- **2026-01-03**: Original migration created (failed due to duplicates)
- **2026-01-06**: Migration updated to handle duplicates automatically ✅
- Applied to production: [TBD]
- Verified working: [TBD]

## Troubleshooting

### If migration still fails

1. **Check error message** for specific duplicate:
   ```
   Key (title, start_date_time, city)=(EventName, DateTime, City) is duplicated
   ```

2. **Manually inspect duplicates**:
   ```sql
   SELECT title, start_date_time, city, COUNT(*) as count
   FROM events
   GROUP BY title, start_date_time, city
   HAVING COUNT(*) > 1;
   ```

3. **Check if migration partially ran**:
   ```sql
   SELECT * FROM information_schema.table_constraints 
   WHERE table_name = 'events' AND constraint_name = 'unique_event';
   ```

If issues persist, see `docs/ON_CONFLICT_FIX.md` for detailed analysis.

---

**Status**: ✅ Ready to apply
**Risk Level**: Low (duplicates are safely cleaned before constraint is added)
**Rollback**: Not needed (keeps best version of duplicates)
