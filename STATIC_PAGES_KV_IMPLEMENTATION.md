# Static Pages KV Storage Implementation

## Overview

This implementation adds durable persistence for static pages using Vercel KV (Upstash REST API) with automatic fallback to filesystem storage for local development. This solves the problem where static page edits in the admin interface were not persisting across deployments on serverless platforms.

## Problem Statement

**Before:**
- Static pages stored only in filesystem (`data/static-pages.json` or `/tmp/static-pages.json`)
- Serverless deployments have ephemeral filesystems
- Edits made through `/admin/static-pages` would disappear on next deployment
- `/tmp` is cleared on each deployment
- No durable persistence for production use

**After:**
- Static pages stored in Vercel KV for production (durable)
- Automatic fallback to filesystem for local development
- Edits persist across deployments
- No new npm dependencies required
- Backward compatible with existing data format

## Architecture

### Storage Layer (`app/lib/staticPagesStore.ts`)

The storage layer provides a unified interface with two implementations:

#### 1. Vercel KV Storage (Production)
- Uses direct REST API calls (no npm dependencies)
- Activated when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set
- Storage key: `where2go:static-pages:v1`
- All pages stored as single JSON array

**KV REST API Usage:**
```javascript
// GET request
GET {KV_REST_API_URL}/get/where2go:static-pages:v1
Headers: { Authorization: Bearer {KV_REST_API_TOKEN} }
Response: { result: "[{...}]" }

// SET request
POST {KV_REST_API_URL}/set/where2go:static-pages:v1
Headers: { Authorization: Bearer {KV_REST_API_TOKEN}, Content-Type: application/json }
Body: { value: "[{...}]" }
```

#### 2. Filesystem Storage (Development)
- Activated when KV env vars are not set
- Primary location: `data/static-pages.json`
- Fallback location: `/tmp/static-pages.json` (read-only FS)
- Same JSON format as KV storage

### API Layer

#### Admin API (`app/api/admin/static-pages/route.ts`)
- **GET**: List all static pages
- **POST**: Create or update a page (upsert)
- **DELETE**: Delete a page by ID

**Validation:**
- `id`: Required, non-empty (trimmed)
- `title`: Required, non-empty (trimmed)
- `content`: Required, must be string (can be empty)
- `path`: Required, must start with `/`

**Error Responses:**
- `400`: Validation failures with specific field messages
- `404`: Page not found (DELETE only)
- `500`: Storage errors with error details

#### Public API (`app/api/static-pages/[id]/route.ts`)
- **GET**: Retrieve a single page by ID
- Returns `404` if page not found
- Returns `500` on storage errors

### Admin UI (`app/admin/static-pages/page.tsx`)

No changes required - already had:
- ✅ `cache: 'no-store'` on fetch requests
- ✅ Client-side validation before POST
- ✅ Error display from API responses

## Data Format

### StaticPage Interface
```typescript
interface StaticPage {
  id: string;          // Unique identifier (e.g., 'seo-footer')
  title: string;       // Display title
  content: string;     // HTML content
  path: string;        // URL path (must start with '/')
  updatedAt: string;   // ISO 8601 timestamp
}
```

### Storage Format
Both KV and filesystem use the same format:
```json
[
  {
    "id": "seo-footer",
    "title": "SEO Footer (Homepage)",
    "content": "<h2>Content...</h2>",
    "path": "/",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

## Environment Variables

### Production (Recommended)
```bash
# Vercel KV credentials
KV_REST_API_URL=https://your-kv-url.upstash.io
KV_REST_API_TOKEN=your_kv_token_here
```

**Setup in Vercel:**
1. Go to Project Settings > Environment Variables
2. Add `KV_REST_API_URL` and `KV_REST_API_TOKEN`
3. Apply to Production and Preview environments
4. Redeploy to activate

### Local Development
No environment variables needed - automatically uses filesystem storage.

## Testing

### Unit Tests (`app/lib/__tests__/staticPagesStore.test.ts`)
12 tests covering:
- ✅ StaticPage interface validation
- ✅ Loading all pages (empty and populated)
- ✅ Getting page by ID (exists and not found)
- ✅ Upserting pages (create and update)
- ✅ Deleting pages (exists and not found)
- ✅ Handling multiple pages
- ✅ Path validation
- ✅ Data format consistency
- ✅ Timestamp updates

**Run tests:**
```bash
npm test -- app/lib/__tests__/staticPagesStore.test.ts
```

### Test Script (`scripts/test-kv-storage.js`)
Tests KV connectivity and operations:
```bash
node scripts/test-kv-storage.js
```

**With KV configured:**
- ✅ Verifies credentials
- ✅ Tests GET operation
- ✅ Tests SET operation
- ✅ Verifies data integrity
- ✅ Restores original data

**Without KV:**
- Shows fallback message
- Confirms filesystem storage will be used

### Manual Testing
```bash
# Start dev server
npm run dev

# Test public API
curl http://localhost:3000/api/static-pages/seo-footer
# Expected: 200 with page data

curl http://localhost:3000/api/static-pages/non-existent
# Expected: 404 with error message

# Check console logs
# Expected: "Using filesystem for static pages storage"
```

## Code Changes Summary

### Files Created (4)
1. **app/lib/staticPagesStore.ts** (272 lines)
   - Storage abstraction layer
   - KV and filesystem implementations
   - Functions: loadAllPages, getPageById, upsertPage, deletePage

2. **app/lib/__tests__/staticPagesStore.test.ts** (240 lines)
   - 12 comprehensive unit tests
   - Tests all storage operations
   - Validates data format consistency

3. **scripts/test-kv-storage.js** (155 lines)
   - KV connectivity test script
   - Demonstrates REST API usage
   - Helpful for debugging KV setup

4. **data/static-pages.json** (9 lines)
   - Default data for local development
   - Contains SEO footer example
   - Serves as template

### Files Modified (3)
1. **app/api/admin/static-pages/route.ts**
   - Before: 142 lines
   - After: 68 lines
   - **Reduction: 52%**
   - Changes: Replaced file operations with storage layer, improved validation

2. **app/api/static-pages/[id]/route.ts**
   - Before: 59 lines
   - After: 20 lines
   - **Reduction: 66%**
   - Changes: Replaced file operations with storage layer

3. **README.md**
   - Added KV environment variables section
   - Documented fallback behavior
   - Added storage key and admin interface info

## Migration Guide

### For Existing Installations

1. **Backup existing data:**
   ```bash
   cp data/static-pages.json data/static-pages.backup.json
   ```

2. **Update code:**
   - Pull latest changes from the PR
   - No code changes needed in your deployment

3. **Configure KV (Production):**
   ```bash
   # In Vercel Project Settings > Environment Variables
   KV_REST_API_URL=https://your-kv-url.upstash.io
   KV_REST_API_TOKEN=your_kv_token_here
   ```

4. **Test locally:**
   ```bash
   npm run dev
   # Visit http://localhost:3000/admin/static-pages
   # Edit and save a page
   # Verify changes persist
   ```

5. **Deploy:**
   ```bash
   # Deploy to Vercel
   # Check logs for: "Using Vercel KV for static pages storage"
   ```

6. **Migrate data to KV (if needed):**
   - Visit `/admin/static-pages`
   - Edit each page
   - Save to write to KV
   - Or use API to bulk update

### For New Installations

1. **Local development:**
   - Clone repository
   - Run `npm install`
   - Run `npm run dev`
   - Uses filesystem storage automatically

2. **Production deployment:**
   - Deploy to Vercel
   - Add KV environment variables
   - Redeploy to activate KV storage

## Troubleshooting

### Issue: Changes not persisting in production
**Solution:** Verify KV environment variables are set in Vercel Project Settings and redeploy.

### Issue: Console shows "Using filesystem for static pages storage" in production
**Solution:** KV environment variables are not set. Add them in Vercel Project Settings.

### Issue: KV test script fails
**Solutions:**
1. Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set
2. Check KV credentials are valid in Vercel/Upstash dashboard
3. Verify network connectivity to Upstash
4. Check console logs for specific error messages

### Issue: 500 errors when saving pages
**Solutions:**
1. Check server logs for specific error
2. Verify KV credentials if using KV storage
3. Check filesystem permissions if using local storage
4. Verify data format is valid JSON

### Issue: Old data not showing after KV migration
**Solution:** KV starts empty. Visit `/admin/static-pages` and re-save each page to populate KV.

## Performance Considerations

- **KV Latency:** ~50-100ms per request (acceptable for admin operations)
- **Filesystem Latency:** ~1-5ms per request (negligible)
- **Storage Size:** Typical static pages ~10-50KB total (well within KV limits)
- **Request Rate:** Low (admin operations only, not cached)

## Security Considerations

- **KV Credentials:** Stored as environment variables (secure)
- **Admin API:** Protected by HTTP Basic Auth (existing)
- **Public API:** Read-only, no authentication needed
- **Validation:** Strict input validation prevents injection attacks
- **Error Messages:** No sensitive information leaked in errors

## Future Enhancements

Possible improvements (not in scope):
- Add versioning/history for pages
- Add preview mode before publishing
- Add markdown support alongside HTML
- Add media upload for images
- Add page templates
- Add search/filter in admin UI
- Add bulk import/export functionality

## Maintenance

### Regular Tasks
- Monitor KV usage in Upstash dashboard
- Check error logs periodically
- Update content as needed via admin UI

### Backup Strategy
- KV data is automatically backed up by Upstash
- Export via admin UI if needed for offline backup
- Keep `data/static-pages.json` in version control as template

## Support

### Logs to Check
```bash
# Development
npm run dev
# Look for: "Using filesystem for static pages storage"

# Production (Vercel)
# Look for: "Using Vercel KV for static pages storage"
```

### Useful Commands
```bash
# Run unit tests
npm test -- app/lib/__tests__/staticPagesStore.test.ts

# Test KV connectivity
node scripts/test-kv-storage.js

# Build verification
npm run build

# Start production server locally
npm run build && npm start
```

## Conclusion

This implementation provides a robust, production-ready solution for static pages persistence with minimal code changes and no new dependencies. The automatic fallback ensures local development remains simple while production deployments benefit from durable KV storage.

All acceptance criteria have been met:
- ✅ Durable persistence with KV
- ✅ Automatic filesystem fallback
- ✅ Strict validation and error handling
- ✅ No breaking changes
- ✅ Comprehensive testing
- ✅ Full documentation
- ✅ Build passes with Next.js 14
