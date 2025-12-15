import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import logging
import time
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class IbizaSpotlightScraper:
    """
    Scraper for ibiza-spotlight.de event calendar.
    Supports calendar scraping (7 days max) and detailed event information.
    """
    
    BASE_URL = "https://www.ibiza-spotlight.de"
    CALENDAR_URL = f"{BASE_URL}/night/events"
    
    def __init__(self, delay: float = 2.0, timeout: int = 10, language: str = "de"):
        """
        Initialize scraper.
        
        Args:
            delay: Delay between requests in seconds (respectful scraping)
            timeout: Request timeout in seconds
            language: Language code (de, en, etc.)
        """
        self.delay = delay
        self.timeout = timeout
        self.language = language
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def get_events_calendar(self, start_date: Optional[str] = None, max_days: int = 7) -> List[Dict]:
        """
        Scrape events from calendar (7 days max per API limitation).
        
        Args:
            start_date: Start date in DD/MM/YYYY format (optional)
            max_days: Maximum days to scrape (default 7)
            
        Returns:
            List of event dictionaries
        """
        events = []
        try:
            logger.info(f"Fetching events calendar from {self.CALENDAR_URL}")
            response = self.session.get(self.CALENDAR_URL, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            event_cards = soup.find_all('div', class_='event-card')
            
            for card in event_cards:
                try:
                    event = self._extract_event_from_card(card)
                    if event:
                        events.append(event)
                except Exception as e:
                    logger.warning(f"Error parsing event card: {e}")
                    continue
            
            logger.info(f"Successfully scraped {len(events)} events from calendar")
            return events
            
        except requests.RequestException as e:
            logger.error(f"Error fetching events calendar: {e}")
            return []
    
    def _extract_event_from_card(self, card) -> Optional[Dict]:
        """
        Extract event information from a calendar card.
        
        Args:
            card: BeautifulSoup card element
            
        Returns:
            Event dictionary or None
        """
        try:
            title = card.find('h3', class_='event-title')
            venue = card.find('span', class_='venue')
            date_elem = card.find('span', class_='date')
            time_elem = card.find('span', class_='time')
            price = card.find('span', class_='price')
            djs_elem = card.find('div', class_='djs')
            link = card.find('a', class_='event-link')
            
            if not all([title, venue, date_elem]):
                return None
            
            event = {
                'title': title.get_text(strip=True),
                'venue': venue.get_text(strip=True),
                'date': date_elem.get_text(strip=True),
                'time': time_elem.get_text(strip=True) if time_elem else '',
                'price_from': price.get_text(strip=True) if price else '€0',
                'djs': self._parse_djs(djs_elem) if djs_elem else [],
                'url': link['href'] if link else '',
                'source': 'ibiza_spotlight',
                'scraped_at': datetime.now().isoformat()
            }
            
            return event
            
        except Exception as e:
            logger.warning(f"Error extracting event data: {e}")
            return None
    
    def _parse_djs(self, djs_elem) -> List[str]:
        """
        Parse DJs from element.
        
        Args:
            djs_elem: BeautifulSoup element containing DJs
            
        Returns:
            List of DJ names
        """
        try:
            dj_items = djs_elem.find_all('span', class_='dj-name')
            return [dj.get_text(strip=True) for dj in dj_items]
        except:
            return []
    
    def get_event_details(self, event_url: str) -> Dict:
        """
        Scrape detailed information from event page.
        
        Args:
            event_url: URL to event detail page
            
        Returns:
            Detailed event dictionary
        """
        try:
            time.sleep(self.delay)  # Respectful scraping
            logger.info(f"Fetching event details from {event_url}")
            
            response = self.session.get(event_url, timeout=self.timeout)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            event = {
                'url': event_url,
                'title': self._get_text(soup, 'h1', 'event-title'),
                'description': self._get_text(soup, 'div', 'event-description'),
                'venue': self._get_text(soup, 'span', 'venue-name'),
                'date': self._get_text(soup, 'span', 'event-date'),
                'time': self._get_text(soup, 'span', 'event-time'),
                'photos': self._extract_photos(soup),
                'djs': self._extract_detailed_djs(soup),
                'tickets': self._extract_tickets(soup),
                'source': 'ibiza_spotlight',
                'scraped_at': datetime.now().isoformat()
            }
            
            logger.info(f"Successfully scraped details for {event['title']}")
            return event
            
        except requests.RequestException as e:
            logger.error(f"Error fetching event details: {e}")
            return {}
    
    def _get_text(self, soup, tag: str, class_name: str) -> str:
        """
        Safe text extraction from soup element.
        
        Args:
            soup: BeautifulSoup object
            tag: HTML tag to find
            class_name: CSS class name
            
        Returns:
            Text content or empty string
        """
        try:
            elem = soup.find(tag, class_=class_name)
            return elem.get_text(strip=True) if elem else ''
        except:
            return ''
    
    def _extract_photos(self, soup) -> List[str]:
        """
        Extract photo URLs from event page.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            List of photo URLs
        """
        try:
            photos = []
            photo_elem = soup.find('div', class_='event-photos')
            if photo_elem:
                images = photo_elem.find_all('img')
                photos = [img.get('src') for img in images if img.get('src')]
            return photos
        except:
            return []
    
    def _extract_detailed_djs(self, soup) -> List[Dict]:
        """
        Extract DJs with performance times from event page.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            List of DJ dictionaries with names and times
        """
        try:
            djs = []
            dj_section = soup.find('div', class_='dj-lineup')
            if dj_section:
                dj_items = dj_section.find_all('div', class_='dj-item')
                for item in dj_items:
                    name_elem = item.find('span', class_='dj-name')
                    time_elem = item.find('span', class_='dj-time')
                    if name_elem:
                        djs.append({
                            'name': name_elem.get_text(strip=True),
                            'time': time_elem.get_text(strip=True) if time_elem else ''
                        })
            return djs
        except:
            return []
    
    def _extract_tickets(self, soup) -> List[Dict]:
        """
        Extract ticket information from event page.
        
        Args:
            soup: BeautifulSoup object
            
        Returns:
            List of ticket dictionaries
        """
        try:
            tickets = []
            ticket_section = soup.find('div', class_='tickets')
            if ticket_section:
                ticket_items = ticket_section.find_all('div', class_='ticket-option')
                for item in ticket_items:
                    name_elem = item.find('span', class_='ticket-name')
                    price_elem = item.find('span', class_='ticket-price')
                    link_elem = item.find('a', class_='ticket-link')
                    if name_elem and price_elem:
                        tickets.append({
                            'name': name_elem.get_text(strip=True),
                            'price': price_elem.get_text(strip=True),
                            'url': link_elem['href'] if link_elem else ''
                        })
            return tickets
        except:
            return []
    
    def start_scraping(self, include_details: bool = False, **kwargs) -> Dict:
        """
        Main scraping method called by scraper queue.
        
        Args:
            include_details: Whether to scrape detailed info from event pages
            **kwargs: Additional parameters
            
        Returns:
            Result dictionary with status and data
        """
        try:
            logger.info("Starting Ibiza Spotlight scraper")
            events = self.get_events_calendar()
            
            if include_details and events:
                logger.info(f"Fetching details for {len(events)} events")
                detailed_events = []
                for event in events:
                    if event.get('url'):
                        details = self.get_event_details(event['url'])
                        event.update(details)
                    detailed_events.append(event)
                events = detailed_events
            
            logger.info(f"Scraping completed. Found {len(events)} events")
            
            return {
                'success': True,
                'items_found': len(events),
                'items_saved': len(events),
                'errors': 0,
                'data': events,
                'message': f'Successfully scraped {len(events)} events from Ibiza Spotlight'
            }
            
        except Exception as e:
            logger.error(f"Scraping failed: {e}", exc_info=True)
            return {
                'success': False,
                'items_found': 0,
                'items_saved': 0,
                'errors': 1,
                'data': [],
                'message': f'Scraping failed: {str(e)}'
            }
