#!/usr/bin/env python3
"""
Patroc Wien Gay Events Scraper
Extracts LGBTQ+ events from https://www.patroc.com/de/gay/wien/

NOTE: Patroc is an event listing website, NOT a venue itself.
Events are extracted with their actual venue information from the listing.
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper


class PatrocWienGayScraper(BaseVenueScraper):
    """
    Scraper for Patroc Wien Gay events.
    
    NOTE: This is NOT a venue scraper - Patroc is an event aggregator website.
    Each event will be saved with its actual venue name extracted from the listing.
    The VENUE_NAME here is only used as source identifier for the scraper.
    """
    
    # Source identifier (not the actual venue - events have their own venues)
    VENUE_NAME = "patroc-listing"  # Source identifier
    VENUE_ADDRESS = "Wien"  # Default city
    BASE_URL = "https://www.patroc.com"
    EVENTS_URL = "https://www.patroc.com/de/gay/wien/"
    CATEGORY = "Musik & Nachtleben"
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
                venue_info = event_data.get('venue_name', 'Unknown venue')
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:40]} @ {venue_info}", 
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
                'venue_name': None,  # Actual venue for the event
                'venue_address': None,
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
            
            # CRITICAL: Extract actual venue from .location (not Patroc as venue!)
            location_elem = item.select_one('.location')
            if location_elem:
                location_text = location_elem.get_text(strip=True)
                # Parse venue name and address from location
                venue_name, venue_address = self._parse_location(location_text)
                event_data['venue_name'] = venue_name
                event_data['venue_address'] = venue_address
            
            # If no venue found, try to extract from other elements or use default
            if not event_data.get('venue_name'):
                event_data['venue_name'] = 'LGBTQ+ Venue Wien'
                event_data['venue_address'] = 'Wien'
            
            return event_data if event_data.get('title') else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event: {e}", "error")
            return None
    
    def _parse_location(self, location_text: str) -> tuple:
        """
        Parse venue name and address from location text.
        
        Common formats:
        - "@ Venue Name (Address)"
        - "@ Venue Name, Address"
        - "Venue Name"
        """
        if not location_text:
            return 'LGBTQ+ Venue Wien', 'Wien'
        
        venue_name = location_text
        venue_address = 'Wien'
        
        # Remove leading "@ " if present
        if location_text.startswith('@'):
            venue_name = location_text[1:].strip()
        
        # Try to split by parentheses for address
        paren_match = re.search(r'^([^(]+)\(([^)]+)\)', venue_name)
        if paren_match:
            venue_name = paren_match.group(1).strip()
            venue_address = paren_match.group(2).strip()
        else:
            # Try comma separation
            if ',' in venue_name:
                parts = venue_name.split(',', 1)
                venue_name = parts[0].strip()
                venue_address = parts[1].strip() if len(parts) > 1 else 'Wien'
        
        return venue_name, venue_address
    
    def _prepare_event_for_db(self, event: Dict) -> Dict:
        """Override to use actual venue from event data instead of scraper's VENUE_NAME"""
        db_event = super()._prepare_event_for_db(event)
        
        # Override with actual venue from event
        if event.get('venue_name'):
            db_event['custom_venue_name'] = event['venue_name']
        if event.get('venue_address'):
            db_event['custom_venue_address'] = event['venue_address']
        
        # Update source to indicate this is from patroc listing
        db_event['source'] = 'patroc-scraper'
        
        return db_event
    
    def _prepare_event_for_pipeline(self, event: Dict) -> Optional[Dict]:
        """Override to use actual venue from event data"""
        raw_event = super()._prepare_event_for_pipeline(event)
        if not raw_event:
            return None
        
        # Override with actual venue from event
        if event.get('venue_name'):
            raw_event['venue_name'] = event['venue_name']
        if event.get('venue_address'):
            raw_event['venue_address'] = event['venue_address']
        
        return raw_event


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
