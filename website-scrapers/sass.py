#!/usr/bin/env python3
"""
SASS Music Club Event Scraper
Extracts upcoming events from https://sassvienna.com/programm
and saves them to the Supabase database.

Usage:
    python website-scrapers/sass.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class SassScraper(BaseVenueScraper):
    """Scraper for SASS Music Club Vienna events"""
    
    VENUE_NAME = "SASS Music Club"
    VENUE_ADDRESS = "Karlsplatz 1, 1010 Wien"
    BASE_URL = "https://sassvienna.com"
    EVENTS_URL = "https://sassvienna.com/programm"
    CATEGORY = "Bars"
    SUBCATEGORY = "Live Music"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from SASS Music Club"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # SASS has structured program page
        event_selectors = [
            'div.event-item',
            'article.program-item',
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
        
        for idx, item in enumerate(event_items, 1):
            if self.debug:
                self.log(f"Processing event {idx}/{len(event_items)}", "debug")
            
            event_data = self._parse_event_item(item)
            
            if event_data and event_data.get('title'):
                # Visit detail page if available
                if event_data.get('detail_url'):
                    self._enrich_from_detail_page(event_data)
                
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
            
            # Extract date (format: "Do 7. Aug")
            date_selectors = ['div.event-date', '.date']
            for sel in date_selectors:
                date_elem = item.select_one(sel)
                if date_elem:
                    date_text = date_elem.get_text(strip=True)
                    parsed_date = self.parse_german_date(date_text)
                    if parsed_date:
                        event_data['date'] = parsed_date
                        break
            
            # Extract time (format: "23:00 - 06:00")
            time_elem = item.select_one('div.event-time')
            if time_elem:
                time_text = time_elem.get_text(strip=True)
                event_data['time'] = self.parse_time(time_text)
            
            # Extract title
            title_selectors = ['h3', '.event-title']
            for sel in title_selectors:
                title_elem = item.select_one(sel)
                if title_elem:
                    event_data['title'] = title_elem.get_text(strip=True)
                    break
            
            # Extract lineup (DJ names with Instagram handles)
            lineup_selectors = ['div.lineup', '.artists']
            for sel in lineup_selectors:
                lineup_elem = item.select_one(sel)
                if lineup_elem:
                    lineup_text = lineup_elem.get_text()
                    # Extract DJ names
                    artists = re.findall(r'\b[A-Z][A-Za-z\s&]{2,30}\b', lineup_text)
                    event_data['artists'] = list(set(artists))[:10]
                    break
            
            # Extract link
            link_elem = item.select_one('a[href*="/programm/event/"]') or item.find('a', href=True)
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
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event item: {e}", "error")
            return None
    
    def _enrich_from_detail_page(self, event_data: Dict):
        """Enrich event data from detail page"""
        if not event_data.get('detail_url'):
            return
        
        try:
            if self.debug:
                self.log(f"  Fetching detail page: {event_data['detail_url']}", "debug")
            
            soup = self.fetch_page(event_data['detail_url'])
            if not soup:
                return
            
            # Extract description
            desc_elem = soup.select_one('.event-description')
            if desc_elem:
                event_data['description'] = desc_elem.get_text(strip=True)
            
            # Extract DJ social media links
            social_links = []
            for link in soup.select('a[href*="instagram.com"]'):
                social_links.append(link['href'])
            
            if social_links and self.debug:
                self.log(f"  Found {len(social_links)} DJ Instagram links", "debug")
            
            # Extract time if not found yet
            if not event_data.get('time'):
                page_text = soup.get_text()
                event_data['time'] = self.parse_time(page_text)
            
        except Exception as e:
            if self.debug:
                self.log(f"  Error enriching from detail page: {e}", "warning")


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape SASS Music Club events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = SassScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
