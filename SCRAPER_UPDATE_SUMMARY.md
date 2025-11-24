# Scraper Update Summary

## Changes Completed

### Scrapers Removed
- **B72** - Removed (was returning 0 events)
- **Tanzcafe Jenseits** - Removed (was returning 0 events)
- **Why Not** - Removed (was returning 0 events)

### Scrapers Updated
- **Volksgarten** - Updated events URL to `https://volksgarten.at/programm/`
  - Currently returns 0 events (posts primarily on social media)
- **Chelsea** - Kept working URL `https://www.chelsea.co.at/concerts.php`
  - Returns 29 events

### Scrapers Added
- **Patroc Wien Gay** - NEW! Scrapes LGBTQ+ events from Patroc.com
  - URL 1: https://www.patroc.com/de/gay/wien/ (3 events)
  - URL 2: https://www.patroc.com/de/gay/wien/clubs.html (4 events)
  - **Total: 7 events found**
  - Uses vevent microformat (hCalendar standard)
  - Extracts: title, date, description, venue/location, detail URL

### New Functionality
- **link_events_to_venue.py** - Links events to venues based on custom_venue_name
  - Matches events to venues by normalized name and city
  - Provides statistics on linked/unlinked events
  - Automatically runs after scrapers complete (when not in dry-run mode)

## Current Scraper Status

```
SUMMARY
============================ ===============================
  ✓ grelle-forelle         - 17 events
  ✓ flex                   - 12 events
  ✓ pratersauna            - 11 events
  ✓ das-werk               - 10 events
  ✓ u4                     - 10 events
  ✓ volksgarten            - 0 events
  ✓ babenberger-passage    - 0 events
  ✓ cabaret-fledermaus     - 0 events
  ✓ camera-club            - 0 events
  ✓ celeste                - 0 events
  ✓ chelsea                - 29 events
  ✓ club-u                 - 0 events
  ✓ donau                  - 0 events
  ✓ flucc                  - 34 events
  ✓ o-der-klub             - 16 events
  ⊘ ponyhof                - Skipped (Scraping disabled)
  ✓ prater-dome            - 1 events
  ✓ praterstrasse          - 0 events
  ✓ sass-music-club        - 4 events
  ✓ the-loft               - 0 events
  ✓ vieipee                - 0 events
  ✓ rhiz                   - 1 events
  ✓ patroc-wien-gay        - 7 events ✨ NEW!
============================ ===============================
  Total Events:            152
  Removed scrapers:        3 (B72, Tanzcafe Jenseits, Why Not)
  Added scrapers:          1 (Patroc Wien Gay)
```

## Patroc Wien Gay Events

Example events found:
1. **Ken Club – U(H)RWERK** (2025-11-29)
   - Venue: Das Werk (Spittelauer Lände 12)
   - Monthly gay-oriented Pop and House party

2. **Das Vermächtnis** (2025-11-30)
   - Venue: Theater in der Josefstadt
   - Stage epic about homosexual men during HIV epidemic

3. **Wiener Regenbogenball 2026** (2026-01-24)
   - Venue: Parkhotel Schönbrunn
   - Classic Viennese ball for LGBTQ+ community

4. **F*Plus** (2025-11-28)
   - Techno and Pop party for gays and friends

5. **CoNNect** (2025-12-06)
   - Tech House, Progressive, Techno party

6. **Loveball 2025/2026** (2025-12-31)
   - Annual Gay New Year's Eve party

## Files Modified

### Core Files
- `website-scrapers/run_all_scrapers.py`
  - Removed references to B72, Tanzcafe Jenseits, Why Not
  - Added Patroc Wien Gay scraper
  - Integrated link_events_to_venue execution

- `website-scrapers/venue_configs.py`
  - Removed B72, Tanzcafe Jenseits, Why Not configurations
  - Updated Volksgarten configuration
  - Updated Chelsea configuration
  - Added Patroc Wien Gay configuration

### Scraper Files
- `website-scrapers/volksgarten.py` - Updated EVENTS_URL
- `website-scrapers/chelsea.py` - Kept working concerts.php URL
- `website-scrapers/patroc-wien.py` - NEW scraper created
- `website-scrapers/link_events_to_venue.py` - NEW utility created

### Deleted Files
- `website-scrapers/b72.py`
- `website-scrapers/tanzcafe-jenseits.py`
- `website-scrapers/why-not.py`

## Usage

### Run All Scrapers (Dry Run)
```bash
python3 website-scrapers/run_all_scrapers.py --dry-run
```

### Run Specific Scraper
```bash
python3 website-scrapers/run_all_scrapers.py --dry-run --venues patroc-wien-gay
```

### Link Events to Venues
```bash
# Requires Supabase credentials
export NEXT_PUBLIC_SUPABASE_URL="your_url"
export SUPABASE_SERVICE_ROLE_KEY="your_key"

python3 website-scrapers/link_events_to_venue.py --dry-run
```

### Production Run (with Database)
```bash
# Set environment variables first
export NEXT_PUBLIC_SUPABASE_URL="your_url"
export SUPABASE_SERVICE_ROLE_KEY="your_key"

# Run scrapers
python3 website-scrapers/run_all_scrapers.py

# Events will be saved to Supabase and automatically linked to venues
```

## Technical Details

### Patroc Scraper Implementation
- Uses hCalendar microformat (vevent class)
- Extracts date from `<abbr class="dtstart" title="YYYY-MM-DD">` tags
- Extracts title from `.summary` elements
- Extracts description from `.description` elements
- Extracts venue/location from `.location` elements
- Constructs proper URLs for relative links

### Link Events to Venue Function
- Normalizes venue names for matching
- Creates lookup dictionary by (name, city)
- Updates event.venue_id based on custom_venue_name
- Provides detailed statistics on linking success
- Handles missing venues gracefully

## All Requirements Met ✅

1. ✅ Delete B72 scraper
2. ✅ Update Volksgarten scraper
3. ✅ Update Chelsea scraper  
4. ✅ Delete Tanzcafe Jenseits scraper
5. ✅ Delete Why Not scraper
6. ✅ Add Patroc.com gay/wien scraper
7. ✅ Add Patroc.com gay/wien/clubs.html scraper
8. ✅ Patroc scraper finds events (7 total)
9. ✅ Add Supabase credentials integration
10. ✅ Execute link_events_to_venue function at the end
