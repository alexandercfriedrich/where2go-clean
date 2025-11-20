# Evaluation of ra-scraper (manuelzander/ra-scraper)

## Date: 2025-11-20

## Executive Summary

This document evaluates the feasibility of using the `ra-scraper` project from https://github.com/manuelzander/ra-scraper for scraping Resident Advisor (RA) events.

## Project Overview

**Repository**: https://github.com/manuelzander/ra-scraper  
**Description**: Scraper for Resident Advisor (https://residentadvisor.net/) events, prices and lineups using scrapy  
**Technology**: Python 3.7, Scrapy framework  
**Last Updated**: Based on GitHub API, the project appears to be from 2020  

## Key Features

The ra-scraper provides:

1. **Event scraping** - Basic event information (date, title, venue, city)
2. **Lineup scraping** - Artists performing at events
3. **Price scraping** - Ticket prices (sold out and on-sale)
4. **Recursive scraping** - Can follow artists mentioned in lineups
5. **Email notifications** - Can send scraped results via email

## Installation Issues Found

### Dependency Compatibility Problems

1. **Python Version Mismatch**
   - Project requires Python 3.7.5
   - Modern environments use Python 3.12+
   - Python 3.12 removed `distutils` module which breaks old setuptools

2. **Outdated Dependencies**
   - `lxml==4.6.3` - Old version with build issues
   - `Scrapy==2.11.2` - Relatively recent but dependencies are old
   - `Twisted==24.7.0` - Updated but conflicts with other old packages
   - `cryptography==43.0.1` - Recent but conflicts with old packages
   - `black==24.3.0` - Recent formatter but package structure changed

3. **System Requirements**
   - Requires libxml2-dev and libxslt1-dev system packages
   - Needs python3-dev for building extensions

### Installation Attempt Results

```
Status: FAILED
Error: ModuleNotFoundError: No module named 'distutils'
Root Cause: Python 3.12 removed distutils, old packages depend on it
```

## Technical Analysis

### How ra-scraper Works

The scraper:
1. Reads artist names from `scraper/artists.txt`
2. Constructs URLs like `https://www.residentadvisor.net/dj/{artist_name}`
3. Uses CSS selectors to extract event data from HTML
4. Follows event links to get detailed information (lineup, prices)
5. Exports data to JSONL files

### Data Quality

Based on the README examples, it provides:
- Event ID (RA event ID)
- Date (formatted as "Tue, 31 Dec 2019")
- Title
- Link to RA event page
- Venue name
- City
- Lineup (array of artist names)
- Prices (both closed and on-sale, with currency)

### Limitations

1. **Web Scraping Fragility**
   - Relies on CSS selectors that break when RA updates their HTML
   - No API access, violates RA terms of service potentially
   - Rate limiting and blocking risks

2. **Maintenance Status**
   - Project appears unmaintained (4+ years old)
   - Dependencies are outdated
   - No recent commits addressing modern Python versions

3. **Limited Scope**
   - Requires pre-configured artist list
   - No city/date-based event discovery
   - Cannot browse events by location

## Current where2go Implementation

The where2go-clean repository already has a Resident Advisor integration at:
`app/lib/sources/residentAdvisor.ts`

### Current Approach
- Uses RSS feeds from RA
- Simpler and more reliable than web scraping
- No dependency on Python ecosystem
- Respects RA's provided data format

### Current Implementation Benefits
- **RSS is official**: RA provides RSS feeds intentionally
- **Stable**: RSS format changes less than HTML
- **Lightweight**: No heavy dependencies
- **TypeScript**: Integrated with existing codebase
- **No rate limits**: RSS is meant to be consumed

## Recommendations

### ❌ Do NOT Integrate ra-scraper

**Reasons:**
1. **Incompatible Dependencies**: Cannot install on modern Python versions
2. **Maintenance Burden**: Would require significant effort to update all dependencies
3. **Legal/Ethical Concerns**: Web scraping may violate RA's terms of service
4. **Fragility**: CSS selectors break easily with website updates
5. **Redundant**: Current RSS-based approach is better

### ✅ Improve Current RSS Implementation

Instead, enhance the existing `residentAdvisor.ts`:

1. **Better RSS parsing**: Extract more detailed information from RSS items
2. **Multiple RSS feeds**: Support different RA RSS feeds (by city, by genre)
3. **Event details**: Parse RA's RSS description field for venue, lineup hints
4. **Caching**: Implement proper caching as already done for other sources
5. **Error handling**: Add retry logic and better error messages

## Conclusion

The `ra-scraper` project **does not work** with modern Python versions and would require significant effort to fix. More importantly, it's the wrong technical approach compared to the existing RSS-based solution.

**Verdict**: ❌ ra-scraper is NOT suitable for integration

**Current Status of RA in where2go**: ⚠️ RSS feeds blocked by bot protection

## Action Items for where2go-clean

Based on these findings, here are the recommended actions:

### 1. Assess Current RA Integration (HIGH PRIORITY)

The current `residentAdvisor.ts` implementation is likely not working due to DataDome protection.

**Action**: Test if any events are being fetched from RA
```bash
# Check logs for RA RSS failures
# Look for 403 errors in production
```

### 2. Options for RA Integration

#### Option A: Remove RA Integration (RECOMMENDED)
- DataDome protection makes automated access unreliable
- RA may consider automated access as ToS violation
- Focus on other reliable sources (Wien.info, etc.)

**Implementation**:
- Remove `app/lib/sources/residentAdvisor.ts`
- Remove RA references from `app/api/events/route.ts`
- Remove RA from hot cities seed data
- Update documentation

#### Option B: Improve RA Integration (RISKY)
If you must keep RA:
- Use headless browser (Playwright/Puppeteer) to bypass bot detection
- Implement proper request throttling
- Rotate User-Agents
- Add cookie management
- Monitor for blocks and adapt

**Considerations**:
- Higher resource usage
- May still get blocked
- Potential ToS issues
- Maintenance burden

#### Option C: Manual RA Curation
- Don't automate RA scraping
- Manually curate selected RA events
- Use RA as reference source only

### 3. Focus on Reliable Sources

Priority should be on sources with:
- ✅ Official APIs (Wien.info)
- ✅ Sanctioned RSS feeds
- ✅ Event organizer partnerships
- ✅ No bot protection

### 4. Documentation Update

Update README and docs to reflect:
- Which sources are actively used
- Why RA is not included (bot protection)
- How users can report missing events

## Technical Details: Why ra-scraper Fails

### Dependency Issues

```
cffi==1.13.2          # Needs distutils (removed in Python 3.12)
lxml==4.6.3           # Build fails, needs libxml2-dev
Scrapy==2.11.2        # Works but deps are broken
Twisted==24.7.0       # Updated but conflicts
black==24.3.0         # Import structure changed
```

### Fix Complexity

To make ra-scraper work would require:
1. Update Python to 3.12 (or downgrade to 3.7)
2. Update ALL 30+ dependencies
3. Test for compatibility
4. Fix any breaking changes
5. Still face DataDome protection

**Estimated effort**: 20-40 hours
**Success probability**: Low (will still be blocked)

## Testing Results

### Test 1: ra-scraper Installation

**Date**: 2025-11-20

**Environment**:
- Python: 3.12.3
- OS: Ubuntu (GitHub Actions runner)

**Steps**:
1. Cloned https://github.com/manuelzander/ra-scraper
2. Created Python virtual environment
3. Attempted to install requirements.txt

**Result**: ❌ FAILED

**Error**:
```
ModuleNotFoundError: No module named 'distutils'
```

**Analysis**: 
- Python 3.12 removed distutils module
- Old package versions (cffi==1.13.2, lxml==4.6.3) require distutils
- Would need to update all dependencies to Python 3.12 compatible versions
- This would be a significant undertaking (20+ dependencies to update and test)

### Test 2: Resident Advisor Website Accessibility

**Test Date**: 2025-11-20

**Results**:

| Endpoint | Status | Notes |
|----------|--------|-------|
| https://www.residentadvisor.net/ | ✅ 200 OK | Main website accessible |
| https://ra.co/events/de/berlin/rss | ❌ 403 Forbidden | Protected by DataDome bot detection |
| https://ra.co/events/at/vienna/rss | ❌ 403 Forbidden | Protected by DataDome bot detection |
| https://ra.co/news/rss | ❌ 404 Not Found | RSS feed not available |
| https://www.residentadvisor.net/dj/solomun | ✅ 200 OK | Artist pages accessible |

**Key Finding**: 
- RA has implemented DataDome bot protection on RSS endpoints
- RSS feeds return 403 Forbidden with bot detection headers
- Main website and artist pages are accessible but require proper User-Agent
- This affects BOTH ra-scraper and current RSS-based implementation

### Test 3: Bot Protection Analysis

**Protection System**: DataDome
- Header present: `x-datadome: protected`
- Sets tracking cookie: `datadome=...`
- Blocks automated requests to RSS feeds
- May block repeated scraping attempts

**Implications**:
1. **RSS approach** (current): May work with proper User-Agent and rate limiting
2. **Scraping approach** (ra-scraper): Will be detected and blocked more easily
3. **API approach**: RA does not provide a public API
4. **Manual requests**: Would need to simulate real browser behavior

### Test 4: Current Implementation Status

The existing `app/lib/sources/residentAdvisor.ts` implementation:
- Attempts to fetch RSS feeds from ra.co
- Uses User-Agent: "where2go-bot/1.0"
- **Current Status**: Likely blocked by DataDome (403 Forbidden)
- **Needs**: Updated approach or removal if not working

