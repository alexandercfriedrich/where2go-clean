# 🚀 QUICK START - RA Vienna Events Scraper

## In 5 Minuten starten

### 1️⃣ Installation (einmalig)

```bash
# Öffne Terminal/PowerShell und führe aus:
pip install selenium webdriver-manager
```

### 2️⃣ Skript herunterladen

Speichere die Datei `ra_scraper_advanced.py` (die Version mit Auto-Detection!)

### 3️⃣ Ausführen

```bash
# Im gleichen Verzeichnis wie das Skript:
python ra_scraper_advanced.py
```

Oder mit Python 3:
```bash
python3 ra_scraper_advanced.py
```

### 4️⃣ Warten

Das Skript lädt Chrome und extrahiert Events (2-5 Minuten). Geduld! 🕐

### 5️⃣ Ergebnis

Datei `ra_vienna_events.json` enthält alle gefundenen Events, sortiert nach Zeiträumen.

---

## 🔧 Falls es nicht funktioniert

### ❌ "Command not found: python"
→ Verwende `python3` oder `py` statt `python`

### ❌ "selenium not found"
→ Nochmal instalieren: `pip install selenium webdriver-manager`

### ❌ "Chrome not found"
→ Chrome ist nicht installiert: https://www.google.com/chrome/

### ❌ "Keine Events gefunden"
→ Starte mit `HEADLESS = False` zum Debuggen (siehe oben)

---

## 🎯 Empfohlene Version

**Verwende `ra_scraper_advanced.py`** - Diese Version:
- ✅ Erkennt automatisch CSS-Selektoren
- ✅ Funktioniert auch wenn die RA-Struktur sich ändert
- ✅ Bessere Fehlerbehandlung
- ✅ Speichert erkannte Selektoren im Output

---

## 📊 Output-Struktur

Nach dem Lauf findest du `ra_vienna_events.json` mit dieser Struktur:

```json
{
  "scrape_timestamp": "2025-11-20T12:34:56Z",
  "city": "Wien",
  "total_events_found": 42,
  "diese_woche": [ /* Events diese Woche */ ],
  "naechste_woche": [ /* Events nächste Woche */ ],
  "naechste_4_wochen": [ /* Events nächste 4 Wochen */ ],
  "alle_kommenden": [ /* Alle Events */ ]
}
```

---

## 🎵 Jetzt geht's los!

```bash
python ra_scraper_advanced.py
```

Viel Spaß! 🎉
