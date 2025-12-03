#!/usr/bin/env python3
"""
Chelsea Event Scraper
Extracts upcoming events from https://www.chelsea.co.at/concerts.php

The page structure shows events with:
- Anchors like <a name="concert_6524"></a>
- Images in format img/concert_XXXX_1.jpg
- Date in format "Mi, 03.12." with event details after
"""
import sys
import os
from typing import List, Dict, Optional
import argparse
import re

sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper

class ChelseaScraper(BaseVenueScraper):
    VENUE_NAME = "Chelsea"
    VENUE_ADDRESS = "Lerchenfelder Gürtel, Stadtbahnbogen 29-31, 1080 Wien"
    BASE_URL = "https://www.chelsea.co.at"
    EVENTS_URLS = [
        "https://www.chelsea.co.at/concerts.php",
        "https://www.chelsea.co.at/clubs.php"
    ]
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Mixed"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from both concerts and clubs pages."""
        all_events = []
        
        for url in self.EVENTS_URLS:
            self.log(f"Fetching events from {url}")
            soup = self.fetch_page(url)
            if not soup:
                continue
            
            events = self._parse_event_list(soup, url)
            all_events.extend(events)
            
        return all_events
    
    def _parse_event_list(self, soup, page_url: str) -> List[Dict]:
        """Parse event list from the page."""
        events = []
        
        try:
            # Find all anchor elements that mark concert sections
            concert_anchors = soup.find_all('a', attrs={'name': re.compile(r'concert_\d+')})
            
            self.log(f"Found {len(concert_anchors)} concert anchors")
            
            for anchor in concert_anchors:
                event_id = anchor.get('name', '').replace('concert_', '')
                
                # Find the parent table containing this event's details
                event_table = anchor.find_next('table', class_='termindetails')
                if not event_table:
                    continue
                
                event_data = self._extract_event_from_table(event_table, event_id)
                
                if event_data and event_data.get('title'):
                    events.append(event_data)
                    status = "✓" if event_data.get('date') else "?"
                    self.log(f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}",
                            "success" if status == "✓" else "warning")
            
            # Also look for links to concerts in the main list
            if len(events) < 5:
                events.extend(self._parse_from_links(soup, page_url))
                
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event list: {e}", "error")
        
        return events
    
    def _extract_event_from_table(self, table, event_id: str) -> Optional[Dict]:
        """Extract event info from a concert details table."""
        try:
            event_data = {
                'title': None,
                'date': None,
                'time': None,
                'description': None,
                'image_url': None,
                'detail_url': f"{self.BASE_URL}/concerts.php#concert_{event_id}",
                'ticket_url': None,
                'price': None,
                'artists': [],
            }
            
            # Get event title from text content
            text_content = table.get_text()
            
            # Try to find title from strong/bold elements
            strong = table.select_one('strong, b')
            if strong:
                event_data['title'] = strong.get_text(strip=True)
            
            # Extract image
            img = table.select_one(f'img[src*="concert_{event_id}"]')
            if img:
                src = img.get('src')
                if src:
                    if not src.startswith('http'):
                        src = self.BASE_URL + '/' + src.lstrip('/')
                    event_data['image_url'] = src
            
            # Try to extract date from text (format: "Mi, 03.12.")
            date_match = re.search(r'(\w{2}),\s*(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?', text_content)
            if date_match:
                day_name, day, month, year = date_match.groups()
                if not year:
                    from datetime import datetime
                    year = datetime.now().year
                    # If month has passed, assume next year
                    current_month = datetime.now().month
                    if int(month) < current_month:
                        year = year + 1
                elif len(str(year)) == 2:
                    year = 2000 + int(year)
                
                event_data['date'] = f"{year}-{int(month):02d}-{int(day):02d}"
            
            # Try to extract time
            time_match = re.search(r'Doors?:\s*(\d{1,2})\.?(\d{2})h?|Start:\s*(\d{1,2})\.?(\d{2})h?', text_content)
            if time_match:
                groups = time_match.groups()
                hour = groups[0] or groups[2]
                minute = groups[1] or groups[3]
                if hour:
                    event_data['time'] = f"{int(hour):02d}:{minute}"
            
            # Try to extract price
            price_match = re.search(r'VVK:\s*([\d,\.]+)[€\s/]*AK:?\s*([\d,\.TBA]+)?', text_content)
            if price_match:
                vvk = price_match.group(1)
                event_data['price'] = f"VVK: €{vvk}"
            
            # Extract ticket link
            ticket_link = table.select_one('a[href*="ticket"]')
            if ticket_link:
                event_data['ticket_url'] = ticket_link.get('href')
            
            # Extract description (paragraphs)
            paragraphs = table.select('p')
            desc_parts = []
            for p in paragraphs:
                text = p.get_text(strip=True)
                if text and len(text) > 30:
                    desc_parts.append(text)
            if desc_parts:
                event_data['description'] = '\n\n'.join(desc_parts[:3])
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error extracting from table: {e}", "error")
            return None
    
    def _parse_from_links(self, soup, page_url: str) -> List[Dict]:
        """Parse events from link list if table parsing didn't work well."""
        events = []
        
        try:
            # Look for highlight links in the overview table
            links = soup.select('a.highlight[href*="#concert_"]')
            
            for link in links[:30]:
                href = link.get('href', '')
                concert_id = re.search(r'concert_(\d+)', href)
                if not concert_id:
                    continue
                
                # Get the parent row to find the date
                parent_row = link.find_parent('tr')
                if not parent_row:
                    continue
                
                title = link.get_text(strip=True)
                if not title or len(title) < 3:
                    continue
                
                event_data = {
                    'title': title,
                    'date': None,
                    'time': None,
                    'description': None,
                    'image_url': f"{self.BASE_URL}/img/concert_{concert_id.group(1)}_1.jpg",
                    'detail_url': f"{self.BASE_URL}/concerts.php#concert_{concert_id.group(1)}",
                    'ticket_url': None,
                    'price': None,
                    'artists': title.split('/') if '/' in title else [title],
                }
                
                # Try to get date from same row
                row_text = parent_row.get_text()
                date_match = re.search(r'(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?', row_text)
                if date_match:
                    day, month, year = date_match.groups()
                    if not year:
                        from datetime import datetime
                        year = datetime.now().year
                    elif len(str(year)) == 2:
                        year = 2000 + int(year)
                    event_data['date'] = f"{year}-{int(month):02d}-{int(day):02d}"
                
                if event_data['title']:
                    events.append(event_data)
        
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing from links: {e}", "error")
        
        return events

def main():
    parser = argparse.ArgumentParser(description='Scrape Chelsea events')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--debug', action='store_true')
    args = parser.parse_args()
    
    scraper = ChelseaScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    sys.exit(0 if result['success'] else 1)

if __name__ == '__main__':
    main()
