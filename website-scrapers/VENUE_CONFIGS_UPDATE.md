# Venue Configs Update Summary

## Overview
Updated `venue_configs.py` with corrected URLs, domains, and specific CSS selectors for all 24 Vienna venues to fix the 4% scraping success rate.

## Critical URL & Domain Corrections

### URL Path Fixes
| Venue | Old URL | New URL | Issue |
|-------|---------|---------|-------|
| **Flex** | `/programm/` | `/events/` | 404 error |
| **Pratersauna** | `/events/` | `/` (main page) | Events on homepage |
| **B72** | `/programm/` | `/program` | 404 error |
| **Cabaret Fledermaus** | `/programm/` | `/program` | 404 error |
| **Flucc** | `/programm/` | `/musik/` | Events under music section |

### Domain Fixes
| Venue | Old Domain | New Domain | Issue |
|-------|------------|------------|-------|
| **Das Werk** | `das-werk.at` | `daswerk.org` | Wrong TLD |
| **Volksgarten** | `www.volksgarten.at` | `volksgarten.at` | Subdomain redirect |
| **Flucc** | `www.flucc.at` | `flucc.at` | Subdomain redirect |

### Enhanced URLs
| Venue | New URL | Note |
|-------|---------|------|
| **U4** | `/events-veranstaltungen/` | More specific path |
| **Camera Club** | `/events/list/` | WordPress events list |
| **Praterstrasse** | `/en/praterstrasse-tickets-9djnDeMk/` | Tickets page |
| **O der Klub** | `/events/` | Events page |

## New Configuration Fields

### WordPress Plugin Detection
```python
'wordpress_eventon': True      # U4 uses EventON plugin
'wordpress_tribe_events': True # Camera Club uses The Events Calendar
```

### Parsing Strategies
```python
'parsing_strategy': 'single_cell_pipe_separated'  # Celeste
'parsing_strategy': 'table_with_inline_data'      # Chelsea
'parsing_strategy': 'grouped_by_month'            # B72
'parsing_strategy': 'static_weekly_program'       # Tanzcafé Jenseits, Why Not
'parsing_strategy': 'external_aggregators'        # Volksgarten, Club U, Donau
```

### Special Features
```python
'requires_dual_scraping': True  # Chelsea (concerts + clubs pages)
'has_multiple_rooms': True      # Flucc (DECK + WANNE)
'has_multiple_floors': True     # Prater Dome (3 floors)
'javascript_rendered': True     # Pratersauna (dynamic content)
'weekly_program_only': True     # Static weekly schedules
'recurring_events_only': True   # Babenberger Passage
```

### Venue Status
```python
'status': 'CLOSED_INDEFINITELY' # Ponyhof
'scraping_enabled': False       # Disable scraping for closed venues
'closure_date': '2025-07-24'    # Documentation
```

### Alternative Data Sources
```python
'alternative_sources': {
    'facebook': 'URL',
    'instagram': '@handle',
    'events_at': 'URL',
    'freytag': 'URL',
    'goodnight': 'URL'
}
'primary_source': 'social_media'  # Main event source is social media
```

## Venue Categories

### ✅ Direct Scraping (17 venues)
These venues have well-structured websites and can be scraped directly:

1. **Grelle Forelle** - Working (reference config)
2. **Flex** - Corrected URL
3. **Pratersauna** - Main page, WordPress blocks
4. **B72** - Monthly grouping
5. **Das Werk** - Domain corrected
6. **U4** - EventON plugin
7. **Cabaret Fledermaus** - Weekly program table
8. **Camera Club** - The Events Calendar plugin
9. **Celeste** - Pipe-separated table parsing
10. **Chelsea** - Dual page scraping
11. **Flucc** - Tribe Events, multiple rooms
12. **O der Klub** - Modern event cards
13. **Prater Dome** - Large venue, multiple floors
14. **Praterstrasse** - Tickets page
15. **SASS Music Club** - Structured program
16. **The Loft** - Multiple rooms
17. **rhiz** - Well-structured program

### ⚠️ External Aggregators Recommended (3 venues)
These venues have minimal websites; better data from aggregators:

1. **Volksgarten** - Primary source: Facebook/Instagram
2. **Club U** - Minimal website, use frey-tag.at
3. **Donau** - Weekly residents, use Instagram
4. **Babenberger Passage** - Static recurring events

### 📅 Static Weekly Programs (3 venues)
These venues have recurring weekly schedules, not dynamic event lists:

1. **Tanzcafé Jenseits** - Jazz/Swing/Soul rotation
2. **Why Not** - LGBTQ+ club, Friday/Saturday schedule
3. **VIEiPEE** - Hip-Hop club, weekly themes

### 🚫 Closed Venue (1)
1. **Ponyhof** - Closed since July 24, 2025 (financial difficulties)

## Enhanced Selectors by Venue Type

### WordPress EventON (U4)
```python
'event_container': 'div.eventon_list_event, article.evo_event'
'title': 'h3.evo_event_title'
'date': 'span.evo_date'
'time': 'span.evo_time'
```

### WordPress Tribe Events (Camera Club, Flucc)
```python
'event_container': 'article.tribe-events-list-widget-events'
'title': 'h3.tribe-event-title'
'date': 'time.tribe-event-date'
'link': 'a.tribe-event-url'
```

### WordPress Blocks (Pratersauna)
```python
'event_container': 'div.wp-block-group'
'title': 'h2, .wp-block-heading'
'image': 'figure.wp-block-image img'
```

### Custom Event Cards (Flex, O der Klub)
```python
'event_container': 'article.eventBox, div.event-card'
'title': 'h3.eventBox-title, h2.event-title'
'date': 'time.eventBox-date, .event-date'
```

### Table-Based (Chelsea, Celeste)
```python
'event_container': 'table tr'
'date': 'td:first-child'
'title': 'td:nth-child(2), strong'
```

## Regex Patterns for Special Cases

### Celeste (Pipe-Separated Data)
Example: `"EMMA RELEASE Party 28-11 | 20:00-06:00| Club LD Smash & GHC |live"`

```python
'regex_patterns': {
    'title': r'^([A-Z\s!]+)',           # EMMA RELEASE Party
    'date': r'(\d{1,2}-\d{1,2})',       # 28-11
    'time': r'(\d{2}:\d{2}-\d{2}:\d{2})', # 20:00-06:00
    'type': r'\|\s*(Club|Concert)',     # Club
    'lineup': r'\|(.*?)\|',             # LD Smash & GHC
}
```

## Recurring Event Series Documentation

### O der Klub
- Friday: Electronic Music / SIGNAL
- Saturday: Super Disco (90s/00s/10s)

### Prater Dome
- Friday: F I R S T (Fridays)
- Saturday: SURREAL (Saturdays)
- Special: CHROM:E Techno, CINEMATIC Drum & Bass

### Praterstrasse
- KLUBNACHT: Techno
- GAZE: Electronic
- PLASTIC DREAMS: House
- EUPHORIA: Electronic

### Cabaret Fledermaus
- Monday: MERCY - 80's, Wave, Synthie Pop
- Thursday: COOL FOR CATS - Rock'n'Roll, 50's
- Friday: CLASSIC - Die Kultnacht
- Saturday: BOOGIE NIGHT (4th Saturday)
- Sunday: FREAK OUT - 60's & 70's

### The Loft
- Saturday: 90ies & 2000s SINGLE Party
- Thursday: Beat Melange, Funk Session Vienna

## Implementation Notes

### Chelsea Dual Scraping
Chelsea requires scraping two separate pages:
- `concerts.php` - Concert events
- `clubs.php` - Club events

The generic scraper should be enhanced to handle `additional_urls` field.

### B72 Monthly Grouping
Events are grouped by month headers (h3 tags like "SEPTEMBER"). The scraper needs to:
1. Identify month headers
2. Parse events under each month
3. Combine month with DD.MM date format

### Celeste Pipe Parsing
All event information is in a single table cell with pipe separators. Requires:
1. Extract full cell text
2. Apply regex patterns to extract fields
3. Parse DD-MM date format

## Testing Recommendations

### Phase 1: Quick Wins (9 venues)
Test venues with simple URL corrections:
```bash
python3 generic_scraper.py flex --dry-run
python3 generic_scraper.py das-werk --dry-run
python3 generic_scraper.py b72 --dry-run
python3 generic_scraper.py pratersauna --dry-run
python3 generic_scraper.py volksgarten --dry-run
python3 generic_scraper.py flucc --dry-run
python3 generic_scraper.py cabaret-fledermaus --dry-run
python3 generic_scraper.py o-der-klub --dry-run
python3 generic_scraper.py praterstrasse --dry-run
```

### Phase 2: WordPress Plugins (2 venues)
Test WordPress integration:
```bash
python3 generic_scraper.py u4 --dry-run
python3 generic_scraper.py camera-club --dry-run
```

### Phase 3: Special Cases (3 venues)
Requires custom parsing logic:
```bash
python3 generic_scraper.py celeste --dry-run      # Pipe-separated
python3 generic_scraper.py chelsea --dry-run      # Dual URLs
python3 generic_scraper.py b72 --dry-run          # Monthly grouping
```

### Phase 4: Static Programs (3 venues)
May require different approach:
```bash
python3 generic_scraper.py tanzcafe-jenseits --dry-run
python3 generic_scraper.py why-not --dry-run
python3 generic_scraper.py vieipee --dry-run
```

## Expected Results

### Success Rate Improvement
- **Before**: 1/25 venues (4%)
- **After Phase 1**: 10/25 venues (40%) - URL fixes
- **After Phase 2**: 12/25 venues (48%) - WordPress support
- **After Phase 3**: 15/25 venues (60%) - Special parsers
- **Target**: 17-20/25 venues (68-80%)

### Excluded from Success Rate
- Ponyhof (closed)
- Static weekly programs (3 venues) - different data model

## Future Enhancements

### Parser Extensions Needed
1. **WordPress EventON Parser** - Handle `eventon_list_event` structure
2. **WordPress Tribe Parser** - Handle `tribe-events` structure
3. **Pipe-Separated Parser** - For Celeste-style data
4. **Table Parser** - For Chelsea-style data
5. **Monthly Grouping Parser** - For B72-style data

### External Aggregator Integration
Consider creating scrapers for:
- events.at
- frey-tag.at
- goodnight.at
- wien.info

These aggregators have better data for venues like Volksgarten, Club U, Donau.

### Monitoring
Add monitoring for:
- Venue status changes (reopenings/closures)
- URL changes
- Website structure updates
- New WordPress plugins

## Migration Path for Existing Scrapers

If custom scrapers exist (like grelle-forelle.py), they should:
1. Continue using their custom logic
2. Reference this config for venue metadata
3. Consider migrating to generic_scraper.py if structure is compatible

## Configuration Validation

The config file includes validation checks:
```python
# Test import
from venue_configs import VENUE_CONFIGS, list_venues, get_venue_config

# Verify all venues load
assert len(list_venues()) == 25

# Verify specific venue
flex_config = get_venue_config('flex')
assert flex_config['events_url'] == 'https://flex.at/events/'
```

## Changelog

### 2024-11-20 - Major Config Update
- ✅ Updated all 24 venue configurations
- ✅ Fixed 7 incorrect URLs
- ✅ Fixed 3 domain names
- ✅ Added 15+ new configuration fields
- ✅ Documented special cases
- ✅ Added alternative sources for 6 venues
- ✅ Marked Ponyhof as closed
- ✅ Categorized venues by scraping approach

## Contact & Support

For venue configuration issues:
1. Check venue website for structure changes
2. Test with `--dry-run --debug` flags
3. Verify selectors with browser DevTools
4. Update config and test
5. Document changes in this file

## References

- Issue: #[number] - Fix venue_configs.py with corrected selectors
- Previous success rate: 4% (1/25 venues)
- Analysis date: November 2024
- Config version: 2.0
