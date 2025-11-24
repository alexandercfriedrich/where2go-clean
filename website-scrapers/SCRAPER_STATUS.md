# Venue Scraper Status

## ✅ Fully Optimized (105+ Events total)

### Grelle Forelle - 17 Events
- **URL**: https://www.grelleforelle.com/programm/
- **Status**: ✅ Alle Parameter extrahiert
- **Features**: 
  - Titel, Datum, Zeit, Bild, Beschreibung
  - Ticket-Links, Artists, Age-Restrictions
  - Detailseiten-Parsing implementiert

### Flex - 12 Events - NEU
- **URL**: https://flex.at/events/list/
- **Status**: ✅ Titel, Datum, Zeit, Bild, Beschreibung
- **Features**:
  - The Events Calendar (WordPress) List View
  - Datetime attribute parsing (YYYY-MM-DD)
  - Event images, descriptions

### das-werk - 10 Events
- **URL**: https://www.daswerk.org/programm/
- **Status**: ✅ Alle Parameter extrahiert
- **Features**:
  - Titel, Datum (inkl. Datumsbereiche), Zeit, Bild, Beschreibung
  - CSS background-image Extraktion
  - Event-Kategorien als Tags

### Pratersauna - 11 Events
- **URL**: https://pratersauna.tv
- **Status**: ✅ Titel, Datum, Zeit, Links, Artists
- **Features**:
  - Elementor loop grid Struktur
  - DD.MM Format Datums-Extraktion
  - Artists aus Lineup

### sass (SASS Music Club) - 4 Events
- **URL**: https://sassvienna.com/de/programm
- **Status**: ✅ Titel, Datum, Zeit, Lineup
- **Features**:
  - Spezielle SASS Struktur (div.events > div.event)
  - Monatsnamen-Mapping (Nov → November)
  - DJ Lineup mit Instagram-Handles

### o-klub (O - der Klub) - 16 Events
- **URL**: https://o-klub.at/events/#upcoming
- **Status**: ✅ Titel, Datum, Zeit, Bilder, Links
- **Features**:
  - Elementor id="upcoming_listing"
  - Tag/Monat separate Elemente
  - data-dce-background-image-url Bilder
  - Ticket-Links extrahiert

### flucc (Flucc / Flucc Wanne) - 35 Events - NEU OPTIMIERT
- **URL**: https://flucc.at
- **Status**: ✅ Titel, Datum, Zeit, Links
- **Features**:
  - Event links in div.himmel.event-list
  - Detailseiten-Parsing für vollständige Infos
  - Datum aus Titel (DD.MM.YYYY Format)
  - Deck/Wanne Location-Tags

## ⚠️ Eingeschränkt / Hinweise

### volksgarten
- **URL**: https://www.facebook.com/dervolksgarten/events
- **Status**: ⚠️ Facebook-Events (nicht direkt scrapbar)
- **Problem**: Facebook erlaubt kein direktes Scraping
- **Lösung**: Externe Event-Aggregatoren verwenden oder Facebook Graph API

### praterstrasse
- **URL**: https://www.praterstrasse.wien/de/praterstrasse-tickets-9djnDeMk/in-C2okbp13/
- **Status**: ⚠️ Ticket-Plattform
- **Problem**: Events über externe Ticket-Plattform
- **Hinweis**: Möglicherweise JavaScript-rendered

### praterdome (Prater DOME)
- **URL**: https://praterdome.at/events
- **Status**: ⚠️ 1 Event (von 42 gefunden)
- **Problem**: JavaScript-rendered content, Events laden erst nach
- **Hinweis**: Seite lädt Events erst mit der Zeit nach

### babenberger-passage
- **URL**: https://www.babenbergerpassage.at
- **Status**: ⚠️ Nur recurring events
- **Hinweis**: Zeigt nur wiederkehrende Events (Do/Fr/Sa), keine spezifischen Termine

## Technische Details

### Verbesserte Datums-Parsing
- "Mittwoch 26. November" ✅
- "26. November - 27. November 2025" ✅
- "28. Nov" ✅
- "23.11.2025" ✅
- DD.MM.YYYY ✅
- DD/MM ✅

### Fallback-Mechanismen
- **Venue Logo**: Wird verwendet wenn kein Event-Bild gefunden
- **Default Zeit**: 23:00 für Club-Events ohne spezifische Zeit
- **Jahr-Ermittlung**: Automatisch für Daten ohne Jahresangabe

### Base Scraper Features
- Supabase Integration
- Duplikat-Prevention
- Robuste Fehlerbehandlung
- Debug-Modus für Entwicklung
- Trockenlauf-Modus für Tests

## Zusammenfassung

**Gesamt**: 93+ Events von 6 vollständig funktionierenden Scrapern
**Optimierungsrate**: 67% (6/9 Venues voll funktionsfähig)
**Events pro Venue**: Durchschnitt 15.5 Events
