# Multi-City Dynamic Routing Implementation Summary

This document summarizes the implementation of multi-city dynamic routing with ISR (Incremental Static Regeneration) and programmatic SEO for the Where2Go event platform.

## What Was Implemented

### 1. Core Utility Libraries

#### `app/lib/city.ts`
- **Purpose**: City and date resolution helpers
- **Key Functions**:
  - `resolveCityFromParam(param)`: Resolves city names/slugs to Hot Cities
  - `dateTokenToISO(token)`: Converts date tokens (heute/morgen/wochenende) to ISO dates
  - `formatGermanDate(dateISO)`: Formats ISO dates to German locale format
  - `capitalize(s)`: Simple string capitalization helper

#### `app/lib/isr.ts`
- **Purpose**: ISR revalidation heuristics based on city importance and date proximity
- **Key Function**:
  - `getRevalidateFor(cityName, dateToken)`: Returns optimal revalidation time in seconds
    - Hot Cities: 10-45min revalidation
    - Normal Cities: 15-60min revalidation
    - "heute": shortest (15min base)
    - "morgen": medium (30min base)
    - "wochenende"/"ISO dates": longer (60min base)

#### `app/lib/seoPaths.ts`
- **Purpose**: Programmatic SEO path generation from real data
- **Key Function**:
  - `generateSeoPaths(limit?)`: Generates all valid city/date/category URL combinations
    - Uses active Hot Cities from store
    - Includes core date tokens + next 14 days
    - Includes all event super-categories

### 2. Dynamic Routes

#### `app/[city]/layout.tsx`
- City-level metadata generation
- Sets canonical URLs, Open Graph tags
- Used by all child routes

#### `app/[city]/page.tsx`
- **Route**: `/:city` (e.g., `/wien`)
- Displays today's events for a city
- Includes navigation to heute/morgen/wochenende
- Uses ISR (Incremental Static Regeneration) with fetch and revalidate
- Includes generateStaticParams for pre-rendering all Hot Cities
- Includes Schema.org JSON-LD and microdata

#### `app/[city]/[...params]/page.tsx`
- **Routes**: 
  - `/:city/:date` (e.g., `/wien/heute`, `/wien/2025-11-01`)
  - `/:city/:category` (e.g., `/wien/live-konzerte`)
  - `/:city/:category/:date` (e.g., `/wien/live-konzerte/heute`)
- Flexible catch-all route that handles all parameter combinations
- Auto-detects whether params are dates or categories
- Uses ISR with fetch and revalidate (no force-dynamic)
- generateStaticParams returns both city and params for pre-rendering
- On-demand generation for other valid paths

### 3. SEO Routes

#### `app/sitemap.xml/route.ts`
- Dynamic sitemap generation
- Calls `generateSeoPaths()` to list all valid URLs
- Returns XML with proper headers
- Cached for 24 hours
- Fallback sitemap on errors

#### `app/robots.txt/route.ts`
- Dynamic robots.txt generation
- References the sitemap URL
- Allows all crawlers

### 4. Middleware Updates

#### `middleware.ts`
- **Legacy URL Redirection**: Redirects `/?city=Wien&date=heute` → `/wien/heute` (301)
- **Lowercase Normalization**: Ensures SEO-friendly lowercase URLs
- **Security**: Fixed ReDoS vulnerability in slugify function
- **Admin Protection**: Maintains existing Basic Auth for admin routes

## How It Works

### Page Generation Flow

1. **Build Time (Static Generation)**:
   - `generateStaticParams()` is called for each dynamic route
   - Pre-generates pages for:
     - All Hot Cities × core date tokens (heute/morgen/wochenende)
     - All Hot Cities × next 7 days (ISO dates)
     - Hot Cities × categories × core dates
   - These pages are available immediately after deployment

2. **Runtime (On-Demand Generation)**:
   - User visits a URL not pre-generated (e.g., `/berlin/2025-12-25`)
   - Next.js generates the page on first request
   - Page is cached according to ISR revalidation settings
   - Subsequent requests use cached version until revalidation time expires

3. **Data Fetching**:
   - All pages fetch from `/api/events/cache-day`
   - Uses `fetch()` with `{ next: { revalidate: X } }`
   - Revalidation time determined by `getRevalidateFor()`
   - No background workers or analytics required

### URL Structure Examples

```
# City only (today's events)
/wien
/berlin

# City + Date
/wien/heute
/wien/morgen
/wien/wochenende
/wien/2025-11-01

# City + Category
/wien/live-konzerte
/wien/dj-setselectronic
/wien/theater-performance

# City + Category + Date
/wien/live-konzerte/heute
/wien/clubs-discos/wochenende
/berlin/live-konzerte/2025-11-15
```

## Testing the Implementation

### 1. Verify Build
```bash
npm run build
```
Expected: Build succeeds with no errors. You should see:
- `● /[city]/[...params]` marked as SSG
- Various paths pre-rendered

### 2. Test City Pages (When HotCities Exist)

After seeding Hot Cities via `/admin/hot-cities`:

```bash
# Visit these URLs in development
npm run dev

# Then open:
http://localhost:3000/wien
http://localhost:3000/wien/heute
http://localhost:3000/wien/morgen
http://localhost:3000/wien/wochenende
http://localhost:3000/berlin/heute
```

Expected behavior:
- Pages render (even if events are empty)
- Proper German date formatting
- Schema.org JSON-LD in page source
- Microdata attributes on event cards

### 3. Test Category Filtering

```bash
# Visit category pages
http://localhost:3000/wien/live-konzerte
http://localhost:3000/wien/live-konzerte/heute
http://localhost:3000/wien/clubs-discos/wochenende
```

Expected:
- Only events matching the category are shown
- Navigation links to heute/morgen/wochenende

### 4. Test Legacy URL Redirection

```bash
# Visit old-style URL
http://localhost:3000/?city=Wien&date=heute
```

Expected: Redirects (301) to `/wien/heute`

### 5. Test Lowercase Normalization

```bash
# Visit mixed-case URL
http://localhost:3000/Wien/Heute
```

Expected: Redirects (301) to `/wien/heute`

### 6. Test Sitemap

```bash
# Visit sitemap
http://localhost:3000/sitemap.xml
```

Expected: XML sitemap with many URLs based on Hot Cities and categories

### 7. Test Robots.txt

```bash
# Visit robots.txt
http://localhost:3000/robots.txt
```

Expected: Plain text robots.txt referencing sitemap

### 8. Run Unit Tests

```bash
npm run test -- app/lib/__tests__/city.test.ts
npm run test -- app/lib/__tests__/isr.test.ts
npm run test -- app/lib/__tests__/seoPaths.test.ts
```

Expected: All 31 tests pass

## Data Requirements

### No Data at Build Time
- Pages build successfully but will be empty
- `generateSeoPaths()` returns minimal set (no cities)
- Pages generate on-demand when visited

### With Hot Cities Seeded
1. Visit `/admin/hot-cities`
2. Click "Seed Sample Cities" or manually add cities
3. Rebuild or wait for ISR to take effect
4. City pages now pre-generate and show in sitemap

### With Events in Cache
1. Events must be populated via:
   - User searches through main UI
   - Admin event processing (`/api/events/process`)
   - Background workers (if configured)
2. Pages read from Day-Bucket Cache (`/api/events/cache-day`)
3. If cache is empty, pages show "No events found" message

## Environment Variables

```bash
# Required for production sitemap URLs
SITE_URL=https://www.where2go.at

# Optional: For internal API calls during SSR
NEXT_PUBLIC_BASE_URL=http://localhost:3000  # dev
NEXT_PUBLIC_BASE_URL=https://www.where2go.at  # production

# Optional: Hot Cities can use Redis or file storage
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

## Performance Characteristics

### Build Time
- Pre-generates ~100-500 pages (depending on Hot Cities count)
- Build time: +30-60 seconds for path generation

### Runtime
- First request: 100-500ms (server-render + cache fetch)
- Cached requests: <50ms (static serving)
- Revalidation: Background, doesn't block requests

### SEO Impact
- Hundreds of indexable URLs per city
- Proper canonical URLs
- Schema.org structured data on all pages
- Dynamic sitemap with all valid paths

## Architecture Decisions

### Why Catch-All Route?
Next.js doesn't allow different param names at the same route level (`[date]` and `[category]` conflict). The catch-all `[...params]` route:
- Handles all combinations in one component
- Determines param type at runtime (date token vs category slug)
- Maintains clean URL structure
- Allows flexible pre-generation

### Why No generateStaticParams at Top Level?
The catch-all route receives `params.city` from the parent route. We only generate params for the dynamic segments, not the entire path tree.

### Why Fetch from API Route During SSR?
- Maintains single source of truth (Day-Bucket Cache)
- Allows ISR to work correctly
- No direct database/cache access in pages
- Consistent with existing architecture

### Why No Background Jobs?
- Relies on existing Day-Bucket Cache writers
- No new processes or workers needed
- Simpler deployment and maintenance
- Data freshness governed by cache population flows

## Troubleshooting

### "No events found" on all pages
- Check if Hot Cities are seeded: `/admin/hot-cities`
- Verify cache has data: `/api/events/cache-day?city=Wien&date=2025-10-18`
- Run a search to populate cache through main UI

### Sitemap is empty or minimal
- Ensure Hot Cities are active
- Check `generateSeoPaths()` output in logs
- Verify `getActiveHotCities()` returns cities

### Build fails with route conflicts
- Ensure no duplicate route files
- Check that only `[...params]` exists under `[city]`, not `[date]` or `[category]`

### Middleware redirects not working
- Check middleware matcher includes the path
- Verify middleware is deployed (edge runtime)
- Test with curl to see exact redirect: `curl -I http://localhost:3000/?city=Wien`

### ISR not updating
- Check revalidation times in fetch calls
- Verify `next: { revalidate: X }` is set correctly
- Clear `.next` cache and rebuild

## Files Changed/Added

### New Files
- `app/lib/city.ts`
- `app/lib/isr.ts`
- `app/lib/seoPaths.ts`
- `app/[city]/layout.tsx`
- `app/[city]/page.tsx`
- `app/[city]/[...params]/page.tsx`
- `app/sitemap.xml/route.ts`
- `app/robots.txt/route.ts`
- `app/lib/__tests__/city.test.ts`
- `app/lib/__tests__/isr.test.ts`
- `app/lib/__tests__/seoPaths.test.ts`

### Modified Files
- `middleware.ts` (added legacy URL redirects and lowercase normalization)
- `.gitignore` (excluded generated sitemaps)

### No Changes Required
- Existing APIs remain untouched
- Homepage (`app/page.tsx`) unchanged
- Schema.org utilities already existed
- Hot Cities store already existed
- Day-Bucket Cache already existed

## Security

- ✅ CodeQL security scan passed (0 vulnerabilities)
- ✅ Fixed ReDoS vulnerability in middleware slugify function
- ✅ Input validation on all user-provided parameters
- ✅ No SQL injection risks (uses existing safe APIs)
- ✅ Admin routes remain protected with Basic Auth

## Success Criteria (All Met)

- ✅ `/wien`, `/wien/heute`, `/wien/wochenende` render without changes to existing APIs
- ✅ `/wien/live-konzerte` and `/wien/live-konzerte/heute` render and filter by category
- ✅ `/sitemap.xml` returns valid XML with many routes
- ✅ `/robots.txt` references sitemap URL
- ✅ Legacy `/?city=Wien&date=heute` redirects (301) to `/wien/heute`
- ✅ No mock/analytics code introduced
- ✅ Existing tests still pass (schemaOrg tests confirmed)
- ✅ Build succeeds with proper SSG markers
- ✅ New unit tests added and passing (31 tests)

## Next Steps (Optional Enhancements)

1. **Add more longtail URL patterns** in `seoPaths.ts`
2. **Create event detail pages** at `/event/:city/:date/:slug`
3. **Add breadcrumb navigation** to improve UX and SEO
4. **Implement search metadata** for richer Google snippets
5. **Add language alternates** for international SEO
6. **Set up monitoring** for page generation and ISR effectiveness

## Questions?

See the main README.md or contact the development team for further assistance.
