# Debug Features Quick Start Guide

This guide helps you quickly diagnose and fix issues with missing events and repeated search failures using the newly implemented debug features.

## 🚀 Quick Start: Debugging Missing Events

### Step 1: Enable Server-Side Logging

Debug logs are automatically enabled and will appear in your server console output.

**For local development:**
```bash
npm run dev
```

**For production:**
Check your hosting provider's logs (e.g., Vercel logs, CloudWatch, etc.)

### Step 2: Check Page Generation Info

Open your browser and navigate to a page with missing events (e.g., `/wien/live-konzerte`).

**In Browser DevTools Console:**
```javascript
// Check when the page was generated
const debugInfo = document.getElementById('debug-page-info');
console.log('Generated:', debugInfo.dataset.pageGeneratedAt);
console.log('Events:', debugInfo.dataset.eventCount);
console.log('City:', debugInfo.dataset.city);
console.log('Date:', debugInfo.dataset.date);
console.log('Category:', debugInfo.dataset.category);

// Check page age
const generatedAt = new Date(debugInfo.dataset.pageGeneratedAt);
const now = new Date();
const ageMinutes = (now - generatedAt) / 1000 / 60;
console.log('Page is', Math.round(ageMinutes), 'minutes old');
```

**If page is old (> 5 minutes) and events are missing:**
→ ISR cache may be stale. Force revalidation (see Step 5)

### Step 3: Check Server Logs for Filter Debug

Look for the filter debug section in your server logs:

```
=== FILTER DEBUG START ===
[DEBUG fetchEvents] Total events from day-bucket: 247
[DEBUG fetchEvents] After validity filter: 245 events (expired: 2)
[DEBUG fetchEvents] After category filter: 89 events (filtered out: 156)
[DEBUG fetchEvents] Final count: 89
=== FILTER DEBUG END ===
```

**Common Issues:**

1. **Many events filtered out by category:**
   ```
   [DEBUG fetchEvents] After category filter: 12 events (filtered out: 235)
   ```
   → Category matching is too strict. Check `normalizeCategory()` function.

2. **Many events expired:**
   ```
   [DEBUG fetchEvents] After validity filter: 50 events (expired: 200)
   ```
   → Event dates/times are in the past. This is normal behavior.

3. **No events from cache:**
   ```
   [DEBUG Cache.getDayEvents] ❌ Day-bucket not found in Redis
   [DEBUG fetchEvents] Day-bucket empty, loading from category shards
   ```
   → Day-bucket not populated yet. This is normal for first request.

### Step 4: Check Cache Operations

Look for cache debug logs:

```
[DEBUG Cache.getEventsByCategories] Input: { city: 'Wien', date: '2025-10-27', categories: [...] }
[DEBUG Cache] ✅ Found 50 events for category "Musik & Konzerte"
[DEBUG Cache] ❌ No events found for category "Theater"
[DEBUG Cache.getEventsByCategories] Summary: { totalEvents: 150, missingCategories: 3 }
```

**If many categories missing:**
→ Trigger initial cache population via search API or cron job

### Step 5: Force Revalidation

If ISR cache is stale, trigger manual revalidation:

```bash
curl -X POST http://localhost:3000/api/revalidate \
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

Refresh the page in your browser - you should see a new generation timestamp.

## 🔍 Quick Start: Debugging Repeated Search Issues

### Step 1: Check Search API Logs

Every search request gets a unique ID. Look for it in logs:

```
[DEBUG Search API search-1698234567-abc123] === REQUEST START ===
[DEBUG Search API search-1698234567-abc123] Request params: { city: 'Wien', date: '2025-10-27', categories: [...] }
[DEBUG Search API search-1698234567-abc123] After deduplication: 50 cached events
[DEBUG Search API search-1698234567-abc123] === REQUEST END ===
```

### Step 2: Verify Unique Request IDs

Perform the same search multiple times and check the request IDs:

```
[DEBUG Search API search-1698234567-abc123] === REQUEST START ===
[DEBUG Search API search-1698234890-def456] === REQUEST START ===
[DEBUG Search API search-1698235000-ghi789] === REQUEST START ===
```

**If request IDs are the same:**
→ Requests are being cached/deduplicated somewhere. Check middleware.

**If request IDs are different but results identical:**
→ Cache is working correctly (expected behavior for same query)

### Step 3: Check Cache Key Uniqueness

Look for cache key generation logs:

```
[DEBUG Cache] Looking up category "live-konzerte" with key: wien_2025-10-27_musik-konzerte
```

**Different searches should have different keys:**
- `/wien/live-konzerte` → `wien_2025-10-27_musik-konzerte`
- `/wien/theater` → `wien_2025-10-27_theater-performance`
- `/wien/live-konzerte?date=2025-10-28` → `wien_2025-10-28_musik-konzerte`

**If keys are the same for different searches:**
→ Cache key generation is missing parameters (city, date, or category)

### Step 4: Verify AI Fetch is Triggered

If cache is empty, AI should be called:

```
[DEBUG Search API search-123-abc] ✅ All data from cache, no AI needed
```

Or:

```
[DEBUG Search API search-123-abc] 🤖 AI fetch needed for missing categories: ["Theater", "Kunst"]
[DEBUG Search API search-123-abc] AI returned 25 new events
```

**If AI is never called but cache is empty:**
→ Check Perplexity API key configuration

## 📊 Common Debug Patterns

### Pattern 1: Events Disappear After Some Time

**Symptoms:**
- Events show up initially
- After refreshing, events are gone
- Server logs show: `[DEBUG Filter] Event expired: ...`

**Solution:**
Events are expiring based on their date/time. This is normal behavior.

**Verify:**
```
[DEBUG fetchEvents] After validity filter: 150 events (expired: 100)
```

### Pattern 2: Wrong Events for Category

**Symptoms:**
- Searching for "live-konzerte" shows theater events
- Category filter not working

**Solution:**
Check category normalization in logs:

```
[DEBUG Filter] Category mismatch: {
  eventCategory: "Theater",
  normalizedCategory: "Theater & Performance",
  requestedCategories: ["Musik & Konzerte"],
  matches: false
}
```

If many mismatches, update category mappings in `EVENT_CATEGORY_SUBCATEGORIES`.

### Pattern 3: Cache Always Empty

**Symptoms:**
- Every request triggers AI fetch
- Logs show: `[DEBUG Cache] ❌ No events found for category ...`

**Solutions:**
1. Check Redis connection is working
2. Verify TTL settings aren't too short
3. Trigger cache warmup:
   ```bash
   curl -X POST http://localhost:3000/api/events/search \
     -H "Content-Type: application/json" \
     -d '{"city": "Wien", "date": "2025-10-27"}'
   ```

### Pattern 4: Page Shows Old Data

**Symptoms:**
- New events not appearing
- Page timestamp is old
- Cache has new data but page doesn't

**Solution:**
```javascript
// Check page age in browser
const debugInfo = document.getElementById('debug-page-info');
const generatedAt = new Date(debugInfo.dataset.pageGeneratedAt);
const ageMinutes = (now - generatedAt) / 1000 / 60;
console.log('Page age:', ageMinutes, 'minutes');
```

If age > 5 minutes, trigger revalidation:
```bash
curl -X POST http://localhost:3000/api/revalidate \
  -H "Content-Type: application/json" \
  -d '{"path": "/wien", "secret": "your-secret"}'
```

## 🛠️ Debug Checklist

When events are missing, check in order:

1. ✅ **Page generation timestamp** - Is it recent?
2. ✅ **Total events from cache** - Are there any events at all?
3. ✅ **Validity filter** - How many expired?
4. ✅ **Category filter** - How many filtered out?
5. ✅ **Cache keys** - Do they include all parameters?
6. ✅ **Redis connection** - Is it working?
7. ✅ **ISR revalidation** - Is cache stale?

When search returns nothing on repeat, check:

1. ✅ **Request ID** - Is it unique per search?
2. ✅ **Cache key** - Is it different for different searches?
3. ✅ **AI trigger** - Is it being called when cache empty?
4. ✅ **Deduplication** - Is it removing too many events?

## 🎓 Advanced Debugging

### View All Debug Logs for Specific Request

```bash
# Find all logs for a search request
grep "search-1698234567-abc123" server.log

# Find all filter debug sessions
grep -A 30 "=== FILTER DEBUG START ===" server.log

# Find cache misses
grep "❌ No events found" server.log
```

### Monitor Real-Time Logs

**Local development:**
```bash
npm run dev | grep "DEBUG"
```

**Production (Vercel):**
```bash
vercel logs --follow | grep "DEBUG"
```

### Export Debug Info to File

```bash
# Capture all debug logs
npm run dev 2>&1 | tee debug-output.log

# Filter for specific patterns
grep "FILTER DEBUG\|Cache\|Search API" debug-output.log > filtered-debug.log
```

## 📞 Need Help?

If you're still experiencing issues after following this guide:

1. **Check DEBUG_FEATURES.md** for comprehensive documentation
2. **Share debug logs** from server console (include filter debug section)
3. **Share browser console output** (page generation timestamp, event count)
4. **Note specific search query** that's failing
5. **Include expected vs actual event counts**

Example issue report:

```
Issue: Missing events for /wien/live-konzerte

Page Info:
- Generated: 2025-10-27T10:30:00Z (15 minutes ago)
- Expected: ~100 events
- Actual: 12 events

Server Logs:
=== FILTER DEBUG START ===
[DEBUG fetchEvents] Total events from day-bucket: 247
[DEBUG fetchEvents] After category filter: 12 events (filtered out: 235)
=== FILTER DEBUG END ===

Observation: Too many events filtered out by category
```

This format helps identify the issue quickly!

## 🔗 Related Documentation

- **DEBUG_FEATURES.md** - Complete debug features documentation
- **ARCHITECTURE.md** - System architecture overview
- **IMPLEMENTATION_COMPLETE.md** - Implementation details

## 🎉 Quick Wins

Most common issues can be fixed with:

1. **Trigger revalidation** if page is stale
2. **Check category normalization** if wrong events shown
3. **Verify Redis connection** if cache always empty
4. **Warm up cache** if first request to new city/date

Happy debugging! 🐛🔍
