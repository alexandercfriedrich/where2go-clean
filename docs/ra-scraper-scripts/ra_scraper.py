#!/usr/bin/env python3
"""
Resident Advisor Vienna Events Scraper
Extrahiert elektronische Musik-Events von https://de.ra.co/guide/at/vienna
und exportiert sie als JSON mit vollständigen Details
"""

import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class RAViennaEventScraper:
    """Scraper für Resident Advisor Vienna Events"""
    
    def __init__(self, headless: bool = True, wait_time: int = 10):
        """
        Initialisiert den Scraper
        
        Args:
            headless: Browser im Hintergrund ausführen (True/False)
            wait_time: Maximale Wartezeit für Element-Laden in Sekunden
        """
        self.headless = headless
        self.wait_time = wait_time
        self.driver = None
        self.wait = None
        self.events = []
        
    def setup_driver(self):
        """Konfiguriert und initialisiert den Chrome WebDriver"""
        chrome_options = Options()
        
        if self.headless:
            chrome_options.add_argument('--headless')
            logger.info("Browser läuft im Headless-Modus (Hintergrund)")
        
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36')
        chrome_options.add_argument('--lang=de-DE')
        
        try:
            # Versuche webdriver-manager zu verwenden (automatische ChromeDriver-Installation)
            from webdriver_manager.chrome import ChromeDriverManager
            from selenium.webdriver.chrome.service import Service
            
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=chrome_options)
            logger.info("✓ WebDriver mit webdriver-manager initialisiert")
        except ImportError:
            # Fallback: Verwende Standard ChromeDriver im PATH
            logger.warning("webdriver-manager nicht gefunden, verwende ChromeDriver aus PATH")
            self.driver = webdriver.Chrome(options=chrome_options)
        
        self.wait = WebDriverWait(self.driver, self.wait_time)
        logger.info(f"✓ WebDriver konfiguriert (Wartezeit: {self.wait_time}s)")
    
    def load_page(self, url: str):
        """Lädt die Seite und wartet bis sie vollständig geladen ist"""
        logger.info(f"Lade Seite: {url}")
        try:
            self.driver.get(url)
            time.sleep(2)
            
            # Warte bis die Seite vollständig geladen ist
            self.wait.until(EC.presence_of_all_elements_located((By.TAG_NAME, "body")))
            logger.info("✓ Seite vollständig geladen")
            return True
        except TimeoutException:
            logger.error("✗ Timeout beim Laden der Seite")
            return False
    
    def scroll_to_load_content(self, scroll_pause_time: float = 2.0, max_scrolls: int = 20):
        """
        Scrollt durch die Seite um Infinite Scroll Content zu laden
        
        Args:
            scroll_pause_time: Wartezeit zwischen Scrolls in Sekunden
            max_scrolls: Maximale Anzahl von Scrolls
        """
        logger.info("Scrolle durch Seite um alle Events zu laden...")
        
        last_height = self.driver.execute_script("return document.body.scrollHeight")
        scrolls = 0
        
        while scrolls < max_scrolls:
            # Scroll nach unten
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(scroll_pause_time)
            
            # Berechne neue Höhe und vergleiche
            new_height = self.driver.execute_script("return document.body.scrollHeight")
            
            if new_height == last_height:
                logger.info(f"✓ Keine neuen Inhalte nach {scrolls} Scrolls - End erreicht")
                break
            
            last_height = new_height
            scrolls += 1
            logger.info(f"  Scroll {scrolls}/{max_scrolls}")
        
        logger.info(f"✓ Scrolling beendet nach {scrolls} Iterationen")
    
    def extract_events(self) -> List[Dict]:
        """
        Extrahiert alle Event-Informationen von der Seite
        
        Returns:
            Liste mit Event-Dictionaries
        """
        logger.info("Extrahiere Events...")
        events = []
        
        try:
            # WICHTIG: Diese Selektoren müssen an die aktuelle RA-Struktur angepasst werden!
            # Inspiziere die Seite mit DevTools (F12) um die korrekten Selektoren zu finden
            
            # Versuche verschiedene mögliche Selektoren
            event_selectors = [
                'article[class*="event"]',
                'div[class*="EventCard"]',
                'div[class*="event-item"]',
                'li[class*="event"]',
                'div[data-testid*="event"]',
                '[class*="EventRow"]',
            ]
            
            event_elements = []
            for selector in event_selectors:
                try:
                    elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if len(elements) > 0:
                        logger.info(f"✓ Gefunden {len(elements)} Events mit Selector: {selector}")
                        event_elements = elements
                        break
                except NoSuchElementException:
                    continue
            
            if not event_elements:
                logger.warning("✗ Keine Events gefunden - möglicherweise falsche Selektoren")
                logger.info("Inspiziere die Seite mit: driver.page_source oder DevTools")
                return events
            
            # Extrahiere jeden Event
            for index, event_elem in enumerate(event_elements, 1):
                try:
                    event_data = self._parse_event_element(event_elem, index)
                    if event_data:
                        events.append(event_data)
                except StaleElementReferenceException:
                    logger.warning(f"  Event {index}: Element wurde aktualisiert, überspringe")
                    continue
                except Exception as e:
                    logger.warning(f"  Event {index}: Fehler - {str(e)}")
                    continue
            
            logger.info(f"✓ {len(events)} Events erfolgreich extrahiert")
            return events
            
        except Exception as e:
            logger.error(f"✗ Fehler beim Extrahieren der Events: {str(e)}")
            return events
    
    def _parse_event_element(self, element, index: int) -> Optional[Dict]:
        """
        Parst ein einzelnes Event-Element
        
        Args:
            element: Selenium WebElement
            index: Index des Events
            
        Returns:
            Dictionary mit Event-Daten oder None
        """
        try:
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
            
            # Diese Selektoren müssen an die tatsächliche RA-Struktur angepasst werden!
            # Inspiziere mit: print(element.get_attribute('outerHTML'))
            
            try:
                event_data["title"] = element.find_element(By.CSS_SELECTOR, 'h2, h3, [class*="title"]').text
            except:
                pass
            
            try:
                event_data["venue"] = element.find_element(By.CSS_SELECTOR, '[class*="venue"], [class*="location"]').text
            except:
                pass
            
            try:
                date_elem = element.find_element(By.CSS_SELECTOR, '[class*="date"], time')
                event_data["date"] = date_elem.text
                # Versuche datetime zu parsen
                event_data["date"] = self._parse_date(date_elem.text)
            except:
                pass
            
            try:
                event_data["time"] = element.find_element(By.CSS_SELECTOR, '[class*="time"]').text
            except:
                pass
            
            try:
                event_data["price"] = element.find_element(By.CSS_SELECTOR, '[class*="price"], [class*="ticket"]').text
            except:
                pass
            
            try:
                link_elem = element.find_element(By.CSS_SELECTOR, 'a[href*="/events/"]')
                event_data["website"] = link_elem.get_attribute('href')
                if not event_data["website"].startswith('http'):
                    event_data["website"] = f"https://ra.co{event_data['website']}"
            except:
                pass
            
            try:
                img_elem = element.find_element(By.CSS_SELECTOR, 'img')
                event_data["imageUrl"] = img_elem.get_attribute('src')
            except:
                pass
            
            try:
                event_data["description"] = element.find_element(By.CSS_SELECTOR, '[class*="description"]').text
            except:
                pass
            
            # Überprüfe ob wenigstens Titel und Venue vorhanden sind
            if event_data["title"] or event_data["venue"]:
                logger.info(f"  Event {index}: {event_data['title'] or 'N/A'} @ {event_data['venue'] or 'N/A'}")
                return event_data
            
            return None
            
        except Exception as e:
            logger.warning(f"  Event {index}: Parsing-Fehler - {str(e)}")
            return None
    
    def _parse_date(self, date_string: str) -> Optional[str]:
        """
        Versucht ein Datum-String in ISO-Format (YYYY-MM-DD) zu konvertieren
        
        Args:
            date_string: Datums-String
            
        Returns:
            ISO-formatiertes Datum oder original string
        """
        date_formats = [
            "%d.%m.%Y",
            "%d.%m.%y",
            "%d. %B %Y",
            "%d. %b %Y",
            "%A, %d. %B",
            "%a, %d. %b",
        ]
        
        for fmt in date_formats:
            try:
                parsed_date = datetime.strptime(date_string, fmt)
                return parsed_date.strftime("%Y-%m-%d")
            except ValueError:
                continue
        
        return date_string
    
    def categorize_events(self, events: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Kategorisiert Events nach Zeiträumen
        
        Args:
            events: Liste von Events
            
        Returns:
            Dictionary mit kategorisierten Events
        """
        today = datetime.now().date()
        week_end = today + timedelta(days=(6 - today.weekday()))  # Sonntag der Woche
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
                if event["date"] and len(event["date"]) == 10:  # ISO-Format YYYY-MM-DD
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
        """
        Exportiert Events als JSON-Datei
        
        Args:
            events: Liste von Events
            filename: Zielfilename
        """
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
                "pagination_method": "Infinite Scroll (manually scrolled)",
                "potential_issues": [
                    "CSS-Selektoren müssen möglicherweise angepasst werden",
                    "Dynamische Selektoren können sich ändern",
                    "Manche Events werden möglicherweise nicht extrahiert"
                ]
            }
        }
        
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(output, f, indent=2, ensure_ascii=False)
            logger.info(f"✓ JSON exportiert: {filename}")
            return filename
        except Exception as e:
            logger.error(f"✗ Fehler beim JSON-Export: {str(e)}")
            return None
    
    def scrape(self, url: str = "https://de.ra.co/guide/at/vienna") -> Optional[str]:
        """
        Führt den kompletten Scraping-Prozess aus
        
        Args:
            url: URL der zu scrapenden Seite
            
        Returns:
            Pfad zur erstellten JSON-Datei
        """
        try:
            logger.info("="*60)
            logger.info("RESIDENT ADVISOR VIENNA EVENTS SCRAPER")
            logger.info("="*60)
            
            # Setup
            self.setup_driver()
            
            # Seite laden
            if not self.load_page(url):
                return None
            
            # Scroll für dynamisches Laden
            self.scroll_to_load_content()
            
            # Events extrahieren
            self.events = self.extract_events()
            logger.info(f"\n✓ Insgesamt {len(self.events)} Events gefunden")
            
            # JSON exportieren
            json_file = self.export_to_json(self.events)
            
            logger.info("="*60)
            logger.info("SCRAPING ABGESCHLOSSEN")
            logger.info("="*60)
            
            return json_file
            
        except Exception as e:
            logger.error(f"✗ Kritischer Fehler: {str(e)}")
            return None
        finally:
            self.close()
    
    def close(self):
        """Schließt den WebDriver"""
        if self.driver:
            self.driver.quit()
            logger.info("WebDriver geschlossen")


def main():
    """Hauptfunktion"""
    
    # Konfiguration
    URL = "https://de.ra.co/guide/at/vienna"
    OUTPUT_FILE = "ra_vienna_events.json"
    HEADLESS = True  # False um den Browser zu sehen
    
    # Scraper initialisieren und ausführen
    scraper = RAViennaEventScraper(headless=HEADLESS, wait_time=15)
    json_file = scraper.scrape(URL)
    
    if json_file:
        print(f"\n✓ Erfolg! Events in {json_file} gespeichert")
        
        # Zeige eine kurze Vorschau
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"\nZusammenfassung:")
            print(f"  - Diese Woche: {len(data['diese_woche'])} Events")
            print(f"  - Nächste Woche: {len(data['naechste_woche'])} Events")
            print(f"  - Nächste 4 Wochen: {len(data['naechste_4_wochen'])} Events")
            print(f"  - Insgesamt: {len(data['alle_kommenden'])} Events")
    else:
        print("✗ Scraping fehlgeschlagen")


if __name__ == "__main__":
    main()
