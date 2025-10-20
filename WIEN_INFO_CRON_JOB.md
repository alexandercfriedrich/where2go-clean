# Wien.info Daily Sync Cron Job

## Overview

This cron job automatically fetches all Wien.info events for all categories once per day and stores them in the database cache. This ensures that Wien city pages always have fresh, up-to-date event data without requiring manual API calls.

## Configuration

### Vercel Cron (Recommended)

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-wien-info",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule**: Runs daily at 2:00 AM UTC

### Environment Variables

Set the following environment variable in Vercel project settings:

```
CRON_SECRET=your-secret-token-here
```

This secret is used to authenticate cron job requests. Generate a secure random string for production.

## API Endpoint

### POST `/api/cron/sync-wien-info`

Fetches all Wien.info events and stores them in the database.

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "message": "Wien.info sync completed successfully",
  "stats": {
    "totalEvents": 450,
    "storedEvents": 450,
    "daysStored": 25,
    "dateRange": {
      "from": "2025-10-20",
      "to": "2025-11-19"
    },
    "categories": {
      "Konzerte": 120,
      "Theater": 85,
      "Museen": 95,
      "...": "..."
    }
  }
}
```

### GET `/api/cron/sync-wien-info`

Health check endpoint that returns information about the cron job.

## Manual Trigger

You can manually trigger the sync from the command line:

```bash
curl -X POST https://your-domain.vercel.app/api/cron/sync-wien-info \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## How It Works

1. **Fetch Events**: Calls Wien.info API with no category filter (fetches all categories)
2. **Date Range**: Fetches events for today + next 30 days
3. **Group by Date**: Organizes events by date
4. **Store in Database**: Uses `storeDayEvents()` to cache events in day-bucket format
5. **Update City Pages**: Cached events are automatically available to all Wien city page routes

## Benefits

- **Fresh Data**: Wien city pages always show current events
- **Performance**: Reduces API calls during user requests
- **Reliability**: Pre-cached data means faster page loads
- **Coverage**: All categories and dates are synchronized

## Monitoring

Check Vercel logs for cron job execution:

```
[CRON:WIEN-INFO] Starting daily sync of all Wien.info events
[CRON:WIEN-INFO] Fetching events from 2025-10-20 to 2025-11-19
[CRON:WIEN-INFO] Fetched 450 events
[CRON:WIEN-INFO] Stored 15 events for 2025-10-20
[CRON:WIEN-INFO] Stored 18 events for 2025-10-21
...
[CRON:WIEN-INFO] Sync complete: 450 events across 25 days
```

## Error Handling

- **Authentication Failure**: Returns 401 if CRON_SECRET doesn't match
- **Wien City Not Found**: Returns 404 if Wien not in hot cities database
- **API Failure**: Returns 500 with error details
- **Partial Failures**: Continues storing events even if some dates fail

## Future Enhancements

- Support for other cities with public event APIs
- Email notifications on sync failures
- Metrics dashboard for sync statistics
- Configurable date range and limits
