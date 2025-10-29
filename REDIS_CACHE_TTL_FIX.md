# Redis Cache TTL Fix - Category Entries Expiring Too Quickly

## Problem

User reported that:
1. After searching for "Museen & Ausstellungen", 5 category entries were created in Redis
2. These entries disappeared after a few seconds
3. Event count dropped from 64 to 36 after page reload

## Root Cause

### Why Categories Are Created

When the search API (`/api/events/search`) is called:

1. **Cache Lookup**: First checks Redis for cached events by category
2. **AI Fetch**: If categories are missing from cache, fetches new events via AI (Perplexity)
3. **Cache Storage**: Stores fetched events in Redis using **per-category keys**:
   - `events:v2:wien_2025-10-27_Community & Wellness`
   - `events:v2:wien_2025-10-27_Film & Kino`
   - `events:v2:wien_2025-10-27_Museen & Ausstellungen`
   - `events:v2:wien_2025-10-27_Musik & Nachtleben`
   - `events:v2:wien_2025-10-27_Theater/Performance`
4. **Day-Bucket Update**: Also stores events in a day-bucket: `events:v3:day:wien_2025-10-27`

This architecture allows:
- Efficient category-specific lookups
- Reduced AI API calls (only fetch missing categories)
- Day-bucket fallback for full-day queries

### Why Entries Were Expiring

The problem was **TTL (Time To Live) was too short**:

**Before Fix:**
- **Minimum TTL**: 60 seconds (1 minute)
- **Default TTL**: 300 seconds (5 minutes)
- **Calculation**: Based on earliest event end time

**Issue**: If events had already passed or were ending soon, the TTL would be calculated as very short (minimum 60 seconds), causing cache entries to expire almost immediately.

**Example Scenario:**
```
Current time: 18:00
Event: "Concert" ends at 18:05
TTL calculation: (18:05 - 18:00) = 5 minutes * 60 = 300 seconds
After 5 minutes: Cache entry expires and is deleted by Redis
```

For past events or events ending very soon, TTL would be the minimum 60 seconds, explaining why entries disappeared "after a few seconds."

## Solution

**After Fix:**
- **Minimum TTL**: 3600 seconds (1 hour)
- **Default TTL**: 3600 seconds (1 hour)
- **Calculation**: Still based on event end time, but with 1-hour minimum

**Changes Made:**

### 1. `app/lib/cacheTtl.ts`
```typescript
// OLD: minimum 60 seconds, default 300 seconds
return Math.max(60, Math.min(ttlSeconds, 24 * 60 * 60));

// NEW: minimum 3600 seconds (1 hour), default 3600 seconds
return Math.max(3600, Math.min(ttlSeconds, 24 * 60 * 60));
```

### 2. `app/lib/cache.ts`
```typescript
// OLD: Default TTL 300 seconds (5 minutes)
async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void>
async setEventsByCategory(city, date, category, events, ttlSeconds = 300): Promise<void>

// NEW: Default TTL 3600 seconds (1 hour)
async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void>
async setEventsByCategory(city, date, category, events, ttlSeconds = 3600): Promise<void>
```

## Impact

### Benefits:
✅ **Category cache entries persist for at least 1 hour** instead of 60 seconds
✅ **Fewer cache misses** - events stay in cache longer
✅ **Reduced AI API calls** - cached data is reused more effectively
✅ **More stable event counts** - users won't see events disappearing
✅ **Better user experience** - consistent results on page reload

### Tradeoffs:
- **Slightly increased Redis storage** (minimal - events are cached 1 hour vs 5 minutes)
- **Stale data for up to 1 hour** (acceptable - event data doesn't change frequently)

## Verification

To verify the fix works:

1. **Check Redis TTL**:
   ```bash
   redis-cli TTL "events:v2:wien_2025-10-27_Museen & Ausstellungen"
   # Should show 3600 (1 hour) or close to it when first cached
   ```

2. **Monitor Cache Behavior**:
   - After search, category entries should remain for at least 1 hour
   - Event counts should remain stable across page reloads
   - No sudden drops in event count (64 → 36)

3. **Check Server Logs**:
   ```
   [DEBUG Search API search-xxx] Caching new events with TTL: 3600 seconds
   ```

## Day-Bucket vs Category Cache

The system uses two caching strategies:

| Type | Key Format | TTL Strategy | Purpose |
|------|-----------|-------------|---------|
| **Category Cache** | `events:v2:wien_2025-10-27_CategoryName` | Min 1 hour, based on event end | Fast category-specific lookups |
| **Day-Bucket** | `events:v3:day:wien_2025-10-27` | Until end of day (23:59) | Full-day event storage |

Both are updated when new events are fetched. Day-bucket has better TTL (until end of day), but category cache is more granular and efficient for filtered queries.

## Related Files

- `app/lib/cacheTtl.ts` - TTL calculation logic
- `app/lib/cache.ts` - Redis cache implementation
- `app/api/events/search/route.ts` - Search API that creates category entries
- `app/lib/dayCache.ts` - Day-bucket cache operations

## Commit

This fix is implemented in commit: `[hash will be added after commit]`

---

**Summary**: Category cache entries are created intentionally for efficient caching. The quick expiration was a bug due to insufficient minimum TTL, now fixed from 60s → 3600s (1 hour).
