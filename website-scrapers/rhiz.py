#!/usr/bin/env python3
"""
Rhiz Event Scraper
Extracts upcoming events from https://rhiz.wien/programm/
and saves them to the Supabase database.

Usage:
    python website-scrapers/rhiz.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class RhizScraper(BaseVenueScraper):
    """Scraper for Rhiz Vienna events"""
    
    VENUE_NAME = "Rhiz"
    VENUE_ADDRESS = "Lerchenfelder Gürtel, Stadtbahnbogen 37-38, 1080 Wien"
    BASE_URL = "https://rhiz.wien"
    EVENTS_URL = "https://rhiz.wien/programm/"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Underground"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Rhiz"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Rhiz lists events as links to detail pages
        event_links = soup.select('a[href*="/programm/event/"]')
        
        # Filter unique URLs
        unique_urls = set()
        unique_links = []
        for link in event_links:
            url = link.get('href', '')
            if url and url not in unique_urls and '/event/' in url:
                unique_urls.add(url)
                unique_links.append(link)
        
        self.log(f"Found {len(unique_links)} unique event links")
        
        for idx, link in enumerate(unique_links, 1):
            if self.debug:
                self.log(f"Processing event {idx}/{len(unique_links)}", "debug")
            
            event_data = self._parse_event_link(link)
            
            if event_data and event_data.get('title'):
                events.append(event_data)
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}", 
                        "success" if status == "✓" else "warning")
        
        return events
    
    def _parse_event_link(self, link) -> Optional[Dict]:
        """Parse event from link and detail page"""
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
            
            # Get URL
            href = link.get('href')
            if not href.startswith('http'):
                href = self.BASE_URL.rstrip('/') + href
            event_data['detail_url'] = href
            
            # Get title from link if it has meaningful text
            link_text = link.get_text(strip=True)
            if link_text and len(link_text) > 5 and not link_text.startswith('do ') and not link_text.startswith('fr '):
                event_data['title'] = link_text
            
            # Visit detail page for full information
            if href:
                self._enrich_from_detail_page(event_data)
            
            return event_data if event_data.get('title') and event_data.get('date') else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event link: {e}", "error")
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
            
            # Extract title from h1
            if not event_data.get('title'):
                title_elem = soup.select_one('h1.entry-title, h1')
                if title_elem:
                    event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract date and time from event meta or specific elements
            date_elem = soup.select_one('.event-date, .tribe-event-date-start, time')
            if date_elem:
                date_text = date_elem.get_text(strip=True)
                event_data['date'] = self.parse_german_date(date_text)
                event_data['time'] = self.parse_time(date_text)
            
            # Try to parse from page content if not found
            if not event_data.get('date'):
                # Look for date patterns in the page
                page_text = soup.get_text()
                # Pattern like "Do 27.11.25 19:30" or "27. November 2025"
                date_match = re.search(r'(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{2,4})', page_text)
                if date_match:
                    event_data['date'] = self.parse_german_date(date_match.group(0))
            
            # Extract description
            desc_elem = soup.select_one('.event-description, .entry-content, article p')
            if desc_elem:
                desc_text = desc_elem.get_text(strip=True)
                if len(desc_text) > 20:
                    event_data['description'] = desc_text[:500]
            
            # Extract image
            img = soup.select_one('article img, .event-image img, img[src*="uploads"]')
            if img:
                src = img.get('src') or img.get('data-src')
                if src and 'logo' not in src.lower():
                    if not src.startswith('http'):
                        src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                    event_data['image_url'] = src
            
            # Extract ticket link
            for link in soup.find_all('a', href=True):
                href = link['href']
                text = link.get_text().lower()
                if any(kw in href.lower() or kw in text for kw in ['ticket', 'karten', 'eventbrite', 'ntry']):
                    event_data['ticket_url'] = href
                    break
            
        except Exception as e:
            if self.debug:
                self.log(f"  Error enriching from detail page: {e}", "warning")


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Rhiz events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = RhizScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
