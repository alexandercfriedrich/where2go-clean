#!/usr/bin/env python3
"""
Generic Venue Scraper
Uses configuration-based approach to scrape different venues.

Usage:
    python website-scrapers/generic_scraper.py <venue-key> [--dry-run] [--debug]
    
Examples:
    python website-scrapers/generic_scraper.py flex --dry-run
    python website-scrapers/generic_scraper.py pratersauna --debug
    
Available venues:
    Run with --list to see all configured venues
"""

import argparse
import sys
import os
from typing import List, Dict, Optional
import re

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper
from venue_configs import get_venue_config, list_venues


class GenericVenueScraper(BaseVenueScraper):
    """
    Generic scraper that uses venue configuration to extract events.
    """
    
    def __init__(self, config: dict, dry_run: bool = False, debug: bool = False):
        # Set venue properties from config
        self.VENUE_NAME = config['venue_name']
        self.VENUE_ADDRESS = config['venue_address']
        self.BASE_URL = config['base_url']
        self.EVENTS_URL = config['events_url']
        self.CATEGORY = config.get('category', 'Clubs/Discos')
        self.SUBCATEGORY = config.get('subcategory', 'Electronic')
        
        # Store configuration
        self.config = config
        
        # Initialize base class
        super().__init__(dry_run, debug)
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events using configuration"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        # Get list selectors
        list_sel = self.config.get('list_selectors', {})
        event_container = list_sel.get('event_container')
        
        if not event_container:
            self.log("No event_container selector configured", "error")
            return []
        
        # Find all event items
        event_items = soup.select(event_container)
        self.log(f"Found {len(event_items)} potential events")
        
        events = []
        for idx, item in enumerate(event_items, 1):
            if self.debug:
                self.log(f"Processing event {idx}/{len(event_items)}", "debug")
            
            event_data = self._parse_event_item(item, list_sel)
            
            if event_data and event_data.get('title'):
                # Visit detail page if configured
                if self.config.get('use_detail_pages') and event_data.get('detail_url'):
                    self._enrich_from_detail_page(event_data)
                
                events.append(event_data)
                
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}", "success" if status == "✓" else "warning")
        
        return events
    
    def _parse_event_item(self, item, selectors: dict) -> Optional[Dict]:
        """Parse a single event item from the list page"""
        try:
            event_data = {
                'title': None,
                'date': None,
                'time': None,
                'description': None,
                'image_url': None,
                'detail_url': None,
                'ticket_url': None,
                'price': None,
                'artists': [],
            }
            
            # Extract title
            title_sel = selectors.get('title')
            if title_sel:
                title_elem = item.select_one(title_sel)
                if title_elem:
                    event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract link
            link_sel = selectors.get('link')
            if link_sel:
                link_elem = item.select_one(link_sel)
                if link_elem and link_elem.get('href'):
                    href = link_elem['href']
                    # Make absolute URL
                    if not href.startswith('http'):
                        href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                    event_data['detail_url'] = href
            
            # Extract image
            image_sel = selectors.get('image')
            if image_sel:
                img_elem = item.select_one(image_sel)
                if img_elem:
                    src = img_elem.get('src') or img_elem.get('data-src')
                    if src:
                        if not src.startswith('http'):
                            src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                        event_data['image_url'] = src
            
            # Extract date
            date_sel = selectors.get('date')
            if date_sel:
                date_elem = item.select_one(date_sel)
                if date_elem:
                    date_text = date_elem.get_text(strip=True)
                    event_data['date'] = self.parse_german_date(date_text)
            
            # Check if date is in title
            if not event_data['date'] and self.config.get('date_in_title') and event_data['title']:
                event_data['date'] = self._extract_date_from_title(event_data['title'])
            
            # Extract time
            time_sel = selectors.get('time')
            if time_sel:
                time_elem = item.select_one(time_sel)
                if time_elem:
                    time_text = time_elem.get_text(strip=True)
                    event_data['time'] = self.parse_time(time_text)
            
            return event_data
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event item: {e}", "error")
            return None
    
    def _extract_date_from_title(self, title: str) -> Optional[str]:
        """Extract date from title (DD/MM or DD.MM format)"""
        if not title:
            return None
        
        # Look for DD/MM or DD.MM pattern
        match = re.search(r'(\d{1,2})[./](\d{1,2})', title)
        if match:
            day = int(match.group(1))
            month = int(match.group(2))
            
            # Determine year
            from datetime import datetime
            current_year = datetime.now().year
            current_month = datetime.now().month
            current_day = datetime.now().day
            
            # If month/day has passed, use next year
            if month < current_month or (month == current_month and day < current_day):
                year = current_year + 1
            else:
                year = current_year
            
            try:
                return f"{year:04d}-{month:02d}-{day:02d}"
            except:
                return None
        
        return None
    
    def _enrich_from_detail_page(self, event_data: Dict):
        """Enrich event data from detail page"""
        if not event_data.get('detail_url'):
            return
        
        try:
            if self.debug:
                self.log(f"  Fetching detail page: {event_data['detail_url']}", "debug")
            
            soup = self.fetch_page(event_data['detail_url'])
            if not soup:
                return
            
            detail_sel = self.config.get('detail_selectors', {})
            
            # Extract description
            desc_sel = detail_sel.get('description')
            if desc_sel:
                desc_elems = soup.select(desc_sel)
                if desc_elems:
                    desc_parts = [elem.get_text(strip=True) for elem in desc_elems if elem.get_text(strip=True)]
                    if desc_parts:
                        event_data['description'] = '\n\n'.join(desc_parts)
            
            # Extract ticket link
            ticket_sel = detail_sel.get('ticket_link')
            if ticket_sel:
                ticket_elem = soup.select_one(ticket_sel)
                if ticket_elem and ticket_elem.get('href'):
                    event_data['ticket_url'] = ticket_elem['href']
            
            # Extract price
            price_sel = detail_sel.get('price')
            if price_sel:
                price_elem = soup.select_one(price_sel)
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    event_data['price'] = self.extract_price(price_text)
            
            # Try to extract time if not found yet
            if not event_data.get('time'):
                page_text = soup.get_text()
                event_data['time'] = self.parse_time(page_text)
            
            # Try to get better image
            image_sel = detail_sel.get('image')
            if image_sel:
                img_elem = soup.select_one(image_sel)
                if img_elem and img_elem.get('src'):
                    src = img_elem['src']
                    if not src.startswith('http'):
                        src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                    if 'thumb' not in src:  # Prefer non-thumbnail images
                        event_data['image_url'] = src
            
        except Exception as e:
            if self.debug:
                self.log(f"  Error enriching from detail page: {e}", "warning")


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Generic venue scraper',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generic_scraper.py flex --dry-run
  python generic_scraper.py pratersauna --debug
  python generic_scraper.py grelle-forelle

Available venues:
  """ + '\n  '.join(list_venues())
    )
    
    parser.add_argument('venue', nargs='?', help='Venue key to scrape')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--list', action='store_true', help='List available venues')
    
    args = parser.parse_args()
    
    # List venues if requested
    if args.list:
        print("Available venues:")
        for venue_key in list_venues():
            config = get_venue_config(venue_key)
            print(f"  {venue_key:20s} - {config['venue_name']}")
        return 0
    
    # Require venue argument
    if not args.venue:
        parser.error("venue argument is required (or use --list)")
    
    # Get venue configuration
    config = get_venue_config(args.venue)
    if not config:
        print(f"❌ Unknown venue: {args.venue}")
        print(f"\nAvailable venues: {', '.join(list_venues())}")
        return 1
    
    # Create and run scraper
    scraper = GenericVenueScraper(config, dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    return 0 if result['success'] else 1


if __name__ == '__main__':
    sys.exit(main())
