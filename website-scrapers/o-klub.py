#!/usr/bin/env python3
"""
O - der Klub Event Scraper
Extracts upcoming events from https://o-klub.at/events/#upcoming
and saves them to the Supabase database.

Usage:
    python website-scrapers/o-klub.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class OKlubScraper(BaseVenueScraper):
    """Scraper for O - der Klub Vienna events"""
    
    VENUE_NAME = "O - der Klub"
    VENUE_ADDRESS = "Passage Opernring/Operngasse, 1010 Wien"
    BASE_URL = "https://o-klub.at"
    EVENTS_URL = "https://o-klub.at/events/"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Electronic"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from O - der Klub"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # O - der Klub uses Elementor with id="upcoming_listing" for each event
        event_items = soup.find_all('div', id='upcoming_listing')
        
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
        """Parse a single event item from O-Klub structure"""
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
            
            # Extract title from element with id="event_name"
            title_elem = item.find(id='event_name')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract day and month from elements with id="day" and id="month"
            day_elem = item.find(id='day')
            month_elem = item.find(id='month')
            
            if day_elem and month_elem:
                day = day_elem.get_text(strip=True)
                month = month_elem.get_text(strip=True)
                
                # Construct date string like "28. November"
                month_mapping = {
                    'JAN': 'Januar', 'FEB': 'Februar', 'MÄR': 'März', 'MAR': 'März',
                    'APR': 'April', 'MAI': 'Mai', 'JUN': 'Juni',
                    'JUL': 'Juli', 'AUG': 'August', 'SEP': 'September',
                    'OKT': 'Oktober', 'NOV': 'November', 'DEZ': 'Dezember', 'DEC': 'Dezember'
                }
                
                month_full = month_mapping.get(month.upper(), month)
                date_text = f"{day}. {month_full}"
                event_data['date'] = self.parse_german_date(date_text)
            
            # Extract link
            link_elem = item.find('a', href=True)
            if link_elem and link_elem.get('href'):
                href = link_elem['href']
                if not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                event_data['detail_url'] = href
            
            # Extract image from data-dce-background-image-url attribute
            for elem in item.find_all(True):
                img_url = elem.get('data-dce-background-image-url')
                if img_url and 'wp-content/uploads' in img_url:
                    event_data['image_url'] = img_url
                    if self.debug:
                        self.log(f"  ✓ Image from data attribute: {img_url[:50]}...", "debug")
                    break
            
            # Fallback: Extract background image from style attribute
            if not event_data.get('image_url'):
                for elem in item.find_all(True):
                    style = elem.get('style', '')
                    if 'background-image' in style:
                        match = re.search(r'background-image:\s*url\(["\']?(.*?)["\']?\)', style)
                        if match:
                            image_url = match.group(1)
                            if image_url and 'logo' not in image_url.lower():
                                event_data['image_url'] = image_url
                                break
            
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
            for elem in soup.select('.event-description, .content p, article p, div.elementor-text-editor p'):
                text = elem.get_text(strip=True)
                if text and len(text) > 20:
                    if not any(skip in text.lower() for skip in ['cookie', 'impressum', 'datenschutz']):
                        desc_parts.append(text)
            
            if desc_parts:
                event_data['description'] = '\n\n'.join(desc_parts[:5])
                if self.debug:
                    self.log(f"  ✓ Description: {len(event_data['description'])} chars", "debug")
            
            # Extract lineup/artists
            lineup_elem = soup.select_one('.lineup, .artists, div[class*="lineup"]')
            if lineup_elem:
                lineup_text = lineup_elem.get_text()
                artists = re.findall(r'\b[A-Z][A-Za-z\s&]{2,30}\b', lineup_text)
                event_data['artists'] = list(set(artists))[:10]
                if self.debug:
                    self.log(f"  ✓ Artists: {len(event_data['artists'])} found", "debug")
            
            # Extract ticket link
            for link in soup.find_all('a', href=True):
                href = link['href']
                text = link.get_text().lower()
                if any(kw in href.lower() or kw in text for kw in ['ticket', 'karte', 'buy', 'kaufen']):
                    event_data['ticket_url'] = href
                    if self.debug:
                        self.log(f"  ✓ Ticket URL found", "debug")
                    break
            
            # Extract time if not found yet
            if not event_data.get('time'):
                page_text = soup.get_text()
                event_data['time'] = self.parse_time(page_text)
                if event_data['time'] and self.debug:
                    self.log(f"  ✓ Time: {event_data['time']}", "debug")
            
            # Try to get better image if not found yet
            if not event_data.get('image_url'):
                for elem in soup.find_all(True, limit=100):
                    style = elem.get('style', '')
                    if 'background-image' in style:
                        match = re.search(r'background-image:\s*url\(["\']?(.*?)["\']?\)', style)
                        if match:
                            image_url = match.group(1)
                            if image_url and 'logo' not in image_url.lower():
                                event_data['image_url'] = image_url
                                if self.debug:
                                    self.log(f"  ✓ Image from detail: {image_url[:50]}...", "debug")
                                break
            
        except Exception as e:
            if self.debug:
                self.log(f"  Error enriching from detail page: {e}", "warning")


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape O - der Klub events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = OKlubScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
