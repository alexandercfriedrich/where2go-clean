# Debug Features Documentation

This document describes all debugging features added to help diagnose issues with missing events and repeated search failures.

## 🎯 Debug Features Overview

### 1. Filter Logic Debugging (`app/[city]/[...params]/page.tsx`)

The `fetchEvents` function now includes comprehensive debug logging:

```typescript
console.log('=== FILTER DEBUG START ===');
// ... detailed logging ...
console.log('=== FILTER DEBUG END ===');
```

**What it logs:**
- **Source tracking**: Whether events came from day-bucket or category shards
- **Cache results**: Number of events per category, missing categories
- **Validity filtering**: Which events are expired and why
- **Category filtering**: Which events don't match the requested category
- **Summary statistics**: Total events at each filter stage

**Example output:**
```
=== FILTER DEBUG START ===
[fetchEvents] Direct call: city=Wien, date=2025-10-27, category=live-konzerte
[DEBUG fetchEvents] Requested categories: ["Musik & Konzerte"]
[DEBUG fetchEvents] Loaded from day-bucket: 247 events
[DEBUG fetchEvents] Total events from day-bucket: 247
[DEBUG fetchEvents] After validity filter: 245 events (expired: 2)
[DEBUG Filter] Category mismatch: { eventTitle: "Theater Show", ... }
[DEBUG fetchEvents] After category filter: 89 events (filtered out: 156)
[DEBUG fetchEvents] Final count: 89
=== FILTER DEBUG END ===
```

### 2. Cache Operations Debugging (`app/lib/cache.ts`)

**getEventsByCategories():**
```typescript
console.log('[DEBUG Cache.getEventsByCategories] Input:', { city, date, categories });
// ... logs each category lookup ...
console.log('[DEBUG Cache.getEventsByCategories] Summary:', { totalCategories, cachedCategories, ... });
```

**getDayEvents():**
```typescript
console.log('[DEBUG Cache.getDayEvents] Looking up day-bucket:', { city, date, key });
// ... logs result ...
console.log('[DEBUG Cache.getDayEvents] ✅ Found day-bucket with X events');
```

**What it logs:**
- Cache key generation with all parameters
- Lookup results per category (✅ found, ❌ not found)
- Total events found vs missing
- Corrupted cache entries detected

### 3. ISR Revalidation Tracking

**Page Generation Timestamp:**
Every page render includes a hidden debug element:
```html
<div 
  id="debug-page-info" 
  data-page-generated-at="2025-10-27T10:30:15.123Z"
  data-event-count="89"
  style="display: none"
>
```

**Access in browser console:**
```javascript
document.getElementById('debug-page-info').dataset.pageGeneratedAt
document.getElementById('debug-page-info').dataset.eventCount
```

Refresh the page multiple times - if timestamp doesn't change, ISR cache is active.

### 4. On-Demand Revalidation API

**Endpoint:** `POST /api/revalidate`

**Usage:**
```bash
curl -X POST https://your-domain.com/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/wien/live-konzerte",
    "secret": "your-secret-token"
  }'
```

**Response:**
```json
{
  "revalidated": true,
  "path": "/wien/live-konzerte",
  "timestamp": "2025-10-27T10:35:00.000Z",
  "message": "Path /wien/live-konzerte has been revalidated"
}
```

**Security:**
Set `REVALIDATION_SECRET` environment variable to protect the endpoint.

**Documentation endpoint:**
```bash
curl https://your-domain.com/api/revalidate
```

### 5. Search API Debugging (`app/api/events/search/route.ts`)

Every search request gets a unique ID and comprehensive logging:

```typescript
const requestId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
console.log(`[DEBUG Search API ${requestId}] === REQUEST START ===`);
// ... detailed logging throughout ...
console.log(`[DEBUG Search API ${requestId}] === REQUEST END ===`);
```

**What it logs:**
- Request parameters (city, date, categories, options)
- Cache hit/miss for each category
- Number of events from cache vs AI
- Deduplication results
- Cache updates and TTL
- Day-bucket updates
- Final event counts

## 🔍 Common Debug Scenarios

### Scenario 1: Events Missing from UI

**Steps to diagnose:**

1. **Check server logs** for filter debug output:
   ```
   [DEBUG fetchEvents] Total events from day-bucket: 247
   [DEBUG fetchEvents] After category filter: 23 events (filtered out: 224)
   ```
   → If many events filtered out, category matching may be too strict

2. **Check cache logs** for missing categories:
   ```
   [DEBUG Cache] ❌ No events found for category "live-konzerte"
   ```
   → Category not in cache, needs AI fetch

3. **Check expiry filtering**:
   ```
   [DEBUG Filter] Event expired: "Concert XYZ" date: 2025-10-25 time: 20:00
   ```
   → Events may have expired

4. **Check page generation timestamp** in browser:
   ```javascript
   document.getElementById('debug-page-info').dataset.pageGeneratedAt
   ```
   → If old timestamp, ISR cache may be stale

### Scenario 2: Repeated Search Returns Nothing

**Steps to diagnose:**

1. **Check search API logs** for unique request IDs:
   ```
   [DEBUG Search API search-1698234567-abc123] === REQUEST START ===
   [DEBUG Search API search-1698234567-abc123] Request params: { city, date, ... }
   ```

2. **Verify cache keys are unique**:
   ```
   [DEBUG Cache] Looking up category "live-konzerte" with key: wien_2025-10-27_musik-konzerte
   ```
   → Ensure different searches use different keys

3. **Check for race conditions**:
   - Multiple rapid requests should have different request IDs
   - Check if requests complete in order

4. **Verify AI fetch is triggered**:
   ```
   [DEBUG Search API ...] 🤖 AI fetch needed for missing categories: ["live-konzerte"]
   ```

### Scenario 3: ISR Cache Not Updating

**Steps to diagnose:**

1. **Check page generation timestamps**:
   - Refresh page multiple times
   - If timestamp doesn't change → ISR cache active
   - Check revalidation setting in page component

2. **Trigger manual revalidation**:
   ```bash
   curl -X POST https://your-domain.com/api/revalidate \
     -H "Content-Type: application/json" \
     -d '{"path": "/wien/live-konzerte", "secret": "your-secret"}'
   ```

3. **Check revalidation logs**:
   ```
   [DEBUG Revalidation API] ✅ Path revalidated successfully: /wien/live-konzerte at 2025-10-27T...
   ```

## 🛠️ Debug Checklist

When troubleshooting event issues, check these in order:

### Events Missing:
- [ ] Check total events from cache/day-bucket
- [ ] Check validity filter (expired events)
- [ ] Check category filter (mismatches)
- [ ] Check cache keys include all parameters
- [ ] Check ISR generation timestamp
- [ ] Check Redis for actual data

### Search Issues:
- [ ] Check request ID is unique per search
- [ ] Check cache keys are different for different searches
- [ ] Check all parameters included in cache key
- [ ] Check AI fetch is triggered when needed
- [ ] Check deduplication isn't removing too many events
- [ ] Check response event count matches expectation

### Performance:
- [ ] Check Redis operations use unlimited range (0, -1)
- [ ] Check no artificial limits in code (.slice, .limit)
- [ ] Check TTL is appropriate for event date/time
- [ ] Check day-bucket is populated and used

## 📝 Environment Variables

Add to `.env.local` for enhanced debugging:

```bash
# Revalidation API security
REVALIDATION_SECRET=your-secret-token-here

# City strict mode (optional)
CITY_STRICT_MODE=false
```

## 🎓 Best Practices

1. **Always check logs chronologically**: Follow the request flow from page → fetchEvents → cache → AI
2. **Use request IDs**: In search API, use the unique request ID to filter logs
3. **Compare before/after counts**: Track event counts at each stage
4. **Monitor cache keys**: Ensure they include all relevant parameters (city, date, category)
5. **Check timestamps**: Use hidden debug element to verify ISR behavior
6. **Manual revalidation**: Use API endpoint to force refresh during debugging

## 🔧 Advanced Debugging

### Redis Direct Access

If you have Redis CLI access:
```bash
# Check if day-bucket exists
redis-cli EXISTS events:v3:day:wien_2025-10-27

# Get day-bucket size
redis-cli HLEN events:v3:day:wien_2025-10-27

# Check category shard
redis-cli GET "events:v2:wien_2025-10-27_musik-konzerte"

# List all event keys
redis-cli KEYS "events:*"
```

### Browser Console Debugging

```javascript
// Check page generation info
const debugInfo = document.getElementById('debug-page-info');
console.log('Generated at:', debugInfo.dataset.pageGeneratedAt);
console.log('Event count:', debugInfo.dataset.eventCount);
console.log('City:', debugInfo.dataset.city);
console.log('Date:', debugInfo.dataset.date);
console.log('Category:', debugInfo.dataset.category);

// Compare with current time
const generatedAt = new Date(debugInfo.dataset.pageGeneratedAt);
const now = new Date();
const ageMinutes = (now - generatedAt) / 1000 / 60;
console.log('Page age:', ageMinutes, 'minutes');
```

## 🚨 Troubleshooting Common Issues

### Issue: Too Many Events Filtered Out

**Symptom:**
```
[DEBUG fetchEvents] Total events from day-bucket: 247
[DEBUG fetchEvents] After category filter: 12 events (filtered out: 235)
```

**Solution:** Category matching too strict. Check:
1. Category normalization in `normalizeCategory()`
2. Add category synonyms/mappings
3. Review EVENT_CATEGORY_SUBCATEGORIES configuration

### Issue: No Events in Cache

**Symptom:**
```
[DEBUG Cache] ❌ No events found for category "live-konzerte"
[DEBUG Cache.getEventsByCategories] Summary: { totalEvents: 0, missingCategories: 10 }
```

**Solution:**
1. Trigger initial cache population via `/api/events/search`
2. Check cron job for cache warmup is running
3. Verify Redis connection is working

### Issue: Stale Data

**Symptom:** Page generation timestamp is old, new events not appearing

**Solution:**
1. Use revalidation API to force refresh
2. Check `dynamic` setting in page component
3. Verify TTL settings in cache operations
4. Check Redis TTL: `redis-cli TTL "events:v3:day:wien_2025-10-27"`

## 📊 Log Analysis Tips

**Grep for specific request:**
```bash
# Find all logs for specific search request
grep "search-1698234567-abc123" logs.txt

# Find all filter debug sessions
grep -A 20 "=== FILTER DEBUG START ===" logs.txt

# Find cache misses
grep "❌ No events found" logs.txt

# Find expired events
grep "Event expired" logs.txt
```

**Count events at each stage:**
```bash
# Total from cache
grep "Total events from" logs.txt | tail -1

# After filtering
grep "After category filter" logs.txt | tail -1

# Final count
grep "Final count" logs.txt | tail -1
```
