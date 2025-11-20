# RA Scraper Scripts (Uploaded by User)

This directory contains Python scripts uploaded by the repository owner for testing.

## Files

- **ra_scraper.py** - Basic Selenium scraper for RA Vienna events
- **ra_scraper_advanced.py** - Advanced version with auto-detection of CSS selectors
- **QUICKSTART.md** - Quick installation and usage guide
- **ANLEITUNG.md** - Comprehensive German documentation

## Test Results

❌ **These scripts do NOT work** due to Cloudflare bot protection.

See: `../uploaded-scripts-test-report.md` for complete test results.

## Summary

- ✅ Scripts are well-written and demonstrate good Python practices
- ✅ Installation works: `pip install selenium webdriver-manager`
- ✅ Chrome WebDriver initializes correctly
- ❌ Cloudflare blocks automated access with "Attention Required!" page
- ❌ No events can be extracted (0 found)
- ❌ Same bot protection issue as RSS feeds

## Recommendation

**Do not use these scripts** for automated scraping. The same bot protection that blocks RSS feeds also blocks Selenium-based scrapers.

Alternative approaches:
1. Focus on Wien.info and other sources with official APIs
2. Manual curation of important RA events
3. Contact Resident Advisor for official API access

## Reference

These scripts are preserved for reference and demonstrate what won't work.
