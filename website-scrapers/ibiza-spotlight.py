#!/usr/bin/env python3
"""
Ibiza Spotlight Event Scraper
Extracts upcoming events from https://www.ibiza-spotlight.de party calendar
and saves them to the Supabase database.

This scraper fetches events from Ibiza Spotlight's party calendar.
Note: The API limits results to 7 days per request.

Usage:
    python website-scrapers/ibiza-spotlight.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse
import time

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
    EVENTS_URL = "https://www.ibiza-spotlight.de/night/events"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Electronic"
    VENUE_LOGO_URL = "https://www.ibiza-spotlight.de/images/logo.png"  # Fallback
    
    def __init__(self, delay: float = 2.0, **kwargs):
        """
        Initialize scraper with respectful rate limiting.
        
        Args:
            delay: Delay between requests in seconds (default: 2.0 for respectful scraping)
            **kwargs: Additional arguments passed to BaseVenueScraper
        """
        super().__init__(**kwargs)
        self.delay = delay
    
    def scrape_events(self) -> List[Dict]:
        """
        Main scraping method - fetches events from Ibiza Spotlight calendar.
        
        Returns:
            List of event dictionaries
        """
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Find event cards on the page
        # Adjust selectors based on actual HTML structure
        event_cards = soup.select('.event-card, .party-card, article.event, .event-item')
        
        if not event_cards:
            # Try alternative selectors
            event_cards = soup.select('[class*="event"], [class*="party"]')
            self.log(f"Using alternative selectors, found {len(event_cards)} potential elements", "debug")
        
        self.log(f"Found {len(event_cards)} potential event cards")
        
        for idx, card in enumerate(event_cards, 1):
            if self.debug:
                self.log(f"Processing event card {idx}/{len(event_cards)}", "debug")
            
            event_data = self._parse_event_card(card)
            
            if event_data and event_data.get('title'):
                events.append(event_data)
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}", 
                        "success" if status == "✓" else "warning")
            
            # Respectful scraping delay
            if idx < len(event_cards):
                time.sleep(self.delay)
        
        return events
    
    def _parse_event_card(self, card) -> Optional[Dict]:
        """
        Parse a single event card from the calendar listing.
        
        Args:
            card: BeautifulSoup element containing event information
            
        Returns:
            Event dictionary or None if parsing fails
        """
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
            title_elem = card.select_one('h3, h2, .event-title, .party-title, .title')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract link
            link_elem = card.select_one('a[href]')
            if link_elem:
                href = link_elem.get('href')
                if href:
                    if not href.startswith('http'):
                        href = self.BASE_URL.rstrip('/') + ('/' if not href.startswith('/') else '') + href
                    event_data['detail_url'] = href
            
            # Extract date
            date_elem = card.select_one('.date, .event-date, time, [class*="date"]')
            if date_elem:
                date_text = date_elem.get_text(strip=True)
                # Try to get from datetime attribute first
                datetime_attr = date_elem.get('datetime')
                if datetime_attr:
                    # Parse ISO format or similar
                    parsed_date = self._parse_iso_date(datetime_attr)
                    if parsed_date:
                        event_data['date'] = parsed_date
                
                if not event_data['date']:
                    event_data['date'] = self.parse_german_date(date_text)
            
            # Extract time
            time_elem = card.select_one('.time, .event-time, [class*="time"]')
            if time_elem:
                time_text = time_elem.get_text(strip=True)
                event_data['time'] = self.parse_time(time_text)
            
            # Extract venue (the actual club/location in Ibiza)
            venue_elem = card.select_one('.venue, .location, [class*="venue"], [class*="location"]')
            if venue_elem:
                venue_text = venue_elem.get_text(strip=True)
                # Add venue to description or title
                if venue_text and venue_text not in event_data.get('title', ''):
                    event_data['description'] = f"Venue: {venue_text}"
            
            # Extract DJs/Artists
            dj_elems = card.select('.dj, .artist, [class*="dj"], [class*="artist"]')
            if dj_elems:
                event_data['artists'] = [dj.get_text(strip=True) for dj in dj_elems if dj.get_text(strip=True)]
            
            # Extract price
            price_elem = card.select_one('.price, [class*="price"]')
            if price_elem:
                price_text = price_elem.get_text(strip=True)
                event_data['price'] = self.extract_price(price_text)
            
            # Extract image
            img_elem = card.select_one('img[src]')
            if img_elem:
                img_src = img_elem.get('src')
                if img_src:
                    if not img_src.startswith('http'):
                        img_src = self.BASE_URL.rstrip('/') + ('/' if not img_src.startswith('/') else '') + img_src
                    event_data['image_url'] = img_src
            
            # If we have at least a title, return the event
            if event_data['title']:
                return event_data
            
            return None
            
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
