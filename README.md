# where2go-clean
Saubere Neuentwicklung der Eventsuchseite für Städte- und Zeitraumfilter.

## Features

### Optimized Event Search (Primary Search Method) 🚀
**The ONLY search method - reduces AI API calls from 30+ to maximum 5 while maintaining coverage!**

The Optimized Event Search uses a smart 4-phase pipeline that runs automatically for every search:
1. **Phase 1: Cache + Local APIs** (0 AI calls) - Parallel execution of day-bucket cache, per-category shards, Wien.info JSON API
2. **Phase 2: Hot-City Venues** (max 2 AI calls) - Prioritized venue queries (only if <20 events from Phase 1)
3. **Phase 3: Smart Category Search** (max 3 AI calls) - Batched multi-category queries
4. **Phase 4: Finalize** - Deduplication and cache updates

**Key Benefits:**
- **83% reduction in AI API costs** (from 30+ to max 5 calls)
- **50% faster Phase 1** through parallel execution
- **Real-time progress tracking** - Events appear progressively as each phase completes
- **Auto-cache loading** - Type a city name and cached events load automatically after 2 seconds
- **Synced filter categories** - Horizontal and vertical filters work together seamlessly
- Maintains 95-100% event coverage

See [OPTIMIZED_SEARCH.md](./OPTIMIZED_SEARCH.md) for detailed documentation.

### Other Features
- Event search by city and date
- Dynamic caching with TTL based on event timings
- Automatic event categorization and deduplication
- Progressive loading - Shows events as they are found during search
- Mobile-responsive UI with collapsible category filters
- Real-time "new events" badge when count increases

## Setup

### Environment Variables

Create a `.env.local` file in the root directory and add your configuration:

```
# Required: Perplexity API Key
PERPLEXITY_API_KEY=your_perplexity_api_key_here

# Required: Upstash Redis for events cache and job state (production)
# Events cache now uses Redis exclusively - no in-memory fallback
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here

# Preview Deployments: Required for background processing on Vercel Preview deployments
# Get this token from Vercel Project > Settings > Protection
PROTECTION_BYPASS_TOKEN=your_protection_bypass_token_here

# Optional: Additional security for background worker route
INTERNAL_API_SECRET=your_internal_secret_here

# Optional: Overall processing timeout (default: 240000ms = 4 minutes)
OVERALL_TIMEOUT_MS=240000

# Admin Area Credentials (Required for /admin access)
# Set these to enable Basic Auth protection for admin pages
ADMIN_USER=alexander.c.friedrich
ADMIN_PASS=Where2go?Lufthansa736.

# Admin API Key (Required for /api/admin/cache-warmup programmatic access)
# Used by cron jobs and automated scripts to trigger cache warmup
ADMIN_API_KEY=your_secure_admin_api_key_here

# NextAuth Configuration (Optional - for session-based admin API access)
# Secret key for NextAuth session encryption (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your_nextauth_secret_here
# Base URL for your application
NEXTAUTH_URL=http://localhost:3000

# Admin Email Whitelist (Optional - for session-based /api/admin/cache-warmup)
# Comma-separated list of admin email addresses allowed to trigger cache warmup
# Only required if using NextAuth session authentication instead of API key
ADMIN_EMAILS=alexander.c.friedrich@example.com,admin@example.com

# Bot Protection Configuration (Optional)
# Disable strict mode by default - allows any city name (recommended)
# Set to 'true' to only allow cities from Hot Cities list
CITY_STRICT_MODE=false
```

**Admin Area Configuration:**
- The admin area (`/admin/*` and `/api/admin/*`) is protected by HTTP Basic Auth
- **Required Environment Variables:**
  - `ADMIN_USER`: Username for admin access
  - `ADMIN_PASS`: Password for admin access
  - `ADMIN_API_KEY`: API key for programmatic access to cache-warmup endpoint
- **Optional Environment Variables (for session-based authentication):**
  - `NEXTAUTH_SECRET`: Secret key for NextAuth JWT session encryption
  - `NEXTAUTH_URL`: Base URL of your application (e.g., `http://localhost:3000`)
  - `ADMIN_EMAILS`: Comma-separated list of admin email addresses for session-based API access
- **Example credentials** (set these in your deployment environment):
  - `ADMIN_USER=alexander.c.friedrich`
  - `ADMIN_PASS=Where2go?Lufthansa736.`
  - `ADMIN_API_KEY=<generate a secure random string>`
  - `NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>`
  - `NEXTAUTH_URL=https://your-domain.com`
  - `ADMIN_EMAILS=admin@example.com,user@example.com`
- Without these credentials, admin pages will return "Admin credentials not configured" error
- The `/api/admin/cache-warmup` route supports two authentication methods:
  1. **API Key** (recommended for cron/programmatic): Send `Authorization: Bearer <ADMIN_API_KEY>` header
  2. **NextAuth Session** (for authenticated users): Requires valid session + email in ADMIN_EMAILS whitelist
- Legacy `ADMIN_SECRET` header authentication is still supported for API calls as an alternative

**Redis Configuration (Required):**
- **Events Cache**: Now uses Redis exclusively for caching events per category. No in-memory fallback.
- **Job State**: Redis provides durable job state persistence for progressive results across serverless route contexts
- **Production**: Always configure Upstash Redis environment variables - without them, the application will throw errors on startup
- **Debug Mode**: Debug mode (`debug=1`) no longer disables caching. Only explicit `disableCache=true` option will disable cache.
- **Wien.info Events**: Early events from Wien.info are now automatically cached per category for faster subsequent requests

**Preview Protection Configuration:**
- Vercel Preview Deployments with Protection enabled block internal API calls by default
- The `PROTECTION_BYPASS_TOKEN` allows background processing to work on Preview deployments
- **To set up:**
  1. Go to Vercel Project > Settings > Protection
  2. Copy the "Protection Bypass Token" 
  3. Add it as `PROTECTION_BYPASS_TOKEN` in Environment Variables
  4. Apply to Preview deployments specifically
- The `INTERNAL_API_SECRET` provides additional hardening for the background worker route
- Without proper configuration, background processing will fail with 401 Unauthorized on Preview deployments

### Architecture: Vercel Background Functions

The application uses **Vercel Background Functions** to ensure reliable job processing that continues after HTTP responses are returned. This solves the issue where background tasks could be terminated prematurely on serverless platforms.

**How it works:**
1. **Main Route (`/api/events`)**: Creates job, schedules background worker
2. **Background Worker (`/api/events/process`)**: Performs actual processing with 300s timeout
3. **Scheduling**: Uses internal HTTP request with `x-vercel-background: 1` header
4. **Local Development**: Falls back to direct HTTP requests for dev simplicity

**Key Benefits:**
- ✅ **Reliable Processing**: Jobs are guaranteed to complete or fail, never stuck in "pending"
- ✅ **Progressive Updates**: Events appear as categories complete
- ✅ **Error Handling**: All jobs finalized with 'done' or 'error' status
- ✅ **Production Ready**: Leverages Vercel's infrastructure for background work

**Testing the Implementation:**
- Enable debug mode with `?debug=1` in URL
- Monitor Redis for job updates (`job:*` keys) and debug info (`debug:*` keys)
- Verify progressive events appear and job transitions from 'pending' to 'done'

**Timeout Configuration:**
- **Overall Timeout**: Configurable via `overallTimeoutMs` option (default 4 minutes) or `OVERALL_TIMEOUT_MS` environment variable
- **Category Timeout**: Increased default from 45s to 90s, minimum 60s on Vercel for external API reliability
- **Background Function**: Configured for 300s `maxDuration` with proper `x-vercel-background` headers
- **AbortController**: Used for clean timeout handling in both overall processing and individual HTTP requests
- **No 30s Cutoffs**: All artificial timeout limitations removed to allow full processing duration

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
- **Hot Cities Management** - Admin area for managing city-specific event sources with priority targeting
- **Bot & Spam Protection** - Middleware-based detection and blocking of malicious requests (see [BOT_PROTECTION_IMPLEMENTATION.md](BOT_PROTECTION_IMPLEMENTATION.md))

### Hot Cities Feature

The Hot Cities feature allows administrators to configure city-specific event sources that get prioritized during searches, improving the quality and relevance of results for popular destinations.

**Key Benefits:**
- **Targeted Sources**: Each city can have specific websites and event sources configured
- **Category Filtering**: Websites can be tagged with categories they cover best  
- **Priority Ordering**: Sources are ranked by priority for better result quality
- **Cost Optimization**: Cached results reduce API calls until event end times
- **Local Knowledge**: Custom search queries and prompts per city

**Admin Management:**
- Access the admin area at `/admin` (requires Basic Auth)
- Manage cities and their websites at `/admin/hot-cities`
- Add, edit, delete, and configure websites for each city
- Set categories, priorities, and custom search queries per website
- Enable/disable sources without deleting configuration

**Seeding Initial Data:**
To populate the system with sample cities (Wien, Linz, Ibiza, Berlin):
1. Access `/admin/hot-cities`
2. Click "Seed Sample Cities" button
3. Sample cities will be created with representative sources across categories

**API Access:**
- **Public API**: `GET /api/hot-cities` - Returns sanitized city data (no admin access required)
- **Admin API**: `/api/admin/hot-cities/*` - Full CRUD operations (requires Basic Auth)

**Search Integration:**
When searching for events, the system automatically:
1. Checks if the city has Hot Cities configuration
2. Identifies relevant websites based on requested categories
3. Provides additional sources to the background worker for prioritized searching
4. Maintains existing caching behavior to minimize costs

### Bot & Spam Protection

The application includes comprehensive bot and spam protection to prevent malicious requests and resource waste. See [BOT_PROTECTION_IMPLEMENTATION.md](BOT_PROTECTION_IMPLEMENTATION.md) for full documentation.

**Key Features:**
- **Middleware-based detection** - Blocks suspicious requests before page rendering
- **File extension blocking** - Rejects requests for `.php`, `.env`, and other malicious files
- **Path filtering** - Blocks WordPress scanner attacks and config file probes
- **User-agent detection** - Identifies and blocks known security scanners
- **Smart city validation** - Allows any legitimate city name while blocking malicious patterns (e.g., `ibiza`, `barcelona` work; `admin.php`, `.env` blocked)
- **Security headers** - Adds headers to protect against XSS, clickjacking, and MIME sniffing

**Configuration:**
```bash
# Optional: Enable strict mode to only allow Hot Cities (default: false)
# By default, any city name is allowed with smart filtering for security
CITY_STRICT_MODE=false
```

**Logging:**
Monitor blocked requests in your logs:
```
[MIDDLEWARE] Blocked suspicious request: /test.php
[MIDDLEWARE] Blocked suspicious request: /.env
```

**Benefits:**
- ✅ Reduces server load from bot traffic
- ✅ Prevents resource waste on invalid requests
- ✅ Protects against common web attacks
- ✅ Improves cache efficiency by filtering spam

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
- **`categoryTimeoutMs`** (default: 90000): Timeout per category in milliseconds, can be a number or object mapping categories to timeouts. **Increased from 45s to 90s to prevent premature termination on Vercel.**
- **`overallTimeoutMs`** (default: 240000): Overall timeout for entire job processing in milliseconds (4 minutes). Configurable via `OVERALL_TIMEOUT_MS` environment variable.
- **`maxAttempts`** (default: 5): Maximum retry attempts per category with exponential backoff + jitter
- **Polling window**: Extended to 8 minutes (48 polls × 10s) to handle longer processing times

**Vercel Background Function Settings:**
- **`runtime`**: 'nodejs' (configured)
- **`maxDuration`**: 300 seconds (configured)
- **Background processing**: Uses `x-vercel-background: '1'` header for reliable execution
- **Minimum timeout on Vercel**: 60 seconds per category to reduce flakiness with external APIs

### Progressive Updates (Polling-Based)

The application provides incremental ("progressive") updates using a polling + job store mechanism:
- After each category is processed, aggregated events are written to the job store
- The frontend polls and merges new events, marking fresh ones with a "Neu" badge
- Toast notifications show category progress and newly added event counts
- Status message updates to "Suche läuft – Ergebnisse werden ergänzt" during progressive loading
- Enhanced Event Cards remain visible with clickable addresses and multiple link types
- Debug mode surfaces raw API response summaries, parsing metrics, and phase statistics
- **Enhanced metrics**: Parsed event counts, added counts, and total counts per search step
- **Phase statistics**: Shows how many events are parsed, merged, and deduplicated at each step

**Removed:** A separate SSE streaming endpoint (`/api/events/progressive-search`) formerly existed but was never wired into the UI. It has been removed to reduce maintenance overhead. See `docs/DEPRECATIONS.md` for details.

**Future Considerations:**
- Re-introduce streaming (SSE or WebSockets) for lower latency and cancellation support if user needs justify added complexity

### API

#### Asynchronous Events API (existing)
- `POST /api/events` - Submit search request, returns job ID immediately
- `GET /api/jobs/[jobId]` - Check job status and get progressive results
- `POST /api/events/process` - **Background worker** (internal, not for direct use)

#### Synchronous Events Search API (new)
- `POST /api/events/search` - Returns events directly (no job/polling required)

The asynchronous API now uses Vercel Background Functions for reliable processing. The `/api/events/process` route handles actual job processing with extended timeouts and is automatically called by the main `/api/events` route.

Both public endpoints accept the same request body format and use shared caching.

#### Job Reuse for Efficiency

To prevent event fragmentation and improve user experience, the asynchronous API implements **job reuse** for identical search parameters:

- When multiple requests are made for the same city/date/categories within a short time window (10 minutes), the system reuses the existing active job instead of creating a new one
- This ensures all PPLX responses accumulate in a single job, eliminating split results across multiple jobIds
- The frontend automatically receives the most complete results without missing events from parallel processing
- Active job mappings expire after 10 minutes to allow for fresh searches while maintaining efficiency
- Job reuse is transparent to the API consumer - the response format remains identical

**Key Benefits:**
- ✅ **Eliminates event fragmentation** - All results appear in a single job
- ✅ **Reduces server load** - Avoids duplicate processing for identical searches  
- ✅ **Improves user experience** - No missing events due to timing issues
- ✅ **Transparent operation** - No API changes required

**Example:** If a user searches for "Wien, 2025-01-20, Music,Theater" and then repeats the same search within 10 minutes, the second request will return the existing job with all accumulated events rather than starting a new search.

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
    "accessibility": "wheelchair",
    "categoryTimeoutMs": 90000, // timeout per category (default: 90s, min 60s on Vercel)
    "overallTimeoutMs": 240000, // overall job timeout (default: 4min)
    "categoryConcurrency": 5, // parallel processing limit
    "maxAttempts": 5 // retry attempts per category
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

### Diagnostics

#### JobStore Diagnostics Endpoint

To verify Redis configuration and connectivity, use the diagnostics endpoint:

```bash
# Development (no authentication required)
GET /api/diagnostics/jobstore

# Production (requires x-internal-secret header)
curl -H "x-internal-secret: your-secret" https://yourdomain.com/api/diagnostics/jobstore
```

**Response Format:**
```json
{
  "timestamp": "2025-01-20T15:00:00Z",
  "environment": "production",
  "usingRedis": true,
  "setGetOk": true,
  "error": null
}
```

**Response Fields:**
- `usingRedis`: Whether Redis environment variables are configured and JobStore is using Redis
- `setGetOk`: Whether set/get/delete operations succeed (tests actual Redis connectivity)
- `error`: Error message if diagnostics fail, null if successful

**Use Cases:**
- Verify Redis is properly configured in production
- Troubleshoot progressive update issues (Redis connectivity problems prevent incremental results)
- Confirm job state persistence is working correctly

### Caching Policy

The application uses intelligent caching with dynamic TTL (Time To Live) based on event timing to minimize costs and improve performance:

- **Cache expiration**: Set to when the earliest event ends
- **TTL calculation**: 
  - If event has `cacheUntil` field, use it directly
  - Otherwise, derive end time from `date` + `time` + 3 hours duration fallback
  - For date-only entries (no time), cache until 23:59 of that day
- **Bounds**: Minimum 1 minute, maximum 24 hours
- **Fallback**: 5 minutes when event timing cannot be determined

**Cost Optimization:**
- **Smart Caching**: Results are cached until event end times, avoiding repeated queries for the same city/date/categories
- **Redis Recommended**: Use Redis in production for persistent caching across serverless functions
- **Shared Cache**: Both Hot Cities and regular searches use the same cache keys for consistency
- **Dynamic TTL**: Longer cache times for events that haven't started, shorter for ongoing events

This ensures cache stays fresh while events are current, significantly reducing Perplexity API costs for popular destinations.

### Vienna Events Integration

Vienna events are sourced exclusively through the **Wien.info JSON API**, which provides:

- **Structured Data**: Clean JSON format eliminates parsing errors common with RSS feeds
- **Official Source**: Direct access to Vienna's comprehensive event database
- **Category Filtering**: Built-in support for filtering by event types (F1 parameters)
- **Reliability**: Stable API with consistent uptime and data quality
- **Maintenance**: No custom parsing logic required, reducing maintenance overhead

The Wien.info integration automatically maps event categories to appropriate F1 filter IDs for targeted searches, ensuring relevant results for different event types.

### Changelog

#### Removed Features

**VADB RSS Integration (Removed)**
- Removed Wien.gv.at VADB RSS feed integration due to parsing complexity and reliability issues
- Simplified codebase by eliminating custom RSS parsing logic
- Wien.info JSON API remains as the sole Vienna events source, providing better data quality and reliability
- All Wien.gv.at URLs are automatically filtered from Hot Cities configurations to prevent accidental re-addition
