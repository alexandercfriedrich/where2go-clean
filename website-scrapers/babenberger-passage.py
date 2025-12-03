#!/usr/bin/env python3
"""
Babenberger Passage Event Scraper
Extracts upcoming events from https://www.babenbergerpassage.at
and saves them to the Supabase database.

Note: Babenberger Passage website shows mainly recurring events (Thu/Fri/Sat).
For more events, consider using external aggregators like events.at or eventfinder.at

Usage:
    python website-scrapers/babenberger-passage.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class BabenbergerPassageScraper(BaseVenueScraper):
    """Scraper for Babenberger Passage Vienna events"""
    
    VENUE_NAME = "Babenberger Passage"
    VENUE_ADDRESS = "Burgring 3, 1010 Wien"
    BASE_URL = "https://www.babenbergerpassage.at"
    EVENTS_URL = "https://www.babenbergerpassage.at"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Mixed"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Babenberger Passage"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Babenberger Passage has static program section
        event_selectors = [
            'div.program',
            'section#program',
            'div.event-row',
            'div[class*="event"]',
            'article[class*="event"]'
        ]
        
        event_items = []
        for selector in event_selectors:
            items = soup.select(selector)
            if items:
                event_items = items
                self.log(f"Found {len(items)} items using selector: {selector}", "debug" if self.debug else "info")
                break
        
        self.log(f"Found {len(event_items)} potential events")
        
        if len(event_items) == 0:
            self.log("Note: Babenberger Passage shows only recurring events (Thu/Fri/Sat)", "warning")
            self.log("Consider using external event aggregators like events.at", "warning")
        
        for idx, item in enumerate(event_items, 1):
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
        """Parse a single event item"""
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
            
            # Extract title (day titles like "Donnerstag", "Freitag", "Samstag")
            title_selectors = ['h4', 'h3']
            for sel in title_selectors:
                title_elem = item.select_one(sel)
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    # If it's a day name, look for event description
                    if title.lower() in ['donnerstag', 'freitag', 'samstag', 'thursday', 'friday', 'saturday']:
                        # Look for description in same section
                        desc_elem = item.find('p')
                        if desc_elem:
                            event_data['title'] = f"{title} - {desc_elem.get_text(strip=True)}"
                            event_data['description'] = desc_elem.get_text(strip=True)
                    else:
                        event_data['title'] = title
                    break
            
            # Extract link
            link_elem = item.find('a', href=True)
            if link_elem and link_elem.get('href'):
                href = link_elem['href']
                if not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                event_data['detail_url'] = href
            
            # Extract image
            img_elem = item.select_one('img')
            if img_elem:
                src = img_elem.get('src') or img_elem.get('data-src')
                if src:
                    if not src.startswith('http'):
                        src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                    event_data['image_url'] = src
            
            # For recurring events, we won't have specific dates
            # These should be handled by external aggregators
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event item: {e}", "error")
            return None


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Babenberger Passage events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = BabenbergerPassageScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
