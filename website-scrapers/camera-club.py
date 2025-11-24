#!/usr/bin/env python3
"""Camera Club Event Scraper"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper
from typing import List, Dict, Optional
import argparse

class CameraClubScraper(BaseVenueScraper):
    VENUE_NAME = "Camera Club"
    VENUE_ADDRESS = "Neubaugasse 2, 1070 Wien"
    BASE_URL = "https://camera-club.at"
    EVENTS_URL = "https://camera-club.at/events/list/"
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "Electronic"
    
    def scrape_events(self) -> List[Dict]:
        self.log(f"Fetching from {self.EVENTS_URL}")
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup: return []
        
        events = []
        event_items = soup.select('article.event, div.event-item, article')
        self.log(f"Found {len(event_items)} items")
        
        for item in event_items[:50]:
            event_data = self._parse_item(item)
            if event_data and event_data.get('title'):
                events.append(event_data)
                self.log(f"  ✓ {event_data['title'][:50]}", "success")
        return events
    
    def _parse_item(self, item) -> Optional[Dict]:
        try:
            data = {'title': None, 'date': None, 'time': None, 'image_url': None, 'detail_url': None}
            
            title = item.select_one('h2, h3, .title')
            if title: data['title'] = title.get_text(strip=True)
            
            date_elem = item.select_one('.date, time')
            if date_elem:
                text = date_elem.get_text(strip=True)
                data['date'] = self.parse_german_date(text)
                data['time'] = self.parse_time(text)
            
            link = item.select_one('a[href]')
            if link:
                href = link.get('href')
                if href and not href.startswith('http'):
                    href = self.BASE_URL + href
                data['detail_url'] = href
            
            img = item.select_one('img')
            if img: data['image_url'] = img.get('src')
            
            return data if data['title'] else None
        except: return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--debug', action='store_true')
    args = parser.parse_args()
    scraper = CameraClubScraper(dry_run=args.dry_run, debug=args.debug)
    sys.exit(0 if scraper.run()['success'] else 1)

if __name__ == '__main__': main()
