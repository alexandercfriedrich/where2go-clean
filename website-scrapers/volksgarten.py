#!/usr/bin/env python3
"""
Volksgarten Event Scraper

NOTE: Volksgarten primarily posts events on Facebook (https://www.facebook.com/dervolksgarten/events)
Facebook does not allow direct web scraping without authentication and API access.

This scraper checks volksgarten.at for any event information but may find limited results.
For complete event coverage, use the Facebook Events API or external event aggregators.

Usage:
    python website-scrapers/volksgarten.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class VolksgartenScraper(BaseVenueScraper):
    """Scraper for Volksgarten Vienna events"""
    
    VENUE_NAME = "Volksgarten"
    VENUE_ADDRESS = "Burgring 1, 1010 Wien"
    BASE_URL = "https://volksgarten.at"
    EVENTS_URL = "https://volksgarten.at/programm/"  # Updated to use programm page
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Electronic"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Volksgarten
        
        Note: Volksgarten posts events primarily on Facebook. This scraper checks
        the main website but may find limited or no events.
        """
        self.log(f"Fetching events from {self.EVENTS_URL}")
        self.log("Note: Volksgarten posts events on Facebook - direct scraping limited", "warning")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Volksgarten website structure - event cards or WordPress blocks
        event_selectors = [
            'div.event-card',
            'article.event',
            'div.wp-block-group',
            'article[class*="event"]',
            'div[class*="event"]'
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
            self.log("Note: Volksgarten posts events mainly on social media (Facebook/Instagram)", "warning")
        
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
            
            # Extract title
            title_selectors = ['h2', 'h3.event-title', 'h3', 'h1']
            for sel in title_selectors:
                title_elem = item.select_one(sel)
                if title_elem:
                    event_data['title'] = title_elem.get_text(strip=True)
                    break
            
            # Extract link
            link_elem = item.select_one('a[href*="event"]') or item.find('a', href=True)
            if link_elem and link_elem.get('href'):
                href = link_elem['href']
                if not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                event_data['detail_url'] = href
            
            # Extract image
            img_selectors = ['img', 'figure img']
            for sel in img_selectors:
                img_elem = item.select_one(sel)
                if img_elem:
                    src = img_elem.get('src') or img_elem.get('data-src')
                    if src:
                        if not src.startswith('http'):
                            src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                        event_data['image_url'] = src
                        break
            
            # Extract date
            date_selectors = ['time', '.event-date']
            for sel in date_selectors:
                date_elem = item.select_one(sel)
                if date_elem:
                    date_text = date_elem.get_text(strip=True)
                    parsed_date = self.parse_german_date(date_text)
                    if parsed_date:
                        event_data['date'] = parsed_date
                        break
            
            # Extract description
            desc_parts = []
            for p in item.select('p'):
                text = p.get_text(strip=True)
                if text and len(text) > 10:
                    desc_parts.append(text)
            
            if desc_parts:
                event_data['description'] = '\n\n'.join(desc_parts[:3])
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event item: {e}", "error")
            return None


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Volksgarten events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = VolksgartenScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
