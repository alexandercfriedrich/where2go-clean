#!/usr/bin/env python3
"""
Ibiza Spotlight Event Scraper
Extracts upcoming events from https://www.ibiza-spotlight.de party calendar
and saves them to the Supabase database.

This scraper fetches events from Ibiza Spotlight's party calendar.
The URL is dynamically constructed with a date range (today + 6 days).
The scraper visits each event detail page to extract comprehensive information.

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
    
    def _generate_events_url(self) -> str:
        """
        Generate dynamic events URL with current date range.
        
        The URL format is: /night/events/{year}/{month}?daterange={DD/MM/YYYY}-{DD/MM/YYYY}
        The date range is max 7 days (today through today + 6 days).
        
        Returns:
            Dynamically constructed events URL
        """
        today = datetime.now()
        end_date = today + timedelta(days=6)
        
        # Format dates as DD/MM/YYYY for the daterange parameter
        start_str = today.strftime('%d/%m/%Y')
        end_str = end_date.strftime('%d/%m/%Y')
        
        # Get year and month for the URL path
        year = today.strftime('%Y')
        month = today.strftime('%m')
        
        # Build the dynamic URL
        daterange = f'{start_str}-{end_str}'
        url = f'{self.BASE_URL}/night/events/{year}/{month}?daterange={daterange}'
        
        return url
    
    def scrape_events(self) -> List[Dict]:
        """
        Main scraping method - fetches events from Ibiza Spotlight calendar.
        Uses dynamic URL with current date range and visits detail pages.
        
        Returns:
            List of event dictionaries
        """
        # Generate dynamic URL with current date range
        events_url = self._generate_events_url()
        self.log(f"Fetching events from {events_url}")
        
        soup = self.fetch_page(events_url)
        if not soup:
            return []
        
        events = []
        
        # Find event cards on the page
        # The Ibiza Spotlight calendar uses a grid structure with li.partyCal-day elements
        # Events without the "empty" class contain actual event data
        event_cards = soup.select('li.partyCal-day:not(.empty)')
        
        if not event_cards:
            # Fallback: try to find all partyCal-day elements and filter manually
            all_days = soup.select('li.partyCal-day')
            event_cards = [day for day in all_days if 'empty' not in day.get('class', [])]
            self.log(f"Using fallback selector, found {len(event_cards)} non-empty days", "debug")
        
        self.log(f"Found {len(event_cards)} event days")
        
        for idx, card in enumerate(event_cards, 1):
            if self.debug:
                self.log(f"Processing event card {idx}/{len(event_cards)}", "debug")
            
            event_data = self._parse_event_card(card)
            
            if event_data and event_data.get('title'):
                # Visit detail page to enrich event data
                if event_data.get('detail_url'):
                    self._enrich_from_detail_page(event_data)
                
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
        Parse a single event card from the Ibiza Spotlight calendar.
        
        The calendar uses li.partyCal-day elements with nested card-ticket structure.
        Each card contains date, time, event/promoter name, DJs, venue rooms, and pricing.
        
        Args:
            card: BeautifulSoup li.partyCal-day element containing event information
            
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
            
            # Extract event ID from data attribute
            ticket_card = card.select_one('.card-ticket')
            event_id = None
            if ticket_card:
                event_id = ticket_card.get('data-eventid')
            
            # Extract title from h3 > a (promoter/event name)
            title_link = card.select_one('h3.h3 a, h3 a')
            if title_link:
                event_data['title'] = title_link.get_text(strip=True)
                href = title_link.get('href')
                if href:
                    if not href.startswith('http'):
                        href = self.BASE_URL.rstrip('/') + ('/' if not href.startswith('/') else '') + href
                    event_data['detail_url'] = href
            
            # If no title link, try just h3
            if not event_data['title']:
                title_elem = card.select_one('h3.h3, h3')
                if title_elem:
                    event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract date from ticket-date spans
            date_container = card.select_one('.ticket-date')
            if date_container:
                date_spans = date_container.select('span')
                if len(date_spans) >= 3:
                    # Format: [Day abbr (Mo., Di., etc.), Day number, Month abbr (Jan., Feb., etc.)]
                    day_num = date_spans[1].get_text(strip=True)
                    month_abbr = date_spans[2].get_text(strip=True)
                    
                    # Also try to get year from data attribute or assume current/next year
                    # The rel attribute on the li might contain the date as YYYYMMDD
                    rel_date = card.get('rel', '')
                    if rel_date and len(rel_date) == 8:  # Format: YYYYMMDD
                        event_data['date'] = f"{rel_date[0:4]}-{rel_date[4:6]}-{rel_date[6:8]}"
                    else:
                        # Parse German date: "day month_abbr"
                        date_str = f"{day_num} {month_abbr}"
                        event_data['date'] = self.parse_german_date(date_str)
                    
                    if self.debug and event_data['date']:
                        self.log(f"  Parsed date from spans: {day_num} {month_abbr} -> {event_data['date']}", "debug")
            
            # Also check for data-eventdate attribute
            if not event_data['date'] and title_link:
                event_date_attr = title_link.get('data-eventdate')
                if event_date_attr:
                    # Format is usually YYYY-MM-DD
                    event_data['date'] = event_date_attr
                    if self.debug:
                        self.log(f"  Got date from data-eventdate: {event_date_attr}", "debug")
            
            # Extract time from <time> tag
            time_elem = card.select_one('time')
            if time_elem:
                time_text = time_elem.get_text(strip=True)
                event_data['time'] = self.parse_time(time_text)
            
            # Extract venue rooms and build description
            rooms = []
            room_elems = card.select('.partyRoom')
            for room in room_elems:
                room_text = room.get_text(strip=True)
                if room_text:
                    rooms.append(room_text)
            
            if rooms:
                event_data['description'] = "Venues: " + " | ".join(rooms)
            
            # Extract DJs/Artists from partyDj links
            dj_elems = card.select('.partyDj a')
            if dj_elems:
                event_data['artists'] = [dj.get_text(strip=True) for dj in dj_elems if dj.get_text(strip=True)]
            
            # Extract price from spotlight-price
            price_elem = card.select_one('.spotlight-price')
            if price_elem:
                # Price is in format: <span class="currencyVal">15</span><span class="currencySymb">€</span>
                currency_val = price_elem.select_one('.currencyVal')
                currency_symb = price_elem.select_one('.currencySymb')
                if currency_val and currency_symb:
                    val = currency_val.get_text(strip=True)
                    symb = currency_symb.get_text(strip=True)
                    event_data['price'] = f"ab {symb}{val}"
            
            # Extract image
            img_elem = card.select_one('img[src]')
            if img_elem:
                img_src = img_elem.get('src')
                if img_src and 'logo' not in img_src.lower():  # Avoid venue logos
                    if not img_src.startswith('http'):
                        img_src = self.BASE_URL.rstrip('/') + ('/' if not img_src.startswith('/') else '') + img_src
                    event_data['image_url'] = img_src
            
            # If we have at least a title, return the event
            if event_data['title']:
                return event_data
            
            return None
            
        except Exception as e:
            if self.debug:
                # Provide context for debugging: show card HTML snippet
                card_html = str(card)
                snippet = card_html[:500] + ("..." if len(card_html) > 500 else "")
                self.log(
                    f"Error parsing event card: {e}\nCard HTML snippet: {snippet}",
                    "error"
                )
            else:
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
        Enrich event data by visiting the detail page.
        
        Extracts additional information such as:
        - Full description
        - Additional venue details
        - Complete artist/DJ lineup
        - Ticket information
        - Price details
        - Better quality images
        
        Args:
            event_data: Event dictionary to enrich (modified in-place)
        """
        if not event_data.get('detail_url'):
            return
        
        try:
            if self.debug:
                self.log(f"  Fetching detail page: {event_data['detail_url']}", "debug")
            
            # Add respectful delay before detail page request
            time.sleep(self.delay)
            
            soup = self.fetch_page(event_data['detail_url'])
            if not soup:
                return
            
            # Extract full description
            # Try multiple selectors for description/content
            desc_selectors = [
                '.event-description',
                '.description',
                '.content',
                'article .text-content',
                '.event-content',
                'div[class*="description"]',
                'div[class*="content"] p'
            ]
            
            for selector in desc_selectors:
                desc_elem = soup.select_one(selector)
                if desc_elem:
                    desc_text = desc_elem.get_text(strip=True)
                    if desc_text and len(desc_text) > 50:  # Ensure meaningful content
                        # Only update if we don't have description or this one is longer
                        if not event_data.get('description') or len(desc_text) > len(event_data.get('description', '')):
                            event_data['description'] = desc_text
                            if self.debug:
                                self.log(f"  ✓ Description from detail: {desc_text[:80]}...", "debug")
                        break
            
            # Extract better quality image
            img_selectors = [
                'img.event-image',
                'img.main-image',
                'article img',
                '.event-header img',
                'img[class*="event"]'
            ]
            
            for selector in img_selectors:
                img_elem = soup.select_one(selector)
                if img_elem:
                    img_src = img_elem.get('src')
                    if img_src and 'logo' not in img_src.lower():  # Avoid logos
                        if not img_src.startswith('http'):
                            img_src = self.BASE_URL.rstrip('/') + ('/' if not img_src.startswith('/') else '') + img_src
                        # Only update if we don't have an image or found a better one
                        if not event_data.get('image_url'):
                            event_data['image_url'] = img_src
                            if self.debug:
                                self.log(f"  ✓ Image from detail: {img_src[:50]}...", "debug")
                        break
            
            # Extract more detailed date/time information
            date_selectors = [
                'time[datetime]',
                '.event-date time',
                '[class*="date"]'
            ]
            
            for selector in date_selectors:
                date_elem = soup.select_one(selector)
                if date_elem:
                    # Try datetime attribute first
                    datetime_attr = date_elem.get('datetime')
                    if datetime_attr:
                        parsed_date = self._parse_iso_date(datetime_attr)
                        if parsed_date and not event_data.get('date'):
                            event_data['date'] = parsed_date
                            if self.debug:
                                self.log(f"  ✓ Date from detail: {parsed_date}", "debug")
                            break
                    
                    # Try text content
                    date_text = date_elem.get_text(strip=True)
                    if date_text and not event_data.get('date'):
                        parsed_date = self.parse_german_date(date_text)
                        if parsed_date:
                            event_data['date'] = parsed_date
                            if self.debug:
                                self.log(f"  ✓ Date from detail: {parsed_date}", "debug")
                            break
            
            # Extract complete artist/DJ lineup
            dj_selectors = [
                '.lineup .artist',
                '.lineup .dj',
                '.artists .artist',
                '.djs .dj',
                '[class*="lineup"] [class*="artist"]',
                '[class*="lineup"] [class*="dj"]'
            ]
            
            for selector in dj_selectors:
                dj_elems = soup.select(selector)
                if dj_elems:
                    artists = [dj.get_text(strip=True) for dj in dj_elems if dj.get_text(strip=True)]
                    if artists:
                        # Update only if we found more artists than before
                        if len(artists) > len(event_data.get('artists', [])):
                            event_data['artists'] = artists
                            if self.debug:
                                self.log(f"  ✓ Artists from detail: {', '.join(artists[:3])}...", "debug")
                        break
            
            # Extract ticket URL
            ticket_selectors = [
                'a[href*="ticket"]',
                'a[href*="buy"]',
                'a.ticket-link',
                'a.buy-button'
            ]
            
            for selector in ticket_selectors:
                ticket_elem = soup.select_one(selector)
                if ticket_elem:
                    ticket_href = ticket_elem.get('href')
                    if ticket_href:
                        if not ticket_href.startswith('http'):
                            ticket_href = self.BASE_URL.rstrip('/') + ('/' if not ticket_href.startswith('/') else '') + ticket_href
                        event_data['ticket_url'] = ticket_href
                        if self.debug:
                            self.log(f"  ✓ Ticket URL from detail: {ticket_href[:50]}...", "debug")
                        break
            
            # Extract price information
            price_selectors = [
                '.price',
                '.ticket-price',
                '[class*="price"]',
                '.admission'
            ]
            
            for selector in price_selectors:
                price_elem = soup.select_one(selector)
                if price_elem:
                    price_text = price_elem.get_text(strip=True)
                    if price_text:
                        extracted_price = self.extract_price(price_text)
                        if extracted_price and not event_data.get('price'):
                            event_data['price'] = extracted_price
                            if self.debug:
                                self.log(f"  ✓ Price from detail: {extracted_price}", "debug")
                            break
            
        except Exception as e:
            if self.debug:
                self.log(f"  Error enriching from detail page: {e}", "error")
            # Continue processing - detail page enrichment is optional


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
