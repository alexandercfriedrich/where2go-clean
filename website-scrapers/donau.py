#!/usr/bin/env python3
"""
Donau Event Scraper
Extracts upcoming events from https://www.donautechno.com
"""

import sys
import os
from typing import List, Dict, Optional
import argparse

sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper


class DonauScraper(BaseVenueScraper):
    """Scraper for Donau Vienna events"""
    
    VENUE_NAME = "Donau"
    VENUE_ADDRESS = "Donaukanal, 1020 Wien"
    BASE_URL = "https://www.donautechno.com"
    EVENTS_URL = "https://www.donautechno.com"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Techno"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Donau"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Try common event selectors
        event_items = soup.select('article.event, div.event, article, .event-item, div[class*="event"]')
        event_items = [item for item in event_items if item.get_text(strip=True) and len(item.get_text(strip=True)) > 20]
        
        self.log(f"Found {len(event_items)} potential events")
        
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
            
            # Extract title
            title_elem = item.select_one('h1, h2, h3, .title, .event-title')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract date
            date_elem = item.select_one('.date, .event-date, time')
            if date_elem:
                date_text = date_elem.get_text(strip=True)
                event_data['date'] = self.parse_german_date(date_text)
                event_data['time'] = self.parse_time(date_text)
            
            # If no date element, try parsing from full text
            if not event_data.get('date'):
                text = item.get_text()
                event_data['date'] = self.parse_german_date(text)
                event_data['time'] = self.parse_time(text)
            
            # Extract link
            link = item.select_one('a[href]')
            if link:
                href = link.get('href')
                if href and not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                event_data['detail_url'] = href
            
            # Extract image
            img = item.select_one('img')
            if img:
                src = img.get('src') or img.get('data-src')
                if src and 'logo' not in src.lower():
                    if not src.startswith('http'):
                        src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                    event_data['image_url'] = src
            
            # Extract description
            desc = item.select_one('.description, .excerpt, p')
            if desc:
                event_data['description'] = desc.get_text(strip=True)[:300]
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event item: {e}", "error")
            return None


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Donau events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = DonauScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
