# Wien.info Event Importer

This document describes the wien.info event importer that was implemented to fetch and store events from wien.info into Supabase (PostgreSQL).

## Overview

The wien.info importer is a server-side tool that:
- Fetches all available events from wien.info API (no date restriction by default)
- Normalizes event data to match our EventData schema
- Upserts venues first (by name + city)
- Bulk upserts events with conflict resolution
- Supports dry-run mode for testing
- Provides comprehensive statistics and error tracking

## Architecture

```
┌─────────────────┐
│   Admin/CLI     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  wien.info Importer             │
│  (/lib/importers/wienInfoImporter.ts)
└────────┬────────────────────────┘
         │
         ├─────► Wien.info API (with throttling & retry)
         │
         ├─────► VenueRepository (upsert venues)
         │
         └─────► EventRepository (bulk upsert events)
                        │
                        ▼
                 ┌──────────────┐
                 │  Supabase    │
                 │  PostgreSQL  │
                 └──────────────┘
```

## Features

### 1. Throttling & Retry Logic
- **Throttling**: Max 2 requests per second to wien.info API
- **Retry**: Up to 3 attempts with exponential backoff (1s → 5s)
- Uses `p-throttle` and `p-retry` libraries

### 2. Batch Processing
- Events processed in configurable batches (default: 100)
- Reduces memory usage for large imports
- Better error isolation

### 3. Idempotent Upserts
- Venues: Upserted by `(name, city)` - prevents duplicates
- Events: Upserted by `(title, start_date_time, city)` unique constraint
- Safe to run multiple times

### 4. Dry-Run Mode
- Test import without writing to database
- Logs all actions that would be performed
- Validates data and reports statistics

### 5. Comprehensive Statistics
```typescript
{
  totalImported: number,
  totalUpdated: number,
  totalFailed: number,
  pagesProcessed: number,
  venuesProcessed: number,
  duration: number,
  errors: string[],
  dateRange: { from: string, to: string }
}
```

## Usage

### 1. CLI via npm Scripts

#### Dry-Run (recommended first)
```bash
npm run import:wien:dry-run
```

#### Full Import
```bash
npm run import:wien
```

### 2. Admin API Endpoint

The importer is also exposed via a secured API endpoint at `/api/admin/cache-warmup`.

#### Authentication

The endpoint is protected by **middleware Basic Auth** (required) and optionally by a **Bearer token** (if configured).

**Required: Basic Auth (enforced by middleware)**
```bash
# Set these in your environment or .env.local
ADMIN_USER=your-admin-username
ADMIN_PASS=your-admin-password
```

**Optional: Bearer Token (additional security layer)**
```bash
ADMIN_WARMUP_SECRET=your-secure-random-secret-here
```

If `ADMIN_WARMUP_SECRET` is set, you must provide both Basic Auth AND Bearer token.  
If `ADMIN_WARMUP_SECRET` is not set, only Basic Auth is required.

#### GET - Documentation
```bash
curl http://localhost:3000/api/admin/cache-warmup \
  -u admin:password
```

#### POST - Run Import

**Basic Auth only (when ADMIN_WARMUP_SECRET is not set):**
```bash
curl -X POST "http://localhost:3000/api/admin/cache-warmup?dryRun=true" \
  -u admin:password
```

**With Bearer Token (when ADMIN_WARMUP_SECRET is set):**
```bash
curl -X POST "http://localhost:3000/api/admin/cache-warmup?dryRun=true" \
  -u admin:password \
  -H "Authorization: Bearer YOUR_SECRET"
```

**With custom parameters:**
```bash
curl -X POST "http://localhost:3000/api/admin/cache-warmup?fromDate=2025-11-17&toDate=2025-12-31&limit=5000&batchSize=100" \
  -u admin:password
```

### 3. Programmatic Usage

```typescript
import { importWienInfoEvents } from '@/lib/importers/wienInfoImporter';

const stats = await importWienInfoEvents({
  dryRun: false,
  fromDate: '2025-11-17',
  toDate: '2026-11-17',
  limit: 10000,
  batchSize: 100,
  debug: true
});

console.log('Imported:', stats.totalImported);
console.log('Failed:', stats.totalFailed);
```

## Configuration

### Environment Variables

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

**Optional:**
- `ADMIN_WARMUP_SECRET` - Secret for admin API endpoint

### Import Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dryRun` | boolean | false | Test without writing to DB |
| `batchSize` | number | 100 | Events per batch (1-1000) |
| `fromDate` | string | today | Start date (YYYY-MM-DD) |
| `toDate` | string | +365 days | End date (YYYY-MM-DD) |
| `limit` | number | 10000 | Max events to fetch (1-50000) |
| `debug` | boolean | false | Enable verbose logging |

## Database Schema

### Events Table Conflict Resolution

The importer uses this unique constraint for upsert:
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_unique_constraint 
ON events (title, start_date_time, city);
```

**Why this constraint?**
- Same event at same time in same city = UPDATE (not duplicate)
- Different event with same title but different time = INSERT (new event)
- Idempotent imports: safe to run multiple times

### Venue Deduplication

Venues are deduplicated by `(name, city)`:
- Same venue name in same city = reuse existing
- Same venue name in different city = create new

## Testing

### Run Tests
```bash
# Run all importer tests
npm test -- app/lib/__tests__/wienInfoImporter.test.ts

# Run API endpoint tests
npm test -- app/lib/__tests__/admin-cache-warmup.test.ts

# Run all tests
npm test
```

### Manual Testing Script
```bash
# Run comprehensive manual tests
./scripts/test-importer.sh
```

## Performance

### Benchmarks (approximate)

| Events | Duration | Rate |
|--------|----------|------|
| 100 | ~2s | 50 events/sec |
| 1000 | ~15s | 67 events/sec |
| 5000 | ~75s | 67 events/sec |

**Notes:**
- Includes API fetch, venue upsert, and event bulk insert
- Throttled to 2 req/sec for API calls
- Actual performance depends on network and DB latency

## Troubleshooting

### Common Issues

**1. "ADMIN_WARMUP_SECRET not configured" or "Invalid Bearer token"**
- This error only occurs if the `ADMIN_WARMUP_SECRET` environment variable is set, but the request does not provide the correct Bearer token.
- The `ADMIN_WARMUP_SECRET` is optional: if you do not set it, authentication is handled solely by middleware Basic Auth (ADMIN_USER/ADMIN_PASS).
- If you wish to enable the additional Bearer token security layer, set the environment variable in your `.env.local` or hosting platform.
- Generate a secure random string: `openssl rand -base64 32`

**2. "Supabase configuration error"**
- Verify all Supabase environment variables are set
- Check service role key has proper permissions
- Test Supabase connection: `curl $NEXT_PUBLIC_SUPABASE_URL/rest/v1/`

**3. "No events returned from Wien.info API"**
- Check date range is valid (not in the past)
- Verify wien.info API is accessible
- Try with `debug: true` to see API response

**4. "Bulk insert failed"**
- Check unique constraint exists: `idx_events_unique_constraint`
- Verify event data is valid (required fields: title, start_date_time, city)
- Review error messages in stats.errors array

### Debug Mode

Enable debug logging for detailed output:
```typescript
await importWienInfoEvents({ debug: true });
```

Output includes:
- API request details
- Event counts at each stage
- Venue upsert operations
- Batch processing progress
- Final statistics

## Security

### Dependencies Scan
- ✅ `p-throttle@8.1.0` - No vulnerabilities
- ✅ `p-retry@7.1.0` - No vulnerabilities

### Best Practices
- Admin endpoint requires secret token
- Service role key only used server-side (never in client bundle)
- Input validation for all query parameters
- Error messages sanitized in production
- Rate limiting to prevent API abuse

## Future Enhancements

Potential improvements:
1. **Pagination**: Implement date range chunking for >50K events
2. **Venue Enrichment**: Fetch venue details (lat/lon, website) from external APIs
3. **Update Detection**: Track `updated_at` to distinguish new vs updated events
4. **Incremental Sync**: Only fetch events changed since last import
5. **Fuzzy Matching**: Deduplicate venues with slight name variations
6. **Scheduling**: Add cron job for automatic daily imports
7. **Webhooks**: Notify on import completion or errors

## Related Documentation

- [PHASE1_COMPLETE.md](../PHASE1_COMPLETE.md) - Phase 1 implementation overview
- [EventRepository](../app/lib/repositories/EventRepository.ts) - Event database operations
- [VenueRepository](../app/lib/repositories/VenueRepository.ts) - Venue database operations
- [wienInfo.ts](../app/lib/sources/wienInfo.ts) - Wien.info API integration

## Support

For issues or questions:
1. Check this documentation first
2. Review test files for usage examples
3. Enable debug mode to diagnose issues
4. Check Supabase logs for database errors
5. Open an issue on GitHub with debug output
