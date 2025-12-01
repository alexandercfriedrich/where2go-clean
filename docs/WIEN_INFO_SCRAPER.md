# Wien.info Event Scraper

## Overview

The Wien.info event scraper extracts event times and additional metadata from Wien.info event detail pages. This is necessary because the Wien.info API only returns date-only strings (e.g., `"2025-12-06"`), not the actual event times.

## Problem Statement

The Wien.info API (`https://www.wien.info/ajax/de/events`) returns event data with dates but no times:

```json
{
  "dates": ["2025-12-06", "2025-12-12", "2025-12-13"],
  "title": "Event Name"
}
```

As a result, all Wien.info events in the database have `start_date_time` set to `00:00:00`. The scraper fixes this by visiting each event's detail page and extracting the actual times.

## How It Works

1. **Fetches Wien.info events** from the Supabase database that have `00:00` as their start time
2. **Visits each event page** on wien.info
3. **Extracts data** from the HTML:
   - Event start times (from the "Termine" section)
   - Venue name and address (from the "Veranstaltungsort" section)
   - Detailed description (from meta tags)
4. **Updates the Supabase events table** with the scraped data

## Rate Limiting

The scraper implements rate limiting (2 requests per second by default) to be respectful of the Wien.info servers.

## Usage

### Via API Endpoint (Recommended for Production)

The scraper can be triggered via the cron API endpoint:

```bash
# Scrape up to 100 events with missing times
curl -X POST "https://your-app.vercel.app/api/cron/scrape-wien-info" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# With options
curl -X POST "https://your-app.vercel.app/api/cron/scrape-wien-info?limit=50&debug=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Query Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `limit` | 100 | Maximum number of events to scrape |
| `dryRun` | false | If true, don't update database (test mode) |
| `debug` | false | Enable verbose logging |
| `all` | false | If true, scrape all events (not just those with missing times) |

### Via TypeScript (For Development/Scripts)

```typescript
import { scrapeWienInfoEvents } from '@/lib/scrapers/wienInfoScraper';

const result = await scrapeWienInfoEvents({
  limit: 50,
  dryRun: true,  // Test mode
  debug: true,
  onlyMissingTimes: true,  // Only scrape events with 00:00 times
});

console.log(result);
// {
//   success: true,
//   eventsScraped: 50,
//   eventsUpdated: 45,
//   eventsFailed: 5,
//   duration: 25000,
//   errors: ['...']
// }
```

## Scheduling

The scraper should be scheduled to run periodically (e.g., daily) after the Wien.info sync job. Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-wien-info",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/scrape-wien-info?limit=200",
      "schedule": "0 7 * * *"
    }
  ]
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CRON_SECRET` | Yes (prod) | Secret for authenticating cron requests |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key for admin access |

## HTML Structure Reference

### Time Slots (Termine Section)

```html
<h2>Termine</h2>
<ul>
  <li>
    <span>Di</span>
    <span>
      <span>02.12.2025</span>
      <span><span>19:30</span><span>Uhr</span></span>
    </span>
  </li>
</ul>
```

### Venue Information

```html
<h2>Veranstaltungsort</h2>
<div itemscope itemtype="http://schema.org/LocalBusiness">
  <h3 itemprop="name">Globe Wien - Marx Halle</h3>
  <address itemprop="address">Karl-Farkas-Gasse 19, 1030 Wien</address>
  <span itemprop="telephone">+43 1 588 93 30</span>
</div>
```

## Error Handling

The scraper handles errors gracefully:

- **HTTP errors**: Logged and skipped, doesn't stop the scraper
- **Missing time data**: Event is skipped with an error logged
- **Network timeouts**: 30-second timeout per request
- **Rate limiting**: Built-in throttling prevents overwhelming the server

## Files

- `app/lib/scrapers/wienInfoScraper.ts` - Main scraper module
- `app/api/cron/scrape-wien-info/route.ts` - API endpoint for cron/manual triggering
- `app/lib/__tests__/wienInfoScraper.test.ts` - Unit tests
