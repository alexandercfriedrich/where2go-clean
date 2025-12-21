# 🚀 WHERE2GO SEO ROUTES: 7-PHASE IMPLEMENTATION (EXACT CODE EXAMPLES)

**Ziel:** Hybrid-Approach mit **12 Kategorien**, **104 Routes**, **SEO-Optimierung**  
**PR:** #311

---

## 📊 STRUKTUR (104 Routes)

```typescript
// CITIES × (DATES + CATEGORIES + (CATEGORIES × DATES))
// 2 × (3 + 12 + 36) + 2 City Roots = 104 Routes

CITIES = ['wien', 'ibiza'];                        // 2
DATES = ['heute', 'morgen', 'wochenende'];        // 3
CATEGORIES = [                                     // 12
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

### Route-Breakdown

| Typ | Anzahl | Beispiel |
|-----|--------|----------|
| City Root | 2 | `/wien`, `/ibiza` |
| City + Date | 6 | `/wien/heute` |
| City + Category | 24 | `/wien/musik` |
| City + Category + Date | 72 | `/wien/musik/heute` |
| **TOTAL** | **104** | ✅ |

---

# PHASE 1: Neue Utility-Funktionen ⏱️ (2h)

## 1.1 - Neue Datei: `app/lib/seo/metadataGenerator.ts`

**Status:** ✅ DONE in PR #311

```typescript
import { Metadata } from 'next';

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  'bildung-workshops': 'Bildung & Workshops',
  'clubs-nachtleben': 'Clubs & Nachtleben',
  'familie-kinder': 'Familie & Kinder',
  'film-kino': 'Film & Kino',
  'klassik-oper': 'Klassik & Oper',
  'kulinarik-maerkte': 'Kulinarik & Märkte',
  'lgbtq': 'LGBTQ+',
  'live-konzerte': 'Live-Konzerte',
  'museen-ausstellungen': 'Museen & Ausstellungen',
  'open-air-festivals': 'Open-Air & Festivals',
  'sport-fitness': 'Sport & Fitness',
  'theater-comedy': 'Theater & Comedy',
};

const DATE_LABELS: Record<string, string> = {
  'heute': 'heute',
  'morgen': 'morgen',
  'wochenende': 'dieses Wochenende',
};

interface MetadataParams {
  city: string;
  date?: string;
  category?: string;
}

export function generateCityMetadata(params: MetadataParams): Metadata {
  const { city, date, category } = params;
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);

  let title = '';
  let description = '';
  let keywords: string[] = [];

  if (category && date) {
    const catName = CATEGORY_DISPLAY_NAMES[category] || category;
    title = `${catName} in ${cityName} ${DATE_LABELS[date]} | Where2Go`;
    description = `${catName} in ${cityName} ${DATE_LABELS[date]}: Alle Events und Tickets auf Where2Go.`;
    keywords = [
      `${catName.toLowerCase()} ${cityName.toLowerCase()} ${DATE_LABELS[date]}`,
      `events ${cityName.toLowerCase()} ${DATE_LABELS[date]}`,
    ];
  } else if (category) {
    const catName = CATEGORY_DISPLAY_NAMES[category] || category;
    title = `${catName} in ${cityName} | Where2Go`;
    description = `Entdecke ${catName.toLowerCase()} in ${cityName}. Aktuelle Events und Tickets auf Where2Go.`;
    keywords = [
      `${catName.toLowerCase()} ${cityName.toLowerCase()}`,
      `events ${cityName.toLowerCase()}`,
    ];
  } else if (date) {
    title = `Events in ${cityName} ${DATE_LABELS[date]} | Where2Go`;
    description = `Alle Events in ${cityName} ${DATE_LABELS[date]}. Konzerte, Theater, Clubs und mehr auf Where2Go.`;
    keywords = [
      `events ${cityName.toLowerCase()} ${DATE_LABELS[date]}`,
      `veranstaltungen ${cityName.toLowerCase()}`,
    ];
  } else {
    title = `Events in ${cityName} | Where2Go`;
    description = `Entdecke alle Events in ${cityName}. Konzerte, Theater, Clubs und mehr auf Where2Go.`;
    keywords = [`events ${cityName.toLowerCase()}`, `${cityName.toLowerCase()} veranstaltungen`];
  }

  return {
    title,
    description,
    keywords,
    canonical: buildCanonicalURL(city, category, date),
    openGraph: {
      title,
      description,
      url: buildCanonicalURL(city, category, date),
    },
  };
}

function buildCanonicalURL(city: string, category?: string, date?: string): string {
  let url = `https://www.where2go.at/${city}`;
  if (category) url += `/${category}`;
  if (date) url += `/${date}`;
  return url;
}

export { CATEGORY_DISPLAY_NAMES, DATE_LABELS };
```

---

# PHASE 2: Neue Routes (Templates) ⏱️ (4-6h)

## 2.1 - Template: `app/wien/heute/page.tsx`

**Status:** ✅ TEMPLATE in PR #311

```typescript
import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents } from '@/lib/events/queries';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: 'wien', date: 'heute' });
}

export const dynamic = 'force-dynamic';

export default async function WienHeutePage() {
  const [trending, weekend, personalized] = await Promise.all([
    getTrendingEvents({ city: 'Wien', limit: 50 }),
    getWeekendEvents({ city: 'Wien', limit: 30 }),
    getPersonalizedEvents({ city: 'Wien', limit: 500 }),
  ]);

  return (
    <DiscoveryClient
      initialTrendingEvents={trending}
      initialWeekendEvents={weekend}
      initialPersonalizedEvents={personalized}
      city="Wien"
      initialDateFilter="heute"
    />
  );
}
```

## 2.2 - Template: `app/wien/musik/page.tsx`

```typescript
import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents } from '@/lib/events/queries';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: 'wien', category: 'live-konzerte' });
}

export const dynamic = 'force-dynamic';

export default async function WienMusikPage() {
  const [trending, weekend, personalized] = await Promise.all([
    getTrendingEvents({ city: 'Wien', limit: 50 }),
    getWeekendEvents({ city: 'Wien', limit: 30 }),
    getPersonalizedEvents({ city: 'Wien', limit: 500 }),
  ]);

  return (
    <DiscoveryClient
      initialTrendingEvents={trending}
      initialWeekendEvents={weekend}
      initialPersonalizedEvents={personalized}
      city="Wien"
      initialCategory="Live-Konzerte"
    />
  );
}
```

## 2.3 - Template: `app/wien/musik/heute/page.tsx`

```typescript
import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents } from '@/lib/events/queries';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({
    city: 'wien',
    category: 'live-konzerte',
    date: 'heute',
  });
}

export const dynamic = 'force-dynamic';

export default async function WienMusikHeutePage() {
  const [trending, weekend, personalized] = await Promise.all([
    getTrendingEvents({ city: 'Wien', limit: 50 }),
    getWeekendEvents({ city: 'Wien', limit: 30 }),
    getPersonalizedEvents({ city: 'Wien', limit: 500 }),
  ]);

  return (
    <DiscoveryClient
      initialTrendingEvents={trending}
      initialWeekendEvents={weekend}
      initialPersonalizedEvents={personalized}
      city="Wien"
      initialDateFilter="heute"
      initialCategory="Live-Konzerte"
    />
  );
}
```

---

# PHASE 3: Generierungs-Skript ⏱️ (1-2h)

## 3.1 - Skript: `scripts/generate-seo-routes.ts`

**Status:** ✅ SCRIPT in PR #311

```typescript
import * as fs from 'fs';
import * as path from 'path';

const CITIES = ['wien', 'ibiza'];
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
  'theater-comedy',
];
const DATES = ['heute', 'morgen', 'wochenende'];

const CATEGORY_NAMES: Record<string, string> = {
  'bildung-workshops': 'Bildung & Workshops',
  'clubs-nachtleben': 'Clubs & Nachtleben',
  'familie-kinder': 'Familie & Kinder',
  'film-kino': 'Film & Kino',
  'klassik-oper': 'Klassik & Oper',
  'kulinarik-maerkte': 'Kulinarik & Märkte',
  'lgbtq': 'LGBTQ+',
  'live-konzerte': 'Live-Konzerte',
  'museen-ausstellungen': 'Museen & Ausstellungen',
  'open-air-festivals': 'Open-Air & Festivals',
  'sport-fitness': 'Sport & Fitness',
  'theater-comedy': 'Theater & Comedy',
};

function generateRoute(city: string, category?: string, date?: string): string {
  const cityName = city.charAt(0).toUpperCase() + city.slice(1);
  const catName = category ? CATEGORY_NAMES[category] : '';

  let metadata = '';
  if (category && date) {
    metadata = `{ city: '${city}', category: '${category}', date: '${date}' }`;
  } else if (category) {
    metadata = `{ city: '${city}', category: '${category}' }`;
  } else if (date) {
    metadata = `{ city: '${city}', date: '${date}' }`;
  } else {
    metadata = `{ city: '${city}' }`;
  }

  let initialProps = '';
  if (category && date) {
    initialProps = `\n      city="${cityName}"\n      initialDateFilter="${date}"\n      initialCategory="${catName}"\n    `;
  } else if (category) {
    initialProps = `\n      city="${cityName}"\n      initialCategory="${catName}"\n    `;
  } else if (date) {
    initialProps = `\n      city="${cityName}"\n      initialDateFilter="${date}"\n    `;
  } else {
    initialProps = `city="${cityName}"`;
  }

  return `import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents } from '@/lib/events/queries';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata(${metadata});
}

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [trending, weekend, personalized] = await Promise.all([
    getTrendingEvents({ city: '${cityName}', limit: 50 }),
    getWeekendEvents({ city: '${cityName}', limit: 30 }),
    getPersonalizedEvents({ city: '${cityName}', limit: 500 }),
  ]);

  return (
    <DiscoveryClient
      initialTrendingEvents={trending}
      initialWeekendEvents={weekend}
      initialPersonalizedEvents={personalized}${initialProps}
    />
  );
}`;
}

function createFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
  console.log(`✅ ${filePath}`);
}

function main(): void {
  console.log('🚀 Generating 104 SEO routes...\n');
  let count = 0;

  // City + Date (6 routes)
  CITIES.forEach((city) => {
    DATES.forEach((date) => {
      const filePath = path.join(process.cwd(), `app/${city}/${date}/page.tsx`);
      createFile(filePath, generateRoute(city, undefined, date));
      count++;
    });
  });

  // City + Category (24 routes)
  CITIES.forEach((city) => {
    CATEGORIES.forEach((category) => {
      const filePath = path.join(process.cwd(), `app/${city}/${category}/page.tsx`);
      createFile(filePath, generateRoute(city, category));
      count++;
    });
  });

  // City + Category + Date (72 routes)
  CITIES.forEach((city) => {
    CATEGORIES.forEach((category) => {
      DATES.forEach((date) => {
        const filePath = path.join(process.cwd(), `app/${city}/${category}/${date}/page.tsx`);
        createFile(filePath, generateRoute(city, category, date));
        count++;
      });
    });
  });

  console.log(`\n✅ Generated ${count} routes!`);
  console.log('- City + Date: 6');
  console.log('- City + Category: 24');
  console.log('- City + Category + Date: 72');
  console.log('- TOTAL: 102 (+ 2 existing city roots = 104)');
}

main();
```

---

# PHASE 4: DiscoveryClient Update ⏱️ (1-2h)

## 4.1 - Anpassung: `app/discover/DiscoveryClient.tsx` (UPDATE)

**Status:** ✅ UPDATE in PR #311

Hinzufügen zu Props:
```typescript
interface DiscoveryClientProps {
  // ... existing props ...
  initialCategory?: string;           // NEW
  initialDateFilter?: string;         // NEW (potential rename)
}

export default function DiscoveryClient({
  // ... existing props ...
  initialCategory,
  initialDateFilter = 'all',
}: DiscoveryClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory || null
  );

  // H1 Dynamic
  function generateH1(): string {
    const dateLabel = initialDateFilter === 'heute' ? 'heute'
      : initialDateFilter === 'morgen' ? 'morgen'
      : initialDateFilter === 'wochenende' ? 'dieses Wochenende'
      : '';

    if (selectedCategory && dateLabel) {
      return `${selectedCategory} in ${city} ${dateLabel}`;
    } else if (selectedCategory) {
      return `${selectedCategory} in ${city}`;
    } else if (dateLabel) {
      return `Events in ${city} ${dateLabel}`;
    } else {
      return `Alle Events in ${city}`;
    }
  }

  return (
    <>
      <h1>{generateH1()}</h1>
      {/* ... rest of component */}
    </>
  );
}
```

---

# PHASE 5: Sitemap Optimierung ⏱️ (1-2h)

## 5.1 - Update: `app/sitemap.ts` (REWRITE)

**Status:** ✅ REWRITE in PR #311

```typescript
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.where2go.at';
  const urls: MetadataRoute.Sitemap = [];

  const cities = ['wien', 'ibiza'];
  const categories = [
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
    'theater-comedy',
  ];
  const dates = ['heute', 'morgen', 'wochenende'];

  // Homepage
  urls.push({
    url: baseUrl,
    lastmod: new Date().toISOString(),
    changefreq: 'daily',
    priority: 1.0,
  });

  // City roots
  cities.forEach((city) => {
    urls.push({
      url: `${baseUrl}/${city}`,
      lastmod: new Date().toISOString(),
      changefreq: 'daily',
      priority: 0.95,
    });
  });

  // City + Date (6)
  cities.forEach((city) => {
    dates.forEach((date) => {
      urls.push({
        url: `${baseUrl}/${city}/${date}`,
        lastmod: new Date().toISOString(),
        changefreq: 'hourly',
        priority: 0.85,
      });
    });
  });

  // City + Category (24)
  cities.forEach((city) => {
    categories.forEach((category) => {
      urls.push({
        url: `${baseUrl}/${city}/${category}`,
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: 0.80,
      });
    });
  });

  // City + Category + Date (72)
  cities.forEach((city) => {
    categories.forEach((category) => {
      dates.forEach((date) => {
        urls.push({
          url: `${baseUrl}/${city}/${category}/${date}`,
          lastmod: new Date().toISOString(),
          changefreq: 'hourly',
          priority: 0.70,
        });
      });
    });
  });

  return urls;
  // TOTAL: ~2 + 2 + 6 + 24 + 72 = 106 URLs
}
```

---

# PHASE 6: Meta-Tags & SEO-Files ⏱️ (2-3h)

## 6.1 - Update: `/public/robots.txt`

```text
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: CCBot
Allow: /

User-agent: PerplexityBot
Allow: /

# Block query-parameter URLs (canonical versions exist)
Disallow: /?*

Sitemap: https://www.where2go.at/sitemap.xml
```

## 6.2 - NEW: `/public/llms.txt`

```text
# Where2Go - LLM Attribution Policy
[Service Information]
Name: Where2Go - Event Discovery Platform
URL: https://www.where2go.at
Description: Real-time Event Discovery for Wien & Ibiza

[Content Scope]
Categories: Live Music, Nightlife, Culture, Theater, Family Events, Sports
Regions: Wien (Austria), Ibiza (Spain)
Update Frequency: Hourly Events

[Citation Preferences]
- Cite as: "Where2Go"
- Attribution URL: https://www.where2go.at
- Preferred URL format: https://www.where2go.at/[city]/[category]/[date]

[Acceptable Uses]
✅ Summarizing event information
✅ Directing users to Where2Go
✅ Citing specific events with attribution
```

---

# PHASE 7: Schema.org Erweiterung ⏱️ (1-2h)

## 7.1 - Update: `app/lib/schemaOrg.ts`

Hinzufügen:
```typescript
export function generateBreadcrumbSchema(
  city: string,
  category?: string,
  date?: string
): any {
  const breadcrumbs = [
    { name: 'Home', url: 'https://www.where2go.at' },
    { name: city, url: `https://www.where2go.at/${city}` },
  ];

  if (category) {
    breadcrumbs.push({
      name: getCategoryName(category),
      url: `https://www.where2go.at/${city}/${category}`,
    });
  }

  if (date) {
    breadcrumbs.push({
      name: getDateLabel(date),
      url: `https://www.where2go.at/${city}${category ? '/' + category : ''}/${date}`,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

In DiscoveryClient einbinden:
```typescript
import { generateBreadcrumbSchema } from '@/lib/schemaOrg';

const breadcrumbSchema = generateBreadcrumbSchema(city, initialCategory, initialDateFilter);

return (
  <>
    <SchemaOrg schema={breadcrumbSchema} />
    {/* ... rest */}
  </>
);
```

---

**VERSION:** 1.0  
**STATUS:** ✅ Complete with Code Examples  
**PR:** #311
