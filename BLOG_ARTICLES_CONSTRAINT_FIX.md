# Blog Articles Unique Constraint Fix

## Issue Summary

**Date**: 2025-12-15  
**Error**: `duplicate key value violates unique constraint "blog_articles_city_category_key"`

### Problem

The production database had an incorrect UNIQUE constraint on `(city, category)` that was not present in any migration file. This constraint prevented the creation of multiple blog articles for the same city-category combination, which contradicts the intended design.

### Error Details

```
Error creating blog article: {
  code: '23505',
  details: 'Key (city, category)=(wien, Clubs & Nachtleben) already exists.',
  hint: null,
  message: 'duplicate key value violates unique constraint "blog_articles_city_category_key"'
}
```

Note: The `&amp;` in the error message is HTML encoding in the log output. The actual data uses the correct `&` character.

## Root Cause

The database constraint `blog_articles_city_category_key UNIQUE (city, category)` existed in production but was not defined in any migration file. This suggests it was added manually at some point.

### Intended Design

According to the codebase design:

1. **Multiple articles ARE allowed** per city-category combination
2. **Articles are differentiated by slug** which includes the title: `{city}-{category}-{normalized-title}`
3. **The correct constraint** is `unique_city_category_slug UNIQUE (city, category, slug)`
4. **Upsert behavior**: If an article with the same title exists, it updates; otherwise, it creates new

### Evidence

From `app/api/admin/blog-articles/route.ts` (lines 191-199):
```typescript
// Check if article exists
const { data: existingArticle } = await supabaseAdmin
  .from('blog_articles')
  .select('id, generated_at')
  .eq('city', payload.city.toLowerCase())
  .eq('category', payload.category)
  .eq('slug', slug)  // <- Checking by slug too!
  .maybeSingle();
```

From `BLOG_ARTICLES_QUICKSTART.md` (line 249):
```
Slug Format: {city}-{category}-{normalized-title}
Example: wien-live-konzerte-die-besten-konzerte-im-dezember
```

## Solution

Created migration `011_fix_blog_articles_unique_constraint.sql` that:

1. **Removes** the incorrect `blog_articles_city_category_key` constraint
2. **Ensures** the correct `unique_city_category_slug` constraint exists
3. **Uses idempotent SQL** so it's safe to run multiple times

### Migration File

```sql
-- Drop the incorrect constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'blog_articles_city_category_key'
  ) THEN
    ALTER TABLE blog_articles DROP CONSTRAINT blog_articles_city_category_key;
    RAISE NOTICE 'Dropped incorrect constraint: blog_articles_city_category_key';
  END IF;
END $$;

-- Ensure the correct constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_city_category_slug'
  ) THEN
    ALTER TABLE blog_articles ADD CONSTRAINT unique_city_category_slug UNIQUE (city, category, slug);
    RAISE NOTICE 'Added correct constraint: unique_city_category_slug';
  END IF;
END $$;
```

## Deployment Instructions

### Using Supabase CLI

```bash
supabase db push
```

### Manual Deployment

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/011_fix_blog_articles_unique_constraint.sql`
3. Paste and execute the SQL
4. Verify output shows constraint was dropped/added

### Verification

After applying the migration, verify the constraints:

```sql
-- Check current constraints on blog_articles table
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'blog_articles'::regclass
  AND contype = 'u';  -- Only unique constraints
```

Expected result:
- ✅ `unique_city_category_slug` on `(city, category, slug)`
- ❌ No `blog_articles_city_category_key` constraint

## Impact

After this fix:

1. ✅ Multiple articles can be created for the same city-category
2. ✅ Different titles generate different slugs → different articles
3. ✅ Same title generates same slug → updates existing article
4. ✅ Daily cron job can create fresh articles without conflicts
5. ✅ Make.com automation will work correctly

## Testing

After deployment, test with:

```bash
# Create first article for "Clubs & Nachtleben"
curl -X POST https://your-domain.com/api/admin/blog-articles \
  -H "X-API-Secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "wien",
    "category": "Clubs & Nachtleben",
    "title": "Die besten Clubs in Wien",
    "content": "<p>First article</p>"
  }'

# Create second article for same category but different title
curl -X POST https://your-domain.com/api/admin/blog-articles \
  -H "X-API-Secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "wien",
    "category": "Clubs & Nachtleben",
    "title": "Nachtleben Guide für Wien",
    "content": "<p>Second article</p>"
  }'

# Both should succeed! ✅
```

## Related Files

- **Migration**: `supabase/migrations/011_fix_blog_articles_unique_constraint.sql`
- **API Route**: `app/api/admin/blog-articles/route.ts`
- **Original Schema**: `supabase/migrations/009_create_blog_articles_table.sql`
- **Cron Job**: `app/api/cron/generate-blog-articles/route.ts`

## Future Prevention

To prevent this issue in the future:

1. ✅ All schema changes MUST be in migration files
2. ✅ Never apply manual constraints in production
3. ✅ Document all constraint decisions in migration comments
4. ✅ Test migrations locally before production deployment
5. ✅ Verify production schema matches migration files

## Support

If you encounter issues after applying this fix:

1. Check Supabase logs for constraint errors
2. Verify the migration was applied successfully
3. Check for any lingering duplicate data that needs cleanup
4. Review the blog articles API logs for detailed error messages
