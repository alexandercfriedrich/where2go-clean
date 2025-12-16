# Scraper Management System

## Overview

The Where2Go platform includes a comprehensive scraper management system that allows administrators to control and monitor event scrapers from multiple venues and sources.

## Architecture

### Components

1. **Python Scrapers** (`website-scrapers/`)
   - Individual scrapers extending `BaseVenueScraper`
   - Centralized execution via `run_all_scrapers.py`
   - Support for dedicated and generic scrapers

2. **Admin UI** (`/admin/scrapers`)
   - Web-based dashboard for scraper management
   - Individual and bulk scraper execution
   - Real-time status monitoring

3. **REST API** (`/api/admin/scrapers`, `/api/admin/venue-scrapers`)
   - List all available scrapers
   - Trigger scraper execution
   - Query scraper statistics

4. **GitHub Actions** (`.github/workflows/venue-scrapers.yml`)
   - Automated scraper execution
   - Scheduled runs (optional)
   - Manual and API triggers

## Features

### ✨ Admin Dashboard

Navigate to `/admin/scrapers` to access:

- **Scraper Registry**: List of all available scrapers
- **Statistics**: Total, active, and inactive scrapers
- **Filtering**: By type (venue/aggregator) and city
- **Individual Controls**: Run single scrapers
- **Bulk Operations**: Select and run multiple scrapers
- **Run All**: Execute all scrapers at once

### 🔧 Scraper Types

#### Venue Scrapers
Individual club/venue event scrapers (e.g., Flex, Grelle Forelle, U4)
- Dedicated scraper classes
- Venue-specific parsing logic
- Direct integration with venues' websites

#### Aggregator Scrapers
Multi-source event scrapers (e.g., Ibiza Spotlight)
- Aggregate events from multiple venues
- Calendar-based scraping
- Regional event coverage

### 📊 Scraper Registry

Current scrapers in the system:

| Scraper | Type | City | Status |
|---------|------|------|--------|
| Ibiza Spotlight | Aggregator | Ibiza, Spain | ✅ Active |
| Grelle Forelle | Venue | Wien, Austria | ✅ Active |
| Flex | Venue | Wien, Austria | ✅ Active |
| Pratersauna | Venue | Wien, Austria | ✅ Active |
| Das Werk | Venue | Wien, Austria | ✅ Active |
| U4 | Venue | Wien, Austria | ✅ Active |
| ... | ... | ... | ... |

## Usage

### Admin UI

1. **Access Dashboard**
   ```
   Navigate to: https://your-app.vercel.app/admin/scrapers
   ```

2. **Run Individual Scraper**
   - Find scraper in the list
   - Click "▶ Run" button
   - Confirm the action
   - Monitor progress via GitHub Actions link

3. **Run Multiple Scrapers**
   - Use checkboxes to select scrapers
   - Click "▶ Run Selected (X)" button
   - Confirm the action
   - View workflow progress

4. **Run All Scrapers**
   - Click "▶▶ Run All Scrapers" button
   - Confirm the action (this may take 20-30 minutes)
   - Monitor GitHub Actions workflow

### REST API

#### List All Scrapers

```bash
GET /api/admin/scrapers

curl -H "Authorization: Basic <credentials>" \
  https://your-app.vercel.app/api/admin/scrapers
```

**Response:**
```json
{
  "success": true,
  "scrapers": [
    {
      "key": "ibiza-spotlight",
      "name": "Ibiza Spotlight",
      "city": "Ibiza",
      "country": "Spain",
      "type": "aggregator",
      "isActive": true,
      "hasDedicatedScraper": true,
      "description": "Scrapes party events from Ibiza Spotlight calendar"
    }
  ],
  "stats": {
    "total": 22,
    "active": 22,
    "inactive": 0
  }
}
```

#### Run Specific Scraper(s)

```bash
POST /api/admin/venue-scrapers?venues=<scraper-keys>

# Run single scraper
curl -X POST \
  -H "Authorization: Basic <credentials>" \
  "https://your-app.vercel.app/api/admin/venue-scrapers?venues=ibiza-spotlight"

# Run multiple scrapers
curl -X POST \
  -H "Authorization: Basic <credentials>" \
  "https://your-app.vercel.app/api/admin/venue-scrapers?venues=ibiza-spotlight,flex,pratersauna"

# Run all scrapers
curl -X POST \
  -H "Authorization: Basic <credentials>" \
  "https://your-app.vercel.app/api/admin/venue-scrapers"
```

**Response:**
```json
{
  "success": true,
  "message": "GitHub Actions workflow triggered successfully",
  "triggered": true,
  "venues": ["ibiza-spotlight"],
  "dryRun": false,
  "workflowUrl": "https://github.com/owner/repo/actions"
}
```

### Command Line

#### Run Single Scraper

```bash
# Direct execution
python website-scrapers/ibiza-spotlight.py

# Via runner
python website-scrapers/run_all_scrapers.py --venues ibiza-spotlight
```

#### Run Multiple Scrapers

```bash
python website-scrapers/run_all_scrapers.py --venues flex pratersauna u4
```

#### Run All Scrapers

```bash
python website-scrapers/run_all_scrapers.py
```

#### Options

```bash
--dry-run          # Run without saving to database
--debug            # Enable detailed logging
--venues <keys>    # Specific venues to scrape
```

### GitHub Actions

#### Manual Trigger

1. Go to GitHub Actions tab
2. Select "Venue Scrapers" workflow
3. Click "Run workflow"
4. Enter venues (optional, comma-separated)
5. Toggle dry-run mode (optional)
6. Click "Run workflow"

#### API Trigger

Triggered automatically via `/api/admin/venue-scrapers` endpoint using `repository_dispatch` event.

#### Scheduled Runs

Uncomment in `.github/workflows/venue-scrapers.yml`:

```yaml
schedule:
  - cron: '0 3 * * *'  # Daily at 3 AM UTC
```

## Adding New Scrapers

### 1. Create Scraper Class

Create a new file in `website-scrapers/`:

```python
#!/usr/bin/env python3
"""
Your Venue Scraper
"""

import sys
import os
from typing import List, Dict

sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper

class YourVenueScraper(BaseVenueScraper):
    VENUE_NAME = "Your Venue"
    VENUE_ADDRESS = "Address"
    CITY = "City"
    COUNTRY = "Country"
    BASE_URL = "https://example.com"
    EVENTS_URL = "https://example.com/events"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Electronic"
    
    def scrape_events(self) -> List[Dict]:
        # Your scraping logic here
        pass

if __name__ == '__main__':
    scraper = YourVenueScraper()
    scraper.run()
```

### 2. Register in run_all_scrapers.py

Add to the `scraper_map` in `website-scrapers/run_all_scrapers.py`:

```python
scraper_map = {
    # ... existing scrapers
    'your-venue': ('your-venue', 'YourVenueScraper'),
}
```

### 3. Add to Scraper Registry

Update `app/api/admin/scrapers/route.ts`:

```typescript
const SCRAPER_REGISTRY = [
  // ... existing scrapers
  {
    key: 'your-venue',
    name: 'Your Venue',
    city: 'City',
    country: 'Country',
    type: 'venue',
    category: 'Clubs & Nachtleben',
    website: 'https://example.com',
    isActive: true,
    hasDedicatedScraper: true,
  },
];
```

### 4. Test

```bash
# Test scraper
python website-scrapers/your-venue.py --dry-run --debug

# Test via runner
python website-scrapers/run_all_scrapers.py --venues your-venue --dry-run

# Test in admin UI
# Navigate to /admin/scrapers and click "Run" for your scraper
```

## Monitoring

### GitHub Actions

- **Workflow Runs**: Check `.github/workflows/venue-scrapers.yml` execution
- **Logs**: Review output for each scraper
- **Duration**: Monitor execution time (timeout: 30 minutes)
- **Errors**: Check for failures and error messages

### Admin Dashboard

- **Statistics**: View scraper counts and activity
- **Status**: Monitor active/inactive scrapers
- **Recent Runs**: Check latest execution results

### Database

Events are stored in Supabase `events` table:
- View via Supabase Dashboard
- Query via SQL editor
- Monitor via admin events page

## Security

### Authentication

All admin endpoints require authentication:

- **Basic Auth**: Via middleware (ADMIN_USER/ADMIN_PASS)
- **Bearer Token**: Optional (ADMIN_WARMUP_SECRET)

### Rate Limiting

- 2-second delays between requests (configurable)
- Respect robots.txt
- Monitor server resources

### Data Privacy

- Only necessary event data stored
- No personal information collected
- Compliant with venue terms of service

## Best Practices

1. **Always Test First**
   - Use `--dry-run` before production runs
   - Enable `--debug` for detailed logging
   - Verify data structure in output

2. **Respect Source Websites**
   - Use appropriate delays (2+ seconds)
   - Check robots.txt
   - Review terms of service
   - Monitor for breaking changes

3. **Monitor Execution**
   - Check GitHub Actions logs
   - Review scraper statistics
   - Watch for errors and failures

4. **Handle Errors Gracefully**
   - Log errors but continue processing
   - Skip failed events
   - Report issues clearly

5. **Keep Scrapers Updated**
   - Monitor website structure changes
   - Update selectors as needed
   - Test after updates

## Troubleshooting

### Scraper Not Running

1. Check if scraper is active in registry
2. Verify GitHub Actions workflow exists
3. Check authentication credentials
4. Review workflow logs for errors

### No Events Found

1. Enable debug mode
2. Check website structure hasn't changed
3. Verify EVENTS_URL is correct
4. Review HTML selectors

### Database Errors

1. Verify Supabase credentials
2. Check UNIFIED_PIPELINE_URL
3. Ensure database schema is current
4. Review API logs

### Authentication Failures

1. Verify ADMIN_USER and ADMIN_PASS
2. Check ADMIN_WARMUP_SECRET (if using Bearer token)
3. Ensure credentials are base64 encoded correctly

## Environment Variables

Required for production:

```bash
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Unified Pipeline API
UNIFIED_PIPELINE_URL=https://your-app.vercel.app/api/admin/events/process
ADMIN_WARMUP_SECRET=your-admin-secret

# GitHub Actions
GITHUB_TOKEN=your-github-token
GITHUB_REPOSITORY=owner/repo

# Admin Authentication
ADMIN_USER=your-admin-username
ADMIN_PASS=your-admin-password
```

## Performance

| Operation | Duration | Notes |
|-----------|----------|-------|
| Single scraper | 10-60s | Depends on event count |
| All scrapers | 20-30min | Sequential execution |
| Admin dashboard load | <500ms | Cached registry |
| API response | <100ms | Fast metadata queries |

## Future Enhancements

- [ ] Real-time scraper status updates
- [ ] Webhook notifications on completion
- [ ] Email alerts for failures
- [ ] Performance analytics dashboard
- [ ] Scraper scheduling UI
- [ ] Historical run data
- [ ] Automated health checks

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review admin panel statistics
3. Enable debug mode
4. Consult scraper documentation
5. Review base_scraper.py code

## Related Documentation

- `website-scrapers/README_IBIZA_SPOTLIGHT.md` - Ibiza Spotlight scraper guide
- `website-scrapers/base_scraper.py` - Base scraper class documentation
- `.github/workflows/venue-scrapers.yml` - GitHub Actions workflow
- `app/api/admin/scrapers/route.ts` - Scrapers API endpoint
- `app/api/admin/venue-scrapers/route.ts` - Venue scrapers execution API
