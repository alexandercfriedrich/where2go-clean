# Implementierungsanleitung: Event-Prompt-Optimierung

## Übersicht der Optimierungen
Diese Anleitung beschreibt die Optimierungen zur Event-Erfassung (mehr Quellen, bessere Prompts, adaptive Verarbeitung) und wie du sie nutzt.

## Wichtige Verbesserungen
- Optimierte System-/Kategorie-Prompts (40k Tokens, Temperatur 0.1, Fallbacks)
- Erweiterte Hot-City-Quellen (Wien) mit Prioritäten und Suchstrategien
- API/Worker: adaptive Concurrency, Batch-Verarbeitung, Fallback-Retries, bessere Debug-/Metrik-Ausgaben

## Voraussetzungen
- Environment: `PERPLEXITY_API_KEY` muss gesetzt sein
- Optionales Logging:
  ```bash
  LOG_PPLX_QUERIES=1
  LOG_PPLX_VERBOSE=1
  ```

## Nutzung
- API-Aufruf: `POST /api/events` mit Body `{ city, date, categories?, options? }`
- Debug aktivieren: URL-Params `?debug=1&verbose=1` oder `options.debug=true`
- Progress: Response enthält `status`, `progress`, `cacheInfo` und `enhancedInfo`
- Background-Worker: Wird automatisch gescheduled und schreibt Zwischenstände in den Job-Store

## Monitoring & Tests
- Zielmetriken: >5 Events pro Kategorie, ausgewogener Quellentyp-Mix, Laufzeit 4–5 Min
- Logs (Beispiele):
  - `ENHANCED`, `BATCH`, `FALLBACK`, `ADAPTIVE`, `CACHE-HIT`
- Manuelle Prüfung:
  1. Stadt/Datum mit bekannter Event-Dichte (z. B. Wien, Wochenende)
  2. Prüfe Response-Felder und Job-Updates
  3. Verifiziere Caching pro Kategorie

## Troubleshooting
- Wenige Events: Hot-City-Konfiguration prüfen, Debug aktivieren, Rate Limits checken
- Timeouts: Concurrency reduzieren, Timeouts erhöhen, Netzwerklatenz prüfen
- Duplikate: Deduplication-Parameter/Normalisierung feintunen

## Roadmap (optional)
- RSS/Soziale APIs, Venue-spezifische APIs
- ML: Klassifizierung, Embeddings für Dedupe, Relevanz-Scoring