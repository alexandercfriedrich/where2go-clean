#!/usr/bin/env python3
"""
Prater DOME Event Scraper
Extracts upcoming events from https://praterdome.at/events
and saves them to the Supabase database.

Usage:
    python website-scrapers/praterdome.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class PraterdomeScraper(BaseVenueScraper):
    """Scraper for Prater DOME Vienna events"""
    
    VENUE_NAME = "Prater DOME"
    VENUE_ADDRESS = "Riesenradplatz 7, 1020 Wien"
    BASE_URL = "https://praterdome.at"
    EVENTS_URL = "https://praterdome.at/events"
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "Electronic"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Prater DOME"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Prater DOME event structure
        event_selectors = [
            'div.event-card',
            'article.event-item',
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
            
            # Extract title
            title_selectors = ['h2.event-title', 'h3', 'h2']
            for sel in title_selectors:
                title_elem = item.select_one(sel)
                if title_elem:
                    event_data['title'] = title_elem.get_text(strip=True)
                    break
            
            # Extract link
            link_elem = item.select_one('a[href*="/event/"]') or item.find('a', href=True)
            if link_elem and link_elem.get('href'):
                href = link_elem['href']
                if not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                event_data['detail_url'] = href
            
            # Extract image
            img_elem = item.select_one('img.event-image, img')
            if img_elem:
                src = img_elem.get('src') or img_elem.get('data-src')
                if src:
                    if not src.startswith('http'):
                        src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                    event_data['image_url'] = src
            
            # Extract date
            date_selectors = ['time.event-date', '.date', 'time']
            for sel in date_selectors:
                date_elem = item.select_one(sel)
                if date_elem:
                    date_text = date_elem.get_text(strip=True)
                    parsed_date = self.parse_german_date(date_text)
                    if parsed_date:
                        event_data['date'] = parsed_date
                        break
            
            # Extract time
            time_elem = item.select_one('.event-time')
            if time_elem:
                time_text = time_elem.get_text(strip=True)
                event_data['time'] = self.parse_time(time_text)
            
            # Extract event series (F I R S T, SURREAL, etc.)
            series_elem = item.select_one('.event-series')
            if series_elem:
                series = series_elem.get_text(strip=True)
                event_data['artists'] = [series]
            
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
            desc_parts = []
            for elem in soup.select('.event-description, .content p'):
                text = elem.get_text(strip=True)
                if text and len(text) > 10:
                    desc_parts.append(text)
            
            if desc_parts:
                event_data['description'] = '\n\n'.join(desc_parts)
            
            # Extract lineup/artists
            lineup_elem = soup.select_one('.lineup, .artists')
            if lineup_elem:
                lineup_text = lineup_elem.get_text()
                artists = re.findall(r'\b[A-Z][A-Za-z\s&]{2,30}\b', lineup_text)
                event_data['artists'] = list(set(artists))[:10]
            
            # Extract floor information
            floor_elem = soup.select_one('.floor')
            if floor_elem:
                floor = floor_elem.get_text(strip=True)
                if floor not in event_data.get('artists', []):
                    event_data['artists'].append(floor)
            
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
    parser = argparse.ArgumentParser(description='Scrape Prater DOME events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = PraterdomeScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
