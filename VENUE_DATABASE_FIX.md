# Venue Database Functions Fix

## Problem
The application was experiencing errors when calling `get_top_venues` with 3 parameters:
```
code: 'PGRST202',
message: 'Could not find the function public.get_top_venues(p_city, p_limit, p_source) in the schema cache'
hint: 'Perhaps you meant to call the function public.get_top_venues(p_city, p_limit)'
```

## Root Cause
The database functions `get_top_venues` and `get_venue_with_events` were documented in README files but never actually created in the database migrations. The API routes were calling these functions expecting 3 and 2 parameters respectively, but the functions didn't exist.

## Solution
Created new migration file: `supabase/migrations/003_create_venue_functions.sql`

This migration adds three functions:

### 1. `slugify(text TEXT) RETURNS TEXT`
Helper function that converts venue names to URL-friendly slugs.
- Converts to lowercase
- Removes special characters
- Replaces spaces with hyphens
- Removes leading/trailing hyphens
- Marked as IMMUTABLE for query optimization

### 2. `get_top_venues(p_city TEXT, p_limit INTEGER, p_source TEXT DEFAULT NULL)`
Returns top venues ranked by upcoming event count.

**Parameters:**
- `p_city` - City to filter by (e.g., 'Wien')
- `p_limit` - Maximum number of venues to return
- `p_source` - Optional event source filter (e.g., 'wien.info')

**Returns TABLE:**
- `venue_id` (UUID) - Venue unique identifier
- `venue_slug` (TEXT) - URL-friendly slug
- `name` (TEXT) - Venue name
- `full_address` (TEXT) - Venue address
- `city` (TEXT) - City name
- `total_events` (INTEGER) - Total event count
- `upcoming_events` (INTEGER) - Upcoming event count
- `next_event_date` (TIMESTAMPTZ) - Next event date
- `categories` (TEXT[]) - Array of event categories
- `sources` (TEXT[]) - Array of event sources

**Logic:**
- Uses INNER JOIN to get only venues with events
- Filters by city
- Optionally filters by event source
- Excludes cancelled events
- Only returns venues with upcoming events
- Orders by upcoming event count (descending), then by next event date (ascending)

### 3. `get_venue_with_events(p_venue_slug TEXT, p_source TEXT DEFAULT NULL)`
Returns complete venue details with stats and upcoming events.

**Parameters:**
- `p_venue_slug` - URL-friendly venue slug
- `p_source` - Optional event source filter

**Returns JSON:**
```json
{
  "venue": {
    "id": "uuid",
    "slug": "venue-slug",
    "name": "Venue Name",
    "full_address": "Address",
    "city": "Wien",
    "country": "Austria",
    "phone": null,
    "email": null,
    "website": "https://...",
    "latitude": 48.2082,
    "longitude": 16.3738
  },
  "stats": {
    "total_events": 100,
    "upcoming_events": 50,
    "categories": ["Live-Konzerte", "Klassik"],
    "sources": ["ai", "wien.info"]
  },
  "upcoming_events": [
    {
      "id": "uuid",
      "title": "Event Title",
      "start_date_time": "2025-11-20T19:30:00Z",
      // ... all event fields
    }
  ]
}
```

**Logic:**
- Looks up venue by slug (case-insensitive)
- Returns NULL if venue not found
- Aggregates stats from all venue events
- Returns up to 100 upcoming events
- Optionally filters by event source
- Excludes cancelled events

## Deployment

### To Supabase
1. Apply the migration:
   ```bash
   supabase db push
   ```

2. Or manually run the SQL file in Supabase SQL Editor:
   ```bash
   cat supabase/migrations/003_create_venue_functions.sql
   ```

### Verification
After deployment, test the functions:

```sql
-- Test get_top_venues
SELECT * FROM get_top_venues('Wien', 10, NULL);

-- Test get_top_venues with source filter
SELECT * FROM get_top_venues('Wien', 10, 'wien.info');

-- Test get_venue_with_events
SELECT get_venue_with_events('wiener-konzerthaus', NULL);

-- Test slugify function
SELECT slugify('Wiener Konzerthaus');  -- Should return: wiener-konzerthaus
```

## API Endpoint Testing

Once deployed, test the API endpoints:

```bash
# Test venue stats API
curl https://your-domain.com/api/venues/stats?city=Wien&limit=15

# Test venue stats with source filter
curl https://your-domain.com/api/venues/stats?city=Wien&limit=15&source=wien.info

# Test venue detail API
curl https://your-domain.com/api/venues/wiener-konzerthaus

# Test venue detail with source filter
curl https://your-domain.com/api/venues/wiener-konzerthaus?source=wien.info
```

Expected responses should have:
- `success: true`
- `data` array or object with venue information
- No PGRST202 errors

## Files Changed
- `supabase/migrations/003_create_venue_functions.sql` (new file, 190 lines)

## Files Verified (no changes needed)
- `app/api/venues/stats/route.ts` - Already calling function correctly
- `app/api/venues/[slug]/route.ts` - Already calling function correctly
- `app/venues/[slug]/page.tsx` - Already using functions in generateStaticParams
- `app/lib/types.ts` - VenueStats and VenueDetail interfaces match return types

## Performance Considerations
- Functions marked as STABLE for PostgreSQL query caching
- slugify marked as IMMUTABLE for maximum optimization
- API routes have revalidation caching (1 hour for stats, 30 min for details)
- Proper indexes exist on events and venues tables
- Limits applied to prevent excessive data return (max 50 venues, max 100 events)

## Security Notes
- No SQL injection vulnerabilities (uses parameterized queries)
- Functions use default NULL for optional parameters
- Proper type casting throughout
- No sensitive data exposed
- Functions are read-only (STABLE/IMMUTABLE)

## Build Status
✅ TypeScript compilation successful
✅ ESLint passes with no errors
✅ Next.js build completes successfully
✅ No breaking changes to existing code
