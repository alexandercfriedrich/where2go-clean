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
    EVENTS_URL = "https://flucc.at"
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "Mixed"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Flucc / Flucc Wanne"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Flucc uses div.himmel.event-list structure with event links
        event_links = soup.select('div.himmel.event-list a[href*="/events/"]')
        
        self.log(f"Found {len(event_links)} potential events")
        
        for idx, link in enumerate(event_links, 1):
            if self.debug:
                self.log(f"Processing event {idx}/{len(event_links)}", "debug")
            
            event_data = self._parse_event_link(link)
            
            if event_data and event_data.get('title'):
                # Visit detail page if available
                if event_data.get('detail_url'):
                    self._enrich_from_detail_page(event_data)
                
                events.append(event_data)
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}", 
                        "success" if status == "✓" else "warning")
        
        return events
    
    def _parse_event_link(self, link) -> Optional[Dict]:
        """Parse event from link - must visit detail page for full info"""
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
            
            # Get link href
            href = link.get('href')
            if not href.startswith('http'):
                href = self.BASE_URL.rstrip('/') + href
            event_data['detail_url'] = href
            
            # Get basic info from link text
            link_text = link.get_text(strip=True)
            # Link text often contains time and title
            # e.g., "19:00@DeckA_Phan & FRNRKE Album Release Show"
            time_match = re.search(r'(\d{1,2}:\d{2})', link_text)
            if time_match:
                event_data['time'] = time_match.group(1)
            
            # Title is after the time and location
            title_match = re.search(r'@(?:Deck|Wanne)\s*(.+?)(?:LIVE:|$)', link_text)
            if title_match:
                event_data['title'] = title_match.group(1).strip()
            elif '@Deck' in link_text or '@Wanne' in link_text:
                # Split by location marker
                parts = re.split(r'@(?:Deck|Wanne)\s*', link_text)
                if len(parts) > 1:
                    event_data['title'] = parts[1].strip()
            
            # Determine location
            if '@Wanne' in link_text:
                event_data['artists'] = ['Flucc Wanne']
            elif '@Deck' in link_text:
                event_data['artists'] = ['Flucc Deck']
            
            # Must visit detail page for date and full info
            if event_data['detail_url']:
                self._enrich_from_detail_page(event_data)
            
            return event_data if event_data.get('title') and event_data.get('date') else None
            
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
            
            # Extract date from title or page (format: "23.11.2025 - TITLE")
            title_elem = soup.select_one('title')
            if title_elem:
                title_text = title_elem.get_text()
                # Extract date from format like "23.11.2025 - "
                date_match = re.search(r'(\d{1,2}\.\d{1,2}\.\d{4})', title_text)
                if date_match:
                    event_data['date'] = self.parse_german_date(date_match.group(1))
                    if self.debug:
                        self.log(f"  ✓ Date from title: {event_data['date']}", "debug")
                
                # Extract better title if current one is incomplete
                if not event_data.get('title') or len(event_data['title']) < 5:
                    title_parts = title_text.split(' - ')
                    if len(title_parts) > 1:
                        event_data['title'] = title_parts[1].strip()
            
            # Extract date/time from more-info div
            info_elem = soup.select_one('div.more-info')
            if info_elem:
                info_text = info_elem.get_text(strip=True)
                # Format: "So, 23. Nov 202514:00—20:00 Uhr@Deck"
                if not event_data.get('date'):
                    event_data['date'] = self.parse_german_date(info_text)
                if not event_data.get('time'):
                    event_data['time'] = self.parse_time(info_text)
            
            # Extract description
            desc_parts = []
            for elem in soup.select('div.event-description p, div.beschreibung p'):
                text = elem.get_text(strip=True)
                if text and len(text) > 20:
                    desc_parts.append(text)
            
            if desc_parts:
                event_data['description'] = '\n\n'.join(desc_parts[:3])
                if self.debug:
                    self.log(f"  ✓ Description: {len(event_data['description'])} chars", "debug")
            
            # Extract ticket/info links
            for link in soup.find_all('a', href=True):
                href = link['href']
                text = link.get_text().lower()
                if any(kw in href.lower() or kw in text for kw in ['ticket', 'karte', 'eventbrite']):
                    event_data['ticket_url'] = href
                    break
            
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
