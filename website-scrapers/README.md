# Website Scrapers

This directory contains custom scrapers for specific venue websites to extract event information.

## Grelle Forelle Scraper

Scrapes upcoming events from https://www.grelleforelle.com/programm/

### Features

- Extracts all upcoming events from Grelle Forelle Vienna
- Collects comprehensive event data:
  - Title
  - Date and time
  - Description
  - Image URL (high quality)
  - Event detail page URL
  - Ticket/booking URL
- Enriches data by visiting detail pages
- Saves events to Supabase database
- Prevents duplicates (checks existing events)
- Supports dry-run mode for testing

### Requirements

```bash
pip install beautifulsoup4 requests supabase
```

### Usage

**Dry-run (test without saving to database):**
```bash
python website-scrapers/grelle-forelle.py --dry-run
```

**Debug mode (verbose output):**
```bash
python website-scrapers/grelle-forelle.py --dry-run --debug
```

**Production run (saves to database):**
```bash
# Set environment variables first:
export NEXT_PUBLIC_SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run scraper
python website-scrapers/grelle-forelle.py
```

### Environment Variables

The scraper requires the following environment variables to save to the database:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase API key

If these are not set, the scraper will automatically run in dry-run mode.

### Output

The scraper provides detailed output including:
- Number of events found
- Events inserted/updated in database
- Any errors encountered
- In dry-run mode: Full JSON output of scraped events

### Scheduled Execution

You can schedule this scraper to run periodically (e.g., daily) using:

**Cron (Linux/Mac):**
```bash
# Edit crontab
crontab -e

# Add line to run daily at 6 AM
0 6 * * * cd /path/to/where2go-clean && python3 website-scrapers/grelle-forelle.py
```

**Vercel Cron:**
Add to your API routes for scheduled execution.

**GitHub Actions:**
Create a workflow file to run the scraper on a schedule.

### Example Output

```
======================================================================
Grelle Forelle Event Scraper
======================================================================
ℹ Fetching events from https://www.grelleforelle.com/programm/
ℹ Found 18 potential events
✓   ✓ 21/11 Spandau 20 | Fjaak, Elli Acula, Claus | TURB - 2025-11-21
✓   ✓ 22/11 FLASHBACK Techno Classics @  - 2025-11-22
...

======================================================================
Summary:
======================================================================
  Events found:    18
  Inserted:        15
  Updated:         3
  Errors:          0
======================================================================
```

### Data Mapping

Events are stored with the following fields:

| Scraped Field | Database Field | Notes |
|--------------|----------------|-------|
| title | title | Event name |
| description | description | First 1000 chars of event description |
| date + time | start_date_time | ISO 8601 format (YYYY-MM-DDTHH:MM:00.000Z) |
| - | category | Set to "Clubs/Discos" |
| - | subcategory | Set to "Electronic" |
| - | custom_venue_name | Set to "Grelle Forelle" |
| - | custom_venue_address | Set to "Spittelauer Lände 12, 1090 Wien" |
| image_url | image_urls | Array with single image URL |
| detail_url | website_url, source_url | Event page on venue website |
| ticket_url | booking_url | Ticket purchase link |
| - | source | Set to "grelle-forelle-scraper" |

### Error Handling

The scraper includes robust error handling:
- Network errors: Logged and skipped
- Parsing errors: Logged, event skipped
- Database errors: Logged, continues with next event
- Missing data: Uses sensible defaults (e.g., 23:00 for club events without time)

### Future Enhancements

Potential improvements:
- Extract price information from detail pages
- Detect sold-out events
- Extract lineup/artist information as tags
- Support for multi-day events
- Age restriction detection
- Genre/style classification from descriptions

## Adding More Venue Scrapers

To add a scraper for another venue:

1. Create a new file: `website-scrapers/venue-name.py`
2. Use `grelle-forelle.py` as a template
3. Adapt the scraping logic to the venue's website structure
4. Update this README with the new scraper
5. Test thoroughly in dry-run mode before production use
