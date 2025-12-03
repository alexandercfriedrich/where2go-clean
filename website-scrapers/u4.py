#!/usr/bin/env python3
"""
U4 Event Scraper
Extracts upcoming events from https://www.u4.at/events-veranstaltungen/
Uses EventON WordPress plugin structure for parsing.
"""

import sys
import os
import re
import json
from typing import List, Dict, Optional
import argparse

sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper


class U4Scraper(BaseVenueScraper):
    """Scraper for U4 Vienna events"""
    
    VENUE_NAME = "U4"
    VENUE_ADDRESS = "Schönbrunner Straße 222, 1120 Wien"
    BASE_URL = "https://www.u4.at"
    EVENTS_URL = "https://www.u4.at/events-veranstaltungen/"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Mixed"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from U4 using EventON structure"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # U4 uses EventON plugin - events are in .eventon_list_event containers
        event_items = soup.select('.eventon_list_event')
        
        self.log(f"Found {len(event_items)} EventON event items")
        
        for idx, item in enumerate(event_items[:50], 1):
            if self.debug:
                self.log(f"Processing event {idx}/{len(event_items)}", "debug")
            
            event_data = self._parse_eventon_event(item)
            
            if event_data and event_data.get('title'):
                events.append(event_data)
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}", 
                        "success" if status == "✓" else "warning")
        
        return events
    
    def _parse_eventon_event(self, item) -> Optional[Dict]:
        """Parse a single EventON event item"""
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
            
            # Try to extract from schema.org JSON-LD first (most reliable)
            schema_script = item.select_one('script[type="application/ld+json"]')
            if schema_script:
                try:
                    schema_data = json.loads(schema_script.string)
                    if schema_data.get('image'):
                        event_data['image_url'] = schema_data['image']
                    if schema_data.get('description'):
                        # Clean HTML from description
                        desc = re.sub(r'<[^>]+>', ' ', schema_data['description'])
                        desc = re.sub(r'\s+', ' ', desc).strip()
                        event_data['description'] = desc[:500]
                except json.JSONDecodeError:
                    # Ignore malformed or missing JSON-LD; not all events have valid schema.org data.
                    if self.debug:
                        self.log("JSON-LD parsing failed for event item", "warning")
            
            # Extract title from span.evcal_event_title
            title_elem = item.select_one('span.evcal_event_title')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract image from data-img attribute on .ev_ftImg or background image
            ft_img = item.select_one('.ev_ftImg')
            if ft_img:
                img_url = ft_img.get('data-img')
                if img_url:
                    event_data['image_url'] = img_url
            
            # Fallback to meta itemprop image
            if not event_data.get('image_url'):
                meta_img = item.select_one('meta[itemprop="image"]')
                if meta_img:
                    event_data['image_url'] = meta_img.get('content')
            
            # Extract date from meta itemprop startDate
            meta_start = item.select_one('meta[itemprop="startDate"]')
            if meta_start:
                start_date = meta_start.get('content')
                if start_date:
                    # Format: "2025-12-4T23:00+1:00"
                    date_match = re.match(r'(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})', start_date)
                    if date_match:
                        year, month, day, hour, minute = date_match.groups()
                        event_data['date'] = f"{year}-{int(month):02d}-{int(day):02d}"
                        event_data['time'] = f"{int(hour):02d}:{minute}"
            
            # Fallback to parsing from date block
            if not event_data.get('date'):
                date_block = item.select_one('.evoet_dayblock')
                if date_block:
                    day_elem = date_block.select_one('em.date')
                    month_elem = date_block.select_one('em.month')
                    time_elem = date_block.select_one('em.time')
                    
                    if day_elem and month_elem:
                        day = day_elem.get_text(strip=True)
                        month_text = month_elem.get_text(strip=True)
                        # Get year from data attribute or current year
                        year = date_block.get('data-syr', str(self._get_current_year()))
                        
                        date_str = f"{day}. {month_text} {year}"
                        event_data['date'] = self.parse_german_date(date_str)
                    
                    if time_elem and not event_data.get('time'):
                        time_text = time_elem.get_text(strip=True)
                        event_data['time'] = self.parse_time(time_text)
            
            # Extract detail URL from itemprop url
            url_link = item.select_one('a[itemprop="url"]')
            if url_link:
                event_data['detail_url'] = url_link.get('href')
            
            # Fallback to first link to event page
            if not event_data.get('detail_url'):
                event_link = item.select_one('a[href*="/events/"]')
                if event_link:
                    href = event_link.get('href')
                    if href and not href.startswith('http'):
                        href = self.BASE_URL.rstrip('/') + href
                    event_data['detail_url'] = href
            
            # Extract subtitle as additional info
            subtitle = item.select_one('span.evcal_event_subtitle')
            if subtitle:
                event_data['artists'] = [subtitle.get_text(strip=True)]
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing EventON event: {e}", "error")
            return None
    
    def _get_current_year(self):
        """Get current year"""
        from datetime import datetime
        return datetime.now().year


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape U4 events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = U4Scraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
