#!/usr/bin/env python3
"""
Flucc / Flucc Wanne Event Scraper
Extracts upcoming events from:
- https://flucc.at/musik/ (music events)
- https://flucc.at/kunst/ (art events)
- https://flucc.at/community/ (community events)

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
    # Primary events URL - we'll scrape multiple pages
    EVENTS_URL = "https://flucc.at/musik/"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Mixed"
    
    # All pages to scrape
    EVENTS_PAGES = [
        "https://flucc.at/musik/",
        "https://flucc.at/kunst/",
        "https://flucc.at/community/",
    ]
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from all Flucc pages"""
        all_events = []
        
        for page_url in self.EVENTS_PAGES:
            self.log(f"Fetching events from {page_url}")
            events = self._scrape_page(page_url)
            all_events.extend(events)
        
        # Deduplicate by detail URL
        seen_urls = set()
        unique_events = []
        for event in all_events:
            url = event.get('detail_url', '')
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_events.append(event)
            elif not url:
                unique_events.append(event)
        
        return unique_events
    
    def _scrape_page(self, page_url: str) -> List[Dict]:
        """Scrape events from a single page"""
        soup = self.fetch_page(page_url)
        if not soup:
            return []
        
        events = []
        
        # Look for the "DEMNÄCHST" section and events after it
        # Flucc structure: events are article or div elements with event links
        event_links = soup.select('a[href*="/events/"], a[href*="/musik/"], a[href*="/kunst/"], a[href*="/community/"]')
        
        # Filter to unique event links
        seen_urls = set()
        unique_links = []
        for link in event_links:
            url = link.get('href', '')
            if url and '/events/' in url and url not in seen_urls:
                seen_urls.add(url)
                unique_links.append(link)
        
        self.log(f"  Found {len(unique_links)} event links on {page_url}")
        
        for idx, link in enumerate(unique_links[:30], 1):  # Limit per page
            if self.debug:
                self.log(f"  Processing event {idx}/{len(unique_links)}", "debug")
            
            event_data = self._parse_event_link(link)
            
            if event_data and event_data.get('title') and event_data.get('date'):
                events.append(event_data)
                status = "✓"
                self.log(f"    {status} {event_data['title'][:40]} - {event_data.get('date')}", 
                        "success")
        
        return events
    
    def _parse_event_link(self, link) -> Optional[Dict]:
        """Parse event from link and optionally visit detail page"""
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
            if not href:
                return None
            if not href.startswith('http'):
                href = self.BASE_URL.rstrip('/') + href
            event_data['detail_url'] = href
            
            # Try to get image from within the link (if it contains an img)
            img = link.select_one('img')
            if img:
                src = img.get('src') or img.get('data-src')
                if src:
                    if not src.startswith('http'):
                        src = self.BASE_URL.rstrip('/') + src
                    event_data['image_url'] = src
            
            # Get basic info from link text
            link_text = link.get_text(strip=True)
            
            # Parse date from link text or parent (format: "Mi, 03.12.25" or "Fr, 05.12.25")
            date_match = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{2,4})', link_text)
            if date_match:
                day, month, year = date_match.groups()
                if len(year) == 2:
                    year = '20' + year
                event_data['date'] = f"{year}-{int(month):02d}-{int(day):02d}"
            
            # Look for date in parent element if not found
            if not event_data.get('date'):
                parent = link.find_parent(['article', 'div', 'li'])
                if parent:
                    parent_text = parent.get_text()
                    date_match = re.search(r'(\d{1,2})\.(\d{1,2})\.(\d{2,4})', parent_text)
                    if date_match:
                        day, month, year = date_match.groups()
                        if len(year) == 2:
                            year = '20' + year
                        event_data['date'] = f"{year}-{int(month):02d}-{int(day):02d}"
            
            # Extract title - try to get meaningful text after date
            title_text = re.sub(r'^\s*\w{2},?\s*\d{1,2}\.\d{1,2}\.\d{2,4}\s*', '', link_text).strip()
            if title_text and len(title_text) > 3:
                event_data['title'] = title_text
            
            # Determine location (Deck or Wanne)
            full_text = link.get_text()
            if '@Wanne' in full_text:
                event_data['artists'] = ['Flucc Wanne']
            elif '@Deck' in full_text:
                event_data['artists'] = ['Flucc Deck']
            
            # Visit detail page for more info
            if event_data.get('detail_url') and event_data.get('date'):
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
                self.log(f"    Fetching detail page: {event_data['detail_url']}", "debug")
            
            soup = self.fetch_page(event_data['detail_url'])
            if not soup:
                return
            
            # Extract title from h1 or page title if not set
            if not event_data.get('title') or len(event_data['title']) < 5:
                h1 = soup.select_one('h1')
                if h1:
                    event_data['title'] = h1.get_text(strip=True)
                else:
                    title_elem = soup.select_one('title')
                    if title_elem:
                        title_text = title_elem.get_text()
                        # Format: "23.11.2025 - TITLE - flucc"
                        parts = title_text.split(' - ')
                        if len(parts) > 1:
                            event_data['title'] = parts[1].strip()
            
            # Extract date from title or meta if not found
            if not event_data.get('date'):
                title_elem = soup.select_one('title')
                if title_elem:
                    title_text = title_elem.get_text()
                    date_match = re.search(r'(\d{1,2}\.\d{1,2}\.\d{4})', title_text)
                    if date_match:
                        event_data['date'] = self.parse_german_date(date_match.group(1))
            
            # Extract time from more-info div
            info_elem = soup.select_one('div.more-info')
            if info_elem:
                info_text = info_elem.get_text(strip=True)
                if not event_data.get('time'):
                    event_data['time'] = self.parse_time(info_text)
            
            # Extract description
            desc_parts = []
            for elem in soup.select('div.event-description p, div.beschreibung p, article p'):
                text = elem.get_text(strip=True)
                if text and len(text) > 20:
                    desc_parts.append(text)
            
            if desc_parts:
                event_data['description'] = '\n\n'.join(desc_parts[:3])
            
            # Extract image from page
            if not event_data.get('image_url'):
                img = soup.select_one('article img, .event-image img, img[src*="uploads"]')
                if img:
                    src = img.get('src') or img.get('data-src')
                    if src and 'logo' not in src.lower():
                        if not src.startswith('http'):
                            src = self.BASE_URL.rstrip('/') + src
                        event_data['image_url'] = src
            
            # Extract ticket link
            for ticket_link in soup.find_all('a', href=True):
                href = ticket_link['href']
                text = ticket_link.get_text().lower()
                if any(kw in href.lower() or kw in text for kw in ['ticket', 'karte', 'eventbrite']):
                    event_data['ticket_url'] = href
                    break
            
        except Exception as e:
            if self.debug:
                self.log(f"    Error enriching from detail page: {e}", "warning")


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
