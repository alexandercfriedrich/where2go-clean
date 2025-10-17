import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventListSchema, generateEventMicrodata, generateCanonicalUrl } from '@/lib/schemaOrg';
import { resolveCityFromParam, dateTokenToISO, formatGermanDate, KNOWN_DATE_TOKENS } from '@/lib/city';
import { getRevalidateFor } from '@/lib/isr';
import { getActiveHotCities, slugify as slugifyCity } from '@/lib/hotCityStore';
import { EVENT_CATEGORY_SUBCATEGORIES } from '@/lib/eventCategories';
import type { EventData } from '@/lib/types';

// Mark as dynamic since we use Redis for HotCities
export const dynamic = 'force-dynamic';

async function fetchEvents(city: string, dateISO: string, category: string | null, revalidateTime: number): Promise<EventData[]> {
  try {
    // Construct absolute URL for server-side fetch
    // Use headers to get the host, or fallback to localhost for development
    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    const categoryParam = category ? `&category=${encodeURIComponent(category)}` : '';
    const url = `${baseUrl}/api/events/cache-day?city=${encodeURIComponent(city)}&date=${encodeURIComponent(dateISO)}${categoryParam}`;
    
    console.log(`[fetchEvents] Fetching: ${url}, city: ${city}, date: ${dateISO}, category: ${category}`);
    
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    console.log(`[fetchEvents] Status: ${res.status}, OK: ${res.ok}`);
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`[fetchEvents] Error response (first 200 chars): ${text.substring(0, 200)}`);
      return [];
    }
    
    const json = await res.json();
    console.log(`[fetchEvents] JSON response keys: ${Object.keys(json).join(', ')}`);
    
    const events = Array.isArray(json?.events) ? json.events : [];
    
    console.log(`[fetchEvents] Events count: ${events.length}`);
    
    return events;
  } catch (error) {
    console.error(`[fetchEvents] Exception:`, error);
    return [];
  }
}

function categorySlugToName(slug: string): string | null {
  const normalized = slug.toLowerCase().trim();
  
  for (const cat of Object.keys(EVENT_CATEGORY_SUBCATEGORIES)) {
    const catSlug = cat.toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\//g, '-')  // Replace slashes with hyphens
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-').replace(/-+/g, '-');
    
    if (catSlug === normalized) {
      return cat;
    }
  }
  
  return null;
}

function isDateToken(param: string): boolean {
  // Check if it's a known date token or ISO date
  return KNOWN_DATE_TOKENS.includes(param.toLowerCase()) || /^\d{4}-\d{2}-\d{2}$/.test(param);
}

// SSG: Generate static params for all combinations
export async function generateStaticParams({ params }: { params: { city: string } }) {
  const cities = await getActiveHotCities();
  const slugs = cities.map(c => slugifyCity(c.name));
  
  const today = new Date();
  const nextDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const coreDates = KNOWN_DATE_TOKENS;
  const allDates = [...coreDates, ...nextDays];
  
  const superCats = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
  const slugify = (s: string) =>
    s.toLowerCase().trim()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-').replace(/-+/g, '-');
  
  const catSlugs = superCats.map(c => slugify(c));
  
  const paths: { params: string[] }[] = [];
  
  // Pattern: [date] only
  allDates.forEach(date => {
    paths.push({ params: [date] });
  });
  
  // Pattern: [category] only
  catSlugs.forEach(cat => {
    paths.push({ params: [cat] });
  });
  
  // Pattern: [category, date]
  catSlugs.forEach(cat => {
    coreDates.forEach(date => {
      paths.push({ params: [cat, date] });
    });
  });
  
  return paths;
}

export async function generateMetadata({ params }: { params: { city: string; params: string[] } }) {
  const resolved = await resolveCityFromParam(params.city);
  if (!resolved) return {};
  
  const p = params.params || [];
  
  // Determine what we have
  let category: string | null = null;
  let dateParam = 'heute';
  
  if (p.length === 1) {
    // Single param: could be date or category
    if (isDateToken(p[0])) {
      dateParam = p[0];
    } else {
      category = categorySlugToName(p[0]);
      if (!category) {
        // Try as date anyway
        dateParam = p[0];
      }
    }
  } else if (p.length === 2) {
    // Two params: category and date
    category = categorySlugToName(p[0]);
    dateParam = p[1];
  }
  
  const dateISO = dateTokenToISO(dateParam);
  const dateHuman = formatGermanDate(dateISO);
  const categoryPart = category ? `${category} ` : '';
  const url = `https://www.where2go.at/${resolved.slug}/${p.join('/')}`;

  return {
    title: `${categoryPart}Events in ${resolved.name} – ${dateHuman} | Where2Go`,
    description: `${categoryPart}Events in ${resolved.name} am ${dateHuman}.`,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      siteName: 'Where2Go',
      title: `${categoryPart}Events in ${resolved.name} – ${dateHuman} | Where2Go`,
      description: `Alle ${categoryPart}Events in ${resolved.name} am ${dateHuman}.`
    }
  };
}

export default async function CityParamsPage({ params }: { params: { city: string; params: string[] } }) {
  const resolved = await resolveCityFromParam(params.city);
  if (!resolved) notFound();
  
  const p = params.params || [];
  
  // Determine what we have
  let category: string | null = null;
  let dateParam = 'heute';
  
  if (p.length === 1) {
    // Single param: could be date or category
    if (isDateToken(p[0])) {
      dateParam = p[0];
    } else {
      category = categorySlugToName(p[0]);
      if (!category) {
        // Try treating as date
        dateParam = p[0];
      }
    }
  } else if (p.length === 2) {
    // Two params: category and date
    category = categorySlugToName(p[0]);
    dateParam = p[1];
  } else {
    notFound();
  }

  const dateISO = dateTokenToISO(dateParam);
  const revalidate = await getRevalidateFor(resolved.name, dateParam.toLowerCase());
  const events = await fetchEvents(resolved.name, dateISO, category, revalidate);
  const listSchema = generateEventListSchema(events, resolved.name, dateISO, 'https://www.where2go.at');

  const categoryPart = category ? `${category} ` : '';
  const categorySlug = category ? p[0] : '';

  return (
    <div className="container" style={{ padding: '24px 16px' }}>
      <SchemaOrg schema={listSchema} />
      <h1 className="text-3xl font-bold mb-6">{categoryPart}Events in {resolved.name} – {formatGermanDate(dateISO)}</h1>

      {category && (
        <nav className="mb-6" aria-label="Zeitraum">
          <ul style={{ display: 'flex', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
            <li><Link href={`/${resolved.slug}/${categorySlug}/heute`} className="btn-outline">Heute</Link></li>
            <li><Link href={`/${resolved.slug}/${categorySlug}/morgen`} className="btn-outline">Morgen</Link></li>
            <li><Link href={`/${resolved.slug}/${categorySlug}/wochenende`} className="btn-outline">Wochenende</Link></li>
          </ul>
        </nav>
      )}

      <div className="events-grid">
        {events.length === 0 && (
          <div className="col-span-full text-center py-10">
            <p className="text-gray-500">Keine {categoryPart}Events gefunden.</p>
          </div>
        )}

        {events.map((ev, i) => {
          const key = `${ev.title}-${ev.venue}-${ev.date}-${i}`;
          const microdata = generateEventMicrodata(ev);
          const canonicalUrl = generateCanonicalUrl(ev, 'https://www.where2go.at');

          return (
            <div key={key} className="event-card" {...microdata}>
              <link itemProp="url" href={canonicalUrl} />
              <meta itemProp="eventStatus" content="https://schema.org/EventScheduled" />
              <meta itemProp="eventAttendanceMode" content="https://schema.org/OfflineEventAttendanceMode" />
              {ev.imageUrl && <meta itemProp="image" content={ev.imageUrl} />}

              <div className="event-card-body">
                <h3 className="event-card-title" itemProp="name">{ev.title}</h3>
                <div className="event-card-details">
                  <span className="event-card-date" itemProp="startDate" content={`${ev.date}T${(ev.time || '19:00')}:00`}>
                    {formatGermanDate(ev.date)}{ev.time ? `, ${ev.time} Uhr` : ''}
                  </span>
                  <span className="event-card-venue" itemProp="location" itemScope itemType="https://schema.org/Place">
                    <span itemProp="name">{ev.venue}</span>
                    {ev.address && (
                      <meta itemProp="address" content={ev.address} />
                    )}
                  </span>
                </div>
                {ev.price && <div className="event-card-price">{ev.price}</div>}
                {ev.description && <p className="event-card-desc" itemProp="description">{ev.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
