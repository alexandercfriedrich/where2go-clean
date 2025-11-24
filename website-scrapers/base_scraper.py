#!/usr/bin/env python3
"""
Base Venue Scraper Template
Provides a flexible framework for creating venue-specific scrapers.

This base class handles:
- Supabase database integration
- Common date/time parsing
- Event data preparation
- Duplicate prevention
- Logging and error handling
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import json
import sys
import os
import re
from typing import List, Dict, Optional, Tuple
from abc import ABC, abstractmethod

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    print("⚠️  supabase-py not installed. Install with: pip install supabase")
    SUPABASE_AVAILABLE = False


class BaseVenueScraper(ABC):
    """
    Abstract base class for venue scrapers.
    
    Subclasses must implement:
    - scrape_events(): Extract events from the venue's website
    - parse_event_list_page(): Parse the main event listing page
    - parse_event_detail_page(): (Optional) Extract details from individual event pages
    """
    
    # Venue configuration - override in subclass
    VENUE_NAME = "Venue Name"
    VENUE_ADDRESS = "Address"
    CITY = "Wien"
    COUNTRY = "Austria"
    BASE_URL = "https://example.com"
    EVENTS_URL = "https://example.com/events"
    CATEGORY = "Clubs/Discos"
    SUBCATEGORY = "Electronic"
    VENUE_LOGO_URL = None  # Fallback image if no event image found
    
    def __init__(self, dry_run: bool = False, debug: bool = False):
        self.dry_run = dry_run
        self.debug = debug
        self.events = []
        
        # Setup HTTP session
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        })
        
        # Initialize Supabase
        self.supabase: Optional[Client] = None
        if not dry_run and SUPABASE_AVAILABLE:
            self._init_supabase()
    
    def _init_supabase(self):
        """Initialize Supabase client from environment variables"""
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            self.log("Supabase credentials not found. Running in dry-run mode.", "warning")
            self.dry_run = True
            return
        
        try:
            self.supabase = create_client(supabase_url, supabase_key)
            self.log("Supabase client initialized", "success")
        except Exception as e:
            self.log(f"Failed to initialize Supabase: {e}", "warning")
            self.dry_run = True
    
    def log(self, message: str, level: str = "info"):
        """Log message with formatting"""
        icons = {
            "info": "ℹ",
            "success": "✓",
            "warning": "⚠",
            "error": "✗",
            "debug": "🔍"
        }
        icon = icons.get(level, "•")
        print(f"{icon} {message}")
    
    def fetch_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch and parse a web page"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except Exception as e:
            self.log(f"Error fetching {url}: {e}", "error")
            return None
    
    def parse_german_date(self, date_text: str) -> Optional[str]:
        """
        Parse various German date formats to YYYY-MM-DD
        
        Supports:
        - DD.MM.YYYY, DD.MM.YY, DD.MM
        - DD/MM/YYYY, DD/MM
        - DD. Month YYYY, DD. Month
        - Weekday DD. Month (e.g., "Mittwoch 26. November")
        - Month DD, YYYY
        """
        if not date_text:
            return None
        
        date_text = date_text.strip()
        
        # German month names
        months = {
            'jänner': 1, 'januar': 1, 'jan': 1,
            'februar': 2, 'feb': 2,
            'märz': 3, 'mär': 3, 'mar': 3,
            'april': 4, 'apr': 4,
            'mai': 5, 'may': 5,
            'juni': 6, 'jun': 6,
            'juli': 7, 'jul': 7,
            'august': 8, 'aug': 8,
            'september': 9, 'sep': 9, 'sept': 9,
            'oktober': 10, 'okt': 10, 'oct': 10,
            'november': 11, 'nov': 11,
            'dezember': 12, 'dez': 12, 'dec': 12
        }
        
        patterns = [
            # DD.MM.YYYY or DD.MM.YY
            (r'(\d{1,2})\.(\d{1,2})\.(\d{2,4})', lambda g: (
                int(g[2]) if len(g[2]) == 4 else 2000 + int(g[2]),
                int(g[1]),
                int(g[0])
            )),
            # DD/MM/YYYY or DD/MM
            (r'(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?', lambda g: (
                int(g[2]) if g[2] else None,
                int(g[1]),
                int(g[0])
            )),
            # DD. Month YYYY (e.g., "26. November 2025")
            (r'(\d{1,2})\.\s*(\w+)\s+(\d{4})', lambda g: (
                int(g[2]),
                months.get(g[1].lower(), 0),
                int(g[0])
            )),
            # DD. Month (without year, e.g., "26. November" or "Mittwoch 26. November")
            # Also handles date ranges like "26. November - 27. November 2025"
            (r'(\d{1,2})\.\s*(\w+)(?:\s*-\s*\d{1,2}\.\s*\w+\s+(\d{4}))?', lambda g: (
                int(g[2]) if g[2] else None,  # Year from end of range if present
                months.get(g[1].lower(), 0),
                int(g[0])
            )),
        ]
        
        for pattern, parser in patterns:
            match = re.search(pattern, date_text.lower())
            if match:
                try:
                    groups = match.groups()
                    year, month, day = parser(groups)
                    
                    # Determine year if not provided
                    if year is None:
                        from datetime import datetime
                        current_year = datetime.now().year
                        current_month = datetime.now().month
                        
                        # If month has passed, use next year
                        if month < current_month:
                            year = current_year + 1
                        else:
                            year = current_year
                    
                    if 1 <= month <= 12 and 1 <= day <= 31 and year >= 2020:
                        return f"{year:04d}-{month:02d}-{day:02d}"
                except:
                    continue
        
        return None
    
    def parse_time(self, text: str) -> Optional[str]:
        """
        Extract time from text (HH:MM format)
        
        Patterns: "23:00", "doors 23:00", "Einlass 19:00", etc.
        """
        if not text:
            return None
        
        time_patterns = [
            r'(?:doors?|einlass|start|beginn)[:\s]+(\d{1,2}):(\d{2})',
            r'(\d{1,2}):(\d{2})\s*(?:uhr)?',
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, text.lower())
            if match:
                try:
                    hour = int(match.group(1))
                    minute = int(match.group(2))
                    if 0 <= hour <= 23 and 0 <= minute <= 59:
                        return f"{hour:02d}:{minute:02d}"
                except:
                    continue
        
        return None
    
    def extract_price(self, text: str) -> Optional[str]:
        """Extract price information from text"""
        if not text:
            return None
        
        # Check for free entry
        if any(kw in text.lower() for kw in ['free', 'gratis', 'eintritt frei', 'freier eintritt']):
            return 'Free / Gratis'
        
        # Extract price patterns
        patterns = [
            r'(?:€|EUR|Euro)\s*(\d+(?:[.,]\d{2})?)',
            r'(\d+(?:[.,]\d{2})?)\s*(?:€|EUR|Euro)',
            r'(?:ab|from)\s+(?:€|EUR)?\s*(\d+(?:[.,]\d{2})?)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    price = match.group(1).replace(',', '.')
                    return f"ab €{price}"
                except:
                    continue
        
        return None
    
    def is_future_event(self, date_str: str) -> bool:
        """Check if event date is in the future"""
        if not date_str:
            return True  # Include events without dates for manual review
        
        try:
            event_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            return event_date >= datetime.now().date()
        except:
            return True
    
    @abstractmethod
    def scrape_events(self) -> List[Dict]:
        """
        Main scraping method - must be implemented by subclass.
        Should return a list of event dictionaries.
        """
        pass
    
    def save_to_database(self, events: List[Dict]) -> Dict:
        """Save events to Supabase database"""
        if not self.supabase:
            self.log("Supabase not initialized, skipping database save", "warning")
            return {'inserted': 0, 'updated': 0, 'errors': 0}
        
        stats = {'inserted': 0, 'updated': 0, 'errors': 0}
        
        for event in events:
            try:
                db_event = self._prepare_event_for_db(event)
                
                # Check for existing event
                existing = None
                if db_event.get('source_url'):
                    result = self.supabase.table('events').select('id').eq(
                        'source_url', db_event['source_url']
                    ).execute()
                    if result.data:
                        existing = result.data[0]
                
                if existing:
                    self.supabase.table('events').update(db_event).eq('id', existing['id']).execute()
                    stats['updated'] += 1
                    self.log(f"  ↻ Updated: {event['title'][:50]}", "info")
                else:
                    self.supabase.table('events').insert(db_event).execute()
                    stats['inserted'] += 1
                    self.log(f"  + Inserted: {event['title'][:50]}", "success")
                    
            except Exception as e:
                stats['errors'] += 1
                self.log(f"  Error saving {event.get('title', 'Unknown')[:50]}: {e}", "error")
        
        return stats
    
    def _prepare_event_for_db(self, event: Dict) -> Dict:
        """Convert scraped event to database format"""
        # Prepare datetime
        start_datetime = None
        if event.get('date'):
            time_str = event.get('time', '23:00')  # Default to 23:00 for club events
            start_datetime = f"{event['date']}T{time_str}:00.000Z"
        
        # Generate slug
        slug = self._generate_slug(event.get('title', ''), event.get('date', ''))
        
        # Use venue logo as fallback if no event image
        image_url = event.get('image_url')
        if not image_url and self.VENUE_LOGO_URL:
            image_url = self.VENUE_LOGO_URL
        
        return {
            'title': event.get('title'),
            'description': event.get('description'),
            'category': self.CATEGORY,
            'subcategory': self.SUBCATEGORY,
            'city': self.CITY,
            'country': self.COUNTRY,
            'start_date_time': start_datetime,
            'end_date_time': event.get('end_datetime'),
            'custom_venue_name': self.VENUE_NAME,
            'custom_venue_address': self.VENUE_ADDRESS,
            'price_info': event.get('price', 'See event page'),
            'is_free': event.get('price', '').lower() in ['free', 'gratis', 'free / gratis'],
            'website_url': event.get('detail_url') or event.get('website'),
            'booking_url': event.get('ticket_url'),
            'image_urls': [image_url] if image_url else None,
            'tags': event.get('artists', [])[:10] if event.get('artists') else None,
            'source': f"{self.VENUE_NAME.lower().replace(' ', '-')}-scraper",
            'source_url': event.get('detail_url') or event.get('website'),
            'slug': slug,
            'published_at': datetime.now().isoformat()
        }
    
    def _generate_slug(self, title: str, date: str) -> str:
        """Generate URL-friendly slug"""
        if not title:
            venue_slug = self.VENUE_NAME.lower().replace(' ', '-')
            return f"{venue_slug}-{date or 'event'}"
        
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[-\s]+', '-', slug).strip('-')
        
        if date:
            slug = f"{slug}-{date}"
        
        venue_slug = self.VENUE_NAME.lower().replace(' ', '-')
        slug = f"{venue_slug}-{slug}"
        
        return slug[:200]
    
    def run(self) -> Dict:
        """Execute the scraper"""
        print("=" * 70)
        print(f"{self.VENUE_NAME} Event Scraper")
        print("=" * 70)
        
        if self.dry_run:
            self.log("Running in DRY-RUN mode (no database writes)", "warning")
        
        # Scrape events
        events = self.scrape_events()
        
        # Filter future events
        future_events = [e for e in events if self.is_future_event(e.get('date'))]
        
        print(f"\n{'=' * 70}")
        print(f"Scraped {len(future_events)} upcoming events")
        print("=" * 70)
        
        # Save to database
        stats = {'inserted': 0, 'updated': 0, 'errors': 0}
        if future_events and not self.dry_run:
            self.log("\nSaving events to database...")
            stats = self.save_to_database(future_events)
            
            # Link events to venues after successful insertion
            if stats['inserted'] > 0 and self.supabase:
                print(f"\n{'=' * 70}")
                print("Linking events to venues...")
                print("=" * 70)
                try:
                    from link_events_to_venue import link_events_to_venues
                    link_stats = link_events_to_venues(self.supabase, dry_run=False, debug=self.debug)
                    self.log(f"✓ Linked {link_stats['linked']} events to venues", "success")
                except Exception as e:
                    self.log(f"⚠️  Error linking events to venues: {e}", "warning")
        
        # Print summary
        print(f"\n{'=' * 70}")
        print("Summary:")
        print("=" * 70)
        print(f"  Events found:    {len(future_events)}")
        print(f"  Inserted:        {stats['inserted']}")
        print(f"  Updated:         {stats['updated']}")
        print(f"  Errors:          {stats['errors']}")
        print("=" * 70)
        
        # Debug output
        if self.debug or self.dry_run:
            print(f"\n{'=' * 70}")
            print("Event Data (JSON):")
            print("=" * 70)
            print(json.dumps(future_events, indent=2, ensure_ascii=False))
        
        return {
            'success': stats['errors'] == 0,
            'events_count': len(future_events),
            'stats': stats,
            'events': future_events
        }
