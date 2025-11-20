#!/usr/bin/env python3
"""
Resident Advisor Vienna Events Scraper - ERWEITERTE VERSION
Mit automatischer CSS-Selector-Erkennung und verbesserter Fehlerbehandlung

Diese Version versucht intelligent die richtigen Selektoren zu finden.
"""

import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import logging
import re
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RAViennaEventScraperAdvanced:
    """Erweiterte Version des RA Vienna Events Scrapers mit Auto-Detection"""
    
    def __init__(self, headless: bool = True, wait_time: int = 10, debug_html: bool = False):
        self.headless = headless
        self.wait_time = wait_time
        self.debug_html = debug_html
        self.driver = None
        self.wait = None
        self.events = []
        self.detected_selectors = {}
        
    def setup_driver(self):
        """Konfiguriert den Chrome WebDriver"""
        chrome_options = Options()
        
        if self.headless:
            chrome_options.add_argument('--headless')
            logger.info("✓ Browser im Headless-Modus")
        
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36')
        
        try:
            from webdriver_manager.chrome import ChromeDriverManager
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
        except ImportError:
            logger.warning("⚠ webdriver-manager nicht gefunden, verwende ChromeDriver aus PATH")
            self.driver = webdriver.Chrome(options=chrome_options)
        
        self.wait = WebDriverWait(self.driver, self.wait_time)
        logger.info(f"✓ WebDriver initialisiert (Wartezeit: {self.wait_time}s)")
    
    def load_page(self, url: str) -> bool:
        """Lädt die Seite"""
        logger.info(f"Lade: {url}")
        try:
            self.driver.get(url)
            time.sleep(2)
            self.wait.until(EC.presence_of_all_elements_located((By.TAG_NAME, "body")))
            logger.info("✓ Seite geladen")
            return True
        except TimeoutException:
            logger.error("✗ Timeout beim Laden")
            return False
    
    def save_debug_html(self, filename: str = "debug_page.html"):
        """Speichert die Seite zum Debuggen"""
        try:
            html = self.driver.page_source
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(html)
            logger.info(f"✓ Debug HTML gespeichert: {filename}")
        except Exception as e:
            logger.warning(f"⚠ Fehler beim Speichern von Debug HTML: {e}")
    
    def detect_event_selectors(self) -> Dict[str, str]:
        """
        Erkennt automatisch die CSS-Selektoren für Events
        
        Returns:
            Dictionary mit erkannten Selektoren
        """
        logger.info("🔍 Erkenne CSS-Selektoren...")
        
        selectors = {
            "container": None,
            "title": None,
            "venue": None,
            "date": None,
            "time": None,
            "price": None,
            "link": None,
            "image": None,
        }
        
        try:
            # Finde Event-Container
            container_selectors = [
                'article[class*="event"]',
                'div[class*="EventCard"]',
                'div[class*="event-item"]',
                'li[class*="event"]',
                'div[data-testid*="event"]',
                '[class*="EventRow"]',
                'article',
                'div[role="article"]',
                '.event',
                '[class*="Event"]',
            ]
            
            for selector in container_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if len(elements) > 2:  # Mindestens 2 Events
                        selectors["container"] = selector
                        logger.info(f"  ✓ Event-Container: {selector} ({len(elements)} gefunden)")
                        break
                except:
                    continue
            
            if not selectors["container"]:
                logger.warning("  ✗ Event-Container nicht erkannt")
                return selectors
            
            # Analysiere erstes Event
            try:
                first_event = self.driver.find_element(By.CSS_SELECTOR, selectors["container"])
                
                # Finde Titel
                for title_selector in ['h1', 'h2', 'h3', '[class*="title"]', '[class*="Title"]', '.title', 'span[class*="name"]']:
                    try:
                        elem = first_event.find_element(By.CSS_SELECTOR, title_selector)
                        if elem.text.strip():
                            selectors["title"] = title_selector
                            logger.info(f"  ✓ Titel: {title_selector}")
                            break
                    except:
                        continue
                
                # Finde Venue
                for venue_selector in ['[class*="venue"]', '[class*="location"]', '[class*="Venue"]', '.venue']:
                    try:
                        elem = first_event.find_element(By.CSS_SELECTOR, venue_selector)
                        if elem.text.strip():
                            selectors["venue"] = venue_selector
                            logger.info(f"  ✓ Venue: {venue_selector}")
                            break
                    except:
                        continue
                
                # Finde Datum
                for date_selector in ['time', '[class*="date"]', '[class*="Date"]', '[data-date]', '.date']:
                    try:
                        elem = first_event.find_element(By.CSS_SELECTOR, date_selector)
                        if elem.text.strip() or elem.get_attribute('datetime'):
                            selectors["date"] = date_selector
                            logger.info(f"  ✓ Datum: {date_selector}")
                            break
                    except:
                        continue
                
                # Finde Preis
                for price_selector in ['[class*="price"]', '[class*="Price"]', '[class*="ticket"]', '.price']:
                    try:
                        elem = first_event.find_element(By.CSS_SELECTOR, price_selector)
                        if elem.text.strip():
                            selectors["price"] = price_selector
                            logger.info(f"  ✓ Preis: {price_selector}")
                            break
                    except:
                        continue
                
                # Finde Link
                for link_selector in ['a[href*="/events/"]', 'a.event-link', 'a[data-event]', 'a']:
                    try:
                        elem = first_event.find_element(By.CSS_SELECTOR, link_selector)
                        if elem.get_attribute('href'):
                            selectors["link"] = link_selector
                            logger.info(f"  ✓ Link: {link_selector}")
                            break
                    except:
                        continue
                
                # Finde Bild
                try:
                    img = first_event.find_element(By.CSS_SELECTOR, 'img')
                    selectors["image"] = 'img'
                    logger.info(f"  ✓ Bild: img")
                except:
                    pass
                
            except Exception as e:
                logger.warning(f"  ⚠ Fehler bei Selector-Erkennung: {e}")
        
        except Exception as e:
            logger.error(f"✗ Fehler bei Event-Container-Erkennung: {e}")
        
        self.detected_selectors = selectors
        return selectors
    
    def scroll_to_load_content(self, scroll_pause_time: float = 2.0, max_scrolls: int = 20):
        """Scrollt um dynamische Inhalte zu laden"""
        logger.info("Scrolle durch Seite um alle Events zu laden...")
        
        last_height = self.driver.execute_script("return document.body.scrollHeight")
        scrolls = 0
        
        while scrolls < max_scrolls:
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(scroll_pause_time)
            
            new_height = self.driver.execute_script("return document.body.scrollHeight")
            
            if new_height == last_height:
                logger.info(f"✓ Alle Inhalte geladen nach {scrolls} Scrolls")
                break
            
            last_height = new_height
            scrolls += 1
            if scrolls % 5 == 0:
                logger.info(f"  Scroll {scrolls}/{max_scrolls}")
        
        logger.info(f"✓ Scrolling beendet ({scrolls} Iterationen)")
    
    def extract_events(self) -> List[Dict]:
        """Extrahiert Events mit erkannten Selektoren"""
        logger.info("Extrahiere Events...")
        events = []
        
        try:
            if not self.detected_selectors.get("container"):
                logger.error("✗ Keine Event-Container gefunden")
                return events
            
            event_elements = self.driver.find_elements(By.CSS_SELECTOR, self.detected_selectors["container"])
            logger.info(f"  Gefunden: {len(event_elements)} Event-Container")
            
            for index, event_elem in enumerate(event_elements, 1):
                try:
                    event_data = self._parse_event_element(event_elem, index)
                    if event_data and (event_data.get("title") or event_data.get("venue")):
                        events.append(event_data)
                except StaleElementReferenceException:
                    logger.debug(f"  Event {index}: Element aktualisiert")
                    continue
                except Exception as e:
                    logger.debug(f"  Event {index}: {str(e)}")
                    continue
            
            logger.info(f"✓ {len(events)} Events extrahiert")
            return events
        
        except Exception as e:
            logger.error(f"✗ Fehler beim Event-Extraction: {e}")
            return events
    
    def _parse_event_element(self, element, index: int) -> Optional[Dict]:
        """Parst ein Event-Element"""
        event_data = {
            "title": None,
            "category": "DJ Sets/Electronic",
            "date": None,
            "time": None,
            "endTime": None,
            "venue": None,
            "address": None,
            "city": "Wien",
            "price": None,
            "website": None,
            "bookingLink": None,
            "description": None,
            "imageUrl": None,
            "source": "ra",
            "ageRestrictions": None
        }
        
        try:
            if self.detected_selectors.get("title"):
                event_data["title"] = element.find_element(By.CSS_SELECTOR, self.detected_selectors["title"]).text
            
            if self.detected_selectors.get("venue"):
                event_data["venue"] = element.find_element(By.CSS_SELECTOR, self.detected_selectors["venue"]).text
            
            if self.detected_selectors.get("date"):
                date_elem = element.find_element(By.CSS_SELECTOR, self.detected_selectors["date"])
                date_text = date_elem.get_attribute('datetime') or date_elem.text
                event_data["date"] = self._parse_date(date_text)
            
            if self.detected_selectors.get("price"):
                event_data["price"] = element.find_element(By.CSS_SELECTOR, self.detected_selectors["price"]).text
            
            if self.detected_selectors.get("link"):
                link_elem = element.find_element(By.CSS_SELECTOR, self.detected_selectors["link"])
                href = link_elem.get_attribute('href')
                if href:
                    event_data["website"] = href if href.startswith('http') else f"https://de.ra.co{href}"
                    event_data["bookingLink"] = event_data["website"]
            
            if self.detected_selectors.get("image"):
                try:
                    img_elem = element.find_element(By.CSS_SELECTOR, self.detected_selectors["image"])
                    event_data["imageUrl"] = img_elem.get_attribute('src')
                except:
                    pass
            
            logger.debug(f"  Event {index}: {event_data['title'] or 'N/A'}")
            return event_data
        
        except Exception as e:
            logger.debug(f"  Event {index}: Parse-Fehler - {e}")
            return None
    
    def _parse_date(self, date_string: str) -> Optional[str]:
        """Konvertiert Datum in ISO-Format"""
        if not date_string:
            return None
        
        date_formats = [
            "%d.%m.%Y", "%d.%m.%y", "%d. %B %Y", "%d. %b %Y",
            "%A, %d. %B", "%a, %d. %b", "%d/%m/%Y", "%Y-%m-%d",
            "%B %d, %Y", "%b %d, %Y",
        ]
        
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_string.strip(), fmt)
                return parsed_date.strftime("%Y-%m-%d")
            except ValueError:
                continue
        
        return date_string
    
    def categorize_events(self, events: List[Dict]) -> Dict[str, List[Dict]]:
        """Kategorisiert Events nach Zeiträumen"""
        today = datetime.now().date()
        week_end = today + timedelta(days=(6 - today.weekday()))
        next_week_start = week_end + timedelta(days=1)
        next_week_end = next_week_start + timedelta(days=6)
        four_weeks = today + timedelta(days=28)
        
        categorized = {
            "diese_woche": [],
            "naechste_woche": [],
            "naechste_4_wochen": [],
            "alle_kommenden": events
        }
        
        for event in events:
            try:
                if event["date"] and len(event["date"]) == 10:
                    event_date = datetime.strptime(event["date"], "%Y-%m-%d").date()
                    
                    if today <= event_date <= week_end:
                        categorized["diese_woche"].append(event)
                    elif next_week_start <= event_date <= next_week_end:
                        categorized["naechste_woche"].append(event)
                    
                    if today <= event_date <= four_weeks:
                        categorized["naechste_4_wochen"].append(event)
            except:
                pass
        
        return categorized
    
    def export_to_json(self, events: List[Dict], filename: str = "ra_vienna_events.json"):
        """Exportiert als JSON"""
        categorized = self.categorize_events(events)
        
        output = {
            "scrape_timestamp": datetime.now().isoformat() + "Z",
            "city": "Wien",
            "total_events_found": len(events),
            "diese_woche": categorized["diese_woche"],
            "naechste_woche": categorized["naechste_woche"],
            "naechste_4_wochen": categorized["naechste_4_wochen"],
            "alle_kommenden": categorized["alle_kommenden"],
            "parsing_info": {
                "pages_scraped": 1,
                "pagination_method": "Infinite Scroll",
                "detected_selectors": self.detected_selectors,
                "potential_issues": ["Selektoren automatisch erkannt - können in Zukunft ändern"]
            }
        }
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)
            logger.info(f"✓ JSON exportiert: {filename}")
            return filename
        except Exception as e:
            logger.error(f"✗ Export-Fehler: {e}")
            return None
    
    def scrape(self, url: str = "https://de.ra.co/guide/at/vienna") -> Optional[str]:
        """Führt kompletten Scraping-Prozess aus"""
        try:
            logger.info("="*70)
            logger.info("RESIDENT ADVISOR VIENNA EVENTS SCRAPER (ADVANCED)")
            logger.info("="*70)
            
            self.setup_driver()
            
            if not self.load_page(url):
                return None
            
            # Debug HTML speichern (optional)
            if self.debug_html:
                self.save_debug_html()
            
            # Selektoren erkennen
            self.detect_event_selectors()
            
            # Scrolle
            self.scroll_to_load_content()
            
            # Extrahiere Events
            self.events = self.extract_events()
            logger.info(f"\n✓ Insgesamt {len(self.events)} Events gefunden")
            
            # Exportiere
            json_file = self.export_to_json(self.events)
            
            logger.info("="*70)
            logger.info("✓ SCRAPING ABGESCHLOSSEN")
            logger.info("="*70)
            
            return json_file
        
        except Exception as e:
            logger.error(f"✗ Kritischer Fehler: {e}")
            return None
        finally:
            self.close()
    
    def close(self):
        """Schließt WebDriver"""
        if self.driver:
            self.driver.quit()
            logger.info("WebDriver geschlossen")


def main():
    """Hauptfunktion"""
    
    # Konfiguration
    URL = "https://de.ra.co/guide/at/vienna"
    OUTPUT_FILE = "ra_vienna_events.json"
    HEADLESS = True
    DEBUG_HTML = False  # Auf True setzen zum Debuggen
    
    # Scraper
    scraper = RAViennaEventScraperAdvanced(
        headless=HEADLESS,
        wait_time=15,
        debug_html=DEBUG_HTML
    )
    
    json_file = scraper.scrape(URL)
    
    if json_file:
        print(f"\n✅ Erfolg! Events in {json_file} gespeichert")
        
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"\n📊 Zusammenfassung:")
            print(f"  • Diese Woche: {len(data['diese_woche'])} Events")
            print(f"  • Nächste Woche: {len(data['naechste_woche'])} Events")
            print(f"  • Nächste 4 Wochen: {len(data['naechste_4_wochen'])} Events")
            print(f"  • Insgesamt: {len(data['alle_kommenden'])} Events")
            
            print(f"\n🔧 Erkannte Selektoren:")
            for key, val in data['parsing_info']['detected_selectors'].items():
                print(f"  • {key}: {val or 'Nicht erkannt'}")
    else:
        print("❌ Scraping fehlgeschlagen")


if __name__ == "__main__":
    main()
