# Venue Scraper Status

## ✅ Vollständig Optimiert (58 Events total)

### Grelle Forelle - 17 Events
- **URL**: https://www.grelleforelle.com/programm/
- **Status**: ✅ Alle Parameter extrahiert
- **Features**: 
  - Titel, Datum, Zeit, Bild, Beschreibung
  - Ticket-Links, Artists, Age-Restrictions
  - Detailseiten-Parsing implementiert

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
- **Status**: ✅ Titel, Datum, Zeit, Links
- **Features**:
  - Elementor id="upcoming_listing"
  - Tag/Monat separate Elemente
  - Ticket-Links extrahiert

## 🚧 Noch zu optimieren

### volksgarten
- **URL**: https://volksgarten.at
- **Status**: ❌ 0 Events gefunden
- **Problem**: Struktur muss analysiert werden

### flucc-wanne (Flucc / Flucc Wanne)
- **URL**: https://flucc.at/musik/
- **Status**: ❌ 0 Events gefunden
- **Problem**: The Events Calendar Struktur

### praterstrasse
- **URL**: https://praterstrasse.wien/en/praterstrasse-tickets-9djnDeMk/
- **Status**: ❌ 0 Events gefunden
- **Problem**: Struktur muss analysiert werden

### praterdome (Prater DOME)
- **URL**: https://praterdome.at/events
- **Status**: ⚠️ 1 Event (von 42 gefunden)
- **Problem**: JavaScript-rendered content
- **Hinweis**: Seite lädt Events erst mit der Zeit nach

### babenberger-passage
- **URL**: https://www.babenbergerpassage.at
- **Status**: ⚠️ Nur recurring events
- **Hinweis**: Zeigt nur wiederkehrende Events (Do/Fr/Sa)

## Technische Details

### Verbesserte Datums-Parsing
- "Mittwoch 26. November" ✅
- "26. November - 27. November 2025" ✅
- "28. Nov" ✅
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
