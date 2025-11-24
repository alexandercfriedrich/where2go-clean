#!/usr/bin/env python3
"""
Patroc Wien Gay Events Scraper
Extracts LGBTQ+ events from https://www.patroc.com/de/gay/wien/
"""

import sys
import os
from typing import List, Dict, Optional
import argparse

sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper


class PatrocWienGayScraper(BaseVenueScraper):
    """Scraper for Patroc Wien Gay events"""
    
    VENUE_NAME = "Patroc Wien Gay Events"
    VENUE_ADDRESS = "Various locations in Wien"
    BASE_URL = "https://www.patroc.com"
    EVENTS_URL = "https://www.patroc.com/de/gay/wien/"
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "LGBTQ+"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Patroc Wien Gay pages"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        events = []
        
        # Scrape from main page
        events.extend(self._scrape_page(self.EVENTS_URL))
        
        # Scrape from clubs page
        clubs_url = "https://www.patroc.com/de/gay/wien/clubs.html"
        self.log(f"Fetching events from {clubs_url}")
        events.extend(self._scrape_page(clubs_url))
        
        return events
    
    def _scrape_page(self, url: str) -> List[Dict]:
        """Scrape events from a specific page"""
        soup = self.fetch_page(url)
        if not soup:
            return []
        
        events = []
        
        # Patroc uses vevent class (microformat for events)
        event_items = soup.select('div.vevent')
        
        self.log(f"Found {len(event_items)} potential events on {url}")
        
        for idx, item in enumerate(event_items[:50], 1):  # Limit to 50 per page
            if self.debug:
                self.log(f"Processing event {idx}/{len(event_items)}", "debug")
            
            event_data = self._parse_event_item(item)
            
            if event_data and event_data.get('title'):
                events.append(event_data)
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]}", 
                        "success" if status == "✓" else "warning")
        
        return events
    
    def _parse_event_item(self, item) -> Optional[Dict]:
        """Parse a single event item"""
        try:
            event_data = {
                'title': None,
                'date': None,
                'time': None,
                'image_url': None,
                'detail_url': None,
                'description': None,
            }
            
            # Extract title from .summary
            title_elem = item.select_one('.summary, strong.summary')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract date from abbr.dtstart title attribute (ISO format: 2025-11-29)
            date_elem = item.select_one('abbr.dtstart')
            if date_elem and date_elem.get('title'):
                # The title attribute has the date in ISO format (YYYY-MM-DD)
                event_data['date'] = date_elem.get('title')
            
            # If no date found, try parsing from visible date text
            if not event_data.get('date'):
                date_text_elem = item.select_one('.news-date, .dtstart')
                if date_text_elem:
                    date_text = date_text_elem.get_text(strip=True)
                    event_data['date'] = self.parse_german_date(date_text)
            
            # Extract time if present
            full_text = item.get_text()
            event_data['time'] = self.parse_time(full_text)
            
            # Extract link from a.url
            link_elem = item.select_one('a.url, a[href]')
            if link_elem:
                href = link_elem.get('href')
                if href:
                    if href.startswith('/'):
                        event_data['detail_url'] = self.BASE_URL + href
                    elif href.startswith('http'):
                        event_data['detail_url'] = href
                    else:
                        # Relative URL like "d/event-name.html"
                        event_data['detail_url'] = self.BASE_URL + '/de/gay/wien/' + href
            
            # Extract image
            img_elem = item.select_one('img')
            if img_elem:
                src = img_elem.get('src') or img_elem.get('data-src')
                if src:
                    if src.startswith('/'):
                        event_data['image_url'] = self.BASE_URL + src
                    elif src.startswith('http'):
                        event_data['image_url'] = src
            
            # Extract description from .description
            desc_elem = item.select_one('.description, span.description')
            if desc_elem:
                event_data['description'] = desc_elem.get_text(strip=True)[:500]
            
            # Extract location/venue from .location
            location_elem = item.select_one('.location')
            if location_elem:
                location_text = location_elem.get_text(strip=True)
                # Location is often in format "@ Venue Name (Address)"
                if '@' in location_text:
                    location_text = location_text.split('@')[1].strip()
                # Store in description if not already present
                if event_data['description']:
                    event_data['description'] = f"{event_data['description']}\n\nVenue: {location_text}"
                else:
                    event_data['description'] = f"Venue: {location_text}"
            
            return event_data if event_data.get('title') else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event: {e}", "error")
            return None


def main():
    parser = argparse.ArgumentParser(description='Scrape Patroc Wien Gay events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = PatrocWienGayScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    return 0 if result['success'] else 1


if __name__ == '__main__':
    sys.exit(main())
