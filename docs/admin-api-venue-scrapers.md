# Admin API: Venue Scrapers Endpoint

Backend endpoint to trigger venue event scrapers.

## Endpoint

```
POST /api/admin/venue-scrapers
GET  /api/admin/venue-scrapers (info)
```

## Authentication

- **Required**: Basic Auth via middleware (`ADMIN_USER`/`ADMIN_PASS`)
- **Optional**: Bearer token (`ADMIN_WARMUP_SECRET` env var)

## POST Request

Trigger venue scrapers to fetch and import events.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `venues` | string | No | all | Comma-separated list of venue keys to scrape |
| `dryRun` | boolean | No | false | Run without writing to database |

### Available Venues

All 25 Vienna venues are pre-configured:

- `grelle-forelle` - Grelle Forelle
- `flex` - Flex
- `pratersauna` - Pratersauna
- `b72` - B72
- `das-werk` - Das WERK
- `u4` - U4
- `volksgarten` - Volksgarten
- `babenberger-passage` - Babenberger Passage
- `cabaret-fledermaus` - Cabaret Fledermaus
- `camera-club` - Camera Club
- `celeste` - Celeste
- `chelsea` - Chelsea
- `club-u` - Club U
- `donau` - Donau
- `flucc` - Flucc / Flucc Wanne
- `o-der-klub` - O - der Klub
- `ponyhof` - Ponyhof
- `prater-dome` - Prater DOME
- `praterstrasse` - Praterstrasse
- `sass-music-club` - SASS Music Club
- `tanzcafe-jenseits` - Tanzcafé Jenseits
- `the-loft` - The Loft
- `vieipee` - VIEiPEE
- `why-not` - Why Not
- `rhiz` - rhiz

### Examples

#### Scrape all venues (production)

```bash
curl -X POST "https://your-domain.com/api/admin/venue-scrapers" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)"
```

#### Dry-run for specific venues

```bash
curl -X POST "https://your-domain.com/api/admin/venue-scrapers?dryRun=true&venues=grelle-forelle,flex" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)"
```

#### With Bearer token

```bash
curl -X POST "https://your-domain.com/api/admin/venue-scrapers?venues=pratersauna" \
  -H "Authorization: Bearer your-secret-token"
```

### Response

#### Success (200)

```json
{
  "success": true,
  "message": "Venue scrapers completed successfully",
  "stats": {
    "output": "...",
    "venues": ["grelle-forelle", "flex"],
    "dryRun": false,
    "success": true,
    "totalEvents": 45,
    "inserted": 30,
    "updated": 15,
    "errors": 0
  }
}
```

#### Dry-run Success (200)

```json
{
  "success": true,
  "dryRun": true,
  "message": "Dry-run completed successfully (no data written to database)",
  "stats": {
    "output": "...",
    "venues": ["all"],
    "dryRun": true,
    "success": true,
    "totalEvents": 150,
    "inserted": 0,
    "updated": 0,
    "errors": 0
  }
}
```

#### Partial Success (207)

```json
{
  "success": false,
  "message": "Venue scrapers completed with errors",
  "stats": {
    "output": "...",
    "venues": ["grelle-forelle", "flex"],
    "dryRun": false,
    "success": false,
    "totalEvents": 30,
    "inserted": 25,
    "updated": 3,
    "errors": 2
  }
}
```

#### Error (401/400/500)

```json
{
  "error": "Unauthorized - Invalid Bearer token"
}
```

## GET Request

Get endpoint information and available venues.

### Response

```json
{
  "endpoint": "/api/admin/venue-scrapers",
  "description": "Admin endpoint to trigger venue event scrapers",
  "method": "POST",
  "authentication": {
    "required": "Basic Auth via middleware (ADMIN_USER/ADMIN_PASS)",
    "optional": "Bearer token (ADMIN_WARMUP_SECRET env var)"
  },
  "queryParameters": {
    "dryRun": "boolean (optional) - Run without writing to database",
    "venues": "string (optional) - Comma-separated venue keys (default: all)"
  },
  "availableVenues": ["grelle-forelle", "flex", ...],
  "example": {
    "url": "/api/admin/venue-scrapers?dryRun=true&venues=grelle-forelle,flex",
    "headers": {
      "Authorization": "Basic <base64(username:password)>"
    }
  }
}
```

## Technical Details

### Implementation

- Executes Python scrapers via `child_process.exec()`
- Runs `website-scrapers/run_all_scrapers.py`
- Maximum duration: 300 seconds (5 minutes)
- Buffer size: 10MB for output
- Timeout: 280 seconds

### Scraper Process

1. Validates Supabase configuration
2. Parses query parameters
3. Executes Python scraper with appropriate flags
4. Captures stdout/stderr
5. Parses output for statistics
6. Returns structured response

### Security

- Protected by middleware Basic Auth (always required)
- Optional Bearer token for additional security
- Uses constant-time comparison for token validation
- Validates all input parameters

### Error Handling

- Validates Supabase configuration
- Validates input parameters
- Catches and logs scraper errors
- Returns appropriate HTTP status codes
- Includes error details in development mode

## Usage in Admin UI

Can be triggered from admin dashboard similar to Wien.info warmup:

```typescript
// Example admin UI code
async function triggerVenueScrapers(venues?: string[]) {
  const params = new URLSearchParams();
  if (venues && venues.length > 0) {
    params.set('venues', venues.join(','));
  }
  
  const response = await fetch(`/api/admin/venue-scrapers?${params}`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa('username:password')
    }
  });
  
  const result = await response.json();
  return result;
}
```

## Scheduling

Can be scheduled via cron or other scheduling services:

```bash
# Cron: Daily at 6 AM
0 6 * * * curl -X POST "https://your-domain.com/api/admin/venue-scrapers" \
  -H "Authorization: Bearer $ADMIN_WARMUP_SECRET"
```

## Configuration

Venue configurations are stored in `website-scrapers/venue_configs.py`.

To add a new venue, see `website-scrapers/TEMPLATE_GUIDE.md`.
