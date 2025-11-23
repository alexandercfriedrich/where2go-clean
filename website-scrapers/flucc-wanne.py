#!/usr/bin/env python3
"""
Flucc / Flucc Wanne Event Scraper
Extracts upcoming events from https://flucc.at/musik/
and saves them to the Supabase database.

Usage:
    python website-scrapers/flucc-wanne.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class FluccWanneScraper(BaseVenueScraper):
    """Scraper for Flucc / Flucc Wanne Vienna events"""
    
    VENUE_NAME = "Flucc / Flucc Wanne"
    VENUE_ADDRESS = "Praterstern 5, 1020 Wien"
    BASE_URL = "https://flucc.at"
    EVENTS_URL = "https://flucc.at/musik/"
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "Mixed"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Flucc / Flucc Wanne"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Flucc uses modern event card structure with The Events Calendar
        event_selectors = [
            'article.event',
            'div.tribe-events-list-widget-events',
            'article[class*="tribe-events"]',
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
            
            # Extract title
            title_selectors = [
                'h2.entry-title',
                'h3.tribe-event-title',
                'h2',
                'h3'
            ]
            for sel in title_selectors:
                title_elem = item.select_one(sel)
                if title_elem:
                    event_data['title'] = title_elem.get_text(strip=True)
                    break
            
            # Extract link
            link_elem = item.select_one('a.tribe-event-url, a[href*="/events/"]') or item.find('a', href=True)
            if link_elem and link_elem.get('href'):
                href = link_elem['href']
                if not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                event_data['detail_url'] = href
            
            # Extract image
            img_selectors = [
                'img.tribe-events-event-image',
                '.event-image img',
                'img'
            ]
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
            date_selectors = [
                'time.tribe-event-date-start',
                '.event-date',
                'time'
            ]
            for sel in date_selectors:
                date_elem = item.select_one(sel)
                if date_elem:
                    date_text = date_elem.get_text(strip=True)
                    parsed_date = self.parse_german_date(date_text)
                    if parsed_date:
                        event_data['date'] = parsed_date
                        break
            
            # Extract time
            time_selectors = [
                'span.tribe-event-time',
                '.event-time'
            ]
            for sel in time_selectors:
                time_elem = item.select_one(sel)
                if time_elem:
                    time_text = time_elem.get_text(strip=True)
                    event_data['time'] = self.parse_time(time_text)
                    break
            
            # Extract location (DECK or WANNE)
            location_elem = item.select_one('.tribe-events-venue, .event-location')
            if location_elem:
                location = location_elem.get_text(strip=True)
                if 'wanne' in location.lower():
                    event_data['artists'] = ['Flucc Wanne']
                elif 'deck' in location.lower():
                    event_data['artists'] = ['Flucc Deck']
            
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
            desc_selectors = [
                'div.tribe-events-content',
                '.event-description',
                '.entry-content p'
            ]
            
            desc_parts = []
            for sel in desc_selectors:
                for elem in soup.select(sel):
                    text = elem.get_text(strip=True)
                    if text and len(text) > 10:
                        desc_parts.append(text)
                
                if desc_parts:
                    break
            
            if desc_parts:
                event_data['description'] = '\n\n'.join(desc_parts)
            
            # Extract ticket link
            ticket_elem = soup.select_one('a[href*="ticket"]')
            if ticket_elem and ticket_elem.get('href'):
                event_data['ticket_url'] = ticket_elem['href']
            
            # Extract time if not found yet
            if not event_data.get('time'):
                page_text = soup.get_text()
                event_data['time'] = self.parse_time(page_text)
            
        except Exception as e:
            if self.debug:
                self.log(f"  Error enriching from detail page: {e}", "warning")


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Flucc / Flucc Wanne events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = FluccWanneScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
