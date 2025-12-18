#!/usr/bin/env python3
"""
Ibiza Spotlight Event Scraper
Extracts upcoming events from https://www.ibiza-spotlight.de party calendar
and saves them to the Supabase database.

This scraper uses a rolling-window approach to fetch events from 4 consecutive
7-day windows, providing comprehensive coverage of ~30 days of events.
The scraper visits each event detail page to extract comprehensive information.

Features:
- Rolling window coverage: 4 x 7-day windows = ~30 days of events
- Month boundary handling: Seamlessly handles Dec/Jan transitions
- Retry logic: Exponential backoff for robust error recovery
- Comprehensive data extraction: Dates, times, venues, artists, prices, descriptions
- Deduplication: Ensures no duplicate events

Usage:
    python website-scrapers/ibiza-spotlight.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse
import time
from datetime import datetime, timedelta

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class IbizaSpotlightScraper(BaseVenueScraper):
    """Scraper for Ibiza Spotlight party calendar"""
    
    # Venue configuration
    VENUE_NAME = "Ibiza Spotlight"
    VENUE_ADDRESS = "Ibiza, Spain"
    CITY = "Ibiza"
    COUNTRY = "Spain"
    BASE_URL = "https://www.ibiza-spotlight.de"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Electronic"
    VENUE_LOGO_URL = None  # No fallback logo available
    
    def __init__(self, delay: float = 2.0, **kwargs):
        """
        Initialize scraper with respectful rate limiting.
        
        Args:
            delay: Delay between requests in seconds (default: 2.0 for respectful scraping)
            **kwargs: Additional arguments passed to BaseVenueScraper
        """
        super().__init__(**kwargs)
        self.delay = delay
    
    def _generate_rolling_window_urls(self) -> List[str]:
        """
        Generate 4 rolling 7-day window URLs for comprehensive month coverage.
        
        Returns list of 4 URLs:
        - Window 1: today to today+6
        - Window 2: today+7 to today+13  
        - Window 3: today+14 to today+20
        - Window 4: today+21 to today+27
        
        Each window is formatted as:
        /night/events/{year}/{month}?daterange=DD/MM/YYYY-DD/MM/YYYY
        
        This ensures:
        1. Full month coverage (~30 days)
        2. Automatic month boundary handling (e.g., Dec 25 - Jan 31)
        3. Each window independently fetchable
        4. No duplicate date ranges
        
        Returns:
            List[str]: 4 URLs for rolling windows
        """
        today = datetime.now()
        urls = []
        
        # Generate 4 consecutive 7-day windows
        for window_num in range(4):
            window_start = today + timedelta(days=window_num * 7)
            window_end = window_start + timedelta(days=6)  # 7 days inclusive
            
            start_str = window_start.strftime('%d/%m/%Y')
            end_str = window_end.strftime('%d/%m/%Y')
            
            year = window_start.strftime('%Y')
            month = window_start.strftime('%m')
            
            daterange = f'{start_str}-{end_str}'
            url = f'{self.BASE_URL}/night/events/{year}/{month}?daterange={daterange}'
            
            urls.append(url)
            self.log(f"Window {window_num + 1}/4: {start_str} to {end_str}", "debug")
        
        return urls
    
    def fetch_page_with_retry(self, url: str, retries: int = 3) -> Optional:
        """
        Fetch page with retry logic and exponential backoff.
        
        Retry strategy:
        - Attempt 1: immediate
        - Attempt 2: wait 1 second (2^0)
        - Attempt 3: wait 2 seconds (2^1)
        - Attempt 4: wait 4 seconds (2^2)
        
        Args:
            url: URL to fetch
            retries: Maximum number of attempts
        
        Returns:
            BeautifulSoup object or None if all attempts fail
        """
        for attempt in range(retries):
            try:
                soup = self.fetch_page(url)
                if soup:
                    if attempt > 0:
                        self.log(f"✓ Successfully fetched after {attempt} retry/ies", "success")
                    return soup
            
            except Exception as e:
                if attempt < retries - 1:
                    wait_time = 2 ** attempt
                    self.log(
                        f"Attempt {attempt + 1}/{retries} failed: {str(e)[:50]}. "
                        f"Retrying in {wait_time}s...",
                        "warning"
                    )
                    time.sleep(wait_time)
                else:
                    self.log(f"✗ Failed to fetch after {retries} attempts", "error")
        
        return None
    
    def scrape_events(self) -> List[Dict]:
        """
        Main scraping method using 4 rolling 7-day windows.
        
        Process:
        1. Generate 4 rolling-window URLs
        2. For each URL (window):
           - Fetch with retry logic
           - Parse all event cards
           - Enrich from detail pages
           - Collect events
        3. Deduplicate results (by date + title)
        4. Return comprehensive event list
        
        Returns:
            List of event dictionaries
        """
        urls = self._generate_rolling_window_urls()
        all_events = []
        
        for window_idx, events_url in enumerate(urls, 1):
            self.log(f"Processing Window {window_idx}/4: {events_url}", "info")
            
            soup = self.fetch_page_with_retry(events_url, retries=3)
            if not soup:
                self.log(f"  ✗ Failed to fetch, skipping window", "warning")
                continue
            
            # Find event cards on the page
            event_cards = soup.select('li.partyCal-day:not(.empty)')
            if not event_cards:
                # Fallback: try to find all partyCal-day elements and filter manually
                all_days = soup.select('li.partyCal-day')
                event_cards = [day for day in all_days if 'empty' not in day.get('class', [])]
            
            self.log(f"  Found {len(event_cards)} event cards")
            
            for card_idx, card in enumerate(event_cards, 1):
                event_data = self._parse_event_card(card)
                
                if event_data and event_data.get('title'):
                    # Enrich from detail page
                    if event_data.get('detail_url'):
                        self._enrich_from_detail_page(event_data)
                    
                    all_events.append(event_data)
                    
                    status = "✓" if event_data.get('date') else "?"
                    date_str = event_data.get('date', '?') or '?'
                    time_str = event_data.get('start_time', '') or ''
                    self.log(
                        f"  {status} {event_data['title'][:40]:40} | "
                        f"{date_str:10} | "
                        f"{time_str:5}",
                        "success" if status == "✓" else "warning"
                    )
                
                if card_idx < len(event_cards):
                    time.sleep(self.delay)
            
            if window_idx < len(urls):
                self.log(f"  Waiting before next window...", "debug")
                time.sleep(self.delay)
        
        # Deduplicate events (same date + title)
        unique_events = {}
        for event in all_events:
            key = f"{event.get('date', '')}_{event.get('title', '')}"
            if key not in unique_events:
                unique_events[key] = event
        
        result = list(unique_events.values())
        self.log(f"✓ Scraped {len(result)} unique events across 4 windows (30-day coverage)", "success")
        
        return result
    
    def _parse_event_card(self, card) -> Optional[Dict]:
        """
        Parse event card with comprehensive field extraction.
        
        Extract:
        - title: Event/promoter name
        - date: From rel attribute (YYYYMMDD format)
        - start_time/end_time: Split from <time> tag
        - venues: ALL .partyRoom elements (deduplicated)
        - artists: ALL a.partyDj elements (deduplicated)
        - price: From .spotlight-price
        - image_url: High-quality image
        - detail_url: For enrichment pass
        
        Returns:
            Dict with all fields populated or None
        """
        try:
            event_data = {
                'title': None,
                'date': None,
                'start_time': None,
                'end_time': None,
                'description': None,
                'image_url': None,
                'detail_url': None,
                'ticket_url': None,
                'price': None,
                'artists': [],
                'venues': [],
            }
            
            # 1. TITLE & DETAIL URL (also extract date from data-eventdate)
            title_link = card.select_one('h3.h3 a, h3 a')
            if title_link:
                event_data['title'] = title_link.get_text(strip=True)
                href = title_link.get('href', '')
                if href and not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + ('/' if not href.startswith('/') else '') + href
                event_data['detail_url'] = href
                
                # Extract date from data-eventdate attribute (format: YYYY-MM-DD)
                event_date = title_link.get('data-eventdate', '').strip()
                if event_date:
                    event_data['date'] = event_date
            
            # 2. FALLBACK: DATE FROM REL ATTRIBUTE
            if not event_data['date']:
                rel_date = card.get('rel', '').strip()
                if rel_date and len(rel_date) == 8 and rel_date.isdigit():
                    event_data['date'] = f"{rel_date[0:4]}-{rel_date[4:6]}-{rel_date[6:8]}"
            
            # If no title link, try just h3
            if not event_data['title']:
                title_elem = card.select_one('h3.h3, h3')
                if title_elem:
                    event_data['title'] = title_elem.get_text(strip=True)
            
            if not event_data['title']:
                return None
            
            # 3. TIME (START/END SEPARATED)
            time_elem = card.select_one('time')
            if time_elem:
                time_text = time_elem.get_text(strip=True)
                # Split by " - " to get start and end times
                if '-' in time_text:
                    times = time_text.split('-')
                    if len(times) >= 2:
                        event_data['start_time'] = times[0].strip()
                        event_data['end_time'] = times[1].strip()
                else:
                    # Single time value
                    event_data['start_time'] = time_text.strip()
            
            # 4. VENUES (COLLECT ALL, DEDUPLICATE)
            venues = []
            for room in card.select('.partyRoom'):
                room_text = room.get_text(strip=True)
                if room_text and room_text not in venues:
                    venues.append(room_text)
            event_data['venues'] = venues
            event_data['description'] = " | ".join(venues) if venues else None
            
            # 5. ARTISTS (COLLECT ALL, DEDUPLICATE)
            artists = []
            # Try .partyDj a links first (most reliable)
            for dj_link in card.select('.partyDj a'):
                dj_name = dj_link.get_text(strip=True)
                if dj_name and dj_name not in artists:
                    artists.append(dj_name)
            event_data['artists'] = artists
            
            # 6. PRICE
            price_elem = card.select_one('.spotlight-price')
            if price_elem:
                val = price_elem.select_one('.currencyVal')
                symb = price_elem.select_one('.currencySymb')
                if val and symb:
                    event_data['price'] = f"ab {symb.get_text(strip=True)}{val.get_text(strip=True)}"
            
            # 7. IMAGE
            img = card.select_one('img[src]')
            if img:
                img_src = img.get('src', '')
                if img_src and 'logo' not in img_src.lower():
                    if not img_src.startswith('http'):
                        img_src = self.BASE_URL.rstrip('/') + ('/' if not img_src.startswith('/') else '') + img_src
                    event_data['image_url'] = img_src
            
            return event_data
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event card: {e}", "error")
            return None
    
    def _parse_iso_date(self, date_str: str) -> Optional[str]:
        """
        Parse ISO date format to YYYY-MM-DD.
        
        Args:
            date_str: Date string in ISO format (e.g., "2024-12-25" or "2024-12-25T20:00:00")
            
        Returns:
            Date in YYYY-MM-DD format or None
        """
        if not date_str:
            return None
        
        # Extract date part from ISO datetime
        match = re.match(r'(\d{4})-(\d{2})-(\d{2})', date_str)
        if match:
            year, month, day = match.groups()
            return f"{year}-{month}-{day}"
        
        return None
    
    def _enrich_from_detail_page(self, event_data: Dict):
        """
        Enrich event data by visiting detail page.
        
        Extract:
        - Full description
        - Better quality images
        - Complete artist lineup
        - All venue information
        - Ticket URLs
        - Price details
        
        Args:
            event_data: Event dict to enrich (modified in-place)
        """
        if not event_data.get('detail_url'):
            return
        
        try:
            time.sleep(self.delay)  # Respectful delay
            soup = self.fetch_page_with_retry(event_data['detail_url'], retries=2)
            
            if not soup:
                return
            
            # Extract description from various selectors
            desc_selectors = [
                '.event-teaser', '.article-text', 'div.event__description',
                '.info-box', '.description-container', 'article p'
            ]
            
            for selector in desc_selectors:
                elem = soup.select_one(selector)
                if elem:
                    desc_text = elem.get_text(strip=True)
                    if desc_text and len(desc_text) > 30:
                        if not event_data.get('description') or len(desc_text) > len(event_data.get('description', '')):
                            event_data['description'] = desc_text[:500]
                            break
            
            # Extract better quality image
            img_selectors = [
                'img.teaser-image', 'img.article-image', 'figure.event-image img',
                'img[class*="event"]', 'img[src*="event"]'
            ]
            
            for selector in img_selectors:
                img_elem = soup.select_one(selector)
                if img_elem:
                    img_src = img_elem.get('src', '')
                    if img_src and 'logo' not in img_src.lower():
                        if not img_src.startswith('http'):
                            img_src = self.BASE_URL.rstrip('/') + ('/' if not img_src.startswith('/') else '') + img_src
                        if not event_data.get('image_url'):
                            event_data['image_url'] = img_src
                            break
            
            # Extract complete artist lineup
            lineup_selectors = [
                '.lineup .artist', '.dj-list .dj', '.artists .artist',
                'a[class*="dj"]', '.lineup__artist'
            ]
            
            for selector in lineup_selectors:
                dj_elems = soup.select(selector)
                if dj_elems:
                    artists = []
                    for dj in dj_elems:
                        dj_name = dj.get_text(strip=True)
                        if dj_name and dj_name not in artists:
                            artists.append(dj_name)
                    if len(artists) > len(event_data.get('artists', [])):
                        event_data['artists'] = artists
                        break
            
            # Extract ticket URL
            ticket_selectors = [
                'a.ticket-button', 'a[href*="tickets"]',
                '.cta-button[href*="ticket"]', 'a[class*="ticket"]'
            ]
            
            for selector in ticket_selectors:
                ticket_elem = soup.select_one(selector)
                if ticket_elem:
                    ticket_href = ticket_elem.get('href', '')
                    if ticket_href:
                        if not ticket_href.startswith('http'):
                            ticket_href = self.BASE_URL.rstrip('/') + ('/' if not ticket_href.startswith('/') else '') + ticket_href
                        event_data['ticket_url'] = ticket_href
                        break
            
        except Exception as e:
            if self.debug:
                self.log(f"Error enriching detail page: {e}", "warning")


def main():
    """Main entry point for the scraper"""
    parser = argparse.ArgumentParser(description='Ibiza Spotlight Event Scraper')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Run without saving to database')
    parser.add_argument('--debug', action='store_true',
                       help='Enable debug logging')
    parser.add_argument('--delay', type=float, default=2.0,
                       help='Delay between requests in seconds (default: 2.0)')
    
    args = parser.parse_args()
    
    # Create and run scraper
    scraper = IbizaSpotlightScraper(
        dry_run=args.dry_run,
        debug=args.debug,
        delay=args.delay
    )
    
    result = scraper.run()
    
    # Exit with appropriate code
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
