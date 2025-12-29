#!/usr/bin/env python3
"""
Das WERK Event Scraper
Extracts upcoming events from https://www.daswerk.org/programm/
and saves them to the Supabase database.

Usage:
    python website-scrapers/das-werk.py [--dry-run] [--debug]
"""

import sys
import os
import re
from typing import List, Dict, Optional
import urllib.request
import uuid
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper


class DasWerkScraper(BaseVenueScraper):
    """Scraper for Das WERK Vienna events"""
    
    VENUE_NAME = "Das WERK"
    VENUE_ADDRESS = "Spittelauer Lände 12, 1090 Wien"
    BASE_URL = "https://www.daswerk.org"
    EVENTS_URL = "https://www.daswerk.org/programm/"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Mixed"

    # Supabase Storage Configuration
    SUPABASE_URL = "https://ksjnmybbiwomhaumdrsk.supabase.co"
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', '')  # Set via environment
    STORAGE_BUCKET = "event-images"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Das WERK"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Das WERK uses specific structure: div.events--preview-item
        event_items = soup.select('div.events--preview-item')
        
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

    def _upload_image_to_storage(self, image_url: str, event_title: str) -> Optional[str]:
                """Download image and upload to Supabase Storage, return public URL"""
                if not self.SUPABASE_SERVICE_KEY:
                                self.log("SUPABASE_SERVICE_KEY not set, skipping image upload", "warning")
                                return image_url

                try:
                        # Download image with proper headers to avoid hotlink blocking
                        req = urllib.request.Request(image_url, headers={'Referer': self.BASE_URL, 'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(req, timeout=10) as response:
                                            image_data = response.read()
                                            content_type = response.headers.get('Content-Type', 'image/jpeg')

            # Generate unique filename
            file_ext = content_type.split('/')[-1].split(';')[0]
            filename = f"daswerk-{uuid.uuid4()}.{file_ext}"

            # Upload to Supabase Storage
            upload_url = f"{self.SUPABASE_URL}/storage/v1/object/{self.STORAGE_BUCKET}/{filename}"
            upload_headers = {
                                'Authorization': f'Bearer {self.SUPABASE_SERVICE_KEY}',
                                'Content-Type': content_type
                            }
            upload_req = urllib.request.Request(upload_url, data=image_data, headers=upload_headers, method='POST')
            with urllib.request.urlopen(upload_req, timeout=30) as upload_response:
                                if upload_response.status in [200, 201]:
                                                        public_url = f"{self.SUPABASE_URL}/storage/v1/object/public/{self.STORAGE_BUCKET}/{filename}"
                                                        if self.debug:
                                                                                    self.log(f"Uploaded image to: {public_url}", "debug")
                                                                                return public_url
                                                                        else:
                                                                            self.log(f"Upload failed with status {upload_response.status}", "error")
                                                                            return image_url

        except Exception as e:
            self.log(f"Error uploading image: {e}", "error")
            return image_url  # Fallback to original URL
    
    def _parse_event_item(self, item) -> Optional[Dict]:
        """Parse a single event item from Das WERK structure"""
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
            
            # Extract title from h2.preview-item--headline
            title_elem = item.select_one('h2.preview-item--headline')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract link from a.preview-item--link
            link_elem = item.select_one('a.preview-item--link')
            if link_elem and link_elem.get('href'):
                href = link_elem['href']
                if not href.startswith('http'):
                    href = self.BASE_URL.rstrip('/') + '/' + href.lstrip('/')
                event_data['detail_url'] = href
            
            # Extract date and time from ul.preview-item--information
            info_list = item.select('ul.preview-item--information li')
            if len(info_list) >= 2:
                # First li: date (e.g., "Mittwoch 26. November" or "Mittwoch 26. November – Donnerstag 27. November 2025")
                date_text = info_list[0].get_text(strip=True)
                event_data['date'] = self.parse_german_date(date_text)
                
                # Second li: time (e.g., "18:00 Uhr")
                time_text = info_list[1].get_text(strip=True)
                event_data['time'] = self.parse_time(time_text)
            
            # Extract description/category from p.preview-item--description
            desc_elem = item.select_one('p.preview-item--description')
            if desc_elem:
                desc_text = desc_elem.get_text(strip=True)
                event_data['description'] = desc_text
            
            # Extract month context for better date parsing
            month_elem = item.find_previous('p', class_='preview-item--month')
            if month_elem:
                month_text = month_elem.get_text(strip=True)
                # If date doesn't have year, add current/next year
                if event_data['date'] and not event_data['date']:
                    # Try to parse with month context
                    full_date_text = f"{date_text} {month_text}"
                    event_data['date'] = self.parse_german_date(full_date_text)
            
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
            
            # Extract date and time from ul.detail-item--information
            info_list = soup.select('ul.detail-item--information li')
            if self.debug:
                self.log(f"  Found {len(info_list)} info items", "debug")
            
            if len(info_list) >= 2:
                # First li: date (e.g., "Mittwoch 26. November")
                date_text = info_list[0].get_text(strip=True)
                if self.debug:
                    self.log(f"  Parsing date: '{date_text}'", "debug")
                
                parsed_date = self.parse_german_date(date_text)
                if parsed_date:
                    event_data['date'] = parsed_date
                    if self.debug:
                        self.log(f"  ✓ Date from detail: {parsed_date}", "debug")
                elif self.debug:
                    self.log(f"  ✗ Could not parse date: '{date_text}'", "debug")
                
                # Second li: time (e.g., "18:00 Uhr")
                time_text = info_list[1].get_text(strip=True)
                parsed_time = self.parse_time(time_text)
                if parsed_time:
                    event_data['time'] = parsed_time
                    if self.debug:
                        self.log(f"  ✓ Time from detail: {parsed_time}", "debug")
            
            # Extract image from header background-image style
            header = soup.select_one('div.main--header-image')
            if header:
                style = header.get('style', '')
                match = re.search(r'background-image:\s*url\([\"\'](.*?)[\"\']?\)', style)
                if match:
                    image_url = match.group(1)
                    if image_url and 'logo' not in image_url.lower():
                    # Upload image to Supabase Storage
                                            stored_url = self._upload_image_to_storage(image_url, event_data.get('title', 'event'))
                                            event_data['image_url'] = stored_url
            
            # Extract description from content divs
            desc_parts = []
            
            # Try multiple content selectors
            content_selectors = [
                'div.content p',
                'div.text-content p',
                'section.content p',
                'div.row div.col-lg-10 p'
            ]
            
            for sel in content_selectors:
                for elem in soup.select(sel):
                    text = elem.get_text(strip=True)
                    # Filter out navigation, cookie notices, etc.
                    if text and len(text) > 30:
                        if not any(skip in text.lower() for skip in ['cookie', 'impressum', 'datenschutz', 'kontakt']):
                            desc_parts.append(text)
                
                if desc_parts:
                    break
            
            if desc_parts:
                # Combine up to 5 paragraphs
                full_desc = '\n\n'.join(desc_parts[:5])
                if event_data.get('description'):
                    # Append to existing description
                    event_data['description'] = f"{event_data['description']}\n\n{full_desc}"
                else:
                    event_data['description'] = full_desc
                
                if self.debug:
                    self.log(f"  ✓ Description: {len(full_desc)} chars", "debug")
            
            # Extract category from ul.event-categories
            category_elem = soup.select_one('ul.event-categories li')
            if category_elem:
                category = category_elem.get_text(strip=True)
                if category and category not in event_data.get('artists', []):
                    if not event_data.get('artists'):
                        event_data['artists'] = []
                    event_data['artists'].append(category)
            
        except Exception as e:
            if self.debug:
                self.log(f"  Error enriching from detail page: {e}", "warning")
                import traceback
                traceback.print_exc()


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Das WERK events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = DasWerkScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
