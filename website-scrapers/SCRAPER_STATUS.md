# Venue Scraper Status

# Venue Scraper Status

## ✅ Dedicated Scrapers Created (25/25 venues - 100%)

### Working Scrapers with Verified Event Counts

#### Grelle Forelle - 17 Events
- **URL**: https://www.grelleforelle.com/programm/
- **Status**: ✅ Fully functional
- **Features**: Titel, Datum, Zeit, Bild, Beschreibung, Ticket-Links, Artists

#### Flex - 12 Events
- **URL**: https://flex.at/events/list/
- **Status**: ✅ Fully functional
- **Features**: The Events Calendar, datetime attributes, images

#### das-werk - 10 Events
- **URL**: https://www.daswerk.org/programm/
- **Status**: ✅ Fully functional
- **Features**: Detail page parsing, CSS background-image, date ranges

#### Pratersauna - 11 Events
- **URL**: https://pratersauna.tv
- **Status**: ✅ Fully functional
- **Features**: Elementor structure, DD.MM dates, artists

#### sass (SASS Music Club) - 4 Events
- **URL**: https://sassvienna.com/de/programm
- **Status**: ✅ Fully functional
- **Features**: DJ lineup, Instagram handles

#### o-klub (O - der Klub) - 16 Events
- **URL**: https://o-klub.at/events/#upcoming
- **Status**: ✅ Fully functional
- **Features**: Elementor, background-image URLs, ticket links

#### flucc (Flucc / Flucc Wanne) - 35 Events
- **URL**: https://flucc.at
- **Status**: ✅ Fully functional
- **Features**: Detail page enrichment, Deck/Wanne locations

### New Scrapers Created (Testing Needed)

#### Rhiz - CREATED
- **URL**: https://rhiz.wien/programm/
- **Status**: 🔄 Scraper created, needs date parsing refinement
- **Approach**: Event link extraction, detail page parsing

#### Chelsea - CREATED
- **URL**: https://www.chelsea.co.at/concerts.php
- **Status**: 🔄 Scraper created, table/concert structure

#### Camera Club - CREATED
- **URL**: https://camera-club.at/events/list/
- **Status**: 🔄 Template-based scraper

#### U4 - CREATED
- **URL**: https://www.u4.at/events-veranstaltungen/
- **Status**: 🔄 Template-based scraper (EventON plugin)

#### B72 - CREATED
- **URL**: https://www.b72.at/program
- **Status**: 🔄 Template-based scraper

#### The Loft - CREATED
- **URL**: https://www.theloft.at/programm/
- **Status**: 🔄 Template-based scraper

#### Donau - CREATED
- **URL**: https://www.donautechno.com
- **Status**: 🔄 Template-based scraper

#### Celeste - CREATED
- **URL**: https://www.celeste.co.at
- **Status**: 🔄 Template-based scraper

#### Cabaret Fledermaus - CREATED
- **URL**: https://www.fledermaus.at/program
- **Status**: 🔄 Template-based scraper

#### Club U - CREATED
- **URL**: https://club-u.at
- **Status**: 🔄 Template-based scraper

#### Ponyhof - CREATED
- **URL**: https://ponyhof-official.at
- **Status**: 🔄 Template-based scraper

#### Tanzcafe Jenseits - CREATED
- **URL**: https://tanzcafejenseits.com
- **Status**: 🔄 Template-based scraper

#### Vieipee - CREATED
- **URL**: https://vieipee.com
- **Status**: 🔄 Template-based scraper

#### Why Not - CREATED
- **URL**: https://why-not.at
- **Status**: 🔄 Template-based scraper

### Known Limitations

#### volksgarten
- **URL**: https://www.facebook.com/dervolksgarten/events
- **Status**: ⚠️ Facebook-only (scraper exists with warning)
- **Note**: Requires Facebook API

#### praterstrasse
- **URL**: https://www.praterstrasse.wien/de/praterstrasse-tickets-9djnDeMk/in-C2okbp13/
- **Status**: 🔄 Scraper created (external ticket platform)

#### praterdome (Prater DOME)
- **URL**: https://praterdome.at/events
- **Status**: 🔄 Scraper created (JavaScript-rendered)

#### babenberger-passage
- **URL**: https://www.babenbergerpassage.at
- **Status**: 🔄 Scraper created (recurring events)
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

## 📊 Summary

### Completion Status
- **Total Venues**: 25
- **Dedicated Scrapers Created**: 25 (100%)
- **Fully Tested & Working**: 7 venues (105+ events)
- **Created & Need Testing**: 14 venues  
- **Known Limitations**: 4 venues

### Event Coverage
- **Verified Events**: 105+ from 7 working scrapers
- **Average per Working Venue**: 15 events
- **Estimated Total (if all work)**: 300-400+ events

### Technical Achievements
1. **Base Scraper Enhancements**:
   - German date parsing (multiple formats)
   - Venue logo fallback for missing images
   - Detail page enrichment
   - Robust error handling

2. **Website Technologies Supported**:
   - WordPress + The Events Calendar (Flex, Camera Club)
   - Elementor (Pratersauna, O-Klub, U4)
   - Custom HTML structures (das-werk, Rhiz, Chelsea)
   - Event detail page parsing (Flucc, das-werk, Rhiz)

3. **Scraper Patterns**:
   - List view parsing (Flex, Flucc)
   - Calendar/grid parsing (Pratersauna, SASS)
   - Link-based scraping with detail enrichment (Rhiz, das-werk)
   - Template-based for similar venues (14 venues)

### Next Steps
1. Test all 14 newly created scrapers
2. Refine date parsing for specific venues (Rhiz, U4)
3. Handle JavaScript-rendered content (Praterdome, U4 EventON)
4. Fine-tune template scrapers based on actual website structures
5. Add image extraction for venues missing images
6. Implement caching for frequently accessed pages

### Maintenance
- Scrapers may break if websites change structure
- Regular testing recommended
- Generic fallback available for simple venues
- Each scraper logs detailed debug information
