#!/usr/bin/env python3
"""
Intelligent Mega Scraper - Automatically detects venue structure and applies correct parsing strategy

This scraper automatically detects which parsing strategy to use for each venue:
- Plain text parsing (Grelle Forelle, Das Werk, B72, SASS, The Loft, rhiz)
- Pipe-separated table parsing (Celeste)
- Table with inline data (Chelsea)
- JavaScript-rendered sites (Flex, U4, Prater Dome)

Usage:
    python website-scrapers/intelligent_scraper.py <venue-key> [--dry-run] [--debug]
"""

import argparse
import sys
import os
import re
from typing import List, Dict, Optional
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from base_scraper import BaseVenueScraper
from venue_configs import get_venue_config, list_venues


class IntelligentVenueScraper(BaseVenueScraper):
    """
    Intelligent scraper that auto-detects venue structure and applies correct parsing strategy
    """
    
    def __init__(self, venue_key: str, config: dict, dry_run: bool = False, debug: bool = False):
        self.venue_key = venue_key
        self.VENUE_NAME = config['venue_name']
        self.VENUE_ADDRESS = config['venue_address']
        self.BASE_URL = config['base_url']
        self.EVENTS_URL = config['events_url']
        self.CATEGORY = config.get('category', 'Clubs/Discos')
        self.SUBCATEGORY = config.get('subcategory', 'Electronic')
        self.config = config
        
        super().__init__(dry_run, debug)
    
    def scrape_events(self) -> List[Dict]:
        """Main scraping method with automatic strategy detection"""
        self.log(f"🔍 Fetching events from {self.EVENTS_URL}")
        
        soup = self.fetch_page(self.EVENTS_URL)
        if not soup:
            self.log("❌ Failed to fetch page", "error")
            return []
        
        # Auto-detect parsing strategy based on venue
        strategy = self._detect_strategy(soup)
        self.log(f"📋 Detected strategy: {strategy}", "info")
        
        # Apply appropriate parsing strategy
        if strategy == "plain_text":
            return self._parse_plain_text(soup)
        elif strategy == "pipe_separated_table":
            return self._parse_celeste_format(soup)
        elif strategy == "inline_data_table":
            return self._parse_chelsea_format(soup)
        elif strategy == "structured_html":
            return self._parse_structured_html(soup)
        else:
            self.log(f"⚠️  Unknown strategy: {strategy}, using fallback", "warning")
            return self._parse_plain_text(soup)
    
    def _detect_strategy(self, soup) -> str:
        """Automatically detect which parsing strategy to use"""
        
        # Strategy 1: Celeste (pipe-separated table)
        if self.venue_key == 'celeste':
            return "pipe_separated_table"
        
        # Strategy 2: Chelsea (inline data table)
        if self.venue_key == 'chelsea':
            return "inline_data_table"
        
        # Strategy 3: Plain text format (Grelle Forelle, Das Werk, B72, SASS, The Loft, rhiz)
        if self.venue_key in ['grelle-forelle', 'das-werk', 'b72', 'sass-music-club', 'the-loft', 'rhiz']:
            return "plain_text"
        
        # Strategy 4: Structured HTML (Flex, U4, O der Klub, Prater Dome, Praterstrasse, Flucc)
        if self.venue_key in ['flex', 'u4', 'o-der-klub', 'prater-dome', 'praterstrasse', 'flucc']:
            return "structured_html"
        
        # Default fallback
        return "plain_text"
    
    # ============================================================================
    # STRATEGY 1: Plain Text Parsing
    # ============================================================================
    
    def _parse_plain_text(self, soup) -> List[Dict]:
        """
        Parse events from plain text content
        Works for: Grelle Forelle, Das Werk, B72, SASS, The Loft, rhiz
        """
        self.log("📄 Using plain text parsing strategy")
        
        # Get all text content
        text = soup.get_text()
        events = []
        
        # Venue-specific parsing
        if self.venue_key == 'grelle-forelle':
            events = self._parse_grelle_forelle(text)
        elif self.venue_key == 'das-werk':
            events = self._parse_das_werk(text)
        elif self.venue_key == 'b72':
            events = self._parse_b72(text)
        elif self.venue_key == 'sass-music-club':
            events = self._parse_sass(text)
        elif self.venue_key == 'the-loft':
            events = self._parse_the_loft(text)
        elif self.venue_key == 'rhiz':
            events = self._parse_rhiz(text)
        
        self.log(f"✅ Found {len(events)} events using plain text parsing")
        return events
    
    def _parse_grelle_forelle(self, text: str) -> List[Dict]:
        """Parse Grelle Forelle format: '15/11 CONTRAST pres. CRITICAL MUSIC w/ ENEI...'"""
        events = []
        
        # Pattern: DD/MM Title | Age restriction
        pattern = r'(\d{2}/\d{2})\s+([^|]+?)(?:\s*\|\s*(\d+)\+)?(?=\s+\d{2}/\d{2}|$)'
        matches = re.finditer(pattern, text, re.MULTILINE)
        
        for match in matches:
            date_str = match.group(1)  # "15/11"
            title = match.group(2).strip()
            age_restriction = match.group(3) if match.group(3) else None
            
            # Parse date
            day, month = date_str.split('/')
            current_year = datetime.now().year
            date = f"{current_year}-{month.zfill(2)}-{day.zfill(2)}"
            
            events.append({
                'title': title,
                'date': date,
                'time': None,
                'description': f"Age: {age_restriction}+" if age_restriction else None,
                'image_url': None,
                'detail_url': f"{self.BASE_URL}/programm/",
            })
        
        return events
    
    def _parse_das_werk(self, text: str) -> List[Dict]:
        """Parse Das Werk format: 'Freitag 21. November\n19:00 Uhr\nAUSTIN GIORGI...'"""
        events = []
        
        # Pattern: Day DD. Month followed by time and title
        lines = text.split('\n')
        current_date = None
        current_time = None
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Detect date: "Freitag 21. November"
            date_match = re.search(r'(\d{1,2})\.\s+([A-Za-zä]+)', line)
            if date_match:
                day = int(date_match.group(1))
                month_name = date_match.group(2)
                month = self._parse_german_month(month_name)
                if month:
                    year = datetime.now().year
                    current_date = f"{year}-{month:02d}-{day:02d}"
            
            # Detect time: "19:00 Uhr" or "23:00 Uhr"
            time_match = re.search(r'(\d{2}:\d{2})\s*Uhr', line)
            if time_match:
                current_time = time_match.group(1)
            
            # Detect title (uppercase, multiple words)
            if line.isupper() and len(line) > 5 and current_date:
                events.append({
                    'title': line,
                    'date': current_date,
                    'time': current_time,
                    'description': None,
                    'image_url': None,
                    'detail_url': f"{self.BASE_URL}/programm/",
                })
        
        return events
    
    def _parse_b72(self, text: str) -> List[Dict]:
        """Parse B72 format: 'September\n15.09\nGoldie Boutilier\nTickets...'"""
        events = []
        
        lines = text.split('\n')
        current_month = None
        current_year = datetime.now().year
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Detect month header
            month_match = re.match(r'^(January|February|March|April|May|June|July|August|September|October|November|December)$', line, re.IGNORECASE)
            if month_match:
                current_month = self._parse_german_month(month_match.group(1))
                continue
            
            # Detect date: "15.09"
            date_match = re.match(r'^(\d{2})\.(\d{2})$', line)
            if date_match and current_month:
                day = int(date_match.group(1))
                month = int(date_match.group(2))
                
                # Get title from next line
                if i + 1 < len(lines):
                    title = lines[i + 1].strip()
                    
                    # Determine year (if month passed, use next year)
                    if month < datetime.now().month:
                        year = current_year + 1
                    else:
                        year = current_year
                    
                    events.append({
                        'title': title,
                        'date': f"{year}-{month:02d}-{day:02d}",
                        'time': None,
                        'description': None,
                        'image_url': None,
                        'detail_url': f"{self.BASE_URL}/program",
                    })
        
        return events
    
    def _parse_sass(self, text: str) -> List[Dict]:
        """Parse SASS format: 'Do 7. Aug\n23:00 - 06:00\nfm.einfamilienhaus...'"""
        events = []
        
        lines = text.split('\n')
        current_date = None
        current_time = None
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Detect date: "Do 7. Aug" or "Fr 8. Aug"
            date_match = re.match(r'^[A-Za-z]{2}\s*(\d{1,2})\.\s*([A-Za-z]+)$', line)
            if date_match:
                day = int(date_match.group(1))
                month_name = date_match.group(2)
                month = self._parse_german_month(month_name)
                if month:
                    year = datetime.now().year
                    if month < datetime.now().month:
                        year += 1
                    current_date = f"{year}-{month:02d}-{day:02d}"
            
            # Detect time: "23:00 - 06:00"
            time_match = re.match(r'^(\d{2}:\d{2})\s*-\s*\d{2}:\d{2}$', line)
            if time_match:
                current_time = time_match.group(1)
            
            # Detect title (starts with ###)
            if line.startswith('###') and current_date:
                title = line.replace('###', '').strip()
                events.append({
                    'title': title,
                    'date': current_date,
                    'time': current_time,
                    'description': None,
                    'image_url': None,
                    'detail_url': f"{self.BASE_URL}/programm",
                })
        
        return events
    
    def _parse_the_loft(self, text: str) -> List[Dict]:
        """Parse The Loft format: 'Do. 20.11.2025 18:00, Eintritt: € 24/26\nOpen Jazz Vienna...'"""
        events = []
        
        # Pattern: "Do. DD.MM.YYYY HH:MM, Eintritt: €..."
        pattern = r'([A-Za-z]{2})\.\s*(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(\d{2}:\d{2})[^\n]*\n([^\n]+)'
        matches = re.finditer(pattern, text, re.MULTILINE)
        
        for match in matches:
            day = int(match.group(2))
            month = int(match.group(3))
            year = int(match.group(4))
            time = match.group(5)
            title = match.group(6).strip()
            
            events.append({
                'title': title,
                'date': f"{year}-{month:02d}-{day:02d}",
                'time': time,
                'description': None,
                'image_url': None,
                'detail_url': f"{self.BASE_URL}/programm/",
            })
        
        return events
    
    def _parse_rhiz(self, text: str) -> List[Dict]:
        """Parse rhiz format: 'do 100725 20:00LiveNØ MAN (US) + support...'"""
        events = []
        
        # Pattern: "do DDMMYY HH:MM Live TITLE"
        pattern = r'([a-z]{2})\s+(\d{6})\s+(\d{2}:\d{2})[A-Za-z]*([^\n]+)'
        matches = re.finditer(pattern, text, re.MULTILINE)
        
        for match in matches:
            date_str = match.group(2)  # "100725"
            time = match.group(3)
            title = match.group(4).strip()
            
            # Parse date: DDMMYY
            day = int(date_str[0:2])
            month = int(date_str[2:4])
            year = 2000 + int(date_str[4:6])
            
            events.append({
                'title': title,
                'date': f"{year}-{month:02d}-{day:02d}",
                'time': time,
                'description': None,
                'image_url': None,
                'detail_url': f"{self.BASE_URL}/programm/",
            })
        
        return events
    
    # ============================================================================
    # STRATEGY 2: Pipe-Separated Table (Celeste)
    # ============================================================================
    
    def _parse_celeste_format(self, soup) -> List[Dict]:
        """Parse Celeste's pipe-separated table format"""
        self.log("📊 Using pipe-separated table parsing (Celeste)")
        
        events = []
        text = soup.get_text()
        
        # Pattern: "Event Name DD-MM | HH:MM-HH:MM| Club|Artists"
        lines = text.split('\n')
        
        for line in lines:
            if '|' not in line or len(line) < 10:
                continue
            
            # Extract date pattern DD-MM
            date_match = re.search(r'(\d{1,2})-(\d{1,2})', line)
            if not date_match:
                continue
            
            day = int(date_match.group(1))
            month = int(date_match.group(2))
            
            # Extract title (everything before date)
            title_end = date_match.start()
            title = line[:title_end].strip()
            
            # Extract time
            time_match = re.search(r'(\d{2}:\d{2})-\d{2}:\d{2}', line)
            time = time_match.group(1) if time_match else None
            
            # Determine year
            year = datetime.now().year
            if month < datetime.now().month:
                year += 1
            
            events.append({
                'title': title,
                'date': f"{year}-{month:02d}-{day:02d}",
                'time': time,
                'description': line,
                'image_url': None,
                'detail_url': self.BASE_URL,
            })
        
        self.log(f"✅ Found {len(events)} events using pipe-separated parsing")
        return events
    
    # ============================================================================
    # STRATEGY 3: Inline Data Table (Chelsea)
    # ============================================================================
    
    def _parse_chelsea_format(self, soup) -> List[Dict]:
        """Parse Chelsea's inline data table format"""
        self.log("📋 Using inline data table parsing (Chelsea)")
        
        events = []
        
        # Find all table rows
        rows = soup.find_all('tr')
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 2:
                continue
            
            date_text = cells[0].get_text(strip=True)  # "So, 27.07."
            details_text = cells[1].get_text(strip=True)
            
            # Parse date
            date_match = re.search(r'(\d{1,2})\.(\d{1,2})\.', date_text)
            if not date_match:
                continue
            
            day = int(date_match.group(1))
            month = int(date_match.group(2))
            year = datetime.now().year
            if month < datetime.now().month:
                year += 1
            
            # Extract title (first line before VVK: or Doors:)
            title_match = re.split(r'VVK:|Doors:', details_text)[0].strip()
            
            # Extract time
            time_match = re.search(r'Doors:\s*(\d+)h', details_text)
            time = f"{time_match.group(1)}:00" if time_match else None
            
            events.append({
                'title': title_match,
                'date': f"{year}-{month:02d}-{day:02d}",
                'time': time,
                'description': details_text,
                'image_url': None,
                'detail_url': self.EVENTS_URL,
            })
        
        self.log(f"✅ Found {len(events)} events using inline data table parsing")
        return events
    
    # ============================================================================
    # STRATEGY 4: Structured HTML (Future: JavaScript-rendered sites)
    # ============================================================================
    
    def _parse_structured_html(self, soup) -> List[Dict]:
        """Parse structured HTML (placeholder for JS-rendered sites)"""
        self.log("⚠️  Structured HTML parsing not yet implemented for this venue", "warning")
        self.log("💡 This venue likely needs JavaScript rendering with Playwright", "info")
        return []
    
    # ============================================================================
    # Helper Methods
    # ============================================================================
    
    def _parse_german_month(self, month_name: str) -> Optional[int]:
        """Convert German/English month name to number"""
        months = {
            'januar': 1, 'january': 1, 'jän': 1,
            'februar': 2, 'february': 2, 'feb': 2,
            'märz': 3, 'march': 3, 'mär': 3, 'mar': 3,
            'april': 4, 'apr': 4,
            'mai': 5, 'may': 5,
            'juni': 6, 'june': 6, 'jun': 6,
            'juli': 7, 'july': 7, 'jul': 7,
            'august': 8, 'aug': 8,
            'september': 9, 'sep': 9, 'sept': 9,
            'oktober': 10, 'october': 10, 'okt': 10, 'oct': 10,
            'november': 11, 'nov': 11,
            'dezember': 12, 'december': 12, 'dez': 12, 'dec': 12,
        }
        return months.get(month_name.lower())


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(
        description='Intelligent venue scraper with auto-strategy detection',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Supported venues (Top 10):
  grelle-forelle    - Plain text parsing
  das-werk          - Plain text parsing  
  b72               - Plain text parsing
  sass-music-club   - Plain text parsing
  the-loft          - Plain text parsing
  rhiz              - Plain text parsing
  celeste           - Pipe-separated table parsing
  chelsea           - Inline data table parsing
  flex              - Structured HTML (needs JS)
  u4                - Structured HTML (needs JS)

Examples:
  python intelligent_scraper.py grelle-forelle --debug
  python intelligent_scraper.py celeste --dry-run
  python intelligent_scraper.py chelsea --debug
"""
    )
    
    parser.add_argument('venue', help='Venue key to scrape')
    parser.add_argument('--dry-run', action='store_true', help='Run without saving to database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    
    args = parser.parse_args()
    
    # Get venue configuration
    config = get_venue_config(args.venue)
    if not config:
        print(f"❌ Unknown venue: {args.venue}")
        print(f"\nSupported venues: grelle-forelle, das-werk, b72, sass-music-club, the-loft, rhiz, celeste, chelsea")
        return 1
    
    # Create and run scraper
    scraper = IntelligentVenueScraper(args.venue, config, dry_run=args.dry_run, debug=args.debug)
    result = scraper.run()
    
    return 0 if result['success'] else 1


if __name__ == '__main__':
    sys.exit(main())
