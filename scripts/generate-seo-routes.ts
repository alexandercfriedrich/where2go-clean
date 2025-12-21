#!/usr/bin/env ts-node
/**
 * SEO Route Generator for Where2Go
 * 
 * Generates all SEO-optimized routes:
 * - /[city]
 * - /[city]/[date] (3 variations per city)
 * - /[city]/[category] (12 categories per city)
 * - /[city]/[category]/[date] (36 combinations per city)
 * 
 * Total: 2 cities × (1 + 3 + 12 + 36) = 104 routes
 * 
 * Usage: npx ts-node scripts/generate-seo-routes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Configuration
const CITIES = ['wien', 'ibiza'];
const CITY_NAMES: Record<string, string> = {
  'wien': 'Wien',
  'ibiza': 'Ibiza',
};

const DATES = ['heute', 'morgen', 'wochenende'];

const CATEGORIES = [
  'clubs-nachtleben',
  'live-konzerte',
  'klassik-oper',
  'theater-comedy',
  'museen-ausstellungen',
  'film-kino',
  'open-air-festivals',
  'kulinarik-maerkte',
  'sport-fitness',
  'bildung-workshops',
  'familie-kinder',
  'lgbtq',
];

const CATEGORY_NAMES: Record<string, string> = {
  'clubs-nachtleben': 'Clubs & Nachtleben',
  'live-konzerte': 'Live-Konzerte',
  'klassik-oper': 'Klassik & Oper',
  'theater-comedy': 'Theater & Comedy',
  'museen-ausstellungen': 'Museen & Ausstellungen',
  'film-kino': 'Film & Kino',
  'open-air-festivals': 'Open Air & Festivals',
  'kulinarik-maerkte': 'Kulinarik & Märkte',
  'sport-fitness': 'Sport & Fitness',
  'bildung-workshops': 'Bildung & Workshops',
  'familie-kinder': 'Familie & Kinder',
  'lgbtq': 'LGBTQ+',
};

/**
 * Generate page template for /[city]/[date] route
 * Example: /wien/heute
 */
function generateDateRoutePage(city: string, date: string): string {
  const cityUpper = CITY_NAMES[city];
  
  return `import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getUpcomingEvents, getWeekendNightlifeEvents } from '../../../lib/events/queries';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventListSchema } from '@/lib/schemaOrg';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: '${city}', date: '${date}' });
}

export const dynamic = 'force-dynamic';

export default async function ${capitalize(city)}${capitalize(date)}Page() {
  try {
    const [trending, weekend, personalized, nightlife, upcoming] = await Promise.all([
      getTrendingEvents({ city: '${cityUpper}', limit: 50 }),
      getWeekendEvents({ city: '${cityUpper}', limit: 30 }),
      getPersonalizedEvents({ city: '${cityUpper}', limit: 500 }),
      getWeekendNightlifeEvents({ city: '${cityUpper}' }),
      getUpcomingEvents(7, { city: '${cityUpper}', limit: 100 }),
    ]);

    const sorted = {
      trending: sortEventsWithImagesFirstThenByDate(trending),
      weekend: sortEventsWithImagesFirstThenByDate(weekend),
      personalized: sortEventsWithImagesFirstThenByDate(personalized),
    };

    const schema = generateEventListSchema(
      upcoming.map((e: any) => ({ ...e, date: e.start_date_time?.split('T')[0] || '' })),
      '${cityUpper}',
      new Date().toISOString().split('T')[0]
    );

    return (
      <>
        <SchemaOrg schema={schema} />
        <DiscoveryClient
          initialTrendingEvents={sorted.trending}
          initialWeekendEvents={sorted.weekend}
          initialPersonalizedEvents={sorted.personalized}
          initialWeekendNightlifeEvents={nightlife}
          city="${cityUpper}"
          initialDateFilter="${date}"
        />
      </>
    );
  } catch (error) {
    console.error('Error in ${capitalize(city)}${capitalize(date)}Page:', error);
    return (
      <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city="${cityUpper}"
        initialDateFilter="${date}"
      />
    );
  }
}
`;
}

/**
 * Generate page template for /[city]/[category] route
 * Example: /wien/clubs-nachtleben
 */
function generateCategoryRoutePage(city: string, category: string): string {
  const cityUpper = CITY_NAMES[city];
  const categoryLabel = CATEGORY_NAMES[category];

  return `import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getWeekendNightlifeEvents } from '../../../lib/events/queries';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: '${city}', category: '${category}' });
}

export const dynamic = 'force-dynamic';

export default async function ${capitalize(city)}${pascalCase(category)}Page() {
  try {
    const [trending, weekend, personalized, nightlife] = await Promise.all([
      getTrendingEvents({ city: '${cityUpper}', limit: 50 }),
      getWeekendEvents({ city: '${cityUpper}', limit: 30 }),
      getPersonalizedEvents({ city: '${cityUpper}', limit: 500 }),
      getWeekendNightlifeEvents({ city: '${cityUpper}' }),
    ]);

    const sorted = {
      trending: sortEventsWithImagesFirstThenByDate(trending),
      weekend: sortEventsWithImagesFirstThenByDate(weekend),
      personalized: sortEventsWithImagesFirstThenByDate(personalized),
    };

    return (
      <DiscoveryClient
        initialTrendingEvents={sorted.trending}
        initialWeekendEvents={sorted.weekend}
        initialPersonalizedEvents={sorted.personalized}
        initialWeekendNightlifeEvents={nightlife}
        city="${cityUpper}"
        initialDateFilter="all"
        initialCategory="${categoryLabel}"
      />
    );
  } catch (error) {
    console.error('Error in ${capitalize(city)}${pascalCase(category)}Page:', error);
    return (
      <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city="${cityUpper}"
        initialDateFilter="all"
        initialCategory="${categoryLabel}"
      />
    );
  }
}
`;
}

/**
 * Generate page template for /[city]/[category]/[date] route
 * Example: /wien/clubs-nachtleben/heute
 */
function generateCategoryDateRoutePage(city: string, category: string, date: string): string {
  const cityUpper = CITY_NAMES[city];
  const categoryLabel = CATEGORY_NAMES[category];

  return `import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getWeekendNightlifeEvents } from '../../../../lib/events/queries';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: '${city}', category: '${category}', date: '${date}' });
}

export const dynamic = 'force-dynamic';

export default async function ${capitalize(city)}${pascalCase(category)}${capitalize(date)}Page() {
  try {
    const [trending, weekend, personalized, nightlife] = await Promise.all([
      getTrendingEvents({ city: '${cityUpper}', limit: 50 }),
      getWeekendEvents({ city: '${cityUpper}', limit: 30 }),
      getPersonalizedEvents({ city: '${cityUpper}', limit: 500 }),
      getWeekendNightlifeEvents({ city: '${cityUpper}' }),
    ]);

    const sorted = {
      trending: sortEventsWithImagesFirstThenByDate(trending),
      weekend: sortEventsWithImagesFirstThenByDate(weekend),
      personalized: sortEventsWithImagesFirstThenByDate(personalized),
    };

    return (
      <DiscoveryClient
        initialTrendingEvents={sorted.trending}
        initialWeekendEvents={sorted.weekend}
        initialPersonalizedEvents={sorted.personalized}
        initialWeekendNightlifeEvents={nightlife}
        city="${cityUpper}"
        initialDateFilter="${date}"
        initialCategory="${categoryLabel}"
      />
    );
  } catch (error) {
    console.error('Error in ${capitalize(city)}${pascalCase(category)}${capitalize(date)}Page:', error);
    return (
      <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city="${cityUpper}"
        initialDateFilter="${date}"
        initialCategory="${categoryLabel}"
      />
    );
  }
}
`;
}

/**
 * Capitalize first letter
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Convert kebab-case to PascalCase
 * Example: 'clubs-nachtleben' -> 'ClubsNachtleben'
 */
function pascalCase(s: string): string {
  return s
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Create directory if it doesn't exist
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Main execution
 */
function main(): void {
  console.log('\n🚀 SEO Route Generator - Where2Go');
  console.log('=====================================\n');

  let totalGenerated = 0;

  // Generate routes for each city
  for (const city of CITIES) {
    console.log(`📍 Processing city: ${city.toUpperCase()}`);

    // 1. Generate /[city]/[date] routes (3 per city)
    console.log(`  ├─ Date routes...`);
    for (const date of DATES) {
      const dir = path.join(process.cwd(), `app/${city}/${date}`);
      ensureDir(dir);
      const content = generateDateRoutePage(city, date);
      fs.writeFileSync(path.join(dir, 'page.tsx'), content);
      totalGenerated++;
      console.log(`  │  ✓ app/${city}/${date}/page.tsx`);
    }

    // 2. Generate /[city]/[category] routes (12 per city)
    console.log(`  ├─ Category routes...`);
    for (const category of CATEGORIES) {
      const dir = path.join(process.cwd(), `app/${city}/${category}`);
      ensureDir(dir);
      const content = generateCategoryRoutePage(city, category);
      fs.writeFileSync(path.join(dir, 'page.tsx'), content);
      totalGenerated++;
      console.log(`  │  ✓ app/${city}/${category}/page.tsx`);
    }

    // 3. Generate /[city]/[category]/[date] routes (36 per city: 12×3)
    console.log(`  ├─ Category+Date routes...`);
    for (const category of CATEGORIES) {
      for (const date of DATES) {
        const dir = path.join(process.cwd(), `app/${city}/${category}/${date}`);
        ensureDir(dir);
        const content = generateCategoryDateRoutePage(city, category, date);
        fs.writeFileSync(path.join(dir, 'page.tsx'), content);
        totalGenerated++;
      }
    }
    console.log(`  └─ ✓ ${CATEGORIES.length * DATES.length} category+date routes\n`);
  }

  // Summary
  console.log('=====================================');
  console.log(`✅ Route Generation Complete!\n`);
  console.log(`Summary:`);
  console.log(`  • Cities: ${CITIES.length}`);
  console.log(`  • Dates per city: ${DATES.length}`);
  console.log(`  • Categories per city: ${CATEGORIES.length}`);
  console.log(`  • Date routes: ${CITIES.length} × ${DATES.length} = ${CITIES.length * DATES.length}`);
  console.log(`  • Category routes: ${CITIES.length} × ${CATEGORIES.length} = ${CITIES.length * CATEGORIES.length}`);
  console.log(`  • Category+Date routes: ${CITIES.length} × ${CATEGORIES.length * DATES.length} = ${CITIES.length * CATEGORIES.length * DATES.length}`);
  console.log(`  • Total routes generated: ${totalGenerated}\n`);
  console.log(`📊 SEO Route Breakdown:`);
  console.log(`  /wien + /ibiza = 2 routes`);
  console.log(`  /[city]/[date] = 6 routes`);
  console.log(`  /[city]/[category] = 24 routes`);
  console.log(`  /[city]/[category]/[date] = 72 routes`);
  console.log(`  ═════════════════════════════`);
  console.log(`  Total in Sitemap: 104 routes\n`);
}

main();
