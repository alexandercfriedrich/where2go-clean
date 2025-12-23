# 📋 WHERE2GO SEO ROUTES - IMPLEMENTATION PLAN

**PR:** #313  
**Ziel:** 104 SEO-optimierte Routes mit Hybrid-Approach (12 Kategorien)  
**Gesamtdauer:** ~14-19 Stunden  
**Status:** Ready to Start ✅

---

## 🎯 ÜBERSICHT: 7 Phasen

```
Phase 1 (2h)     → Utility-Funktionen
Phase 2 (4-6h)   → Route-Templates
Phase 3 (1-2h)   → Generierungs-Skript
Phase 4 (1-2h)   → DiscoveryClient Update
Phase 5 (1-2h)   → Sitemap Optimierung
Phase 6 (2-3h)   → Meta-Tags & SEO-Files
Phase 7 (1-2h)   → Schema.org

TOTAL: ~14-19h ⏱️
```

---

# PHASE 1: Neue Utility-Funktionen ⏱️ (2h)

## 📝 Phase 1.1: Neue Datei `app/lib/seo/metadataGenerator.ts`

### Aufgaben:
- [ ] Datei erstellen: `app/lib/seo/metadataGenerator.ts`
- [ ] 12 Kategorien mappings hinzufügen
- [ ] Funktion `generateCityMetadata()` implementieren
  - [ ] Unterstützt: city only
  - [ ] Unterstützt: city + date
  - [ ] Unterstützt: city + category
  - [ ] Unterstützt: city + category + date
- [ ] Exportiere: `CATEGORY_DISPLAY_NAMES`, `DATE_LABELS`
- [ ] TypeScript: Vollständig typisiert
- [ ] Test: Compile erfolgreich

### Definition: CATEGORIES
```typescript
const CATEGORIES = [
  'bildung-workshops',
  'clubs-nachtleben',
  'familie-kinder',
  'film-kino',
  'klassik-oper',
  'kulinarik-maerkte',
  'lgbtq',
  'live-konzerte',
  'museen-ausstellungen',
  'open-air-festivals',
  'sport-fitness',
  'theater-comedy'
];
```

### Success Criteria:
- ✅ 1 neue Datei erstellt
- ✅ Alle 4 Route-Typen unterstützt
- ✅ Unique titles/descriptions pro Typ
- ✅ TypeScript keine Fehler

---

# PHASE 2: Neue Routes (Templates) ⏱️ (4-6h)

## 📝 Phase 2.1: Template `app/wien/heute/page.tsx`

### Aufgaben:
- [ ] Datei erstellen: `app/wien/heute/page.tsx`
- [ ] generateMetadata() implementieren
  - [ ] Nutze `generateCityMetadata({ city: 'wien', date: 'heute' })`
  - [ ] Export als Metadata
- [ ] Default export als async function
- [ ] DiscoveryClient mit Props:
  - [ ] initialTrendingEvents
  - [ ] initialWeekendEvents
  - [ ] initialPersonalizedEvents
  - [ ] city="Wien"
  - [ ] initialDateFilter="heute"
- [ ] Error handling (try/catch)

### Success Criteria:
- ✅ Route lädt ohne Fehler
- ✅ Metadata korrekt
- ✅ H1 Text = \"Events in Wien heute\"

---

## 📝 Phase 2.2: Template `app/wien/musik/page.tsx`

### Aufgaben:
- [ ] Datei erstellen: `app/wien/musik/page.tsx`
- [ ] generateMetadata() implementieren
  - [ ] Nutze `generateCityMetadata({ city: 'wien', category: 'live-konzerte' })`
- [ ] DiscoveryClient mit Props:
  - [ ] city="Wien"
  - [ ] initialCategory="Live-Konzerte"

### Success Criteria:
- ✅ Route lädt ohne Fehler
- ✅ H1 Text = \"Live-Konzerte in Wien\"

---

## 📝 Phase 2.3: Template `app/wien/musik/heute/page.tsx`

### Aufgaben:
- [ ] Datei erstellen: `app/wien/musik/heute/page.tsx`
- [ ] generateMetadata() implementieren
  - [ ] Nutze `generateCityMetadata({ city: 'wien', category: 'live-konzerte', date: 'heute' })`
- [ ] DiscoveryClient mit Props:
  - [ ] city="Wien"
  - [ ] initialCategory="Live-Konzerte"
  - [ ] initialDateFilter="heute"

### Success Criteria:
- ✅ Route lädt ohne Fehler
- ✅ H1 Text = \"Live-Konzerte in Wien heute\"

---

# PHASE 3: Generierungs-Skript ⏱️ (1-2h)

## 📝 Phase 3.1: Skript `scripts/generate-seo-routes.ts`

### Aufgaben:
- [ ] Datei erstellen: `scripts/generate-seo-routes.ts`
- [ ] Konfiguration (CITIES, DATES, CATEGORIES)
- [ ] Funktion `generateRoute()` die Template erstellt
  - [ ] Unterstützt: city + date
  - [ ] Unterstützt: city + category
  - [ ] Unterstützt: city + category + date
- [ ] Funktion `createFile()` erstellt Dateien
- [ ] main() generiert alle Routes:
  - [ ] 6 City + Date Routes
  - [ ] 24 City + Category Routes
  - [ ] 72 City + Category + Date Routes
- [ ] Console-Output mit Statistik

### Ausführung:
```bash
npx ts-node scripts/generate-seo-routes.ts
```

### Erwarteter Output:
```
🚀 Generating 104 SEO routes...

✅ Generated app/wien/heute/page.tsx
✅ Generated app/wien/morgen/page.tsx
... (102 mehr)

✅ Successfully generated 102 routes!
- City + Date: 6
- City + Category: 24
- City + Category + Date: 72
- TOTAL: 102 (+ 2 existing city roots = 104)
```

### Success Criteria:
- ✅ 102 neue Routes erstellt
- ✅ Alle Routes im app/ Verzeichnis
- ✅ Alle Routes compilierbar
- ✅ Keine Duplikate

---

# PHASE 4: DiscoveryClient Update ⏱️ (1-2h)

## 📝 Phase 4.1: Anpassung `app/discover/DiscoveryClient.tsx`

### Aufgaben:
- [ ] Props erweitern:
  ```typescript
  interface DiscoveryClientProps {
    // existing props...
    initialCategory?: string;           // NEW
    initialDateFilter?: string;         // NEW (rename if needed)
  }
  ```

- [ ] useState Hooks:
  ```typescript
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory || null
  );
  ```

- [ ] H1 Dynamik implementieren:
  ```typescript
  function generateH1(): string {
    if (selectedCategory && initialDateFilter !== 'all') {
      return `${selectedCategory} in ${city} ${getDateLabel(initialDateFilter)}`;
    } else if (selectedCategory) {
      return `${selectedCategory} in ${city}`;
    } else if (initialDateFilter !== 'all') {
      return `Events in ${city} ${getDateLabel(initialDateFilter)}`;
    } else {
      return `Alle Events in ${city}`;
    }
  }
  ```

- [ ] Render: `<h1>{generateH1()}</h1>`

### Success Criteria:
- ✅ Props korrekt typisiert
- ✅ H1 unterschiedlich je Route
- ✅ Component lädt ohne Fehler

---

# PHASE 5: Sitemap Optimierung ⏱️ (1-2h)

## 📝 Phase 5.1: Update `app/sitemap.ts`

### Aufgaben:
- [ ] Komplette Rewrite von sitemap.ts
- [ ] Funktion generiert alle 104 URLs:
  - [ ] Homepage (priority: 1.0)
  - [ ] 2 City roots (priority: 0.95)
  - [ ] 6 City + Date (priority: 0.85)
  - [ ] 24 City + Category (priority: 0.80)
  - [ ] 72 City + Category + Date (priority: 0.70)

- [ ] Jede URL hat:
  ```typescript
  {
    url: string,
    lastmod: ISO string,
    changefreq: 'daily' | 'hourly' | ...,
    priority: number (0-1)
  }
  ```

- [ ] Loops für Kombinationen:
  ```typescript
  // City + Date (6)
  cities.forEach(city => {
    dates.forEach(date => {
      urls.push({ url: `${baseUrl}/${city}/${date}`, ... });
    });
  });
  // ... etc
  ```

### Success Criteria:
- ✅ 104 URLs in Sitemap
- ✅ Alle URLs einzigartig
- ✅ Korrekte Priorities
- ✅ Sitemap XML valid

---

# PHASE 6: Meta-Tags & SEO-Files ⏱️ (2-3h)

## 📝 Phase 6.1: Update `/public/robots.txt`

### Aufgaben:
- [ ] Datei erstellen/updaten: `/public/robots.txt`
- [ ] Standard-Rules:
  ```text
  User-agent: *
  Allow: /
  ```

- [ ] AI-Crawler erlauben:
  ```text
  User-agent: GPTBot
  Allow: /
  
  User-agent: Claude-Web
  Allow: /
  
  User-agent: CCBot
  Allow: /
  
  User-agent: PerplexityBot
  Allow: /
  ```

- [ ] Query-Parameter blocken:
  ```text
  Disallow: /?*
  ```

- [ ] Sitemap Reference:
  ```text
  Sitemap: https://www.where2go.at/sitemap.xml
  ```

### Success Criteria:
- ✅ robots.txt ist valid
- ✅ Alle AI-Crawler listed
- ✅ Query-Parameter blockt
- ✅ Sitemap verlinkt

---

## 📝 Phase 6.2: Neue Datei `/public/llms.txt`

### Aufgaben:
- [ ] Datei erstellen: `/public/llms.txt`
- [ ] Service Information:
  ```text
  [Service Information]
  Name: Where2Go - Event Discovery Platform
  URL: https://www.where2go.at
  Description: Real-time Event Discovery for Wien & Ibiza
  Type: Event Listing Aggregator
  ```

- [ ] Content Scope:
  ```text
  [Content Scope]
  Primary Focus: Real-time Event Discovery
  Categories: Live Music, Nightlife, Culture, Theater, Family Events, Sports
  Regions: Wien (Austria), Ibiza (Spain)
  Update Frequency: Hourly Events, Daily Content
  ```

- [ ] Citation Preferences:
  ```text
  [Citation Preferences]
  - Cite as: "Where2Go"
  - Attribution URL: https://www.where2go.at
  - Preferred URL format: https://www.where2go.at/[city]/[category]/[date]
  ```

- [ ] Acceptable & Prohibited Uses
- [ ] Contact Information

### Success Criteria:
- ✅ llms.txt ist valid
- ✅ Alle Sektion vollständig
- ✅ URL-Format dokumentiert
- ✅ Attribution-Anforderungen klar

---

# PHASE 7: Schema.org Erweiterung ⏱️ (1-2h)

## 📝 Phase 7.1: Update `app/lib/schemaOrg.ts`

### Aufgaben:
- [ ] Neue Funktion: `generateBreadcrumbSchema()`
  ```typescript
  export function generateBreadcrumbSchema(
    city: string,
    category?: string,
    date?: string
  ): any { ... }
  ```

- [ ] Breadcrumb-Array bauen:
  - [ ] Home (immer)
  - [ ] City (immer)
  - [ ] Category (wenn vorhanden)
  - [ ] Date (wenn vorhanden)

- [ ] Rückgabe: BreadcrumbList Schema
  ```typescript
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '...' },
      { '@type': 'ListItem', position: 2, name: 'Wien', item: '...' },
      ...
    ]
  }
  ```

- [ ] In DiscoveryClient integrieren:
  ```typescript
  const breadcrumbSchema = generateBreadcrumbSchema(
    city,
    initialCategory,
    initialDateFilter
  );
  
  return (
    <>
      <SchemaOrg schema={breadcrumbSchema} />
      {/* ... rest */}
    </>
  );
  ```

### Success Criteria:
- ✅ BreadcrumbList Schema valid
- ✅ Alle Levels richtig ordered
- ✅ URLs im Schema korrekt
- ✅ In allen 104 Routes aktiv

---

# ✅ FINAL CHECKLIST

## Code Quality
- [ ] TypeScript: Zero errors
- [ ] ESLint: No critical issues
- [ ] Build: `npm run build` succeeds
- [ ] No console errors/warnings

## Routes
- [ ] Alle 104 Routes erstellt
- [ ] Alle Routes compilieren
- [ ] Keine Duplikate
- [ ] Korrekte URL-Struktur

## SEO
- [ ] Metadaten unique pro Route (keine Duplicates)
- [ ] H1 Tags unterschiedlich
- [ ] Canonical URLs korrekt
- [ ] Sitemap mit allen 104 URLs
- [ ] robots.txt und llms.txt in place
- [ ] Schema.org valid (0 Errors)

## Deployment
- [ ] Code in PR committed
- [ ] CI/CD läuft ohne Fehler
- [ ] Ready for review

---

# 📊 TIMELINE

```
🕐 Montag
  08:00 - 10:00  → Phase 1 (2h)
  10:00 - 16:00  → Phase 2 (4-6h best estimate: 5h)

🕐 Dienstag
  08:00 - 09:30  → Phase 3 (1-2h best estimate: 1.5h)
  09:30 - 11:30  → Phase 4 (1-2h best estimate: 1.5h)
  11:30 - 13:00  → Phase 5 (1-2h best estimate: 1.5h)
  14:00 - 16:30  → Phase 6 (2-3h best estimate: 2.5h)

🕐 Mittwoch
  08:00 - 09:30  → Phase 7 (1-2h best estimate: 1.5h)
  09:30 - 11:00  → Final Checklist + Fixes
  11:00 - 12:00  → Code Review Prep

TOTAL: ~18 Arbeitsstunden (etwas optimistisch kalkuliert)
```

---

# 🎯 SUCCESS METRICS (After Implementation)

| Metrik | Before | After |
|--------|--------|-------|
| Routes | ~20 (nur City) | 104 (Hybrid-Approach) |
| Sitemap URLs | ~20 | 104 |
| Unique Titles | Wenige | 104 einzigartige |
| H1 Differenzierung | Basic | 4 Varianten pro Route |
| Schema.org | Minimal | BreadcrumbList + EventList |
| AI-Crawler Support | Nein | Ja (llms.txt) |
| Date-based Rankings | Nein | Möglich (neue Keywords) |

---

# 📝 NOTES

- **Generierungs-Skript:** Kann mehrfach ausgeführt werden (überschreibt bestehende Routes)
- **Existing Routes:** `app/[city]/page.tsx` bleibt erhalten (fallback)
- **Build-Zeit:** Kann mit 104 Routes länger dauern (monitor)
- **Next.js Versioning:** Code kompatibel mit App Router

---

**Dokumentation:** `SEVEN_PHASES_DETAILED_IMPLEMENTATION.md` für Code-Details  
**Status:** ✅ Ready to Start  
**Ziel:** PR #313 fertigstellen
