#!/usr/bin/env python3
"""
SASS Music Club Event Scraper
Extracts upcoming events from https://sassvienna.com/de/programm
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
    EVENTS_URL = "https://sassvienna.com/de/programm"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Live Music"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from SASS Music Club"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # SASS has a specific structure: div.events contains div.event items
        event_items = soup.select('div.events div.event')
        
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
        """Parse a single event item from SASS structure"""
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
            
            # Extract title from h3 in div.title
            title_elem = item.select_one('div.title h3')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract subtitle/subline if available
            subline_elem = item.select_one('div.subline h4')
            if subline_elem:
                subline = subline_elem.get_text(strip=True)
                if subline:
                    event_data['title'] = f"{event_data['title']} {subline}"
            
            # Extract link from a.eventlink
            link_elem = item.select_one('a.eventlink')
            if link_elem and link_elem.get('href'):
                href = link_elem['href']
                if not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + href
                event_data['detail_url'] = href
            
            # Extract date from span.start_date (format: "27. Nov")
            date_elem = item.select_one('span.start_date')
            if date_elem:
                date_text = date_elem.get_text(strip=True)
                # Convert "Nov" to "November" for better parsing
                date_text = date_text.replace('Nov', 'November').replace('Dez', 'Dezember').replace('Okt', 'Oktober')
                event_data['date'] = self.parse_german_date(date_text)
            
            # Extract time from span.start_time
            time_elem = item.select_one('span.start_time')
            if time_elem:
                time_text = time_elem.get_text(strip=True)
                event_data['time'] = self.parse_time(time_text)
            
            # Extract lineup (DJ names with Instagram handles)
            lineup_elem = item.select_one('div.lineup')
            if lineup_elem:
                # Get all strong elements (artist names)
                artists = []
                for strong in lineup_elem.find_all('strong'):
                    artist = strong.get_text(strip=True)
                    if artist:
                        artists.append(artist)
                
                if artists:
                    event_data['artists'] = artists
                    # Also add lineup as description preview
                    event_data['description'] = f"Lineup: {', '.join(artists)}"
            
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
            
            # Extract full description
            desc_parts = []
            for elem in soup.select('.event-description, .content p, article p'):
                text = elem.get_text(strip=True)
                if text and len(text) > 20:
                    desc_parts.append(text)
            
            if desc_parts:
                full_desc = '\n\n'.join(desc_parts[:5])
                if event_data.get('description'):
                    event_data['description'] = f"{event_data['description']}\n\n{full_desc}"
                else:
                    event_data['description'] = full_desc
                
                if self.debug:
                    self.log(f"  ✓ Description: {len(full_desc)} chars", "debug")
            
            # Extract image
            img_selectors = [
                'img.event-image',
                'div.header-image img',
                'article img',
                'img[src*="wp-content"]'
            ]
            for sel in img_selectors:
                img_elem = soup.select_one(sel)
                if img_elem:
                    src = img_elem.get('src') or img_elem.get('data-src')
                    if src and 'logo' not in src.lower():
                        if not src.startswith('http'):
                            src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                        event_data['image_url'] = src
                        if self.debug:
                            self.log(f"  ✓ Image: {src[:50]}...", "debug")
                        break
            
            # Extract ticket link
            for link in soup.find_all('a', href=True):
                href = link['href']
                text = link.get_text().lower()
                if any(kw in href.lower() or kw in text for kw in ['ticket', 'karte', 'buy', 'kaufen']):
                    event_data['ticket_url'] = href
                    if self.debug:
                        self.log(f"  ✓ Ticket URL: {href[:50]}...", "debug")
                    break
            
            # Extract DJ Instagram handles
            social_links = []
            for link in soup.select('a[href*="instagram.com"]'):
                social_links.append(link['href'])
            
            if social_links and self.debug:
                self.log(f"  ✓ Found {len(social_links)} Instagram links", "debug")
            
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
