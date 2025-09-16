# where2go-clean – Architekturüberblick

Diese Datei definiert die zentralen Architektur-Prinzipien, Invarianten und Evolutionspfade der Event-Erfassung & -Aggregation.

## 1. Ziele

1. Einheitliche, erweiterbare Event-Kategorien (20 Hauptkategorien) – Single Source of Truth (SSOT).
2. Reproduzierbare LLM-Abfragen mit strengen, stabilen JSON-Prompts (kein Markdown, kein Fließtext).
3. Deterministische Normalisierung + Validierung von Events bevor sie in Cache / UI gelangen.
4. Effiziente per-Category Cache-Strategie zur Reduktion externer API-/LLM-Kosten.
5. Progressive Verarbeitung (Job mit Status „processing“ → Polling → Abschluss).
6. Minimales Risiko für „Drift“ durch Tests + Dokumentierte Invarianten.

## 2. Komponenten

| Komponente | Datei/Ort | Kurzbeschreibung |
|------------|-----------|------------------|
| Kategorien / Normalisierung | `app/lib/eventCategories.ts` | SSOT für Haupt- & Subkategorien, Token-Mapping, Normalisierung |
| Prompt-Erzeugung | `app/lib/perplexity.ts` | Dynamische Erstellung von General- und Category-Prompts |
| Event Parsing & Dedup | `app/lib/aggregator.ts` | JSON-first Parsing, Fallbacks, Dedup (fuzzy) |
| Caching (per category + legacy) | `app/lib/cache.ts` | In-Memory Cache inkl. Key-Strategie |
| TTL Berechnung | `app/lib/cacheTtl.ts` | Dynamisch basierend auf Event-Ende oder Fallback |
| Jobs / Async Processing | `app/lib/jobStore.ts` | Redis oder In-Memory Persistenz für Job-Status |
| Hot City Konfiguration | `app/lib/hotCityStore.*` | Städte-spezifische Quellen + Prompterweiterung |
| API Entry | `app/api/events/route.ts` | Request → Cache-Check → Job-Anlage → Hintergrundverarbeitung |
| Tests (Invarianten etc.) | `app/lib/__tests__/...` | Schutz vor Regressions / Formatdrift |

## 3. Kategorien – Single Source of Truth

Datei: `app/lib/eventCategories.ts`

Enthält:
- `EVENT_CATEGORY_SUBCATEGORIES`: Objekt mit 20 Schlüssel (Hauptkategorien) + Sublisten.
- `EVENT_CATEGORIES`: Array der 20 Hauptkategorien (abgeleitet, nicht manuell pflegen).
- `NORMALIZATION_TOKEN_MAP`: Mapping von Roh- / Umgangswörtern → Hauptkategorie.
- `normalizeCategory()`, `validateAndNormalizeEvents()`, `isValidCategory()`.

### Invarianten
- Kein Hardcoding der 20 Kategorien in anderen Dateien.
- Wenn neue Hauptkategorie hinzukommt: Nur in `eventCategories.ts` ergänzen → Prompts & Tests passen sich dynamisch an.
- Subcategories dienen nur als semantischer Kontext / mögliche LLM-Ausgaben in `eventType`, niemals als `category`.

## 4. Prompt-Architektur

Datei: `app/lib/perplexity.ts`

Zwei Ebenen:
1. General Prompt → listet 1..20 Kategorien dynamisch.
2. Category Prompt → fokussiert eine Hauptkategorie.

### Strikte Regeln:
- Muss Phrasen enthalten:
  - `Return ONLY a valid JSON array`
  - `If no events found, return: []` (bzw. kleine Varianten; Tests sollten Kernphrase validieren, nicht alles exakt)
- Keine Code-Fences (```), kein Markdown.
- `category` MUSS exakt eine der 20 Hauptkategorien sein.
- Feingranularität (`Techno`, `Jazz`, `Wine Tasting` etc.) gehört in `eventType` oder `description`.
- Guidance-Zeile erklärt Subtyp-Kontext, verbietet freie Kategorie-Erfindung.

### Erweiterbarkeit Phase 2/3 (Optionen):
- Prompt-Komprimierung / Token-Optimierung.
- Modelspezifische Anpassungen (Fallback zu günstigerem Modell für „leichte“ Kategorien).
- City-spezifische Insertions (Hot City) – bereits unterstützt.

## 5. Normalisierungspipeline

```
LLM JSON Output
      ↓
validateAndNormalizeEvents()
  - map raw category → Hauptkategorie
  - filter ungültige
      ↓
Dedup / Aggregator (falls mehrere Abfragen)
      ↓
Cache Write (per category)
      ↓
API Response / Frontend
```

### Regeln:
- Kein direkter UI-Zugriff auf ungeprüfte LLM-Ausgaben.
- Unbekannte Kategorien werden verworfen (oder vorher durch Normalisierung gemappt).
- Token-Map wird NICHT außerhalb von `eventCategories.ts` repliziert.

## 6. Caching

- Primär: Per-Category Keys (`city_date_Category`).
- Legacy Keys (kombinierte Kategorien / `all`) bleiben übergangsweise lesbar, aber sollten nicht mehr neu erzeugt werden (Migration Phase 2).
- Key Normalisierung: Stadt lowercased, Kategorie normalisiert.

### Effizienz-Ziel:
- Folgeanfragen für Teilmenge bereits abgefragter Kategorien triggern nur fehlende Kategorien → reduziert Kosten.

## 7. Job-Verarbeitung

- API `/api/events` legt Job mit Status `processing` an, liefert sofort alle Cache-Treffer zurück.
- Fehlende Kategorien werden asynchron (Background) abgefragt.
- Polling-Frontend fragt Job-Status bis abgeschlossen.
- `progress.completedCategories / totalCategories` hilft UI.

### Zukunft (Phase 3):
- Websocket Push / Server-Sent Events (optional)
- Re-Query Expired TTL Kategorien inkrementell

## 8. Tests – Kategorien & Prompts

Aktuelle Schutztests (sollten NICHT entfernt werden):
- Kategorie-Invarianten: 20 Einträge, keine Duplikate
- Normalisierung: Token → Hauptkategorie
- Prompt enthält alle 20 Kategorien (General)
- Strenge JSON Pflicht-Phrasen vorhanden
- Kein abgeschnittener String wie `Kuns[` im finalen Prompt (Regression früherer Bugs)

Empfehlung: Keine Snapshot-Tests für kompletten Prompt-Text (zu fragil). Stattdessen gezielte Assertions.

## 9. Erweiterung / Änderungen – Checkliste

Bei Änderung einer Hauptkategorie:
1. `eventCategories.ts`: Hauptkategorie hinzufügen / ändern.
2. Prüfen: Token-Mapping erweitern bei Bedarf.
3. Tests: laufen lassen – sollten dynamisch sein.
4. API: keine Anpassung nötig (importiert nur EVENT_CATEGORIES).
5. Prompt: automatisch aktualisiert (dynamische Liste).

Bei Hinzufügen neuer Subcategories:
- Nur in `EVENT_CATEGORY_SUBCATEGORIES[...]` erweitern.
- Keine Codeänderung sonst nötig.

## 10. Aggregator (Parsing)

- JSON-first Ansatz: versucht zuerst komplettes Array zu parsen.
- Fallbacks: Zeilenweise JSON, Markdown Tabellen, heuristische Satzanalyse.
- Dedup: fuzzy Matching (Ähnlichkeit Titel + Venue + Datum).
- Zukunft: Einbau von `normalizeCategory()` direkt nach Parsing (Phase 2).

## 11. Hot Cities

- Dynamischer Einbau städtischer Prioritätsquellen.
- `defaultSearchQuery` kann Kontext an Prompt anhängen.
- Erweiterungsidee: Weighted Source Scheduling / Source-Spezifische TTL.

## 12. Fehlerquellen / Anti-Patterns

| Problem | Vermeidung |
|---------|------------|
| Kategorien erneut hart codiert | Immer `EVENT_CATEGORIES` importieren |
| Prompt driftet (Markdown) | Tests + Architekturhinweis |
| Token-Map an mehreren Orten kopiert | Nur in `eventCategories.ts` pflegen |
| Cache Keys inkonsistent | Immer `InMemoryCache.createKeyForCategory` |
| Nicht-normalisierte Events gespeichert | Vor Cache-Writes Normalisierung erzwingen |

## 13. Phase 2 – Geplante Schritte

1. Integrate normalization direkt im Aggregationspfad (nach parse, vor cache).
2. Entferne alte Kategorie-Variations-Mappings aus `cache.ts` (ersetzt durch zentrale Normalisierung).
3. Legacy Combined Cache Keys (mit Komma) markieren → optional Migration / automatische Aufsplitterung.
4. Metriken: Anzahl verworfener Roh-Events wegen ungültiger Kategorie.

## 14. Phase 3 – (Optionale Roadmap)

- Persistenter Cache (Redis) + TTL gesteuert durch `computeTTLSecondsForEvents`.
- Rate-Limiting / Budget-Kontrolle pro Stadt / pro Zeitraum.
- Multi-Model Strategy: Schnelles Modell für „leichte“ Kategorien, hochwertiges Modell für komplexe.

## 15. Contribution Guidelines (Kategorien-spezifisch)

DO:
- Neue Kategorie nur via `EVENT_CATEGORY_SUBCATEGORIES`.
- Tests erweitern falls neue Token zugeordnet werden sollen.
- Prompts unverändert streng halten.

DON'T:
- Harte Listen in Routen oder Komponenten.
- Kategorienamen kürzen oder lokalisieren im JSON Schema (Lokalisierung gehört ins UI, nicht ins Model Output).

## 16. Glossar

| Begriff | Erklärung |
|---------|----------|
| Hauptkategorie | Kanonischer Eintrag (einer der 20 Schlüssel) |
| Subkategorie | Kontext / granularer Typ („Jazz/Blues“, „Wine Tasting“) |
| Token | Rohes Eingabewort, das auf Hauptkategorie gemappt wird |
| Normalisierung | Prozess: Eingabe → kanonische Hauptkategorie |
| SSOT | Single Source of Truth (ein definierter Ursprung) |

---

Bei Fragen oder Erweiterungsbedarf: Diese Datei zuerst aktualisieren, dann Implementierung anpassen.