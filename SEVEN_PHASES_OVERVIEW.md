# 🚀 WHERE2GO SEO ROUTES - 7 PHASE OVERVIEW

**PR:** #311  
**Status:** 🟡 READY FOR IMPLEMENTATION  
**Total Phases:** 7  
**Estimated Time:** 14-19 hours  
**Total Routes:** 104 (2 cities × (3 dates + 12 categories + 36 combinations))

---

## 📊 PHASE SUMMARY TABLE

| # | Phase | Duration | Key Deliverable | Status |
|---|-------|----------|-----------------|--------|
| 1 | Utility Functions | 2h | `metadataGenerator.ts` | ✅ DONE |
| 2 | Route Templates | 4-6h | 3 route examples | ✅ DONE |
| 3 | Generation Script | 1-2h | `generate-seo-routes.ts` | ✅ DONE |
| 4 | DiscoveryClient | 1-2h | Updated props | ✅ DONE |
| 5 | Sitemap | 1-2h | 104 URLs sitemap | ✅ DONE |
| 6 | SEO Files | 2-3h | robots.txt, llms.txt | ✅ DONE |
| 7 | Schema.org | 1-2h | BreadcrumbList | ✅ DONE |
| **TOTAL** | **7 Phases** | **~18h** | **104 Routes** | **🟡 READY** |

---

## 📝 PHASE DETAILS

### PHASE 1: Utility Functions (2h)
**File:** `app/lib/seo/metadataGenerator.ts`

- Generates dynamic metadata (title, description, keywords) for 4 route types
- Supports city, city+date, city+category, city+category+date combinations
- Maps 12 categories to display names
- Builds canonical URLs and OpenGraph tags

```
Inputs: city (required), category (optional), date (optional)
Outputs: Metadata object with titles, descriptions, keywords
Formats:
  - /wien → "Events in Wien | Where2Go"
  - /wien/heute → "Events in Wien heute | Where2Go"
  - /wien/musik → "Live-Konzerte in Wien | Where2Go"
  - /wien/musik/heute → "Live-Konzerte in Wien heute | Where2Go"
```

---

### PHASE 2: Route Templates (4-6h)
**Files:** 3 example routes

- `/app/wien/heute/page.tsx` - City + Date template
- `/app/wien/musik/page.tsx` - City + Category template
- `/app/wien/musik/heute/page.tsx` - City + Category + Date template

Each template:
- Calls `generateCityMetadata()` for SEO metadata
- Passes props to `DiscoveryClient` component
- Fetches events data (trending, weekend, personalized)
- Has error handling (try/catch)

---

### PHASE 3: Generation Script (1-2h)
**File:** `scripts/generate-seo-routes.ts`

Automatically generates all 102 new routes from templates:
- 6 City + Date routes (2 cities × 3 dates)
- 24 City + Category routes (2 cities × 12 categories)
- 72 City + Category + Date routes (2 cities × 12 categories × 3 dates)

```bash
Run: npx ts-node scripts/generate-seo-routes.ts

Output:
  ✅ Generated 102 routes!
  - City + Date: 6
  - City + Category: 24
  - City + Category + Date: 72
  - TOTAL: 102 (+ 2 existing city roots = 104)
```

---

### PHASE 4: DiscoveryClient Update (1-2h)
**File:** `app/discover/DiscoveryClient.tsx` (UPDATE)

Add new props:
- `initialCategory?: string` - Set initial category filter
- `initialDateFilter?: string` - Set initial date filter

Implement dynamic H1 based on route:
- `/wien` → "Alle Events in Wien"
- `/wien/heute` → "Events in Wien heute"
- `/wien/musik` → "Live-Konzerte in Wien"
- `/wien/musik/heute` → "Live-Konzerte in Wien heute"

---

### PHASE 5: Sitemap Optimization (1-2h)
**File:** `app/sitemap.ts` (REWRITE)

Generate 104 URLs with proper priorities:
- Homepage: priority 1.0
- City roots: priority 0.95
- City + Date: priority 0.85 (hourly changefreq)
- City + Category: priority 0.80 (daily changefreq)
- City + Category + Date: priority 0.70 (hourly changefreq)

Result: Focused, semantic sitemap (~104 URLs vs 1000+ before)

---

### PHASE 6: SEO Files (2-3h)
**Files:**
- `/public/robots.txt` (UPDATE)
- `/public/llms.txt` (NEW)

**robots.txt:**
- Allow all crawlers
- Whitelist AI crawlers (GPTBot, Claude-Web, CCBot, PerplexityBot)
- Block query-parameter URLs (redirect to clean URLs)
- Reference sitemap

**llms.txt:**
- Service information
- Content scope (Wien, Ibiza, 12 categories)
- Citation preferences ("Where2Go" with attribution URL)
- Acceptable & prohibited uses
- Contact information

---

### PHASE 7: Schema.org Integration (1-2h)
**File:** `app/lib/schemaOrg.ts` (EXTEND)

Add `generateBreadcrumbSchema()` function:
- Creates BreadcrumbList schema for navigation
- Supports 1-4 levels: Home > City > Category > Date
- Valid JSON-LD format
- Integrated into DiscoveryClient via `<SchemaOrg />` component

Example output:
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.where2go.at"},
    {"@type": "ListItem", "position": 2, "name": "Wien", "item": "https://www.where2go.at/wien"},
    {"@type": "ListItem", "position": 3, "name": "Live-Konzerte", "item": "https://www.where2go.at/wien/live-konzerte"},
    {"@type": "ListItem", "position": 4, "name": "heute", "item": "https://www.where2go.at/wien/live-konzerte/heute"}
  ]
}
```

---

## 🎯 12 CATEGORIES MAPPING

```typescript
const CATEGORIES = [
  'bildung-workshops'       → 'Bildung & Workshops',
  'clubs-nachtleben'        → 'Clubs & Nachtleben',
  'familie-kinder'          → 'Familie & Kinder',
  'film-kino'               → 'Film & Kino',
  'klassik-oper'            → 'Klassik & Oper',
  'kulinarik-maerkte'       → 'Kulinarik & Märkte',
  'lgbtq'                   → 'LGBTQ+',
  'live-konzerte'           → 'Live-Konzerte',
  'museen-ausstellungen'    → 'Museen & Ausstellungen',
  'open-air-festivals'      → 'Open-Air & Festivals',
  'sport-fitness'           → 'Sport & Fitness',
  'theater-comedy'          → 'Theater & Comedy'
];
```

---

## 📊 ROUTE STRUCTURE

```
104 TOTAL ROUTES:

2 City Roots (existing):
  /wien
  /ibiza

6 City + Date Routes:
  /wien/heute
  /wien/morgen
  /wien/wochenende
  /ibiza/heute
  /ibiza/morgen
  /ibiza/wochenende

24 City + Category Routes:
  /wien/bildung-workshops
  /wien/clubs-nachtleben
  ... (10 more for Wien)
  /ibiza/bildung-workshops
  ... (10 more for Ibiza)

72 City + Category + Date Routes:
  /wien/bildung-workshops/heute
  /wien/bildung-workshops/morgen
  /wien/bildung-workshops/wochenende
  /wien/clubs-nachtleben/heute
  ... (69 more combinations)
```

---

## 📚 FILES OVERVIEW

| File | Type | Phase | Status |
|------|------|-------|--------|
| `app/lib/seo/metadataGenerator.ts` | NEW | 1 | ✅ |
| `app/wien/heute/page.tsx` | TEMPLATE | 2 | ✅ |
| `app/wien/musik/page.tsx` | TEMPLATE | 2 | ✅ |
| `app/wien/musik/heute/page.tsx` | TEMPLATE | 2 | ✅ |
| `scripts/generate-seo-routes.ts` | NEW | 3 | ✅ |
| `app/discover/DiscoveryClient.tsx` | UPDATE | 4 | ✅ |
| `app/sitemap.ts` | REWRITE | 5 | ✅ |
| `/public/robots.txt` | UPDATE | 6 | ✅ |
| `/public/llms.txt` | NEW | 6 | ✅ |
| `app/lib/schemaOrg.ts` | EXTEND | 7 | ✅ |
| **102 Auto-Generated Routes** | **GENERATED** | **3** | **🟡 Ready** |

---

## ✅ BEFORE & AFTER

| Aspect | Before | After |
|--------|--------|-------|
| Routes | ~20 (query params) | 104 (semantic URLs) |
| URLs in Sitemap | 1000+ | ~104 |
| Unique Metadata | Minimal (repeated) | 104 unique titles/descriptions |
| H1 Differenziation | Basic | 4 variants per route type |
| Schema.org | Minimal | BreadcrumbList + EventList |
| AI Crawler Support | Limited | Full (with llms.txt) |
| Long-tail Keywords | Not possible | \"clubs wien heute\", etc. |
| Crawl Efficiency | Poor (1000+ URLs) | Excellent (104 URLs) |
| User Experience | Generic | Contextual (date/category aware) |

---

## 🎭 QUICK START

1. **Review this document** - Understand all 7 phases
2. **Read code examples** - See `SEVEN_PHASES_DETAILED_IMPLEMENTATION.md`
3. **Follow checklist** - Complete tasks in `IMPLEMENTATION_PLAN.md`
4. **Run generation script** after phase 3:
   ```bash
   npx ts-node scripts/generate-seo-routes.ts
   ```
5. **Test routes** - Verify with `npm run dev`
6. **Deploy** - Merge PR when all tests pass

---

## 📪 DOCUMENTATION FILES

- **SEVEN_PHASES_OVERVIEW.md** (this file) - Quick reference
- **IMPLEMENTATION_PLAN.md** - Phase-by-phase checklist
- **SEVEN_PHASES_DETAILED_IMPLEMENTATION.md** - Full code examples

---

**Last Updated:** 2025-12-21  
**PR:** #311  
**Status:** 🟡 READY FOR IMPLEMENTATION
