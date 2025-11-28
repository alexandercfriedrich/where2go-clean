# Upstash Event Slug Fix

## Problem

**404 errors on event detail pages when clicking events on www.where2go.at main page**

### Symptoms
- Events on main page (www.where2go.at) → Click event link → 404 Not Found
- Events on Discovery page (/discover) → Click event link → Works ✅

### Root Cause

**Events in Upstash Redis cache are missing the `slug` property!**

**Main Page (www.where2go.at):**
1. Events loaded from **Upstash Redis** (for performance)
2. Upstash events have NO `slug` property 
3. EventCard generates URL using `generateEventSlug()` → **Missing 6-char suffix**
4. Event detail page expects: `/events/wien/event-title-2024-11-28-abc123`
5. Generated URL is: `/events/wien/event-title-2024-11-28` (missing `abc123`)
6. Result: ❌ **404 Not Found**

**Discovery Page (/discover):**
1. Events loaded directly from **Supabase**
2. Supabase events HAVE `slug` property with full slug including 6-char suffix
3. EventCard uses `ev.slug` directly
4. Result: ✅ **Works perfectly**

## Solution

### Files to Update

1. **`lib/events/unified-event-pipeline.ts`**
   - Line 327-330 (Cache sync section)
   - Line 442-454 (`normalizedToEventData` function)
   
### Changes Required

#### 1. Update `normalizedToEventData` Function Signature

**Before:**
```typescript
function normalizedToEventData(event: NormalizedEvent): EventData {
  // ... existing code ...
  return {
    title: event.title,
    category: event.category,
    date: date,
    time: time,
    venue: event.venue_name,
    price: event.price_info || '',
    website: event.website_url || '',
    description: event.description || undefined,
    address: event.venue_address || undefined,
    city: event.venue_city,
    source: event.source
    // ❌ Missing: slug property!
  };
}
```

**After:**
```typescript
/**
 * Convert normalized event to EventData format for deduplication and caching
 * 
 * @param event Normalized event data
 * @param slug Optional event slug (for cache sync)
 */
function normalizedToEventData(event: NormalizedEvent, slug?: string): EventData {
  // Extract date and time from ISO timestamp
  const dateMatch = event.start_date_time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  const date = dateMatch ? dateMatch[1] : event.start_date_time.split('T')[0] || '';
  const time = dateMatch ? dateMatch[2] : '';

  return {
    title: event.title,
    category: event.category,
    date: date,
    time: time,
    venue: event.venue_name,
    price: event.price_info || '',
    website: event.website_url || '',
    description: event.description || undefined,
    address: event.venue_address || undefined,
    city: event.venue_city,
    source: event.source,
    slug: slug  // ✅ CRITICAL FIX: Include slug property for cache consistency
  };
}
```

#### 2. Pass `eventSlug` When Creating Cache Data

**Before (Line 327-330):**
```typescript
if (syncToCache) {
  const eventDataForCache = normalizedToEventData(event);
  // ...
}
```

**After:**
```typescript
if (syncToCache) {
  // CRITICAL FIX: Include eventSlug in cached event data
  const eventDataForCache = normalizedToEventData(event, eventSlug);
  const eventDate = eventDataForCache.date;
  if (eventDate) {
    if (!eventsForCache.has(eventDate)) {
      eventsForCache.set(eventDate, []);
    }
    eventsForCache.get(eventDate)!.push(eventDataForCache);
  }
}
```

### Testing

1. **Clear Upstash cache** (to remove old events without slugs)
2. **Run wien.info import** to populate cache with new events containing slugs
3. **Verify main page events** have correct URLs with 6-char suffix
4. **Click event links** on main page → should work ✅

### Impact

✅ **Fixed:** 404 errors on main page event links
✅ **Improved:** Cache consistency between Upstash and Supabase
✅ **Benefit:** Events from cache now match events from database

### Deployment

1. Merge this PR
2. Deploy to production
3. Run `/api/admin/cache-warmup` to refresh Upstash with correct slugs
4. Test event links on www.where2go.at

## Related Files

- `app/components/EventCard.tsx` - Uses `ev.slug` to generate event URLs
- `app/lib/cache.ts` - Upstash day-bucket cache implementation
- `lib/events/unified-event-pipeline.ts` - Event processing pipeline with cache sync
