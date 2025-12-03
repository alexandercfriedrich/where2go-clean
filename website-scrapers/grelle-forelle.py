#!/usr/bin/env python3#!/usr/bin/env python3
"""
Grelle Forelle Event Scraper
Extracts upcoming events from https://www.grelleforelle.com/programm/
Now using BaseVenueScraper for unified pipeline integration.

Usage:
    python website-scrapers/grelle-forelle.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class GrelleForelleScraper(BaseVenueScraper):
    """Scraper for Grelle Forelle Vienna events"""
    
    VENUE_NAME = "Grelle Forelle"
    VENUE_ADDRESS = "Spittelauer Lände 12, 1090 Wien"
    BASE_URL = "https://www.grelleforelle.com"
    EVENTS_URL = "https://www.grelleforelle.com/programm/"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Electronic"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape all upcoming events from Grelle Forelle"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        portfolio_items = soup.find_all('div', class_='et_pb_portfolio_item')
        
        self.log(f"Found {len(portfolio_items)} potential events")
        
        for idx, item in enumerate(portfolio_items, 1):
            if self.debug:
                self.log(f"Processing event {idx}/{len(portfolio_items)}", "debug")
            
            event_data = self._extract_event_from_portfolio_item(item)
            if event_data and event_data['title']:
                events.append(event_data)
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}", 
                        "success" if status == "✓" else "warning")
        
        return events
    
    def _extract_event_from_portfolio_item(self, item_elem) -> Optional[Dict]:
        """Extract event data from a portfolio item element"""
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
            
            # Get detail page URL
            link_elem = item_elem.find('a', href=True)
            if link_elem and link_elem.get('href'):
                event_data['detail_url'] = link_elem['href']
            
            # Get title from h2 > a first, then fallback to img alt
            title_elem = item_elem.find('h2')
            if title_elem:
                title_link = title_elem.find('a')
                if title_link:
                    event_data['title'] = title_link.get_text(strip=True)
            
            # Fallback to image alt if no title found
            if not event_data['title']:
                img_elem = item_elem.find('img')
                if img_elem:
                    event_data['title'] = img_elem.get('alt') or img_elem.get('title')
            
            # Get image URL
            img_elem = item_elem.find('img')
            if img_elem:
                srcset = img_elem.get('srcset', '')
                if srcset:
                    srcset_parts = [s.strip().split() for s in srcset.split(',')]
                    if srcset_parts and srcset_parts[-1]:
                        event_data['image_url'] = srcset_parts[-1][0]
                if not event_data['image_url']:
                    event_data['image_url'] = img_elem.get('src')
            
            # Extract date from title (format: DD/MM or DD.MM)
            if event_data['title']:
                date_match = re.search(r'(\d{1,2})[./](\d{1,2})', event_data['title'])
                if date_match:
                    day = int(date_match.group(1))
                    month = int(date_match.group(2))
                    
                    current_year = datetime.now().year
                    current_month = datetime.now().month
                    current_day = datetime.now().day
                    
                    if month < current_month or (month == current_month and day < current_day):
                        year = current_year + 1
                    else:
                        year = current_year
                    
                    event_data['date'] = f"{year:04d}-{month:02d}-{day:02d}"
            
            # Enrich from detail page
            if event_data['detail_url']:
                self._enrich_from_detail_page(event_data)
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event: {e}", "error")
            return None
    
    def _enrich_from_detail_page(self, event_data: Dict):
        """Fetch detail page and enrich event data"""
        try:
            if self.debug:
                self.log(f"  Fetching detail page: {event_data['detail_url']}", "debug")
            
            soup = self.fetch_page(event_data['detail_url'])
            if not soup:
                return
            
            page_text = soup.get_text()
            page_text_lower = page_text.lower()
            
            # Extract full title from h1
            title_elem = soup.find('h1', class_='entry-title')
            if title_elem:
                full_title = title_elem.get_text(strip=True)
                if full_title and len(full_title) > len(event_data.get('title', '')):
                    event_data['title'] = full_title
            
            # Extract description
            content = soup.find('div', class_='entry-content')
            if content:
                desc_parts = []
                for p in content.find_all('p'):
                    text = p.get_text(strip=True)
                    if text and len(text) > 10 and not text.lower().startswith(('home', 'back', 'weiter')):
                        desc_parts.append(text)
                
                if not desc_parts:
                    for div in content.find_all('div', recursive=False):
                        text = div.get_text(strip=True)
                        if text and len(text) > 10:
                            desc_parts.append(text)
                
                if desc_parts:
                    event_data['description'] = '\n\n'.join(desc_parts)
            
            # Extract time
            if not event_data.get('time'):
                event_data['time'] = self.parse_time(page_text)
            
            # Extract price
            if not event_data.get('price'):
                event_data['price'] = self.extract_price(page_text)
            
            # Extract ticket URL
            ticket_keywords = ['ticket', 'karte', 'buy', 'kaufen', 'eventbrite', 'ticketmaster', 'linkt.ree']
            for link in soup.find_all('a', href=True):
                href = link['href']
                text = link.get_text().lower()
                if any(kw in href.lower() or kw in text for kw in ticket_keywords):
                    if not href.startswith('#') and 'grelleforelle.com' not in href:
                        event_data['ticket_url'] = href
                        break
            
            # Extract better image
            image_candidates = []
            for img in soup.find_all('img'):
                src = img.get('src', '')
                if any(skip in src.lower() for skip in ['logo', 'icon', 'avatar', 'wp-content/themes']):
                    continue
                
                if 'wp-content/uploads' in src:
                    priority = 0
                    if 'thumb' not in src:
                        priority += 2
                    if any(size in src for size in ['-1024x', '-800x', '-600x', 'full']):
                        priority += 3
                    elif any(size in src for size in ['-400x', '-300x']):
                        priority += 1
                    
                    image_candidates.append((priority, src))
            
            if image_candidates:
                image_candidates.sort(reverse=True)
                best_image = image_candidates[0][1]
                full_size_url = re.sub(r'-\d+x\d+', '', best_image)
                event_data['image_url'] = full_size_url
            
            # Extract artists
            artists = []
            artist_sections = ['mainfloor', 'kitchen', 'lineup', 'line-up', 'line up']
            for section in artist_sections:
                if section in page_text_lower:
                    idx = page_text_lower.find(section)
                    if idx != -1:
                        section_text = page_text[idx:idx+300]
                        artist_matches = re.findall(r'\b[A-Z][A-Za-z\s&]{2,30}\b', section_text)
                        artists.extend(artist_matches[:10])
            
            if artists:
                event_data['artists'] = list(dict.fromkeys(artists))[:20]
                
        except Exception as e:
            if self.debug:
                self.log(f"  Error enriching from detail page: {e}", "warning")


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Grelle Forelle events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = GrelleForelleScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()

