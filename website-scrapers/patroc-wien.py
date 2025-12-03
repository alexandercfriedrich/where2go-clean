#!/usr/bin/env python3
"""
Patroc Wien Gay Events Scraper
Extracts LGBTQ+ events from https://www.patroc.com/de/gay/wien/

NOTE: Patroc is an event listing website, NOT a venue itself.
Events are extracted with their actual venue information from the listing.
Venue names are extracted from the "@ VenueName" format in the address section.
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
    CATEGORY = "LGBTQ+"
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
        
        # Patroc uses div.vevent.item class for event containers
        event_items = soup.select('div.vevent.item')
        
        self.log(f"Found {len(event_items)} events on {url}")
        
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
        """Parse a single event item from Patroc structure"""
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
                'price': None,
            }
            
            # Extract title from span.summary
            title_elem = item.select_one('span.summary')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract date from abbr.dtstart title attribute (ISO format: 2025-12-05)
            date_elem = item.select_one('abbr.dtstart')
            if date_elem and date_elem.get('title'):
                event_data['date'] = date_elem.get('title')
            
            # Extract time from div.open text (format: "Freitag, 5. Dezember 2025, 18:00 – 24:00")
            open_elem = item.select_one('div.open')
            if open_elem:
                open_text = open_elem.get_text(strip=True)
                event_data['time'] = self.parse_time(open_text)
            
            # Extract detail URL from a.url
            link_elem = item.select_one('a.url')
            if link_elem:
                href = link_elem.get('href')
                if href:
                    if href.startswith('d/'):
                        # Relative URL like "d/event-name.html"
                        event_data['detail_url'] = self.BASE_URL + '/de/gay/wien/' + href
                    elif href.startswith('/'):
                        event_data['detail_url'] = self.BASE_URL + href
                    elif href.startswith('http'):
                        event_data['detail_url'] = href
            
            # Extract description from div.description.notes
            desc_elem = item.select_one('div.description.notes')
            if desc_elem:
                desc_text = desc_elem.get_text(strip=True)
                event_data['description'] = desc_text[:500]
                
                # Extract price from description (format: "Eintritt: 13-25 €" or "Tickets: 10-15 €")
                price_match = re.search(r'(?:Eintritt|Tickets?):\s*([\d\-€,\.\s]+)', desc_text)
                if price_match:
                    event_data['price'] = price_match.group(1).strip()
            
            # Extract venue from div.adr - look for "@ VenueName" pattern
            adr_elem = item.select_one('div.adr')
            if adr_elem:
                # First span in adr usually contains "@ VenueName"
                venue_span = adr_elem.select_one('span')
                if venue_span:
                    venue_text = venue_span.get_text(strip=True)
                    # Remove "@ " prefix
                    if venue_text.startswith('@'):
                        event_data['venue_name'] = venue_text[1:].strip()
                    else:
                        event_data['venue_name'] = venue_text
                
                # Also get full address
                full_adr = adr_elem.get_text(strip=True)
                if event_data.get('venue_name'):
                    # Remove venue name from address
                    full_adr = full_adr.replace('@ ' + event_data['venue_name'], '').strip()
                event_data['venue_address'] = full_adr
            
            # Fallback venue name from abbr.fn.org
            if not event_data.get('venue_name'):
                venue_abbr = item.select_one('abbr.fn.org')
                if venue_abbr:
                    event_data['venue_name'] = venue_abbr.get('title', '')
            
            # Try to get event image from Facebook/Instagram links
            # We can't actually fetch these without authentication, but store the links
            social_links = []
            for link in item.select('div.communication a'):
                href = link.get('href', '')
                if 'facebook.com/events' in href or 'instagram.com' in href:
                    social_links.append(href)
            
            if social_links:
                # Store first social link as potential image source (for future enhancement)
                event_data['social_links'] = social_links
            
            # If no venue found, use default
            if not event_data.get('venue_name'):
                event_data['venue_name'] = 'LGBTQ+ Venue Wien'
                event_data['venue_address'] = 'Wien'
            
            return event_data if event_data.get('title') else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event: {e}", "error")
            return None
    
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
