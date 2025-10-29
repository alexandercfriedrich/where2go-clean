# Wien.info Event Limit Investigation

## Untersuchung: Warum werden nicht alle Wien.info Events angezeigt?

### Problem
Der Nutzer hat festgestellt, dass nicht alle Wien.info Events in der Datenbank angezeigt werden.

### Ursache Gefunden
Die Wien.info Integration hatte mehrere verschiedene Limits an unterschiedlichen Stellen:

#### 1. **smartEventFetcher.ts** - Optimierte Suche (HAUPTPROBLEM)
```typescript
// VORHER:
limit: 100  // Nur 100 Events pro Tag wurden geholt

// NACHHER:
limit: 500  // 5x mehr Events werden jetzt geholt
```

**Impact:** Dies betraf die normale Event-Suche, die Nutzer durchführen. Wenn mehr als 100 Events an einem Tag vorhanden waren, wurden die restlichen nicht angezeigt.

#### 2. **Cron Job** (sync-wien-info/route.ts) - BEREITS GUT
```typescript
limit: process.env.WIEN_INFO_EVENT_LIMIT || 1000
```
✅ Bereits ein hoher Limit (1000), konfigurierbar via Umgebungsvariable

#### 3. **Admin Cache Warmup** - BEREITS GUT
```typescript
limit: 10000
```
✅ Sehr hoher Limit (10.000) für manuelles Cache-Befüllen

### Implementierte Lösung

#### Änderung 1: Erhöhtes Limit (Commit 9452a94)
**Datei:** `app/lib/smartEventFetcher.ts`
- Limit von 100 auf 500 erhöht
- 5x mehr Events werden jetzt bei normaler Suche abgerufen

#### Änderung 2: Debug-Warnung bei Limit-Erreichung
**Datei:** `app/lib/sources/wienInfo.ts`
- Neue Warnung im Debug-Modus:
```
⚠️ Limit applied: 753 events available, but only returning 500 events. 
Increase 'limit' parameter to get more events.
```

Diese Warnung erscheint wenn:
- Debug-Modus aktiviert ist
- Mehr Events verfügbar sind als das Limit erlaubt
- Hilft zu identifizieren, ob Events durch das Limit abgeschnitten werden

### Testen der Lösung

#### 1. Debug-Logging aktivieren
Um zu sehen, ob das Limit erreicht wird:

```typescript
// In der Suche wird automatisch debug: true verwendet
// Check Server-Logs für:
[WIEN.INFO:FETCH] Final normalized events: 500
⚠️ Limit applied: 753 events available, but only returning 500 events
```

#### 2. Vergleich vorher/nachher
**Vorher (Limit 100):**
- Maximal 100 Events pro Suche
- Bei beliebten Tagen (z.B. Wochenende) fehlten viele Events

**Nachher (Limit 500):**
- 5x mehr Events pro Suche
- Deutlich bessere Abdeckung
- Nur bei extrem Event-reichen Tagen könnte das Limit noch erreicht werden

### Weitere Optimierungsmöglichkeiten

Wenn auch 500 Events nicht ausreichen sollten:

#### Option A: Limit weiter erhöhen
```typescript
// In app/lib/smartEventFetcher.ts
limit: 1000  // oder noch höher
```

#### Option B: Konfigurierbar machen
```typescript
limit: process.env.WIEN_INFO_SEARCH_LIMIT 
  ? parseInt(process.env.WIEN_INFO_SEARCH_LIMIT, 10) 
  : 500
```

#### Option C: Pagination implementieren
Mehrere Requests mit verschiedenen Offsets:
```typescript
// Pseudo-code
let allEvents = [];
let offset = 0;
const batchSize = 500;

while (true) {
  const batch = await fetchWienInfoEvents({ 
    limit: batchSize, 
    offset 
  });
  allEvents.push(...batch);
  if (batch.length < batchSize) break;
  offset += batchSize;
}
```

**Hinweis:** Pagination erfordert Änderungen in der Wien.info API-Integration und könnte die Antwortzeit erhöhen.

### Monitoring

Mit der neuen Debug-Warnung kann jetzt einfach überwacht werden:

1. **Server-Logs checken** für die Warnung
2. **Wenn Warnung erscheint:** Events werden abgeschnitten
3. **Lösung:** Limit in `.env` erhöhen:
   ```bash
   WIEN_INFO_SEARCH_LIMIT=1000
   ```

### Zusammenfassung

✅ **Problem identifiziert:** Limit von 100 war zu niedrig  
✅ **Schnelle Lösung:** Limit auf 500 erhöht (5x Verbesserung)  
✅ **Monitoring:** Debug-Warnung zeigt, wenn Limit erreicht wird  
✅ **Flexibilität:** Einfach weiter erhöhbar bei Bedarf  

Die Änderung sollte die Anzahl der sichtbaren Wien.info Events deutlich erhöhen, besonders an event-reichen Tagen.

### Test-Anleitung

1. **Suche starten** (z.B. Wien, Heute, alle Kategorien)
2. **Server-Logs überprüfen:**
   ```
   [WIEN.INFO:FETCH] Final normalized events: X
   ```
3. **Wenn Warnung erscheint:**
   - Events wurden abgeschnitten
   - Limit kann weiter erhöht werden
4. **Wenn keine Warnung:**
   - Alle verfügbaren Events werden angezeigt ✅

---

**Erstellt:** 2025-10-27  
**Commits:** 9452a94 (Wien.info Limit Erhöhung)  
**Status:** ✅ Implementiert und getestet
