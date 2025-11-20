# Website Scrapers - Template System

This directory contains a flexible template system for creating venue-specific event scrapers.

## 🎯 Quick Start

### Using the Generic Scraper

The easiest way to scrape a venue is using the generic scraper with a configuration:

```bash
# List available venues
python website-scrapers/generic_scraper.py --list

# Test a venue (dry-run)
python website-scrapers/generic_scraper.py flex --dry-run

# Scrape and save to database
python website-scrapers/generic_scraper.py flex

# Debug mode
python website-scrapers/generic_scraper.py flex --dry-run --debug
```

## 📁 File Structure

```
website-scrapers/
├── base_scraper.py          # Base class with common functionality
├── venue_configs.py         # Venue configurations
├── generic_scraper.py       # Config-based scraper
├── grelle-forelle.py        # Example: Custom scraper
├── TEMPLATE_GUIDE.md        # This file
└── README.md                # General documentation
```

## 🔧 Adding a New Venue

### Option 1: Using Configuration (Easiest)

If the venue has a standard structure, just add a configuration to `venue_configs.py`:

1. **Inspect the website** using browser DevTools (F12)
2. **Identify CSS selectors** for event elements
3. **Add configuration** to `venue_configs.py`:

```python
'my-venue': {
    'venue_name': 'My Venue',
    'venue_address': 'Street 123, 1010 Wien',
    'base_url': 'https://my-venue.com',
    'events_url': 'https://my-venue.com/events/',
    'category': 'Clubs/Discos',
    'subcategory': 'Electronic',
    
    'list_selectors': {
        'event_container': 'div.event',      # Container for each event
        'title': 'h2.title',                 # Event title
        'date': '.date',                     # Date element
        'time': '.time',                     # Time element (optional)
        'image': 'img',                      # Event image
        'link': 'a.event-link',              # Link to detail page
    },
    
    'detail_selectors': {                     # For detail pages (optional)
        'description': '.description p',
        'ticket_link': 'a.buy-ticket',
        'price': '.price',
    },
    
    'use_detail_pages': True,                 # Visit detail pages for more info
    'date_in_title': False,                   # If date is part of title
},
```

4. **Test it**:

```bash
python website-scrapers/generic_scraper.py my-venue --dry-run --debug
```

### Option 2: Custom Scraper (Advanced)

For complex websites or special requirements, create a custom scraper:

1. **Copy the template**:

```bash
cp website-scrapers/grelle-forelle.py website-scrapers/my-venue.py
```

2. **Extend BaseVenueScraper**:

```python
from base_scraper import BaseVenueScraper

class MyVenueScraper(BaseVenueScraper):
    # Set venue properties
    VENUE_NAME = "My Venue"
    VENUE_ADDRESS = "Street 123, 1010 Wien"
    BASE_URL = "https://my-venue.com"
    EVENTS_URL = "https://my-venue.com/events/"
    
    def scrape_events(self) -> List[Dict]:
        """Implement your scraping logic here"""
        soup = self.fetch_page(self.EVENTS_URL)
        events = []
        
        # Your custom scraping code
        for item in soup.select('div.event'):
            event_data = {
                'title': item.select_one('h2').text,
                'date': self.parse_german_date(item.select_one('.date').text),
                # ... extract more fields
            }
            events.append(event_data)
        
        return events
```

3. **Use base class methods**:
   - `fetch_page(url)` - Fetch and parse HTML
   - `parse_german_date(text)` - Parse German dates
   - `parse_time(text)` - Extract time
   - `extract_price(text)` - Extract price
   - `is_future_event(date)` - Check if event is upcoming

## 📋 Configuration Reference

### Required Fields

```python
{
    'venue_name': 'Venue Name',              # Official venue name
    'venue_address': 'Full address',         # Full address
    'base_url': 'https://venue.com',         # Base URL for relative links
    'events_url': 'https://venue.com/events',# Events page URL
    'category': 'Clubs/Discos',              # Event category
    'subcategory': 'Electronic',             # Subcategory
}
```

### List Selectors

CSS selectors for the main event listing page:

```python
'list_selectors': {
    'event_container': 'div.event',      # REQUIRED: Each event item
    'title': 'h2',                       # Event title
    'date': '.date',                     # Date text
    'time': '.time',                     # Time text
    'image': 'img',                      # Event image
    'link': 'a',                         # Link to detail page
}
```

### Detail Selectors (Optional)

For extracting additional info from detail pages:

```python
'detail_selectors': {
    'description': '.description p',      # Full description
    'ticket_link': 'a.ticket',           # Ticket purchase link
    'price': '.price',                   # Price information
    'image': 'img.main',                 # Higher quality image
}
```

### Options

```python
'use_detail_pages': True,     # Visit detail pages for more info
'date_in_title': False,       # Parse date from title (DD/MM format)
```

## 🔍 Finding CSS Selectors

### Using Browser DevTools

1. **Open the events page** in Chrome/Firefox
2. **Press F12** to open DevTools
3. **Click the inspector** (cursor icon)
4. **Hover over an event** on the page
5. **Look at the HTML** in DevTools
6. **Identify the selector**:
   - Class: `.event-item` or `div.event-item`
   - ID: `#event-123`
   - Tag: `article`, `div`, etc.
   - Attribute: `[data-event-id]`

### Testing Selectors

In browser console:

```javascript
// Test if selector works
document.querySelectorAll('div.event')  // Should return event elements

// Count events
document.querySelectorAll('div.event').length

// Test nested selector
document.querySelector('div.event h2').textContent
```

## 📝 Event Data Structure

Scrapers should return events with this structure:

```python
{
    'title': 'Event Title',
    'date': '2025-11-20',              # YYYY-MM-DD format
    'time': '23:00',                   # HH:MM format
    'description': 'Full description',
    'image_url': 'https://...',
    'detail_url': 'https://...',       # Event page URL
    'ticket_url': 'https://...',       # Ticket purchase URL
    'price': 'ab €15',                 # or 'Free / Gratis'
    'artists': ['Artist 1', 'Artist 2'],
    'age_restriction': '18+',          # Optional
}
```

## 🧪 Testing Your Scraper

### 1. Dry Run (No Database)

```bash
python website-scrapers/generic_scraper.py my-venue --dry-run
```

Shows all events found without saving to database.

### 2. Debug Mode

```bash
python website-scrapers/generic_scraper.py my-venue --dry-run --debug
```

Shows detailed parsing information and full JSON output.

### 3. Production Run

```bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your_url"
export SUPABASE_SERVICE_ROLE_KEY="your_key"

# Run scraper
python website-scrapers/generic_scraper.py my-venue
```

## 🚀 Scheduled Execution

### Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Run daily at 6 AM
0 6 * * * cd /path/to/where2go-clean && python3 website-scrapers/generic_scraper.py my-venue

# Run multiple venues
0 6 * * * cd /path/to/where2go-clean && python3 website-scrapers/run_all_scrapers.sh
```

### Python Script

```python
#!/usr/bin/env python3
"""Run all configured venue scrapers"""
from venue_configs import list_venues
from generic_scraper import GenericVenueScraper, get_venue_config

for venue_key in list_venues():
    print(f"\n{'='*70}")
    print(f"Scraping: {venue_key}")
    print('='*70)
    
    config = get_venue_config(venue_key)
    scraper = GenericVenueScraper(config)
    result = scraper.run()
    
    if not result['success']:
        print(f"⚠️ Errors occurred for {venue_key}")
```

## 📊 Common Patterns

### Pattern 1: WordPress Events Plugin

Many venues use WordPress with an events plugin:

```python
'list_selectors': {
    'event_container': 'article.event, div.tribe-event',
    'title': 'h2.entry-title, .tribe-event-title',
    'date': '.event-date, time.tribe-event-date-start',
    'link': 'a.tribe-event-url',
}
```

### Pattern 2: Custom Event Cards

Modern sites with custom designs:

```python
'list_selectors': {
    'event_container': 'div[class*="event"], article[class*="event"]',
    'title': 'h2, h3, [class*="title"]',
    'date': '[class*="date"], time',
    'image': 'img[src*="event"], img[class*="event"]',
}
```

### Pattern 3: Date in Title

Some venues include date in the title (e.g., "21/11 Event Name"):

```python
'date_in_title': True,  # Automatically extracts DD/MM from title
```

## ⚠️ Troubleshooting

### No Events Found

1. **Check selectors** - Open DevTools and verify CSS selectors
2. **Check for JavaScript** - Page might load events dynamically
3. **Try different selectors** - Use `div[class*="event"]` for partial matches

### JavaScript-Rendered Content

If the page uses React/Vue/Angular:

```python
# The generic scraper won't work
# You need Selenium - see ra-scraper-scripts for examples
```

### Wrong Dates

Check date format:
- DD.MM.YYYY → Use `parse_german_date()`
- DD/MM → Set `'date_in_title': True`
- Custom format → Override parsing in custom scraper

### Missing Images

Try multiple selectors:

```python
'image': 'img, [style*="background-image"]'
```

Or fetch from detail page:

```python
'detail_selectors': {
    'image': 'img[class*="main"], img[class*="featured"]'
}
```

## 📚 Examples

See `grelle-forelle.py` for a complete custom scraper example.

See `venue_configs.py` for configuration examples.

## 🤝 Contributing

When adding a new venue:

1. Test thoroughly with `--dry-run --debug`
2. Verify all events are captured
3. Check date/time parsing
4. Ensure images load
5. Document any special handling needed

## 📞 Support

For issues or questions, check:
- This guide
- `base_scraper.py` source code
- `grelle-forelle.py` example
- Browser DevTools for selector debugging
