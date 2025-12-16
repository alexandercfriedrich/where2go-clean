# Ibiza Spotlight Scraper

## Overview

The Ibiza Spotlight scraper extracts party and club events from [ibiza-spotlight.de](https://www.ibiza-spotlight.de), a comprehensive guide to nightlife and events in Ibiza, Spain.

This scraper extends `BaseVenueScraper` and integrates with the Unified Pipeline API.

## Features

- ✅ Extends `BaseVenueScraper` for consistent behavior
- ✅ **Dynamic URL generation** with current date + 6 days range
- ✅ Scrapes party/club events from Ibiza Spotlight calendar
- ✅ **Visits event detail pages** for comprehensive data extraction
- ✅ Extracts event details (title, date, time, venue, DJs, prices)
- ✅ Parses event structure from `li.partyCal-day` elements
- ✅ Extracts multiple venue rooms per event
- ✅ Collects complete DJ/artist lineups
- ✅ Respectful rate limiting (2-second delays between requests)
- ✅ Unified Pipeline API integration for event storage
- ✅ Comprehensive error handling and logging
- ✅ Supports dry-run mode for testing

## How It Works

The scraper:
1. **Generates a dynamic URL** with the current date and end date (today + 6 days) in format: `/night/events/{YYYY}/{MM}?daterange={DD/MM/YYYY}-{DD/MM/YYYY}`
2. Fetches the events calendar page for the 7-day window
3. Parses event cards from `li.partyCal-day` elements (excluding empty days)
4. Extracts basic information from each event card
5. **Visits each event's detail page** to enrich the data with additional information
6. Returns comprehensive event data ready for database storage

## Limitations

- The Ibiza Spotlight calendar API supports a maximum of 7 days per request
- Events are focused on Ibiza, Spain nightlife
- Some events may not have detail pages (promoter pages are used instead)
- Availability depends on website structure (may require updates if site changes)

## Usage

### Command Line

Run the scraper directly:

```bash
# Normal run (saves to database)
python website-scrapers/ibiza-spotlight.py

# Dry run (no database writes)
python website-scrapers/ibiza-spotlight.py --dry-run

# Debug mode (detailed logging)
python website-scrapers/ibiza-spotlight.py --debug

# Custom delay between requests
python website-scrapers/ibiza-spotlight.py --delay 3.0
```

### Via run_all_scrapers.py

Run with all scrapers:

```bash
python website-scrapers/run_all_scrapers.py
```

Run Ibiza Spotlight only:

```bash
python website-scrapers/run_all_scrapers.py --venues ibiza-spotlight
```

### Via Admin Panel

1. Navigate to `/admin/scrapers`
2. Find "Ibiza Spotlight" in the list
3. Click "▶ Run" button
4. Monitor progress in GitHub Actions workflow

### Via API

```bash
# Trigger via REST API
curl -X POST "https://your-app.vercel.app/api/admin/venue-scrapers?venues=ibiza-spotlight" \
  -H "Authorization: Basic <base64(username:password)>"
```

## Configuration

### Scraper Configuration

The scraper is configured in `website-scrapers/ibiza-spotlight.py`:

```python
class IbizaSpotlightScraper(BaseVenueScraper):
    VENUE_NAME = "Ibiza Spotlight"
    VENUE_ADDRESS = "Ibiza, Spain"
    CITY = "Ibiza"
    COUNTRY = "Spain"
    BASE_URL = "https://www.ibiza-spotlight.de"
    # Note: EVENTS_URL is dynamically generated in _generate_events_url()
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Electronic"
```

### Dynamic URL Generation

The scraper uses `_generate_events_url()` to create URLs with the current date range:

```python
def _generate_events_url(self) -> str:
    """Generate dynamic events URL with current date range (today + 6 days)"""
    today = datetime.now()
    end_date = today + timedelta(days=6)
    
    start_str = today.strftime('%d/%m/%Y')
    end_str = end_date.strftime('%d/%m/%Y')
    year = today.strftime('%Y')
    month = today.strftime('%m')
    
    daterange = f'{start_str}-{end_str}'
    url = f'{self.BASE_URL}/night/events/{year}/{month}?daterange={daterange}'
    
    return url
```

Example URL: `https://www.ibiza-spotlight.de/night/events/2025/12?daterange=16/12/2025-22/12/2025`

### Registry Configuration

Ibiza Spotlight is also registered in `website-scrapers/venue_configs.py` as an **aggregator** (not a single venue):

```python
'ibiza-spotlight': {
    'venue_name': 'Ibiza Spotlight',
    'type': 'aggregator',  # Aggregates events from multiple venues
    'aggregates_multiple_venues': True,
    'use_detail_pages': True,  # Visits detail pages for enrichment
    'has_dedicated_scraper': True,
    ...
}
```

This configuration allows `run_all_scrapers.py` to recognize and run the scraper

### Event Structure

The scraper parses events from the calendar's structure:

```html
<li class="partyCal-day" rel="">
  <div class="card-ticket partyCal-ticket" data-eventid="423774">
    <div class="ticket-header">
      <div class="ticket-date">
        <span>Sa.</span>
        <span>20</span>
        <span>Dez.</span>
      </div>
      <time>16:00</time>
      <h3><a href="/night/promoters/...">Event Name</a></h3>
      <div class="partyRoom">Venue Name</div>
      <div class="partyDj"><a href="/dj/...">DJ Name</a></div>
      <div class="spotlight-price">
        <span class="currencyVal">15</span>
        <span class="currencySymb">€</span>
      </div>
    </div>
  </div>
</li>
```

## Output

The scraper creates events in the database with the following structure:

```typescript
{
  title: string              // Event name
  date: string              // YYYY-MM-DD format
  time: string              // HH:MM format
  description: string       // Event description (may include venue)
  image_url: string        // Event poster/image
  detail_url: string       // Link to event page
  price: string            // Price information
  artists: string[]        // DJs and performers
  venue_name: string       // "Ibiza Spotlight"
  city: string             // "Ibiza"
  country: string          // "Spain"
  category: string         // "Clubs & Nachtleben"
}
```

## Environment Variables

Required for production use:

```bash
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Unified Pipeline API (recommended)
UNIFIED_PIPELINE_URL=https://your-app.vercel.app/api/admin/events/process
ADMIN_WARMUP_SECRET=your-admin-secret
```

## GitHub Actions Workflow

The scraper runs automatically via GitHub Actions:

- **Trigger**: Manual, API, or scheduled
- **Workflow**: `.github/workflows/venue-scrapers.yml`
- **Timeout**: 30 minutes
- **Python**: 3.12

## Troubleshooting

### No events found

- **Most common**: No events scheduled in the current 7-day window (especially off-season)
- Check if the website structure has changed
- Verify the dynamic URL is being generated correctly (enable debug mode)
- Check if the calendar is loading JavaScript content (may need Selenium)
- Enable debug mode to see detailed parsing logs: `--debug`

### Dynamic URL Issues

- The URL format must be: `/night/events/{YYYY}/{MM}?daterange={DD/MM/YYYY}-{DD/MM/YYYY}`
- Date format is crucial: DD/MM/YYYY (European format)
- The daterange parameter is limited to 7 days maximum
- If you see "Found 0 event days", the calendar might be empty or the URL format changed

### Request timeouts

- Increase the delay between requests: `--delay 3.0`
- Check network connectivity
- Verify the website is accessible
- Some detail pages may be slow to load

### Database errors

- Verify Supabase credentials are set
- Check UNIFIED_PIPELINE_URL is correct
- Ensure database schema is up to date

### Testing the scraper

```bash
# Test URL generation
python3 -c "
from datetime import datetime, timedelta
today = datetime.now()
end_date = today + timedelta(days=6)
print(f'URL: https://www.ibiza-spotlight.de/night/events/{today:%Y/%m}?daterange={today:%d/%m/%Y}-{end_date:%d/%m/%Y}')
"

# Run in debug mode with dry-run
python website-scrapers/ibiza-spotlight.py --dry-run --debug --delay 1.0
```

## Development

### Adding new fields

1. Update `_parse_event_card()` method
2. Add new selectors for HTML elements
3. Map to event data dictionary
4. Test with dry-run mode

### Debugging

```python
# Enable debug logging
scraper = IbizaSpotlightScraper(debug=True, dry_run=True)
result = scraper.run()

# Check scraped events
print(json.dumps(result['events'], indent=2))
```

## Best Practices

1. **Rate Limiting**: Always use delays (2+ seconds) to respect server resources
2. **Error Handling**: Log errors but continue scraping other events
3. **Data Validation**: Check dates and filter past events
4. **Testing**: Use dry-run mode before production runs
5. **Monitoring**: Check GitHub Actions logs for issues

## Integration with Where2Go

Events scraped by this scraper are:
1. Sent to Unified Pipeline API
2. Matched with existing venues or new venues are created
3. Deduplicated based on source URL
4. Synced to Upstash Redis cache
5. Made available via Next.js API

## License

This scraper respects ibiza-spotlight.de's terms of service and robots.txt. Use responsibly and review their terms before deployment.

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Review admin panel scraper statistics
3. Enable debug mode for detailed logging
4. Consult `website-scrapers/base_scraper.py` documentation
