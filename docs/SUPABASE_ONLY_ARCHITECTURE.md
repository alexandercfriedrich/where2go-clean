# Supabase-Only Event Architecture

## Overview

As of November 2024, the event infrastructure has been simplified to use **Supabase as the single source of truth** for all event data. Upstash Redis is now used **only for AI search result caching**.

## Benefits

- **100% consistent event links** - Slugs always come from Supabase
- **Single event source** - No sync/mismatch/race condition issues
- **Simpler architecture** - Easier to maintain and debug
- **Cost-effective** - Reduced Upstash usage
- **Supabase performance** - Built-in caching at database level

## Architecture

### Before (Hybrid Cache)
```
User Request → Upstash Cache → (fallback) → Supabase
              ↓
        Cache miss → AI Search → Upstash → Supabase
```

Problems:
- Cache could get out of sync with database
- Events in cache missing `slug` property → 404 errors
- Complex cache invalidation logic
- Race conditions between cache and DB

### After (Supabase-Only)
```
User Request → Supabase (direct)
                    ↓
AI Search → Results cached in Upstash (for performance only)
```

Benefits:
- Events always have consistent slugs from database
- No cache invalidation needed for event display
- AI search remains fast with Upstash caching

## Implementation Details

### Pages Updated to Use Supabase Directly

1. **`/app/[city]/page.tsx`**
   - Uses `EventRepository.getEvents()` for city pages

2. **`/app/event/[...params]/page.tsx`**
   - Uses `EventRepository.getEvents()` for legacy event URLs

3. **`/app/[city]/guides/[category]/page.tsx`**
   - Uses `EventRepository.getEvents()` for venue events

4. **`/app/lib/smartEventFetcher.ts`**
   - Phase 1 now loads from Supabase, not Upstash cache

5. **`/app/api/events/cache-day/route.ts`**
   - Uses `EventRepository.getEvents()` instead of day-bucket cache

### Event Pipeline Changes

The unified event pipeline (`/lib/events/unified-event-pipeline.ts`) has been updated:
- Removed Step 5 (Upstash cache sync)
- Events are stored only in Supabase
- `syncToCache` option is now deprecated (ignored)

### What Still Uses Upstash

1. **AI Search Results** (`/api/search`)
   - Cached search results for performance
   - TTL-based expiration

2. **Hot Cities Configuration**
   - City-specific settings and venues
   - Read-only configuration data

## Migration Notes

### For Developers

- No action needed for existing event pages
- All event URLs will work correctly after deployment
- Cache warmup scripts are no longer necessary for events

### For Operators

- No need to run `/api/admin/cache-warmup` for events
- Events appear immediately after import (no cache delay)
- Upstash costs will decrease (fewer write operations)

## EventRepository API

```typescript
import { EventRepository } from '@/lib/repositories/EventRepository';

// Get events for a city and date
const events = await EventRepository.getEvents({
  city: 'Wien',
  date: '2024-11-28',
  category: 'Clubs & Nachtleben', // optional
  limit: 100
});

// Search events
const searchResults = await EventRepository.searchEvents({
  city: 'Wien',
  searchTerm: 'konzert',
  limit: 50
});
```

## Related Files

- `/lib/repositories/EventRepository.ts` - Main event data access
- `/lib/events/unified-event-pipeline.ts` - Event import pipeline
- `/lib/events/queries.ts` - Homepage Supabase queries
- `/app/lib/smartEventFetcher.ts` - Smart event fetcher for AI search
