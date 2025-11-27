#!/usr/bin/env python3
"""
Chelsea Event Scraper
Extracts upcoming events from https://www.chelsea.co.at/concerts.php and clubs.php
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
    EVENTS_URLS = [
        "https://www.chelsea.co.at/concerts.php",
        "https://www.chelsea.co.at/clubs.php"
    ]
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "Mixed"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from both concerts and clubs pages."""
        all_events = []
        
        for url in self.EVENTS_URLS:
            self.log(f"Fetching events from {url}")
            soup = self.fetch_page(url)
            if not soup:
                continue
            
            # Chelsea lists events in a table format
            # Find all text items that contain event info (numbered list)
            events = self._parse_event_list(soup, url)
            all_events.extend(events)
            
        return all_events
    
    def _parse_event_list(self, soup, page_url: str) -> List[Dict]:
        """Parse event list from the page."""
        events = []
        
        try:
            # Look for the main content area with event list
            # Chelsea displays events as a numbered list
            # Find all text nodes that start with numbers (01, 02, etc.)
            
            # Get all text content and split into potential event entries
            page_text = soup.get_text()
            
            # Look for event anchors - they have ID pattern like #concert_XXXX
            event_links = soup.find_all('a', href=re.compile(r'#concert_\d+'))
            
            self.log(f"Found {len(event_links)} event anchors")
            
            # For each anchor, try to extract event info
            for anchor in event_links:
                event_data = self._extract_event_from_anchor(anchor, soup)
                if event_data and event_data.get('title'):
                    events.append(event_data)
                    status = "✓" if event_data.get('date') else "?"
                    self.log(f" {status} {event_data['title'][:60]}",
                            "success" if status == "✓" else "warning")
            
            # Also try to parse from visible text list format
            if not events or len(events) < 5:
                events.extend(self._parse_text_list(soup, page_url))
                
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event list: {e}", "error")
        
        return events
    
    def _extract_event_from_anchor(self, anchor, soup) -> Optional[Dict]:
        """Extract event info from an anchor tag."""
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
            
            # Get the anchor text as title
            text_content = anchor.get_text(strip=True)
            if text_content:
                event_data['title'] = text_content[:200]
            
            # Get the detail URL
            href = anchor.get('href', '')
            if href:
                if not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                event_data['detail_url'] = href
                
                # Try to find associated event details after the anchor
                # Look for nearby text that might contain date/time info
                parent = anchor.find_parent(['tr', 'td', 'div', 'li'])
                if parent:
                    sibling_text = parent.get_text(strip=True)
                    
                    # Try to extract date
                    event_data['date'] = self.parse_german_date(sibling_text)
                    event_data['time'] = self.parse_time(sibling_text)
                    
                    # Try to extract price
                    event_data['price'] = self.extract_price(sibling_text)
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error extracting from anchor: {e}", "error")
            return None
    
    def _parse_text_list(self, soup, page_url: str) -> List[Dict]:
        """Parse event list from visible text format."""
        events = []
        
        try:
            # Get all text content
            full_text = soup.get_text('\n')
            lines = full_text.split('\n')
            
            # Look for lines that match event patterns
            # Chelsea uses format like: "01 SPORTY BOYS / HONEST LIE", "02 THE MUDDY MOON", etc.
            event_pattern = re.compile(r'^(\d{2})\s+(.+?)(?:\s*[-–]\s*(.+))?$')
            
            for line in lines:
                line = line.strip()
                match = event_pattern.match(line)
                
                if match and len(line) > 10:  # Must be substantial
                    num, artists, detail = match.groups()
                    
                    if artists:
                        event_data = {
                            'title': artists.strip()[:200],
                            'date': None,
                            'time': None,
                            'description': detail.strip() if detail else None,
                            'image_url': None,
                            'detail_url': None,
                            'ticket_url': None,
                            'price': None,
                            'artists': artists.split('/'),
                        }
                        
                        # Try to find full details in nearby text
                        # Look for date patterns in surrounding lines
                        line_idx = lines.index(line)
                        context_text = ' '.join(lines[max(0, line_idx-2):min(len(lines), line_idx+5)])
                        
                        event_data['date'] = self.parse_german_date(context_text)
                        event_data['time'] = self.parse_time(context_text)
                        
                        if event_data['title']:
                            events.append(event_data)
            
            if self.debug and events:
                self.log(f"Parsed {len(events)} events from text list")
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing text list: {e}", "error")
        
        return events

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
