#!/usr/bin/env python3
"""
Flex Event Scraper
Extracts upcoming events from https://flex.at/events/
and saves them to the Supabase database.

Flex uses The Events Calendar WordPress plugin.

Usage:
    python website-scrapers/flex.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class FlexScraper(BaseVenueScraper):
    """Scraper for Flex Vienna events"""
    
    VENUE_NAME = "Flex"
    VENUE_ADDRESS = "Donaukanal, Augartenbrücke 1, 1010 Wien"
    BASE_URL = "https://flex.at"
    EVENTS_URL = "https://flex.at/events/list/"
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "Mixed"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Flex"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Flex uses The Events Calendar: article.tribe-events-calendar-list__event
        event_items = soup.select('article.tribe-events-calendar-list__event, article.tribe_events')
        
        # Filter out past events if possible
        event_items = [item for item in event_items if 'tribe-events-calendar-list__event--past' not in item.get('class', [])]
        
        self.log(f"Found {len(event_items)} potential events")
        
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
        """Parse a single event item from The Events Calendar list view"""
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
            title_elem = item.select_one('h3 a, a.tribe-events-calendar-list__event-title-link')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
                
                # Get link
                href = title_elem.get('href')
                if href and not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + href
                event_data['detail_url'] = href
            
            # Extract date from time element with datetime attribute
            time_elem = item.select_one('time[datetime]')
            if time_elem:
                # Get date from datetime attribute (format: YYYY-MM-DD)
                datetime_str = time_elem.get('datetime')
                if datetime_str and '-' in datetime_str:
                    # Already in YYYY-MM-DD format
                    event_data['date'] = datetime_str
                
                # Get time from text
                time_text = time_elem.get_text(strip=True)
                event_data['time'] = self.parse_time(time_text)
            
            # Extract description
            desc_elem = item.select_one('.tribe-events-calendar-list__event-description')
            if desc_elem:
                event_data['description'] = desc_elem.get_text(strip=True)
            
            # Extract image
            img = item.select_one('img.tribe-events-calendar-list__event-featured-image, img')
            if img:
                src = img.get('src') or img.get('data-src')
                if src and 'logo' not in src.lower():
                    if not src.startswith('http'):
                        src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                    event_data['image_url'] = src
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event item: {e}", "error")
            return None


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Flex events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = FlexScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
