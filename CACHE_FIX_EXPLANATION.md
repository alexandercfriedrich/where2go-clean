# Cache Fix: Empty Category Results

## Problem
When searching for event categories, if a category returned NO events (empty array), the result was NOT cached. This meant:

1. First search for "RareCategory" → API call made → returns 0 events → **NOT cached**
2. Second search for "RareCategory" → Cache miss → **API call made AGAIN** → returns 0 events → **NOT cached**
3. Third search for "RareCategory" → Cache miss → **API call made AGAIN** → ...and so on

This caused unnecessary repeated expensive API calls for categories that consistently have no events.

## Solution
Modified the cache system to cache ALL search results, including empty arrays:

### Before
```typescript
// Only cached if events.length > 0
if (Array.isArray(events) && events.length > 0) {
  cachedEvents[category] = events;
  cacheInfo[category] = { fromCache: true, eventCount: events.length };
} else {
  missingCategories.push(category);
}

// Only cached categories that had events
if (newEvents.length > 0) {
  for (const cat of Object.keys(grouped)) {
    await eventsCache.setEventsByCategory(city, date, cat, grouped[cat], ttlSeconds);
  }
}
```

### After
```typescript
// Caches ANY array, including empty ones
if (Array.isArray(events)) {
  cachedEvents[category] = events;
  cacheInfo[category] = { fromCache: true, eventCount: events.length };
} else {
  missingCategories.push(category);
}

// Caches ALL searched categories, even those with no events
if (missingCategories.length > 0) {
  for (const cat of missingCategories) {
    const eventsForCategory = grouped[cat] || []; // Empty array if no events
    await eventsCache.setEventsByCategory(city, date, cat, eventsForCategory, ttlSeconds);
  }
}
```

## Impact
Now when searching for the same category repeatedly:

1. First search for "RareCategory" → API call made → returns 0 events → **CACHED as []**
2. Second search for "RareCategory" → **Cache HIT** → returns 0 events immediately → **No API call**
3. Third search for "RareCategory" → **Cache HIT** → returns 0 events immediately → **No API call**

### Benefits
- ✅ Prevents redundant API calls for empty categories
- ✅ Faster response times for repeated searches
- ✅ Reduces load on external APIs (Perplexity, etc.)
- ✅ Maintains data freshness through proper TTL management
- ✅ Distinguishes between "never searched" and "searched but empty"

## Example Scenario
**User searches for events in a small city:**
- 20 categories requested
- Only 3 categories have events
- **Before:** 17 empty categories cause repeated API calls on every search
- **After:** 17 empty categories are cached, only searched once per TTL period

**Result:** ~85% reduction in API calls for subsequent searches!

## Testing
See `app/lib/__tests__/empty-category-cache.test.ts` for comprehensive test coverage.

All tests pass ✅
