# Venue Scraper Quick Reference Guide

## Common Issues & Solutions

### Issue: Scraper Returns 0 Events
**Check these in order:**
1. **URL verification** - Visit the URL in a browser, check if it returns 404
2. **Selector validation** - Open browser DevTools, test CSS selectors
3. **JavaScript rendering** - Some sites load content dynamically (add `javascript_rendered: True`)
4. **Authentication** - Some sites require login or have bot protection

### Issue: Wrong URL Patterns
**Common mistakes:**
- ❌ `/programm/` → Use `/program` or `/events/` (check actual site)
- ❌ `/events/` → Some use main page `/` for events (Pratersauna, Celeste)
- ❌ `www.subdomain` → Some sites redirect from www (Volksgarten, Flucc)
- ❌ Wrong TLD → Das Werk uses `.org` not `.at`

**Always verify:**
```bash
curl -I https://venue-url.com/events/  # Check for 404 or redirects
```

### Issue: Generic Selectors Don't Work
**Bad patterns that fail:**
```python
'event_container': 'div.event, article'  # Too generic
'title': 'h2, h3'                         # Too broad
'date': '.date'                           # Too common
```

**Good patterns that work:**
```python
'event_container': 'article.eventBox'           # Specific class
'title': 'h3.eventBox-title'                    # Exact selector
'date': 'time.eventBox-date'                    # Semantic HTML + class
```

## WordPress Plugin Detection

### EventON Plugin (U4)
**Indicators:**
- Class names: `eventon_list_event`, `evo_event`, `evo_event_title`
- URL patterns: Often use `/events-veranstaltungen/`

**Selectors:**
```python
'wordpress_eventon': True,
'event_container': 'div.eventon_list_event, article.evo_event',
'title': 'h3.evo_event_title',
'date': 'span.evo_date',
'time': 'span.evo_time',
```

### The Events Calendar Plugin (Camera Club, Flucc)
**Indicators:**
- Class names: `tribe-events`, `tribe-event-title`, `tribe-event-date`
- URL patterns: `/events/`, `/events/list/`

**Selectors:**
```python
'wordpress_tribe_events': True,
'event_container': 'article.tribe-events-list-widget-events',
'title': 'h3.tribe-event-title',
'date': 'time.tribe-event-date',
'link': 'a.tribe-event-url',
```

### WordPress Block Editor (Pratersauna)
**Indicators:**
- Class names: `wp-block-group`, `wp-block-heading`, `wp-block-image`

**Selectors:**
```python
'event_container': 'div.wp-block-group, article.event-post',
'title': 'h2, .wp-block-heading',
'image': 'figure.wp-block-image img',
```

## Special Parsing Strategies

### Pipe-Separated Data (Celeste)
**Structure:** `TITLE 28-11 | 20:00-06:00 | Club LD Smash & GHC | live`

**Config:**
```python
'parsing_strategy': 'single_cell_pipe_separated',
'regex_patterns': {
    'title': r'^([A-Z\s!]+)',
    'date': r'(\d{1,2}-\d{1,2})',
    'time': r'(\d{2}:\d{2}-\d{2}:\d{2})',
    'type': r'\|\s*(Club|Concert)',
    'lineup': r'\|(.*?)\|',
}
```

### Dual URL Scraping (Chelsea)
**Two separate pages:**
- `concerts.php` - Concert events
- `clubs.php` - Club events

**Config:**
```python
'requires_dual_scraping': True,
'additional_urls': {
    'clubs': 'https://www.chelsea.co.at/clubs.php',
    'concerts': 'https://www.chelsea.co.at/concerts.php',
}
```

### Monthly Grouping (B72)
**Structure:** Month header (h3: "SEPTEMBER") followed by events

**Config:**
```python
'parsing_strategy': 'grouped_by_month',
'list_selectors': {
    'month_header': 'h3',
    'event_container': 'div.event-item, li.program-event, p',
    'date': 'span.date, time',  # DD.MM format
}
```

## Venue Categories Reference

### 🟢 Ready for Direct Scraping (17 venues)
Well-structured websites, specific selectors configured:
- Grelle Forelle, Flex, Pratersauna, B72, Das Werk, U4
- Cabaret Fledermaus, Camera Club, Celeste, Chelsea
- Flucc, O der Klub, Prater Dome, Praterstrasse
- SASS Music Club, The Loft, rhiz

### 🟡 Need External Aggregators (4 venues)
Minimal websites, better data from aggregators:
- **Volksgarten** → Facebook/Instagram primary
- **Club U** → Use frey-tag.at
- **Donau** → Use Instagram
- **Babenberger Passage** → Use events.at

### 🔵 Static Weekly Programs (3 venues)
No dynamic event lists, recurring schedules only:
- **Tanzcafé Jenseits** - Jazz/Swing rotation
- **Why Not** - LGBTQ+ club, Fri/Sat schedule
- **VIEiPEE** - Hip-Hop club, weekly themes

### 🔴 Closed Venues (1 venue)
- **Ponyhof** - Closed July 24, 2025
  - `scraping_enabled: False`
  - Monitor Instagram for possible reopening

## Testing Workflow

### Quick Test (Dry Run)
```bash
cd website-scrapers
python3 generic_scraper.py <venue-key> --dry-run
```

### Debug Mode (Verbose Output)
```bash
python3 generic_scraper.py <venue-key> --dry-run --debug
```

### Test All Venues
```bash
python3 run_all_scrapers.py --dry-run
```

### Test Specific Group
```bash
python3 run_all_scrapers.py --dry-run --venues flex pratersauna b72
```

## Selector Development Process

### 1. Open Venue Website
```bash
# Open in browser with DevTools
open https://venue-url.com/events/
```

### 2. Inspect Event Container
- Right-click on event card → Inspect
- Find the common container element
- Note specific class names (not generic ones)

### 3. Test Selector in Console
```javascript
// Browser console
document.querySelectorAll('article.eventBox').length
// Should return number of events
```

### 4. Map All Fields
Find selectors for each field:
- Title: Usually h2/h3 with specific class
- Date: Look for `<time>` tags or `.date` classes
- Image: Find `<img>` within container
- Link: Usually `<a>` with `href` to detail page

### 5. Add to Config
```python
'list_selectors': {
    'event_container': 'article.eventBox',  # From step 2
    'title': 'h3.eventBox-title',           # From step 4
    'date': 'time.eventBox-date',           # From step 4
    'image': 'img.eventBox-image',          # From step 4
    'link': 'a.eventBox-link',              # From step 4
}
```

### 6. Test & Iterate
```bash
python3 generic_scraper.py <venue> --dry-run --debug
```

## Common Selector Patterns

### Event Container
```python
# Modern sites
'article.event'
'div.event-card'
'article.eventBox'

# WordPress
'div.eventon_list_event'
'article.tribe-events-list-widget-events'
'div.wp-block-group'

# Table-based
'table tr'
'tr.event-row'
```

### Title
```python
# Semantic
'h2.event-title'
'h3.eventBox-title'

# WordPress
'h3.evo_event_title'
'h3.tribe-event-title'

# Table
'td:nth-child(2)'
'strong'
```

### Date/Time
```python
# Semantic HTML
'time.event-date'
'time.eventBox-date'

# WordPress
'span.evo_date'
'time.tribe-event-date'

# Generic
'.date'
'span.date'
```

## Date Format Patterns

```python
'DD.MM.YYYY'    # 20.11.2024 (German standard)
'DD.MM.YY'      # 20.11.24
'DD.MM'         # 20.11 (year from context)
'DD-MM'         # 20-11 (Celeste)
'DD/MM'         # 20/11 (date in title)
'ddd, DD.MM.'   # So, 20.11. (Chelsea)
'ddd. DD.MM.YYYY' # Do. 20.11.2024 (The Loft)
```

## Multi-Room/Floor Venues

### Multiple Rooms (Flucc, The Loft)
```python
'has_multiple_rooms': True,
'rooms': ['FLUCC DECK', 'FLUCC WANNE'],
# or
'rooms': ['Oben', 'Unten', 'Wohnzimmer'],

'list_selectors': {
    'location': '.tribe-events-venue, .event-location',
}
```

### Multiple Floors (Prater Dome)
```python
'has_multiple_floors': True,
'detail_selectors': {
    'floor': '.floor',  # Main, Club, Hip Hop
}
```

## Alternative Data Sources

### Social Media Sources
```python
'alternative_sources': {
    'facebook': 'https://www.facebook.com/venue-page',
    'instagram': '@venue_handle',
}
'primary_source': 'social_media'
```

### Aggregator Sources
```python
'alternative_sources': {
    'events_at': 'https://events.at/venue/venue-name',
    'freytag': 'https://frey-tag.at/locations/venue-name',
    'goodnight': 'https://goodnight.at/locations/123-venue-name',
    'wien_info': 'https://www.wien.info/.../venue-name',
}
'scraping_strategy': 'external_aggregators'
```

## Adding New Venues

### 1. Research Venue
- Visit website
- Check for event listings
- Identify website technology (WordPress, custom, etc.)
- Note URL patterns

### 2. Create Config Entry
```python
'venue-key': {
    'venue_name': 'Venue Name',
    'venue_address': 'Full Address, Postal Code Wien',
    'base_url': 'https://venue-website.com',
    'events_url': 'https://venue-website.com/events/',  # Verified!
    'category': 'Clubs & Nachtleben',
    'subcategory': 'Electronic',
    
    'list_selectors': {
        'event_container': 'SPECIFIC_SELECTOR',
        'title': 'SPECIFIC_SELECTOR',
        'date': 'SPECIFIC_SELECTOR',
        'link': 'SPECIFIC_SELECTOR',
    },
    
    'use_detail_pages': True,  # Set False if all info on list page
}
```

### 3. Test Thoroughly
```bash
# Dry run
python3 generic_scraper.py venue-key --dry-run --debug

# Check output
# - Are events found?
# - Are dates parsed correctly?
# - Are titles clean?
# - Are URLs absolute?
```

### 4. Document Special Cases
If venue requires special handling, document in:
- Config comments
- VENUE_CONFIGS_UPDATE.md
- This QUICK_REFERENCE.md

## Troubleshooting Checklist

- [ ] URL returns 200 status (not 404)
- [ ] Event container selector finds elements
- [ ] Title selector returns text
- [ ] Date format is recognized
- [ ] Images are absolute URLs
- [ ] Links are absolute URLs
- [ ] No bot protection blocking requests
- [ ] JavaScript rendering not required (or handled)
- [ ] WordPress plugin detected (if applicable)
- [ ] Special parsing strategy configured (if needed)

## Key Files

- `venue_configs.py` - All venue configurations
- `generic_scraper.py` - Main scraper using configs
- `base_scraper.py` - Base class with utilities
- `VENUE_CONFIGS_UPDATE.md` - Detailed change documentation
- `QUICK_REFERENCE.md` - This file

## Success Metrics

**Target Success Rate:** 68-80% (17-20 out of 25 venues)

**Current Status:**
- Phase 1 (URL fixes): 40% → 10/25 venues
- Phase 2 (WordPress): 48% → 12/25 venues
- Phase 3 (Special parsers): 60% → 15/25 venues
- Phase 4 (Full implementation): 68-80% → 17-20/25 venues

**Excluded from metrics:**
- Ponyhof (closed)
- Static weekly programs (3 venues)

## Contact

For questions or issues:
1. Check this quick reference
2. Review VENUE_CONFIGS_UPDATE.md
3. Test with `--dry-run --debug`
4. Document findings
5. Update configs and documentation
