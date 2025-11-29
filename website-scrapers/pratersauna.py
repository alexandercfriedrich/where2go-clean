#!/usr/bin/env python3
"""
Pratersauna Event Scraper
Extracts upcoming events from https://pratersauna.tv
and saves them to the Supabase database.

Usage:
    python website-scrapers/pratersauna.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class PratersaunaScraper(BaseVenueScraper):
    """Scraper for Pratersauna Vienna events"""
    
    VENUE_NAME = "Pratersauna"
    VENUE_ADDRESS = "Waldsteingartenstraße 135, 1020 Wien"
    BASE_URL = "https://pratersauna.tv"
    EVENTS_URL = "https://pratersauna.tv"
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "Electronic"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Pratersauna"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Pratersauna uses Elementor with loop grid
        # Events have class 'event' and 'type-event'
        event_selectors = [
            'article.event.type-event',
            'div.e-loop-item',
            'article.event-post',
            'div.event-item',
            'article[class*="post"]'
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
            
            # First, extract the link - we may need to visit detail page for title
            link_elem = item.select_one('a[href*="/event/"]') or item.find('a', href=True)
            if link_elem and link_elem.get('href'):
                href = link_elem['href']
                if not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                event_data['detail_url'] = href
            
            # Extract title - try multiple selectors
            title_selectors = ['h2', 'h3.event-title', '.wp-block-heading', 'h1', '.elementor-heading-title']
            for sel in title_selectors:
                title_elem = item.select_one(sel)
                if title_elem:
                    event_data['title'] = title_elem.get_text(strip=True)
                    break
            
            # Check if title is just a date (DD.MM or DD.MM.) - if so, we need a better title
            is_date_only_title = event_data['title'] and re.match(r'^\d{1,2}\.\d{1,2}\.?$', event_data['title'].strip())
            
            if is_date_only_title:
                # Try to extract event name from URL slug
                better_title = self._extract_title_from_url(event_data.get('detail_url'))
                
                # Also try to find other text elements that might have the real title
                if not better_title:
                    for heading in item.select('h2, h3, h4, strong, .event-name'):
                        heading_text = heading.get_text(strip=True)
                        # Skip if it's also just a date
                        if heading_text and not re.match(r'^\d{1,2}\.\d{1,2}\.?$', heading_text.strip()):
                            better_title = heading_text
                            break
                
                # Try image alt text as fallback
                if not better_title:
                    img = item.select_one('img[alt]')
                    if img and img.get('alt'):
                        alt_text = img['alt'].strip()
                        if alt_text and len(alt_text) > 3 and not re.match(r'^\d{1,2}\.\d{1,2}\.?$', alt_text):
                            better_title = alt_text
                
                # If we found a better title, use date + title format
                if better_title:
                    event_data['title'] = f"Pratersauna {event_data['title'].strip('.')} - {better_title}"
                else:
                    # Fallback: Use "Pratersauna Event" + date
                    event_data['title'] = f"Pratersauna Event {event_data['title']}"
            
            # Extract image
            img_selectors = [
                'figure.wp-block-image img',
                '.event-image img',
                'img.wp-image',
                'img'
            ]
            for sel in img_selectors:
                img_elem = item.select_one(sel)
                if img_elem:
                    src = img_elem.get('src') or img_elem.get('data-src')
                    if src:
                        if not src.startswith('http'):
                            src = self.BASE_URL.rstrip('/') + '/' + src.lstrip('/')
                        event_data['image_url'] = src
                        break
            
            # Extract date - try multiple selectors and formats
            date_selectors = ['time', '.event-date', 'p.has-text-align-center', '.elementor-heading-title']
            for sel in date_selectors:
                date_elem = item.select_one(sel)
                if date_elem:
                    date_text = date_elem.get_text(strip=True)
                    parsed_date = self.parse_german_date(date_text)
                    if parsed_date:
                        event_data['date'] = parsed_date
                        break
            
            # If date not found and title contains DD.MM format, extract from title
            if not event_data['date'] and event_data['title']:
                match = re.search(r'(\d{1,2})\.(\d{1,2})', event_data['title'])
                if match:
                    day = int(match.group(1))
                    month = int(match.group(2))
                    from datetime import datetime
                    current_year = datetime.now().year
                    current_month = datetime.now().month
                    # If month has passed, use next year
                    if month < current_month:
                        year = current_year + 1
                    else:
                        year = current_year
                    try:
                        event_data['date'] = f"{year:04d}-{month:02d}-{day:02d}"
                    except:
                        pass
            
            # Extract time
            time_elem = item.select_one('.event-time')
            if time_elem:
                time_text = time_elem.get_text(strip=True)
                event_data['time'] = self.parse_time(time_text)
            
            # Get description from paragraphs
            desc_parts = []
            for p in item.select('p.wp-block-paragraph, p'):
                text = p.get_text(strip=True)
                if text and len(text) > 10:
                    desc_parts.append(text)
            
            if desc_parts:
                event_data['description'] = '\n\n'.join(desc_parts[:3])  # First 3 paragraphs
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event item: {e}", "error")
            return None
    
    def _extract_title_from_url(self, url: str) -> Optional[str]:
        """
        Extract event title from URL slug.
        URLs like: https://pratersauna.tv/event/event-name-here/
        """
        if not url:
            return None
        
        try:
            # Extract path after /event/
            match = re.search(r'/event/([^/]+)', url)
            if match:
                slug = match.group(1)
                # Convert slug to title: replace hyphens with spaces, capitalize
                title = slug.replace('-', ' ').strip()
                # Capitalize each word
                title = ' '.join(word.capitalize() for word in title.split())
                if title and len(title) > 3:
                    return title
        except Exception as e:
            if hasattr(self, "debug") and self.debug:
                self.log(f"Error extracting title from URL '{url}': {e}", "error")
        
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
            desc_selectors = [
                'div.entry-content p',
                '.event-description',
                '.wp-block-paragraph'
            ]
            
            desc_parts = []
            for sel in desc_selectors:
                for elem in soup.select(sel):
                    text = elem.get_text(strip=True)
                    if text and len(text) > 10:
                        desc_parts.append(text)
                
                if desc_parts:
                    break
            
            if desc_parts:
                event_data['description'] = '\n\n'.join(desc_parts)
            
            # Extract ticket link
            ticket_selectors = [
                'a[href*="ticket"]',
                'a.button',
                'a.wp-block-button__link'
            ]
            for sel in ticket_selectors:
                ticket_elem = soup.select_one(sel)
                if ticket_elem and ticket_elem.get('href'):
                    event_data['ticket_url'] = ticket_elem['href']
                    break
            
            # Extract lineup/artists
            lineup_elem = soup.select_one('div.lineup, .artists')
            if lineup_elem:
                lineup_text = lineup_elem.get_text()
                # Extract capitalized words as artist names
                artists = re.findall(r'\b[A-Z][A-Za-z\s&]{2,30}\b', lineup_text)
                event_data['artists'] = list(set(artists))[:10]
            
            # Extract time if not found yet
            if not event_data.get('time'):
                page_text = soup.get_text()
                event_data['time'] = self.parse_time(page_text)
            
            # Extract date if not found yet
            if not event_data.get('date'):
                page_text = soup.get_text()
                event_data['date'] = self.parse_german_date(page_text)
            
        except Exception as e:
            if self.debug:
                self.log(f"  Error enriching from detail page: {e}", "warning")


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Pratersauna events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = PratersaunaScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
