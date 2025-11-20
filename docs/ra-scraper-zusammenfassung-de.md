# ra-scraper Überprüfung - Zusammenfassung

**Datum**: 20. November 2025  
**Aufgabe**: Überprüfung ob https://github.com/manuelzander/ra-scraper funktioniert und Ergebnisse liefert

## Kurze Antwort

❌ **Nein, ra-scraper funktioniert nicht und ist nicht empfehlenswert.**

## Warum funktioniert es nicht?

### 1. Installation schlägt fehl

```
Python Version: 3.12 (modern)
ra-scraper benötigt: Python 3.7.5 (veraltet, 2019)

Fehler: ModuleNotFoundError: No module named 'distutils'
```

**Problem**: 
- Python 3.12 hat `distutils` entfernt
- Alle Abhängigkeiten sind veraltet (4+ Jahre alt)
- 30+ Pakete müssten aktualisiert werden
- Geschätzter Aufwand: 20-40 Stunden

### 2. Resident Advisor blockiert Bots

**Aktuelle Situation**:
```
Test: https://ra.co/events/de/berlin/rss
Ergebnis: ❌ 403 Forbidden (Bot-Schutz aktiv)

Bot-Schutz: DataDome
```

**Bedeutung**:
- RA hat Bot-Detection aktiviert
- Sowohl RSS als auch Web-Scraping werden blockiert
- Deine aktuelle RSS-Integration (`residentAdvisor.ts`) ist wahrscheinlich auch betroffen

### 3. Projekt ist nicht wartbar

- Letztes Update: ~2020
- Keine Python 3.12 Unterstützung
- Keine aktive Entwicklung
- Web-Scraping ist fragil (HTML ändert sich)

## Test-Ergebnisse

### Unsere Tests haben gezeigt:

| Test | Status | Hinweis |
|------|--------|---------|
| ra-scraper Installation | ❌ Fehlgeschlagen | Python 3.12 inkompatibel |
| RA Website | ✅ Erreichbar | Hauptseite funktioniert |
| RA RSS Feeds | ❌ Blockiert | 403 Forbidden (DataDome) |
| RA Künstlerseiten | ✅ Erreichbar | Aber Web-Scraping schwierig |

### Test ausführen

Du kannst selbst testen mit:
```bash
./scripts/test-ra-access.sh
```

## Was bedeutet das für where2go?

### Deine aktuelle RA-Integration

**Datei**: `app/lib/sources/residentAdvisor.ts`

**Status**: ⚠️ Wahrscheinlich nicht funktionsfähig
- RSS Feeds sind blockiert
- Liefert keine Events
- Sollte überprüft/entfernt werden

### Betroffene Dateien

```
app/lib/sources/residentAdvisor.ts
app/api/events/route.ts (importiert RA)
app/api/admin/hot-cities/seed/route.ts (RA Berlin)
scripts/initHotCities.ts (RA Referenzen)
```

## Empfehlungen

### Option A: RA Integration entfernen (EMPFOHLEN) ✅

**Warum**:
- Funktioniert aktuell nicht
- Bot-Schutz macht es unzuverlässig
- Potentielle ToS-Verletzung
- Wartungsaufwand zu hoch

**Wie**:
```bash
# Dateien entfernen/anpassen
rm app/lib/sources/residentAdvisor.ts
# RA Referenzen aus events/route.ts entfernen
# RA aus Hot Cities Seed entfernen
```

**Fokus stattdessen auf**:
- ✅ Wien.info (funktioniert, hat API)
- ✅ Andere offizielle Event-Quellen
- ✅ Veranstalter-Partnerschaften

### Option B: Alternative RA-Integration (RISKANT) ⚠️

Falls RA Events unbedingt nötig sind:

1. **Headless Browser** (Playwright/Puppeteer)
   - Umgeht Bot-Detection besser
   - Höherer Ressourcenverbrauch
   - Kann trotzdem blockiert werden

2. **Manuelle Kuratierung**
   - Keine Automatisierung
   - Wichtige RA Events manuell hinzufügen
   - Zeitaufwändig aber sicher

3. **RA API-Partnerschaft**
   - Offizielle Zusammenarbeit
   - Keine Bot-Probleme
   - Wahrscheinlich kostenpflichtig

### Option C: Status Quo prüfen

Überprüfe in deinen Logs:
```bash
# Suche nach RA-bezogenen Fehlern
grep "rss:ra" logs/
grep "403" logs/ | grep "ra.co"
```

Wenn keine RA Events ankommen → sofort entfernen

## Technische Details

### DataDome Bot-Schutz

```http
HTTP/2 403 Forbidden
x-datadome: protected
set-cookie: datadome=...
```

**Was macht DataDome**:
- Erkennt automatisierte Zugriffe
- Blockiert bekannte Bot User-Agents
- Analysiert Request-Muster
- Setzt Tracking-Cookies

### ra-scraper Architektur

```
Technologie: Python Scrapy
Methode: HTML Parsing (CSS Selectors)
Ziel: https://www.residentadvisor.net/dj/{artist}

Extrahiert:
- Event Datum
- Event Titel
- Venue & Stadt
- Event Link
- Lineup (weitere Künstler)
- Preise
```

**Problem**: HTML-Struktur ändert sich → Code bricht

## Nächste Schritte

### Sofort:

1. ✅ Lies die vollständige Evaluierung: `docs/ra-scraper-evaluation.md`
2. ✅ Führe Test aus: `./scripts/test-ra-access.sh`
3. ⚠️ Prüfe deine Logs auf RA-Fehler
4. ⚠️ Entscheide: Entfernen oder Alternative

### Optional:

5. Entferne RA-Integration komplett
6. Fokussiere auf Wien.info und andere Quellen
7. Update Dokumentation

## Kontakt & Fragen

Falls du weitere Fragen hast:
- Siehe vollständige Analyse: `docs/ra-scraper-evaluation.md`
- Test-Script: `scripts/test-ra-access.sh`
- Code-Referenzen im Repository

## Zusammenfassung

**ra-scraper**: ❌ Funktioniert nicht, nicht empfohlen  
**Aktuelle RA-Integration**: ⚠️ Wahrscheinlich auch betroffen  
**Empfehlung**: Entfernen und auf verlässliche Quellen fokussieren  
**Alternativen**: Wien.info, direkte Event-Partnerschaften  

---

*Dokumentation erstellt im Rahmen der Issue-Bearbeitung am 20.11.2025*
