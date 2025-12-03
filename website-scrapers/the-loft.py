#!/usr/bin/env python3
"""
The Loft Event Scraper
Extracts upcoming events from https://www.theloft.at/programm/

The page structure shows events as:
- Links with div.box-wrap containing:
  - div.datum: date (format: "Di. 9.12.2025")
  - span.open: time (format: "19:00")
  - span.preis: price
  - div.content-middle: event title
  - div.content-right: room (Wohnzimmer, Oben, Unten)
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper


class TheLoftScraper(BaseVenueScraper):
    """Scraper for The Loft Vienna events"""
    
    VENUE_NAME = "The Loft"
    VENUE_ADDRESS = "Lerchenfelder Gürtel 37, 1160 Wien"
    BASE_URL = "https://www.theloft.at"
    EVENTS_URL = "https://www.theloft.at/programm/"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Mixed"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from The Loft"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Find all event links with box-wrap structure
        event_links = soup.select('a:has(div.box-wrap)')
        
        self.log(f"Found {len(event_links)} events")
        
        for idx, link in enumerate(event_links[:50], 1):  # Limit to 50
            if self.debug:
                self.log(f"Processing event {idx}/{len(event_links)}", "debug")
            
            event_data = self._parse_event_link(link)
            
            if event_data and event_data.get('title'):
                events.append(event_data)
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}", 
                        "success" if status == "✓" else "warning")
        
        return events
    
    def _parse_event_link(self, link) -> Optional[Dict]:
        """Parse a single event link with box-wrap structure"""
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
            
            # Get link URL
            href = link.get('href')
            if href:
                if not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + href
                event_data['detail_url'] = href
            
            # Get the box-wrap div
            box = link.select_one('div.box-wrap')
            if not box:
                return None
            
            # Extract title from content-middle
            title_elem = box.select_one('div.content-middle')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract date from datum (format: "Di. 9.12.2025")
            date_elem = box.select_one('div.datum')
            if date_elem:
                date_text = date_elem.get_text(strip=True)
                # Parse date: "Di. 9.12.2025" or "Fr. 12.12.2025"
                date_match = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', date_text)
                if date_match:
                    day, month, year = date_match.groups()
                    event_data['date'] = f"{year}-{int(month):02d}-{int(day):02d}"
            
            # Extract time from open span
            time_elem = box.select_one('span.open')
            if time_elem:
                event_data['time'] = time_elem.get_text(strip=True)
            
            # Extract price from preis span
            price_elem = box.select_one('span.preis')
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                # Remove "Eintritt: " prefix
                price_text = re.sub(r'^Eintritt:\s*', '', price_text)
                event_data['price'] = price_text
            
            # Extract room/location from content-right
            room_elem = box.select_one('div.content-right')
            if room_elem:
                room = room_elem.get_text(strip=True)
                event_data['artists'] = [f"The Loft {room}"]
                event_data['description'] = f"Location: {room}"
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event link: {e}", "error")
            return None


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape The Loft events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = TheLoftScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
