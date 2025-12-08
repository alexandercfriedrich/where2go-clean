#!/usr/bin/env python3
"""
U4 Event Scraper
Extracts upcoming events from https://www.u4.at/events-veranstaltungen/
Uses EventON WordPress plugin structure for parsing.
NOW with Selenium WebDriver for JavaScript rendering!
"""

import sys
import os
import re
import json
from typing import List, Dict, Optional
import argparse
from datetime import datetime
import time

sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper

# Selenium imports
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from bs4 import BeautifulSoup


class U4Scraper(BaseVenueScraper):
    """Scraper for U4 Vienna events - Now with Selenium for JS rendering"""
    
    VENUE_NAME = "U4"
    VENUE_ADDRESS = "Schönbrunner Straße 222, 1120 Wien"
    BASE_URL = "https://www.u4.at"
    EVENTS_URL = "https://www.u4.at/events-veranstaltungen/"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Mixed"
    
    def __init__(self, *args, **kwargs):
        """Initialize scraper with Selenium WebDriver"""
        super().__init__(*args, **kwargs)
        self.driver = None
        self.wait = None
    
    def _init_selenium(self):
        """Initialize Chrome WebDriver with optimized settings"""
        try:
            options = webdriver.ChromeOptions()
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument('--start-maximized')
            # Headless für Server-Umgebung
            options.add_argument('--headless')
            options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            
            # Webdriver-Manager für automatische Driver-Verwaltung
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            self.wait = WebDriverWait(self.driver, 20)  # 20 Sekunden Timeout
            
            self.log("✓ Selenium WebDriver initialized", "success")
            return True
        except Exception as e:
            self.log(f"✗ Failed to initialize Selenium: {e}", "error")
            return False
    
    def _close_selenium(self):
        """Close WebDriver"""
        if self.driver:
            try:
                self.driver.quit()
                self.log("✓ WebDriver closed", "success")
            except:
                pass
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from U4 using Selenium for JS rendering"""
        self.log(f"🔄 Fetching events from {self.EVENTS_URL}")
        
        # Initialize Selenium
        if not self._init_selenium():
            return []
        
        try:
            events = []
            
            # Load the page
            self.log("📄 Loading page with Selenium...", "info")
            self.driver.get(self.EVENTS_URL)
            
            # Wait for events to load via JavaScript
            try:
                self.wait.until(
                    EC.presence_of_all_elements_located((By.CLASS_NAME, "eventon_list_event"))
                )
                self.log("✓ Events rendered by JavaScript", "success")
            except TimeoutException:
                self.log("✗ Events failed to load (timeout after 20s)", "error")
                return []
            
            # Scroll to trigger lazy-loading of images
            self.log("📸 Scrolling to load images...", "info")
            self._scroll_to_load_images()
            
            # Get rendered HTML
            html_content = self.driver.page_source
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Parse events
            event_items = soup.select('.eventon_list_event')
            self.log(f"Found {len(event_items)} EventON event items", "info")
            
            for idx, item in enumerate(event_items[:50], 1):
                if self.debug:
                    self.log(f"Processing event {idx}/{len(event_items)}", "debug")
                
                event_data = self._parse_eventon_event(item)
                
                if event_data and event_data.get('title'):
                    events.append(event_data)
                    status = "✓" if event_data.get('date') else "?"
                    self.log(
                        f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}",
                        "success" if status == "✓" else "warning"
                    )
            
            return events
            
        finally:
            self._close_selenium()
    
    def _scroll_to_load_images(self, pause_time=0.5):
        """Scroll page to trigger lazy-loading of images"""
        try:
            # Scroll to bottom to load all lazy-loaded images
            last_height = self.driver.execute_script("return document.body.scrollHeight")
            
            while True:
                # Scroll down
                self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(pause_time)
                
                # Check if we've reached the end
                new_height = self.driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
                    break
                last_height = new_height
            
            # Scroll back to top
            self.driver.execute_script("window.scrollTo(0, 0);")
            self.log("✓ Page scrolled, lazy-loaded images loaded", "success")
            
        except Exception as e:
            self.log(f"⚠ Scrolling error (non-critical): {e}", "warning")
    
    def _parse_eventon_event(self, item) -> Optional[Dict]:
        """Parse a single EventON event item"""
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
            
            # Try to extract from schema.org JSON-LD first (most reliable)
            schema_script = item.select_one('script[type="application/ld+json"]')
            if schema_script:
                try:
                    schema_data = json.loads(schema_script.string)
                    if schema_data.get('image'):
                        event_data['image_url'] = schema_data['image']
                    if schema_data.get('description'):
                        # Clean HTML from description
                        desc = re.sub(r'<[^>]+>', ' ', schema_data['description'])
                        desc = re.sub(r'\s+', ' ', desc).strip()
                        event_data['description'] = desc[:500]
                except json.JSONDecodeError:
                    if self.debug:
                        self.log("JSON-LD parsing failed for event item", "warning")
            
            # Extract title from span.evcal_event_title
            title_elem = item.select_one('span.evcal_event_title')
            if title_elem:
                event_data['title'] = title_elem.get_text(strip=True)
            
            # Extract image - CHECK BOTH src AND data-src FOR LAZY-LOADED IMAGES
            ft_img = item.select_one('.ev_ftImg img')
            if ft_img:
                # Try src first
                img_url = ft_img.get('src')
                # Fallback to data-src (lazy-loading)
                if not img_url or 'placeholder' in img_url.lower():
                    img_url = ft_img.get('data-src')
                if img_url:
                    event_data['image_url'] = img_url
            
            # Fallback to meta itemprop image
            if not event_data.get('image_url'):
                meta_img = item.select_one('meta[itemprop="image"]')
                if meta_img:
                    event_data['image_url'] = meta_img.get('content')
            
            # Extract date from meta itemprop startDate
            meta_start = item.select_one('meta[itemprop="startDate"]')
            if meta_start:
                start_date = meta_start.get('content')
                if start_date:
                    # Format: "2025-12-4T23:00+1:00"
                    date_match = re.match(r'(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})', start_date)
                    if date_match:
                        year, month, day, hour, minute = date_match.groups()
                        event_data['date'] = f"{year}-{int(month):02d}-{int(day):02d}"
                        event_data['time'] = f"{int(hour):02d}:{minute}"
            
            # Fallback to parsing from date block
            if not event_data.get('date'):
                date_block = item.select_one('.evoet_dayblock')
                if date_block:
                    day_elem = date_block.select_one('em.date')
                    month_elem = date_block.select_one('em.month')
                    time_elem = date_block.select_one('em.time')
                    
                    if day_elem and month_elem:
                        day = day_elem.get_text(strip=True)
                        month_text = month_elem.get_text(strip=True)
                        # Get year from data attribute or current year
                        year = date_block.get('data-syr', str(self._get_current_year()))
                        
                        date_str = f"{day}. {month_text} {year}"
                        event_data['date'] = self.parse_german_date(date_str)
                    
                    if time_elem and not event_data.get('time'):
                        time_text = time_elem.get_text(strip=True)
                        event_data['time'] = self.parse_time(time_text)
            
            # Extract detail URL from itemprop url
            url_link = item.select_one('a[itemprop="url"]')
            if url_link:
                event_data['detail_url'] = url_link.get('href')
            
            # Fallback to first link to event page
            if not event_data.get('detail_url'):
                event_link = item.select_one('a[href*="/events/"]')
                if event_link:
                    href = event_link.get('href')
                    if href and not href.startswith('http'):
                        href = self.BASE_URL.rstrip('/') + href
                    event_data['detail_url'] = href
            
            # Extract subtitle as additional info
            subtitle = item.select_one('span.evcal_event_subtitle')
            if subtitle:
                event_data['artists'] = [subtitle.get_text(strip=True)]
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing EventON event: {e}", "error")
            return None
    
    def _get_current_year(self):
        """Get current year"""
        return datetime.now().year


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape U4 events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = U4Scraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
