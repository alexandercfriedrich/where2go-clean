#!/usr/bin/env python3
"""
Rhiz Event Scraper
Extracts upcoming events from https://rhiz.wien/programm/

The page structure shows events as:
- Grid items with:
  - .event-date a: date format "sa 061225 19:30" - the regex skips the day prefix and parses "DDMMYY HH:MM"
  - .event-category: Live, DJ, etc.
  - .ev-body h3 a: event title
  - .ev-body h4 a: event subtitle
  - .event-image img: event image
  - .event-price: price info

Usage:
    python website-scrapers/rhiz.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class RhizScraper(BaseVenueScraper):
    """Scraper for Rhiz Vienna events"""
    
    VENUE_NAME = "Rhiz"
    VENUE_ADDRESS = "Lerchenfelder Gürtel, Stadtbahnbogen 37-38, 1080 Wien"
    BASE_URL = "https://rhiz.wien"
    EVENTS_URL = "https://rhiz.wien/programm/"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Underground"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Rhiz"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Rhiz lists events in grid-item containers
        event_items = soup.select('.grid-item')
        
        self.log(f"Found {len(event_items)} events")
        
        for idx, item in enumerate(event_items[:50], 1):  # Limit to 50
            if self.debug:
                self.log(f"Processing event {idx}/{len(event_items)}", "debug")
            
            event_data = self._parse_event_item(item)
            
            if event_data and event_data.get('title'):
                events.append(event_data)
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}", 
                        "success" if status == "✓" else "warning")
        
        return events
    
    def _parse_event_item(self, item) -> Optional[Dict]:
        """Parse a single event grid item"""
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
            
            # Extract date and time from event-date link
            # Format: "sa 061225 19:30" (saturday 6 Dec 2025 at 19:30)
            date_elem = item.select_one('.event-date a')
            if date_elem:
                date_text = date_elem.get_text(strip=True)
                # Parse: "fr 051225 20:00"
                date_match = re.search(r'(\d{2})(\d{2})(\d{2})\s+(\d{1,2}:\d{2})', date_text)
                if date_match:
                    day, month, year, time = date_match.groups()
                    event_data['date'] = f"20{year}-{month}-{day}"
                    event_data['time'] = time
                
                # Also get detail URL from this link
                event_data['detail_url'] = date_elem.get('href')
            
            # Extract title from h3 a
            title_elem = item.select_one('.ev-body h3 a')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
                if not event_data.get('detail_url'):
                    event_data['detail_url'] = title_elem.get('href')
            
            # Extract subtitle from h4 a
            subtitle_elem = item.select_one('.ev-body h4 a')
            if subtitle_elem:
                subtitle = subtitle_elem.get_text(strip=True)
                if subtitle:
                    event_data['description'] = subtitle
            
            # Extract category (Live, DJ, etc.)
            category_elem = item.select_one('.event-category')
            if category_elem:
                category = category_elem.get_text(strip=True)
                event_data['artists'] = [category]
            
            # Extract price
            price_elem = item.select_one('.event-price')
            if price_elem:
                event_data['price'] = price_elem.get_text(strip=True)
            
            # Extract image
            img_elem = item.select_one('.event-image img')
            if img_elem:
                # Try data-src first (lazy loading), then src
                src = img_elem.get('data-src') or img_elem.get('src')
                if src and 'lazy_placeholder' not in src:
                    if not src.startswith('http'):
                        if src.startswith('//'):
                            src = 'https:' + src
                        else:
                            src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                    event_data['image_url'] = src
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event item: {e}", "error")
            return None


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Rhiz events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = RhizScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
