import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Mark this route as always dynamic (wir hängen von Runtime-Daten ab)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface HotCityWebsite {
  id: string;
  name: string;
  url: string;
  categories?: string[];
  description?: string;
  priority?: number;
  isActive?: boolean;
}

interface HotCity {
  id: string;
  name: string;
  country?: string;
  isActive?: boolean;
  defaultSearchQuery?: string;
  customPrompt?: string;
  websites?: HotCityWebsite[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface SimpleEvent {
  id: string;
  title: string;
  date: string;
  category?: string;
  city: string;
  source?: string;
  url?: string;
  excerpt?: string;
}

function parseCategories(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(c => c.trim())
    .filter(Boolean)
    .map(c => c.replace(/\s+/g, ' '))
    .slice(0, 12); // Hard limit – Schutz
}

function normalizeDate(input?: string | null): string {
  if (!input) return new Date().toISOString().slice(0, 10);
  // Akzeptiere YYYY-MM-DD, sonst fallback
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return new Date().toISOString().slice(0, 10);
}

function pick<T>(arr: T[] | undefined | null): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildStubEvents(city: HotCity, date: string, categories: string[], count = 6): SimpleEvent[] {
  const catPool = categories.length
    ? categories
    : (city.websites?.flatMap(w => w.categories || []) || ['General']);

  const distinctCats = Array.from(new Set(catPool));
  return Array.from({ length: count }).map((_, i) => {
    const cat = distinctCats[i % distinctCats.length] || 'General';
    const website = pick(city.websites);
    return {
      id: `stub-${city.id}-${date}-${i}`,
      title: `Beispiel Event ${i + 1} in ${city.name}`,
      date,
      category: cat,
      city: city.name,
      source: website?.name,
      url: website?.url,
      excerpt: `Platzhalter für ein echtes "${cat}" Event in ${city.name}.`
    };
  });
}

async function loadHotCities(): Promise<HotCity[]> {
  // Hauptkey
  let cities = await redis.get<HotCity[]>('hot-cities');
  if (Array.isArray(cities) && cities.length > 0) return cities;

  // Fallback: vielleicht wurde unter anderem Key geschrieben – wenn du andere Keys nutzt, hier ergänzen
  const alt = await redis.get<HotCity[]>('hot_cities');
  if (Array.isArray(alt) && alt.length > 0) return alt;

  return [];
}

function findCity(cities: HotCity[], input: string): HotCity | undefined {
  const lower = input.toLowerCase();
  return (
    cities.find(c => c.name.toLowerCase() === lower) ||
    cities.find(c => c.id?.toLowerCase() === lower) ||
    cities.find(c => c.name.toLowerCase().includes(lower)) ||
    undefined
  );
}

export async function GET(req: NextRequest) {
  const started = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const cityParam = searchParams.get('city');
    const rawDate = searchParams.get('date');
    const categories = parseCategories(searchParams.get('categories'));

    if (!cityParam) {
      return NextResponse.json(
        { error: 'Missing required query param: city' },
        { status: 400 }
      );
    }

    const date = normalizeDate(rawDate);

    const hotCities = await loadHotCities();
    if (hotCities.length === 0) {
      return NextResponse.json(
        {
          error: 'No hot cities data found',
          hint: 'Seed via /api/admin/hot-cities/seed (POST) falls noch nicht geschehen'
        },
        { status: 500 }
      );
    }

    const city = findCity(hotCities, cityParam);
    if (!city) {
      return NextResponse.json(
        {
          error: `City '${cityParam}' not found`,
          available: hotCities.map(c => c.name).slice(0, 25)
        },
        { status: 404 }
      );
    }

    const baseQuery =
      city.defaultSearchQuery ||
      `${city.name} events ${date}`;

    const finalQuery =
      categories.length > 0
        ? `${baseQuery} | categories: ${categories.join(', ')}`
        : baseQuery;

    // ---------------- STUB / PLACEHOLDER BLOCK ----------------
    // Hier später echte Logik einsetzen (Scraper, LLM, externe API etc.)
    // z.B.:
    // const rawResults = await runPerplexity(finalQuery, { websites: city.websites });
    // const events = normalizeExternalResults(rawResults);
    const events: SimpleEvent[] = buildStubEvents(city, date, categories, 6);
    // ----------------------------------------------------------

    return NextResponse.json(
      {
        success: true,
        meta: {
            city: city.name,
            cityId: city.id,
            date,
            categoriesRequested: categories,
            queryUsed: finalQuery,
            stub: true,
            websitesAttached: city.websites?.length || 0,
            processingMs: Date.now() - started
        },
        events
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (err: any) {
    console.error('simple events endpoint error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal error fetching simple events',
        detail: err?.message || 'unknown'
      },
      { status: 500 }
    );
  }
}

// Optional: einfache OPTIONS für CORS (falls du später extern zugreifen willst)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}