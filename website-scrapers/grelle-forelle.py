#!/usr/bin/env python3
"""
Grelle Forelle Event Scraper
Extracts upcoming events from https://www.grelleforelle.com/programm/
and saves them to the Supabase database.

Usage:
    python website-scrapers/grelle-forelle.py [--dry-run] [--debug]
"""

import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import json
import sys
import os
import re
from typing import List, Dict, Optional
import argparse

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from supabase import create_client, Client
except ImportError:
    print("⚠️  supabase-py not installed. Install with: pip install supabase")
    print("   Continuing in dry-run mode only.")

# Import link_events_to_venues function
try:
    from link_events_to_venue import link_events_to_venues
    LINK_EVENTS_AVAILABLE = True
except ImportError:
    LINK_EVENTS_AVAILABLE = False


class GrelleForelleScraper:
    """Scraper for Grelle Forelle Vienna events"""
    
    BASE_URL = "https://www.grelleforelle.com"
    PROGRAMM_URL = f"{BASE_URL}/programm/"
    VENUE_NAME = "Grelle Forelle"
    VENUE_ADDRESS = "Spittelauer Lände 12, 1090 Wien"
    CITY = "Wien"
    COUNTRY = "Austria"
    
    def __init__(self, dry_run: bool = False, debug: bool = False):
        self.dry_run = dry_run
        self.debug = debug
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        })
        
        # Initialize Supabase client if not in dry-run mode
        self.supabase: Optional[Client] = None
        if not dry_run:
            self._init_supabase()
    
    def _init_supabase(self):
        """Initialize Supabase client from environment variables"""
        supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            print("⚠️  Supabase credentials not found in environment variables.")
            print("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
            print("   Continuing in dry-run mode.")
            self.dry_run = True
            return
        
        try:
            self.supabase = create_client(supabase_url, supabase_key)
            print("✓ Supabase client initialized")
        except Exception as e:
            print(f"⚠️  Failed to initialize Supabase: {e}")
            print("   Continuing in dry-run mode.")
            self.dry_run = True
    
    def log(self, message: str, level: str = "info"):
        """Log message with formatting"""
        icons = {"info": "ℹ", "success": "✓", "warning": "⚠", "error": "✗", "debug": "🔍"}
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
    
    def parse_date_from_text(self, date_text: str) -> Optional[str]:
        """
        Parse date from various German date formats
        Returns YYYY-MM-DD format or None
        """
        if not date_text:
            return None
        
        # Clean the text
        date_text = date_text.strip()
        
        # German month names
        months = {
            'jänner': 1, 'januar': 1, 'jan': 1,
            'februar': 2, 'feb': 2,
            'märz': 3, 'mär': 3,
            'april': 4, 'apr': 4,
            'mai': 5,
            'juni': 6, 'jun': 6,
            'juli': 7, 'jul': 7,
            'august': 8, 'aug': 8,
            'september': 9, 'sep': 9, 'sept': 9,
            'oktober': 10, 'okt': 10, 'oct': 10,
            'november': 11, 'nov': 11,
            'dezember': 12, 'dez': 12, 'dec': 12
        }
        
        # Try different patterns
        patterns = [
            # DD.MM.YYYY or DD.MM.YY
            (r'(\d{1,2})\.(\d{1,2})\.(\d{2,4})', lambda m: (int(m[3]) if len(m[3]) == 4 else 2000 + int(m[3]), int(m[2]), int(m[1]))),
            # DD. Month YYYY
            (r'(\d{1,2})\.\s*(\w+)\s*(\d{4})', lambda m: (int(m[3]), months.get(m[2].lower(), 0), int(m[1]))),
            # Month DD, YYYY
            (r'(\w+)\s+(\d{1,2}),?\s+(\d{4})', lambda m: (int(m[3]), months.get(m[1].lower(), 0), int(m[2]))),
        ]
        
        for pattern, parser in patterns:
            match = re.search(pattern, date_text.lower())
            if match:
                try:
                    year, month, day = parser(match.groups())
                    if 1 <= month <= 12 and 1 <= day <= 31:
                        return f"{year:04d}-{month:02d}-{day:02d}"
                except:
                    continue
        
        return None
    
    def extract_event_from_portfolio_item(self, item_elem) -> Optional[Dict]:
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
                'age_restriction': None
            }
            
            # Get detail page URL - try different selectors
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
                # Try srcset first (higher quality), then src
                srcset = img_elem.get('srcset', '')
                if srcset:
                    # Get the largest image from srcset
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
                    
                    # Determine year (assume current or next year)
                    current_year = datetime.now().year
                    current_month = datetime.now().month
                    current_day = datetime.now().day
                    
                    # If month is before current month, or same month but day has passed, use next year
                    if month < current_month or (month == current_month and day < current_day):
                        year = current_year + 1
                    else:
                        year = current_year
                    
                    event_data['date'] = f"{year:04d}-{month:02d}-{day:02d}"
            
            # If we have a detail URL, fetch more details
            if event_data['detail_url']:
                self._enrich_event_from_detail_page(event_data)
            
            return event_data if event_data['title'] else None
            
        except Exception as e:
            if self.debug:
                self.log(f"Error parsing event: {e}", "error")
            return None
    
    def _enrich_event_from_detail_page(self, event_data: Dict):
        """Fetch detail page and enrich event data with all available information"""
        try:
            if self.debug:
                self.log(f"  Fetching detail page: {event_data['detail_url']}", "debug")
            
            soup = self.fetch_page(event_data['detail_url'])
            if not soup:
                return
            
            # Get full page text for searching
            page_text = soup.get_text()
            page_text_lower = page_text.lower()
            
            # 1. Extract full title from h1 if better than image alt
            title_elem = soup.find('h1', class_='entry-title')
            if title_elem:
                full_title = title_elem.get_text(strip=True)
                if full_title and len(full_title) > len(event_data.get('title', '')):
                    event_data['title'] = full_title
            
            # 2. Find main content area
            content = soup.find('div', class_='entry-content')
            if not content:
                if self.debug:
                    self.log(f"  ⚠ No content area found", "debug")
                return
            
            # 3. Extract ALL text content as description (better approach)
            # Get all paragraphs and text blocks
            desc_parts = []
            
            # Get all <p> tags
            for p in content.find_all('p'):
                text = p.get_text(strip=True)
                # Filter out very short text and common navigation elements
                if text and len(text) > 10 and not text.lower().startswith(('home', 'back', 'weiter')):
                    desc_parts.append(text)
            
            # Get all text from divs if no paragraphs found
            if not desc_parts:
                for div in content.find_all('div', recursive=False):
                    text = div.get_text(strip=True)
                    if text and len(text) > 10:
                        desc_parts.append(text)
            
            # Combine all description parts
            if desc_parts:
                # Join with double newline for better readability
                full_description = '\n\n'.join(desc_parts)
                # Store full description (no limit - we want ALL info)
                event_data['description'] = full_description
                
                if self.debug:
                    self.log(f"  ✓ Description: {len(full_description)} chars", "debug")
            
            # 4. Extract time information (multiple approaches)
            if not event_data.get('time'):
                time_patterns = [
                    # Specific patterns for Grelle Forelle
                    (r'opens\s+doors?\s+at\s+(\d{1,2}):(\d{2})', 'doors'),  # "opens doors at 23:00"
                    (r'einlass[:\s]+(\d{1,2}):(\d{2})', 'einlass'),  # "Einlass: 23:00"
                    (r'start[:\s]+(\d{1,2}):(\d{2})', 'start'),  # "Start: 23:00"
                    (r'beginn[:\s]+(\d{1,2}):(\d{2})', 'beginn'),  # "Beginn: 23:00"
                    (r'(\d{1,2}):(\d{2})\s*uhr', 'uhr'),  # "23:00 Uhr"
                    (r'(\d{1,2}):(\d{2})', 'general'),  # Any time format HH:MM
                ]
                
                for pattern, source in time_patterns:
                    match = re.search(pattern, page_text_lower)
                    if match:
                        try:
                            groups = match.groups()
                            if len(groups) >= 2:
                                hour, minute = int(groups[0]), int(groups[1])
                                if 0 <= hour <= 23 and 0 <= minute <= 59:
                                    event_data['time'] = f"{hour:02d}:{minute:02d}"
                                    if self.debug:
                                        self.log(f"  ✓ Time from {source}: {event_data['time']}", "debug")
                                    break
                        except (ValueError, IndexError):
                            continue
            
            # 5. Extract price information
            price_patterns = [
                r'(?:€|EUR|Euro)\s*(\d+(?:[.,]\d{2})?)',  # €15 or EUR 15.00
                r'(\d+(?:[.,]\d{2})?)\s*(?:€|EUR|Euro)',  # 15€ or 15.00 EUR
                r'(?:eintritt|entry|price|preis)[:\s]+(?:€|EUR)?\s*(\d+(?:[.,]\d{2})?)',  # Eintritt: €15
                r'(?:ab|from)\s+(?:€|EUR)?\s*(\d+(?:[.,]\d{2})?)',  # ab €15
            ]
            
            for pattern in price_patterns:
                match = re.search(pattern, page_text_lower)
                if match:
                    try:
                        price = match.group(1).replace(',', '.')
                        event_data['price'] = f"ab €{price}"
                        if self.debug:
                            self.log(f"  ✓ Price: {event_data['price']}", "debug")
                        break
                    except:
                        continue
            
            # Check for "free entry" keywords
            if any(kw in page_text_lower for kw in ['free entry', 'eintritt frei', 'freier eintritt', 'gratis']):
                event_data['price'] = 'Free / Gratis'
                if self.debug:
                    self.log(f"  ✓ Price: Free", "debug")
            
            # 6. Look for ALL ticket/booking links (not just first)
            ticket_keywords = ['ticket', 'karte', 'buy', 'kaufen', 'eventbrite', 'ticketmaster', 'linkt.ree']
            ticket_links = []
            
            for link in soup.find_all('a', href=True):
                href = link['href']
                text = link.get_text().lower()
                
                # Check if this is a ticket link
                if any(kw in href.lower() or kw in text for kw in ticket_keywords):
                    # Avoid internal navigation links
                    if not href.startswith('#') and 'grelleforelle.com' not in href:
                        ticket_links.append(href)
            
            # Use the first valid ticket link
            if ticket_links:
                event_data['ticket_url'] = ticket_links[0]
                if self.debug:
                    self.log(f"  ✓ Ticket URL: {event_data['ticket_url']}", "debug")
            
            # 7. Extract better/larger image from detail page
            # Try multiple strategies to find the best image
            image_candidates = []
            
            # Strategy 1: Look for featured/main images
            for img in soup.find_all('img'):
                src = img.get('src', '')
                # Skip logos and small images
                if any(skip in src.lower() for skip in ['logo', 'icon', 'avatar', 'wp-content/themes']):
                    continue
                
                # Check if it's from wp-content/uploads (actual content images)
                if 'wp-content/uploads' in src:
                    # Prefer images without 'thumb' and with dimensions in filename
                    priority = 0
                    if 'thumb' not in src:
                        priority += 2
                    if any(size in src for size in ['-1024x', '-800x', '-600x', 'full']):
                        priority += 3
                    elif any(size in src for size in ['-400x', '-300x']):
                        priority += 1
                    
                    image_candidates.append((priority, src))
            
            # Sort by priority and use best image
            if image_candidates:
                image_candidates.sort(reverse=True)
                best_image = image_candidates[0][1]
                
                # Only update if it's different from current
                if best_image != event_data.get('image_url'):
                    # Try to get full-size version
                    full_size_url = re.sub(r'-\d+x\d+', '', best_image)
                    event_data['image_url'] = full_size_url
                    if self.debug:
                        self.log(f"  ✓ Better image: {full_size_url}", "debug")
            
            # 8. Extract lineup/artists (if mentioned in description)
            # This helps with searchability
            artists = []
            artist_sections = ['mainfloor', 'kitchen', 'lineup', 'line-up', 'line up']
            
            for section in artist_sections:
                if section in page_text_lower:
                    # Find text after section marker
                    idx = page_text_lower.find(section)
                    if idx != -1:
                        # Get next 200 chars after section name
                        section_text = page_text[idx:idx+300]
                        # Look for capitalized words (artist names)
                        artist_matches = re.findall(r'\b[A-Z][A-Za-z\s&]{2,30}\b', section_text)
                        artists.extend(artist_matches[:10])  # Max 10 per section
            
            if artists:
                # Remove duplicates and store
                unique_artists = list(dict.fromkeys(artists))
                event_data['artists'] = unique_artists[:20]  # Max 20 total
                if self.debug:
                    self.log(f"  ✓ Artists: {len(unique_artists)} found", "debug")
            
            # 9. Extract age restrictions
            age_patterns = [
                r'(\d+)\+',  # 18+
                r'ab\s+(\d+)',  # ab 18
                r'mindestalter[:\s]+(\d+)',  # Mindestalter: 18
            ]
            
            for pattern in age_patterns:
                match = re.search(pattern, page_text_lower)
                if match:
                    age = match.group(1)
                    event_data['age_restriction'] = f"{age}+"
                    if self.debug:
                        self.log(f"  ✓ Age restriction: {age}+", "debug")
                    break
            
            if self.debug:
                self.log(f"  ✓ Detail page enrichment complete", "debug")
                
        except Exception as e:
            if self.debug:
                self.log(f"  ✗ Error enriching from detail page: {e}", "warning")
            import traceback
            if self.debug:
                traceback.print_exc()
    
    def scrape_events(self) -> List[Dict]:
        """Scrape all upcoming events from Grelle Forelle"""
        self.log(f"Fetching events from {self.PROGRAMM_URL}")
        
        soup = self.fetch_page(self.PROGRAMM_URL)
        if not soup:
            return []
        
        # Find all portfolio items (events)
        events = []
        portfolio_items = soup.find_all('div', class_='et_pb_portfolio_item')
        
        self.log(f"Found {len(portfolio_items)} potential events")
        
        for idx, item in enumerate(portfolio_items, 1):
            if self.debug:
                self.log(f"Processing event {idx}/{len(portfolio_items)}", "debug")
            
            event_data = self.extract_event_from_portfolio_item(item)
            if event_data and event_data['title']:
                # Only include future events
                if event_data['date']:
                    event_date = datetime.strptime(event_data['date'], '%Y-%m-%d').date()
                    if event_date >= datetime.now().date():
                        events.append(event_data)
                        self.log(f"  ✓ {event_data['title'][:50]} - {event_data['date']}", "success")
                    else:
                        if self.debug:
                            self.log(f"  ⊗ Skipped past event: {event_data['title'][:50]}", "debug")
                else:
                    # Include events without date for review
                    events.append(event_data)
                    self.log(f"  ? {event_data['title'][:50]} - no date", "warning")
        
        return events
    
    def save_to_database(self, events: List[Dict]) -> Dict:
        """Save events to Supabase database"""
        if not self.supabase:
            self.log("Supabase not initialized, skipping database save", "warning")
            return {'inserted': 0, 'updated': 0, 'errors': 0}
        
        stats = {'inserted': 0, 'updated': 0, 'errors': 0, 'skipped': 0}
        
        for event in events:
            try:
                # Prepare event data for database
                db_event = self._prepare_event_for_db(event)
                
                # Check if event already exists (by source_url or title+date)
                existing = None
                if db_event.get('source_url'):
                    result = self.supabase.table('events').select('id').eq('source_url', db_event['source_url']).execute()
                    if result.data:
                        existing = result.data[0]
                
                if not existing and db_event.get('title') and db_event.get('start_date_time'):
                    # Check by title and date
                    result = self.supabase.table('events').select('id').eq('title', db_event['title']).eq('start_date_time', db_event['start_date_time']).execute()
                    if result.data:
                        existing = result.data[0]
                
                if existing:
                    # Update existing event
                    self.supabase.table('events').update(db_event).eq('id', existing['id']).execute()
                    stats['updated'] += 1
                    self.log(f"  ↻ Updated: {event['title'][:50]}", "info")
                else:
                    # Insert new event
                    self.supabase.table('events').insert(db_event).execute()
                    stats['inserted'] += 1
                    self.log(f"  + Inserted: {event['title'][:50]}", "success")
                    
            except Exception as e:
                stats['errors'] += 1
                self.log(f"  Error saving {event.get('title', 'Unknown')[:50]}: {e}", "error")
        
        return stats
    
    def _prepare_event_for_db(self, event: Dict) -> Dict:
        """Convert scraped event to database format"""
        # Prepare start datetime
        start_datetime = None
        if event['date']:
            if event['time']:
                start_datetime = f"{event['date']}T{event['time']}:00.000Z"
            else:
                # Default to 23:00 for club events without specific time
                start_datetime = f"{event['date']}T23:00:00.000Z"
        
        # Generate slug for URL
        slug = self._generate_slug(event['title'], event['date'])
        
        return {
            'title': event['title'],
            'description': event.get('description'),
            'category': 'Clubs/Discos',
            'subcategory': 'Electronic',
            'city': self.CITY,
            'country': self.COUNTRY,
            'start_date_time': start_datetime,
            'end_date_time': None,  # Usually not specified for club events
            'custom_venue_name': self.VENUE_NAME,
            'custom_venue_address': self.VENUE_ADDRESS,
            'price_info': 'See event page',  # Price usually varies
            'is_free': False,
            'website_url': event.get('detail_url'),
            'booking_url': event.get('ticket_url'),
            'image_urls': [event['image_url']] if event.get('image_url') else None,
            'tags': ['Electronic', 'Techno', 'Club'],
            'source': 'grelle-forelle-scraper',
            'source_url': event.get('detail_url'),
            'slug': slug,
            'published_at': datetime.now().isoformat()
        }
    
    def _generate_slug(self, title: str, date: str) -> str:
        """Generate URL-friendly slug"""
        if not title:
            return f"grelle-forelle-{date or 'event'}"
        
        # Convert to lowercase and replace spaces/special chars with hyphens
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        slug = re.sub(r'[-\s]+', '-', slug)
        slug = slug.strip('-')
        
        # Add date if available
        if date:
            slug = f"{slug}-{date}"
        
        # Add venue for uniqueness
        slug = f"grelle-forelle-{slug}"
        
        return slug[:200]  # Limit length
    
    def run(self) -> Dict:
        """Main execution method"""
        print("=" * 70)
        print("Grelle Forelle Event Scraper")
        print("=" * 70)
        
        if self.dry_run:
            self.log("Running in DRY-RUN mode (no database writes)", "warning")
        
        # Scrape events
        events = self.scrape_events()
        
        print("\n" + "=" * 70)
        print(f"Scraped {len(events)} upcoming events")
        print("=" * 70)
        
        # Save to database
        stats = {'inserted': 0, 'updated': 0, 'errors': 0}
        if events and not self.dry_run:
            self.log("\nSaving events to database...")
            stats = self.save_to_database(events)
            
            # Link events to venues after successful insertion
            if stats['inserted'] > 0 and self.supabase and LINK_EVENTS_AVAILABLE:
                print("\n" + "=" * 70)
                print("Linking events to venues...")
                print("=" * 70)
                try:
                    link_stats = link_events_to_venues(self.supabase, dry_run=False, debug=self.debug)
                    self.log(f"✓ Linked {link_stats['linked']} events to venues", "success")
                except Exception as e:
                    self.log(f"⚠️  Error linking events to venues: {e}", "warning")
        
        # Print summary
        print("\n" + "=" * 70)
        print("Summary:")
        print("=" * 70)
        print(f"  Events found:    {len(events)}")
        print(f"  Inserted:        {stats['inserted']}")
        print(f"  Updated:         {stats['updated']}")
        print(f"  Errors:          {stats['errors']}")
        print("=" * 70)
        
        # Print events in JSON format for inspection
        if self.debug or self.dry_run:
            print("\n" + "=" * 70)
            print("Event Data (JSON):")
            print("=" * 70)
            print(json.dumps(events, indent=2, ensure_ascii=False))
        
        return {
            'success': stats['errors'] == 0,
            'events_count': len(events),
            'stats': stats,
            'events': events
        }


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
