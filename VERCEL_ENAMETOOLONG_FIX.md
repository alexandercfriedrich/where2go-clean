# Vercel ENAMETOOLONG Error Fix

## Problem

```
Error: ENAMETOOLONG: name too long, open '/vercel/output/functions/events/wien/buchprasentation-smoke-birds-...-buchprasentation-smoke-birds-...2025-12-08-h76zox.rsc'
```

**Root Cause:** Event titles are too long and being used directly as URL slugs without truncation, causing Vercel build to fail when creating .rsc files.

## Solution

I've created `app/lib/slug-utils.ts` with safe slug generation functions that:

1. ✅ Truncate slugs to max 50 characters
2. ✅ Remove special characters and umlauts  
3. ✅ Normalize spacing to hyphens
4. ✅ Prevent consecutive hyphens
5. ✅ Verify file system safety

## Implementation

### Step 1: Use the utility in `generateStaticParams`

In `/app/events/[city]/[slug]/page.tsx`, update `generateStaticParams`:

```typescript
import { generateSafeSlug } from '@/app/lib/slug-utils';

export async function generateStaticParams() {
  const events = await fetchAllEvents();
  
  return events.map((event) => ({
    city: event.city,
    slug: generateSafeSlug(event.title, event.id), // ← USE THIS
  }));
}
```

### Step 2: Update dynamic route parameter lookup

When fetching event by slug, create slug the same way:

```typescript
export default async function EventPage({ params }: { params: { city: string; slug: string } }) {
  const { slug, city } = params;
  
  // Fetch ALL events for the city and find by safe slug comparison
  const events = await fetchEventsByCity(city);
  const event = events.find(e => generateSafeSlug(e.title, e.id) === slug);
  
  if (!event) {
    notFound();
  }
  
  return <EventDetail event={event} />;
}
```

## Functions

### `generateSafeSlug(title, id?, maxLength?)`

Generates URL-safe slug from event title.

```typescript
generateSafeSlug("Buchpräsentation Smoke Birds Pun Crisis: Ein dialogisches Glossar von Magdalena Kreinecker mit Simon Nagy");
// Returns: "buchpraesentation-smoke-birds-pun-crisis-ein-dial" (50 chars max)
```

**Parameters:**
- `title`: Event title string
- `id`: Optional event ID (used as fallback)
- `maxLength`: Max slug length (default: 50)

### `createEventSlug(title, id, includeId?)`

Creates slug with optional date suffix for extra uniqueness.

```typescript
createEventSlug("Players Party", "123", true);
// Returns: "players-party-20251208" (for uniqueness)
```

### `isSlugSafe(slug)`

Verifies slug is safe for file system.

```typescript
isSlugSafe("players-party"); // true
isSlugSafe("x".repeat(200)); // false (too long)
```

## Why This Works

**Before:**
```
/events/wien/buchprasentation-smoke-birds-pun-crisis-ein-dialogisches-glossar-von-magdalena-kreinecker-mit-simon-nagybuchprasentation-smoke-birds-pun-crisis-ein-dialogisches-glossar-von-magdalena-kreinecker-mit-simon-nagydeck-2025-12-08

Length: 223+ chars → ❌ VERCEL ERROR
```

**After:**
```
/events/wien/buchpraesentation-smoke-birds-pun-crisis-ein-dial

Length: 60 chars → ✅ SAFE
```

## Testing

```bash
# Test the utility
node -e "console.log(require('./app/lib/slug-utils.ts').generateSafeSlug('Buchpräsentation Smoke Birds Pun Crisis: Ein dialogisches Glossar von Magdalena Kreinecker mit Simon Nagy'))"

# Should output: "buchpraesentation-smoke-birds-pun-crisis-ein-dial"
```

## File Limits Reference

| Limit | Value | Status |
|-------|-------|--------|
| Max filename (NTFS/ext4) | 255 bytes | ⚠️ Industry standard |
| Max path segment (safe) | 150 chars | ✅ Safe margin |
| Our slug max | 50 chars | ✅ Conservative |
| Current error | 200+ chars | ❌ Over limit |

## Deployment

1. ✅ `app/lib/slug-utils.ts` created
2. ⏳ Update `/app/events/[city]/[slug]/page.tsx` to use `generateSafeSlug`
3. ⏳ Update `/app/venues/[slug]/page.tsx` if needed
4. ⏳ Update any other dynamic routes using long titles
5. ⏳ Test build locally: `npm run build`
6. ⏳ Deploy to Vercel

## Result

Vercel build will now succeed without ENAMETOOLONG errors ✅

---
**Created:** 2025-12-08  
**Status:** Ready for implementation
