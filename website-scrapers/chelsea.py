#!/usr/bin/env python3
"""
Chelsea Event Scraper
Extracts upcoming events from https://www.chelsea.co.at/concerts.php
"""

import sys
import os
from typing import List, Dict, Optional
import argparse
import re

sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper

class ChelseaScraper(BaseVenueScraper):
    VENUE_NAME = "Chelsea"
    VENUE_ADDRESS = "Lerchenfelder Gürtel, Stadtbahnbogen 29-31, 1080 Wien"
    BASE_URL = "https://www.chelsea.co.at"
    EVENTS_URL = "https://www.chelsea.co.at/concerts.php"
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "Live Music"
    
    def scrape_events(self) -> List[Dict]:
        self.log(f"Fetching events from {self.EVENTS_URL}")
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        # Chelsea uses table rows or divs for concerts
        event_items = soup.select('tr.concert, div.concert, table tr')
        event_items = [item for item in event_items if item.get_text(strip=True)]
        
        self.log(f"Found {len(event_items)} potential events")
        
        for idx, item in enumerate(event_items[:50], 1):  # Limit to 50
            event_data = self._parse_event_item(item)
            if event_data and event_data.get('title'):
                events.append(event_data)
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]}", 
                        "success" if status == "✓" else "warning")
        
        return events
    
    def _parse_event_item(self, item) -> Optional[Dict]:
        try:
            event_data = {
                'title': None, 'date': None, 'time': None,
                'description': None, 'image_url': None,
                'detail_url': None, 'ticket_url': None,
                'price': None, 'artists': [],
            }
            
            # Extract text content
            text = item.get_text(strip=True)
            
            # Look for date patterns
            event_data['date'] = self.parse_german_date(text)
            event_data['time'] = self.parse_time(text)
            
            # Extract title (band name)
            title_elem = item.select_one('td, .title, strong, b')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            elif text:
                # Use first meaningful text as title
                lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 3]
                if lines:
                    event_data['title'] = lines[0][:100]
            
            # Look for links
            link = item.select_one('a[href]')
            if link:
                href = link.get('href')
                if href and not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                event_data['detail_url'] = href
            
            return event_data if event_data['title'] else None
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing: {e}", "error")
            return None

def main():
    parser = argparse.ArgumentParser(description='Scrape Chelsea events')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--debug', action='store_true')
    args = parser.parse_args()
    
    scraper = ChelseaScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    sys.exit(0 if result['success'] else 1)

if __name__ == '__main__':
    main()
