# Static Pages Supabase Migration

## Overview
This migration moves static pages management from Redis to Supabase, providing a more robust and persistent storage solution for content managed through the admin interface.

## Migration File
- **Location**: `supabase/migrations/010_create_static_pages_table.sql`
- **Created**: 2025-12-10

## What Changed

### Before
- Static pages were stored in Redis under key `where2go:static-pages:v1`
- Fallback storage in `data/static-pages.json` file
- No persistent database storage

### After
- Static pages are stored in Supabase `static_pages` table
- Full CRUD operations through Supabase API
- Automatic timestamp management
- Better query performance with indexes

## Database Schema

```sql
CREATE TABLE static_pages (
  id VARCHAR(100) PRIMARY KEY,           -- e.g., 'seo-footer', 'impressum'
  title VARCHAR(500) NOT NULL,           -- Display title
  content TEXT NOT NULL,                 -- HTML from React-Quill editor
  path VARCHAR(500) NOT NULL,            -- URL path e.g., '/', '/impressum'
  created_at TIMESTAMPTZ NOT NULL,       -- Auto-set on creation
  updated_at TIMESTAMPTZ NOT NULL,       -- Auto-updated via trigger
  CONSTRAINT unique_static_page_path UNIQUE (path)
);
```

## Indexes
- `idx_static_pages_path` - Fast lookups by URL path
- `idx_static_pages_updated_at` - Ordered by last update

## How to Apply Migration

### Option 1: Via Supabase Dashboard (Recommended)
1. Log in to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open the file `supabase/migrations/010_create_static_pages_table.sql`
4. Copy and paste the contents into the SQL Editor
5. Click "Run" to execute the migration

### Option 2: Via Supabase CLI
```bash
# Make sure you have Supabase CLI installed
npm install -g supabase

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### Option 3: Manual Execution
Connect to your Supabase database using your preferred PostgreSQL client and execute the SQL file.

## Data Migration

The migration automatically imports the existing SEO footer content from `data/static-pages.json`:
- Page ID: `seo-footer`
- Path: `/`
- Content: Full HTML from the JSON file

Other static pages (datenschutz, agb, impressum, etc.) don't have content yet and can be added through the admin interface.

## API Changes

### Admin API (`/api/admin/static-pages`)
- `GET` - Lists all static pages from Supabase
- `POST` - Creates/updates a static page in Supabase
- `DELETE` - Removes a static page from Supabase

### Public API (`/api/static-pages/[id]`)
- `GET` - Fetches a specific static page by ID from Supabase

## Admin UI
The admin interface at `/admin/static-pages` continues to work without changes:
- View all static pages
- Edit content with React-Quill rich text editor
- Save changes to Supabase

## Static Pages Managed
1. **seo-footer** - SEO content for homepage footer (/)
2. **datenschutz** - Privacy policy (/datenschutz)
3. **agb** - Terms and conditions (/agb)
4. **impressum** - Legal notice (/impressum)
5. **ueber-uns** - About us (/ueber-uns)
6. **kontakt** - Contact page (/kontakt)
7. **premium** - Premium features (/premium)

## Rollback
If you need to rollback this migration:

```sql
DROP TABLE IF EXISTS static_pages CASCADE;
DROP FUNCTION IF EXISTS update_static_pages_updated_at() CASCADE;
```

Then revert the code changes to use Redis again.

## Verification

After applying the migration, verify it worked:

1. Check table exists:
```sql
SELECT * FROM static_pages;
```

2. Test the admin interface:
   - Navigate to `/admin/static-pages`
   - Edit a page
   - Save and verify it persists

3. Check the API:
```bash
curl https://your-domain.com/api/static-pages/seo-footer
```

## Notes
- The migration uses `ON CONFLICT (id) DO NOTHING` to avoid duplicate insertions
- The `updated_at` field is automatically managed by a database trigger
- All content is stored as HTML (from React-Quill editor)
- Path must start with `/` (validated in API)

## Support
If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify environment variables are set correctly
3. Ensure service role key has proper permissions
4. Check browser console for frontend errors
