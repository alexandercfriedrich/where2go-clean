#!/usr/bin/env python3
"""
Run all configured venue scrapers sequentially.

Usage:
    python website-scrapers/run_all_scrapers.py [--dry-run] [--debug]
"""

import sys
import os
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from generic_scraper import GenericVenueScraper
from venue_configs import get_venue_config, list_venues


# Import dedicated scrapers
def import_scraper(venue_key):
    """Import dedicated scraper for a venue if it exists"""
    scraper_map = {
        'grelle-forelle': ('grelle-forelle', 'GrelleForelleScraper'),
        'flex': ('flex', 'FlexScraper'),
        'pratersauna': ('pratersauna', 'PratersaunaScraper'),
        'das-werk': ('das-werk', 'DasWerkScraper'),
        'o-der-klub': ('o-klub', 'OKlubScraper'),
        'volksgarten': ('volksgarten', 'VolksgartenScraper'),
        'flucc': ('flucc-wanne', 'FluccWanneScraper'),
        'praterstrasse': ('praterstrasse', 'PraterstrasseScraper'),
        'prater-dome': ('praterdome', 'PraterdomeScraper'),
        'sass-music-club': ('sass', 'SassScraper'),
        'babenberger-passage': ('babenberger-passage', 'BabenbergerPassageScraper'),
    }
    
    if venue_key in scraper_map:
        module_name, class_name = scraper_map[venue_key]
        try:
            module = __import__(module_name)
            return getattr(module, class_name)
        except (ImportError, AttributeError) as e:
            print(f"⚠️  Could not import dedicated scraper for {venue_key}: {e}")
            return None
    
    return None


def main():
    parser = argparse.ArgumentParser(description='Run all venue scrapers')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--venues', nargs='+', help='Specific venues to scrape (default: all)')
    args = parser.parse_args()
    
    # Get venues to scrape
    if args.venues:
        venues_to_scrape = args.venues
    else:
        venues_to_scrape = list_venues()
    
    print("=" * 70)
    print(f"Running scrapers for {len(venues_to_scrape)} venues")
    print("=" * 70)
    
    results = {}
    
    for venue_key in venues_to_scrape:
        print(f"\n{'=' * 70}")
        print(f"Venue: {venue_key}")
        print('=' * 70)
        
        config = get_venue_config(venue_key)
        if not config:
            print(f"❌ Unknown venue: {venue_key}")
            results[venue_key] = {'success': False, 'error': 'Unknown venue'}
            continue
        
        # Skip venues where scraping is disabled (e.g., closed venues)
        if config.get('scraping_enabled') is False:
            print(f"⚠️  Skipping {venue_key}: scraping disabled (venue {config.get('status', 'inactive')})")
            results[venue_key] = {'success': False, 'error': 'Scraping disabled', 'skipped': True}
            continue
        
        try:
            # Try to use dedicated scraper first
            ScraperClass = import_scraper(venue_key)
            
            if ScraperClass:
                print(f"ℹ Using dedicated scraper for {venue_key}")
                scraper = ScraperClass(dry_run=args.dry_run, debug=args.debug)
            else:
                print(f"ℹ Using generic scraper for {venue_key}")
                scraper = GenericVenueScraper(config, dry_run=args.dry_run, debug=args.debug)
            
            result = scraper.run()
            results[venue_key] = result
        except Exception as e:
            print(f"❌ Error running scraper for {venue_key}: {e}")
            results[venue_key] = {'success': False, 'error': str(e)}
    
    # Print summary
    print(f"\n{'=' * 70}")
    print("SUMMARY")
    print('=' * 70)
    
    total_events = 0
    total_inserted = 0
    total_updated = 0
    total_errors = 0
    skipped = 0
    
    for venue_key, result in results.items():
        if result.get('skipped'):
            skipped += 1
            print(f"  ⊘ {venue_key:20s} - Skipped ({result.get('error', 'Disabled')})")
        elif result.get('success'):
            events = result.get('events_count', 0)
            stats = result.get('stats', {})
            total_events += events
            total_inserted += stats.get('inserted', 0)
            total_updated += stats.get('updated', 0)
            total_errors += stats.get('errors', 0)
            
            print(f"  ✓ {venue_key:20s} - {events} events")
        else:
            print(f"  ✗ {venue_key:20s} - {result.get('error', 'Failed')}")
    
    print(f"\n{'=' * 70}")
    print(f"  Total Events:  {total_events}")
    print(f"  Inserted:      {total_inserted}")
    print(f"  Updated:       {total_updated}")
    print(f"  Errors:        {total_errors}")
    if skipped > 0:
        print(f"  Skipped:       {skipped}")
    print('=' * 70)
    
    return 0 if total_errors == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
