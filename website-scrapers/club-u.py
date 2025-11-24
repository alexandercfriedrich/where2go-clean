#!/usr/bin/env python3
"""Club U Event Scraper - https://club-u.at"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper
from typing import List, Dict, Optional
import argparse

class ClubUScraper(BaseVenueScraper):
    VENUE_NAME = "Club U"
    VENUE_ADDRESS = "Karlsplatz 1, 1010 Wien"
    BASE_URL = "https://club-u.at"
    EVENTS_URL = "https://club-u.at"
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "Electronic"
    
    def scrape_events(self) -> List[Dict]:
        self.log(f"Fetching from {self.EVENTS_URL}")
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup: return []
        
        events = []
        event_items = soup.select('article, div.event, .event-item, div[class*="event"]')
        event_items = [i for i in event_items if i.get_text(strip=True) and len(i.get_text(strip=True)) > 20][:50]
        self.log(f"Found {len(event_items)} items")
        
        for item in event_items:
            data = self._parse_item(item)
            if data and data.get('title'):
                events.append(data)
                self.log(f"  ✓ {data['title'][:50]}", "success")
        return events
    
    def _parse_item(self, item) -> Optional[Dict]:
        try:
            data = {'title': None, 'date': None, 'time': None, 'image_url': None, 'detail_url': None}
            title = item.select_one('h1, h2, h3, .title')
            if title: data['title'] = title.get_text(strip=True)
            date_elem = item.select_one('.date, time')
            if date_elem:
                text = date_elem.get_text(strip=True)
                data['date'] = self.parse_german_date(text)
                data['time'] = self.parse_time(text)
            if not data.get('date'):
                text = item.get_text()
                data['date'] = self.parse_german_date(text)
                data['time'] = self.parse_time(text)
            link = item.select_one('a[href]')
            if link:
                href = link.get('href')
                if href and not href.startswith('http'): href = self.BASE_URL + href
                data['detail_url'] = href
            img = item.select_one('img')
            if img:
                src = img.get('src') or img.get('data-src')
                if src and not src.startswith('http'): src = self.BASE_URL + src
                data['image_url'] = src
            return data if data['title'] else None
        except: return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--debug', action='store_true')
    args = parser.parse_args()
    scraper = ClubUScraper(dry_run=args.dry_run, debug=args.debug)
    sys.exit(0 if scraper.run()['success'] else 1)

if __name__ == '__main__': main()
