# Resident Advisor Vienna Events Scraper - Anleitung

## 🎯 Übersicht

Dieses Python-Skript extrahiert automatisch alle elektronischen Musik-Events von der Resident Advisor Vienna Guide-Seite (https://de.ra.co/guide/at/vienna) und speichert sie strukturiert als JSON-Datei.

Das Skript kategorisiert Events nach:
- **diese_woche**: Events dieser Woche (heute bis Sonntag)
- **naechste_woche**: Events nächste Woche
- **naechste_4_wochen**: Alle Events der nächsten 4 Wochen
- **alle_kommenden**: ALLE kommenden Events ohne Zeitlimit

---

## 📋 Voraussetzungen

### 1. Python 3.7+
Stelle sicher, dass Python installiert ist:
```bash
python --version
# oder
python3 --version
```

### 2. Erforderliche Python-Pakete installieren

```bash
# Option A: Empfohlen (einfacher)
pip install selenium webdriver-manager

# Option B: Nur Selenium (ChromeDriver muss manuell installiert werden)
pip install selenium
```

### 3. Chrome Browser
Der Scraper verwendet Google Chrome. Stelle sicher, dass Chrome installiert ist:
- **Windows**: https://www.google.com/chrome/
- **macOS**: https://www.google.com/chrome/
- **Linux**: `sudo apt-get install google-chrome-stable` (Ubuntu/Debian)

**Hinweis**: Bei webdriver-manager wird der ChromeDriver automatisch heruntergeladen und verwaltet.

---

## 🚀 Verwendung

### Schritt 1: Datei speichern
Speichere das Skript als `ra_scraper.py` in einem Verzeichnis deiner Wahl.

### Schritt 2: Skript ausführen

#### Einfach (empfohlen):
```bash
python ra_scraper.py
```

#### Mit Python 3 (wenn python auf Python 2 zeigt):
```bash
python3 ra_scraper.py
```

### Schritt 3: Warten
Das Skript wird:
1. Chrome starten (im Hintergrund, wenn `HEADLESS=True`)
2. Die RA-Seite laden
3. Durch die Seite scrollen um alle Events zu laden
4. Events extrahieren
5. JSON-Datei erstellen

**Dauer**: ca. 2-5 Minuten je nach Anzahl der Events und Internetgeschwindigkeit.

### Schritt 4: Ergebnis
Die extrahierten Events werden in `ra_vienna_events.json` gespeichert.

---

## ⚙️ Konfiguration

### Im Skript anpassen:

```python
def main():
    # Konfiguration
    URL = "https://de.ra.co/guide/at/vienna"        # URL der Seite
    OUTPUT_FILE = "ra_vienna_events.json"            # Output-Dateiname
    HEADLESS = True                                   # True = Browser versteckt, False = Browser sichtbar
    
    # Scraper initialisieren und ausführen
    scraper = RAViennaEventScraper(
        headless=HEADLESS,                            # Browser-Modus
        wait_time=15                                  # Wartezeit beim Laden
    )
```

### Debugging: Browser sichtbar machen

Wenn das Skript nicht funktioniert, starte es mit sichtbarem Browser:

```python
HEADLESS = False  # Browser wird sichtbar
```

So kannst du sehen, ob die Seite korrekt lädt und welche Events angezeigt werden.

---

## 🔍 CSS-Selektoren anpassen

Die aktuelle Version enthält verschiedene CSS-Selektoren, die ausprobiert werden. Falls keine Events gefunden werden, musst du die Selektoren aktualisieren.

### So findest du die korrekten Selektoren:

1. **Starten mit Browser sichtbar**:
   ```python
   HEADLESS = False
   ```

2. **Skript ausführen**:
   ```bash
   python ra_scraper.py
   ```

3. **Im Chrome-Fenster**: Drücke `F12` um Developer Tools zu öffnen

4. **Inspiziere ein Event-Element**:
   - Rechtsklick auf einen Event → "Inspizieren"
   - Finde die HTML-Struktur

5. **Passe die Selektoren an** in der `_parse_event_element` Methode:

```python
def _parse_event_element(self, element, index: int) -> Optional[Dict]:
    # ...
    
    # Beispiel: Titel extrahieren
    try:
        event_data["title"] = element.find_element(By.CSS_SELECTOR, 'h2, h3, [class*="title"]').text
    except:
        pass
    
    # Ändere die Selektoren je nach tatsächlicher HTML-Struktur
    # Beispiele:
    # 'h1' - erster H1-Tag
    # 'div.event-title' - div mit class "event-title"
    # '[class*="EventTitle"]' - Element mit "EventTitle" in der Klasse
    # 'span[data-testid="event-title"]' - span mit data-testid Attribut
```

### Häufige Selektoren:

| Element | Mögliche Selektoren |
|---------|------------------|
| Titel | `h1`, `h2`, `h3`, `[class*="title"]`, `[class*="Title"]`, `.event-name` |
| Venue | `[class*="venue"]`, `[class*="location"]`, `[class*="Venue"]`, `.event-venue` |
| Datum | `time`, `[class*="date"]`, `[class*="Date"]`, `[data-date]` |
| Uhrzeit | `[class*="time"]`, `[class*="Time"]`, `.event-time` |
| Preis | `[class*="price"]`, `[class*="Price"]`, `[class*="ticket"]` |
| Bild | `img`, `[class*="image"]`, `[class*="Image"]` |
| Link | `a[href*="/events/"]`, `a.event-link`, `a[data-event-id]` |

---

## 📊 JSON-Output Format

Die erstellte JSON-Datei hat folgende Struktur:

```json
{
  "scrape_timestamp": "2025-11-20T12:00:00Z",
  "city": "Wien",
  "total_events_found": 42,
  "diese_woche": [
    {
      "title": "Spandau 20 with Fjaak",
      "category": "DJ Sets/Electronic",
      "date": "2025-11-21",
      "time": "23:00",
      "endTime": null,
      "venue": "Grelle Forelle",
      "address": "Lassallestraße 9, 1020 Wien",
      "city": "Wien",
      "price": "15 EUR",
      "website": "https://de.ra.co/events/1234567",
      "bookingLink": null,
      "description": "Fjaak Live",
      "imageUrl": "https://...",
      "source": "ra",
      "ageRestrictions": "18+"
    }
  ],
  "naechste_woche": [],
  "naechste_4_wochen": [...],
  "alle_kommenden": [...],
  "parsing_info": {
    "pages_scraped": 1,
    "pagination_method": "Infinite Scroll (manually scrolled)",
    "potential_issues": [...]
  }
}
```

---

## 🐛 Häufige Fehler und Lösungen

### Fehler: "chromedriver not found"
**Lösung**: Installiere webdriver-manager:
```bash
pip install webdriver-manager
```

### Fehler: "No events found"
**Lösung**: 
1. Setze `HEADLESS = False` um den Browser zu sehen
2. Prüfe die CSS-Selektoren mit Developer Tools (F12)
3. Passe die Selektoren an (siehe Abschnitt "CSS-Selektoren anpassen")

### Fehler: "Chrome not found"
**Lösung**: Chrome ist nicht installiert oder nicht im PATH
```bash
# Ubuntu/Debian
sudo apt-get install google-chrome-stable

# macOS
brew install google-chrome

# Windows: Installiere Chrome von https://www.google.com/chrome/
```

### Fehler: "TimeoutException"
**Lösung**: Erhöhe die Wartezeit:
```python
scraper = RAViennaEventScraper(
    headless=HEADLESS,
    wait_time=30  # Erhöht von 15 auf 30 Sekunden
)
```

### Fehler: "Too many processes" / Memory leak
**Lösung**: Der Browser wird nicht korrekt geschlossen. Stelle sicher, dass das Skript vollständig läuft (bis zum Ende).

---

## 🔐 Tipps zur Vermeidung von Blockierungen

1. **Rate Limiting**: Das Skript scrollt mit 2-Sekunden-Pausen - das ist nicht zu aggressiv
2. **User Agent**: Ein Chrome User Agent ist bereits konfiguriert
3. **Headless Modus**: Mit `headless=True` ist es weniger auffällig
4. **Nicht zu häufig scrapen**: Führe das Skript nicht mehrmals hintereinander aus

---

## 📈 Erwiterungen

### Events in Datenbank speichern

```python
import sqlite3

def save_to_db(events, db_file="events.db"):
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    cursor.execute('''CREATE TABLE IF NOT EXISTS events
                     (id INTEGER PRIMARY KEY, title TEXT, date TEXT, venue TEXT, price TEXT)''')
    
    for event in events:
        cursor.execute("INSERT INTO events (title, date, venue, price) VALUES (?, ?, ?, ?)",
                      (event["title"], event["date"], event["venue"], event["price"]))
    
    conn.commit()
    conn.close()
```

### Nach bestimmten Events filtern

```python
with open("ra_vienna_events.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Nur Grelle Forelle Events
grelle_events = [e for e in data["alle_kommenden"] if "Grelle Forelle" in (e.get("venue") or "")]

# Nur Techno Events
techno_events = [e for e in data["alle_kommenden"] if "techno" in (e.get("description") or "").lower()]

# Nur kostenlose Events
free_events = [e for e in data["alle_kommenden"] if "free" in (e.get("price") or "").lower()]
```

---

## 📞 Support & Debugging

### Debug-Modus aktivieren

Das Skript nutzt Python logging. Für mehr Details:

```python
# Am Anfang des Skripts
logging.basicConfig(level=logging.DEBUG)  # Statt logging.INFO
```

### Seite speichern für Analyse

```python
# Am Ende von scrape() Methode, vor finally:
# Speichere den HTML-Quelltext
with open("debug_page.html", "w", encoding="utf-8") as f:
    f.write(self.driver.page_source)
print("HTML-Quelltext in debug_page.html gespeichert")
```

---

## ✅ Checkliste vor der Nutzung

- [ ] Python 3.7+ installiert (`python --version`)
- [ ] Selenium installiert (`pip install selenium webdriver-manager`)
- [ ] Chrome Browser installiert
- [ ] Skript als `ra_scraper.py` gespeichert
- [ ] Im Verzeichnis mit `cd` hingegangen
- [ ] Gestartet mit `python ra_scraper.py`
- [ ] Warte 2-5 Minuten auf Abschluss
- [ ] Prüfe `ra_vienna_events.json` auf Ergebnisse

---

## 📝 Lizenz & Datenschutz

- Respektiere die Terms of Service von Resident Advisor
- Das Skript ist nur für persönliche, nicht-kommerzielle Nutzung vorgesehen
- Nicht zu häufig scrapen, um die Server nicht zu überlasten

---

## 🎉 Viel Erfolg!

Bei Fragen oder Problemen:
1. Prüfe die CSS-Selektoren (Developer Tools / F12)
2. Setze `HEADLESS = False` zum Debuggen
3. Lese die Fehlermeldungen im Console-Output

Viel Spaß beim Erkunden der Wiener Electronic Music Szene! 🎵
