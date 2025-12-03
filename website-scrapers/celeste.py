#!/usr/bin/env python3
"""
Celeste Event Scraper
Extracts upcoming events from https://www.celeste.co.at

The page structure shows events in a table with:
- td.agenda-description: contains title (in a.month) and date (in div.ddMM)
- td.agenda-djs: contains DJs/artists in div.eventarts
- Date format: "DD-MM | HH:MM-HH:MM| Type" e.g. "12-12 | 20:00-06:00| Club"
"""

import sys
import os
import re
from typing import List, Dict, Optional
import argparse

sys.path.insert(0, os.path.dirname(__file__))
from base_scraper import BaseVenueScraper


class CelesteScraper(BaseVenueScraper):
    """Scraper for Celeste Vienna events"""
    
    VENUE_NAME = "Celeste"
    VENUE_ADDRESS = "Hamburgerstraße 18, 1050 Wien"
    BASE_URL = "https://www.celeste.co.at"
    EVENTS_URL = "https://www.celeste.co.at"
    CATEGORY = "Clubs & Nachtleben"
    SUBCATEGORY = "Electronic"
    
    def scrape_events(self) -> List[Dict]:
        """Scrape events from Celeste"""
        self.log(f"Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            return []
        
        events = []
        
        # Find all table rows with agenda-description cells
        rows = soup.select('tr:has(td.agenda-description)')
        
        self.log(f"Found {len(rows)} event rows")
        
        for idx, row in enumerate(rows[:50], 1):  # Limit to 50
            if self.debug:
                self.log(f"Processing event {idx}/{len(rows)}", "debug")
            
            event_data = self._parse_event_row(row)
            
            if event_data and event_data.get('title'):
                events.append(event_data)
                status = "✓" if event_data.get('date') else "?"
                self.log(f"  {status} {event_data['title'][:50]} - {event_data.get('date', 'no date')}", 
                        "success" if status == "✓" else "warning")
        
        return events
    
    def _parse_event_row(self, row) -> Optional[Dict]:
        """Parse a single event row from the table"""
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
            
            # Get the description cell
            desc_cell = row.select_one('td.agenda-description')
            if not desc_cell:
                return None
            
            # Extract title from a.month link
            title_link = desc_cell.select_one('a.month')
            if title_link:
                event_data['title'] = title_link.get_text(strip=True)
                event_data['detail_url'] = title_link.get('href', '')
            
            # Extract date/time from div.ddMM
            # Format: "DD-MM | HH:MM-HH:MM| Type" e.g. "12-12 | 20:00-06:00| Club"
            date_div = desc_cell.select_one('div.ddMM')
            if date_div:
                date_text = date_div.get_text(strip=True)
                
                # Parse date: "DD-MM"
                date_match = re.search(r'(\d{1,2})-(\d{1,2})', date_text)
                if date_match:
                    day, month = date_match.groups()
                    # Determine year
                    from datetime import datetime
                    today = datetime.now()
                    year = today.year
                    
                    # If the event date is in the past, it's likely for next year
                    try:
                        event_date_this_year = datetime(year, int(month), int(day))
                        if event_date_this_year.date() < today.date():
                            year = year + 1
                    except ValueError:
                        # Invalid date, use current year
                        pass
                    
                    event_data['date'] = f"{year}-{int(month):02d}-{int(day):02d}"
                
                # Parse time: "HH:MM-HH:MM" or "HH:MM"
                time_match = re.search(r'(\d{1,2}:\d{2})(?:-\d{1,2}:\d{2})?', date_text)
                if time_match:
                    event_data['time'] = time_match.group(1)
                
                # Parse event type: "Club" or "Concert" etc.
                if '| Club' in date_text:
                    event_data['description'] = 'Club Event'
                elif '| Concert' in date_text:
                    event_data['description'] = 'Concert'
            
            # Get the DJs/artists cell
            djs_cell = row.select_one('td.agenda-djs')
            if djs_cell:
                # Extract all artists
                artists = []
                for art in djs_cell.select('div.eventarts'):
                    artist_text = art.get_text(strip=True)
                    # Clean up the text (remove instrument info)
                    artist_name = re.sub(r'\|.*', '', artist_text).strip()
                    if artist_name:
                        artists.append(artist_name)
                
                if artists:
                    event_data['artists'] = artists[:10]  # Limit to 10
                    # Add lineup to description
                    lineup = ', '.join(artists[:5])
                    if event_data.get('description'):
                        event_data['description'] += f'\n\nLineup: {lineup}'
                    else:
                        event_data['description'] = f'Lineup: {lineup}'
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event row: {e}", "error")
            return None


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='Scrape Celeste events')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    scraper = CelesteScraper(dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()
