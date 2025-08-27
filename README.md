# where2go-clean
Saubere Neuentwicklung der Eventsuchseite für Städte- und Zeitraumfilter.

## Setup

### Environment Variables

Create a `.env.local` file in the root directory and add your configuration:

```
# Required: Perplexity API Key
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Optional: Upstash Redis for durable job state (production recommended)
# When not set, uses in-memory storage (dev/local only)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

**Redis Configuration (Production):**
- In production environments (e.g., Vercel), configure Upstash Redis environment variables for durable job state persistence
- This ensures progressive results work reliably across serverless route contexts
- Without Redis, job state uses in-memory storage which doesn't persist across serverless function invocations

### Installation

```bash
npm install
npm run dev
```

The application will start on `http://localhost:3000`.

### Features

- Event search by city and date
- **Parallel category processing** - Configurable concurrency for faster searches
- Multi-query Perplexity search with smart aggregation
- **Per-category timeouts** - Configurable timeout with retries and exponential backoff + jitter
- **Extended serverless duration** - 300s maxDuration for long-running searches
- Dynamic caching with TTL based on event timings (instead of fixed 5-minute caching)
- Automatic event categorization and deduplication
- No UI changes required - fully backward compatible
- New synchronous search endpoint for immediate results
- **Progressive loading** - Shows events as they are found during search
- **Enhanced debug mode** - Add `?debug=1` to URL for detailed search insights with raw responses and counts
- **Real-time updates** - Progressive results with new event notifications and toast messages
- **Conservative deduplication** - Avoids over-filtering events with missing fields

### Debug Mode

To enable debug mode, add `?debug=1` to the URL (e.g., `http://localhost:3000?debug=1`).

Debug mode provides:
- Detailed search query information per category
- Raw API responses for troubleshooting  
- **Enhanced metrics**: Parsed event counts, added counts, and total counts per search step
- Complete search timeline and performance metrics
- **Phase statistics**: Shows how many events are parsed, merged, and deduplicated at each step

The debug panel appears at the bottom of the page when debug mode is active and shows comprehensive information about each search step.

### Configuration Options

The following options can be configured by modifying the request in `page.tsx`:

- **`categoryConcurrency`** (default: 5): Number of categories to process in parallel
- **`categoryTimeoutMs`** (default: 45000): Timeout per category in milliseconds, can be a number or object mapping categories to timeouts
- **`maxAttempts`** (default: 5): Maximum retry attempts per category with exponential backoff + jitter
- **Polling window**: Extended to 8 minutes (48 polls × 10s) to handle longer processing times

### Progressive Updates

The application now provides reliable progressive updates:
- Results are pushed to the job store after each category completes
- Events appear in the UI as they are found, not just at the end
- "Neu" badges indicate newly found events
- Toast notifications show progress with event counts
- Enhanced Event Cards remain visible with clickable addresses and multiple link types
- Detailed search query information per category
- Raw API responses for troubleshooting  
- **Enhanced metrics**: Parsed event counts, added counts, and total counts per search step
- Complete search timeline and performance metrics
- **Phase statistics**: Shows how many events are parsed, merged, and deduplicated at each step

The debug panel appears at the bottom of the page when debug mode is active and shows comprehensive information about each search step.

### Progressive Updates

The application supports progressive loading of search results:
- Results appear as they are found, reducing perceived wait time
- New events are highlighted with a "Neu" badge and glow animation
- Toast notifications show when new events are discovered
- Search continues in the background while showing initial results
- Status message updates to "Suche läuft – Ergebnisse werden ergänzt" during progressive loading

### API

#### Asynchronous Events API (existing)
- `POST /api/events` - Submit search request, returns job ID
- `GET /api/jobs/[jobId]` - Check job status and get results

#### Synchronous Events Search API (new)
- `POST /api/events/search` - Returns events directly (no job/polling required)

Both endpoints accept the same request body format and use shared caching.

#### Request Format (both endpoints)

```json
{
  "city": "Berlin",
  "date": "2025-01-20",
  "categories": ["musik", "theater", "museen"], // optional
  "options": { // optional
    "includeNearbyEvents": true,
    "maxResults": 50,
    "priceRange": "free",
    "accessibility": "wheelchair"
  }
}
```

#### Response Format

**Asynchronous API (`/api/events`)**:
```json
{
  "jobId": "job_1234567890_abcdef123",
  "status": "pending"
}
```

**Synchronous API (`/api/events/search`)**:
```json
{
  "events": [
    {
      "title": "Concert at Philharmonie",
      "category": "Musik",
      "date": "2025-01-20",
      "time": "19:30",
      "venue": "Berliner Philharmonie",
      "price": "€35-85",
      "website": "https://example.com",
      "cacheUntil": "2025-01-20T23:30:00Z" // optional
    }
  ],
  "cached": false,
  "timestamp": "2025-01-20T15:00:00Z",
  "ttl": 7200 // cache TTL in seconds
}
```

### Caching Policy

The application uses intelligent caching with dynamic TTL (Time To Live) based on event timing:

- **Cache expiration**: Set to when the earliest event ends
- **TTL calculation**: 
  - If event has `cacheUntil` field, use it directly
  - Otherwise, derive end time from `date` + `time` + 3 hours duration fallback
  - For date-only entries (no time), cache until 23:59 of that day
- **Bounds**: Minimum 1 minute, maximum 24 hours
- **Fallback**: 5 minutes when event timing cannot be determined

This ensures cache stays fresh while events are current, improving performance and API efficiency.
