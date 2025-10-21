import { notFound } from 'next/navigation';
import Link from 'next/link';
import SchemaOrg from '@/components/SchemaOrg';
import Breadcrumb from '@/components/Breadcrumb';
import { generateEventListSchema, generateEventMicrodata, generateCanonicalUrl } from '@/lib/schemaOrg';
import { resolveCityFromParam, dateTokenToISO, formatGermanDate, KNOWN_DATE_TOKENS } from '@/lib/city';
import { getRevalidateFor } from '@/lib/isr';
import { getActiveHotCities, slugify as slugifyCity } from '@/lib/hotCityStore';
import { EVENT_CATEGORY_SUBCATEGORIES, EVENT_CATEGORIES, normalizeCategory } from '@/lib/eventCategories';
import { getDayEvents, isEventValidNow } from '@/lib/dayCache';
import { eventsCache } from '@/lib/cache';
import { eventAggregator } from '@/lib/aggregator';
import { generateCitySEO } from '@/lib/seoContent';
import type { EventData } from '@/lib/types';

// Mark as dynamic since we use Redis for HotCities
export const dynamic = 'force-dynamic';

async function fetchEvents(city: string, dateISO: string, category: string | null): Promise<EventData[]> {
  try {
    console.log(`[fetchEvents] Direct call: city=${city}, date=${dateISO}, category=${category}`);
    
    // Direct call to cache logic (no HTTP request needed)
    const requestedCategories = category
      ? Array.from(new Set(
          category.split(',')
            .map(c => c.trim())
            .filter(Boolean)
            .map(c => normalizeCategory(c))
        ))
      : null;

    let allEvents: EventData[] = [];

    // Try to load from day-bucket first
    const dayBucket = await getDayEvents(city, dateISO);
    
    if (dayBucket && dayBucket.events.length > 0) {
      allEvents = dayBucket.events;
    } else {
      // Fallback: Load from per-category shards
      const categoriesToLoad = requestedCategories || EVENT_CATEGORIES;
      const cacheResult = await eventsCache.getEventsByCategories(city, dateISO, categoriesToLoad);
      
      const cachedEventsList: EventData[] = [];
      for (const cat in cacheResult.cachedEvents) {
        cachedEventsList.push(...cacheResult.cachedEvents[cat]);
      }
      
      // Deduplicate events from different category shards
      allEvents = eventAggregator.deduplicateEvents(cachedEventsList);
    }

    // Filter: Only return valid (non-expired) events
    const now = new Date();
    const validEvents = allEvents.filter(event => isEventValidNow(event, now));

    // Filter by requested categories if specified
    let filteredEvents = validEvents;
    if (requestedCategories && requestedCategories.length > 0) {
      filteredEvents = validEvents.filter(event => {
        if (!event.category) return false;
        const normalizedEventCategory = normalizeCategory(event.category);
        return requestedCategories.includes(normalizedEventCategory);
      });
    }

    console.log(`[fetchEvents] Events count: ${filteredEvents.length}`);
    
    return filteredEvents;
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
  const strictMode = process.env.CITY_STRICT_MODE === 'true'; // Default to non-strict
  const resolved = await resolveCityFromParam(params.city, strictMode);
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
  // Disable strict mode by default - allow any city name (filtered by middleware)
  const strictMode = process.env.CITY_STRICT_MODE === 'true'; // Default to non-strict
  const resolved = await resolveCityFromParam(params.city, strictMode);
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
  const events = await fetchEvents(resolved.name, dateISO, category);
  const listSchema = generateEventListSchema(events, resolved.name, dateISO, 'https://www.where2go.at');
  const seoContent = generateCitySEO(resolved.name, dateParam, category || undefined);

  const categoryPart = category ? `${category} ` : '';
  const categorySlug = category ? p[0] : '';

  // Build breadcrumb
  const breadcrumbItems = [
    { label: resolved.name, href: `/${resolved.slug}` }
  ];
  
  if (category) {
    breadcrumbItems.push({ label: category, href: `/${resolved.slug}/${categorySlug}` });
  }
  
  if (dateParam !== 'heute') {
    breadcrumbItems.push({ label: formatGermanDate(dateISO), href: `/${resolved.slug}${categorySlug ? `/${categorySlug}` : ''}/${dateParam}` });
  }

  return (
    <div style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)', minHeight: '100vh', padding: '24px 16px' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <SchemaOrg schema={listSchema} />
        <Breadcrumb items={breadcrumbItems} />
        
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF', marginBottom: '24px' }}>
          {categoryPart}Events in {resolved.name} – {formatGermanDate(dateISO)}
        </h1>

        {/* Date Navigation - Always show */}
        <nav className="mb-6" aria-label="Zeitraum">
          <ul style={{ display: 'flex', gap: 12, listStyle: 'none', padding: 0, margin: '0 0 24px 0', flexWrap: 'wrap' }}>
            <li>
              <Link 
                href={category ? `/${resolved.slug}/${categorySlug}/heute` : `/${resolved.slug}/heute`}
                style={{ 
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: dateParam === 'heute' ? '#4A90E2' : 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Heute
              </Link>
            </li>
            <li>
              <Link 
                href={category ? `/${resolved.slug}/${categorySlug}/morgen` : `/${resolved.slug}/morgen`}
                style={{ 
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: dateParam === 'morgen' ? '#4A90E2' : 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Morgen
              </Link>
            </li>
            <li>
              <Link 
                href={category ? `/${resolved.slug}/${categorySlug}/wochenende` : `/${resolved.slug}/wochenende`}
                style={{ 
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: dateParam === 'wochenende' ? '#4A90E2' : 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Wochenende
              </Link>
            </li>
          </ul>
        </nav>

        {/* Category Filter Row */}
        <div style={{ marginBottom: '24px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', gap: '10px', paddingBottom: '8px', minWidth: 'min-content' }}>
            {/* "Alle Events anzeigen" button */}
            <Link
              href={`/${resolved.slug}/${dateParam}`}
              style={{
                padding: '8px 16px',
                background: !category ? '#404040' : '#f5f5f5',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: !category ? '#ffffff' : '#374151',
                fontWeight: 500,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              Alle Events anzeigen
              <span style={{ fontSize: '11px', opacity: 0.8 }}>({events.length})</span>
            </Link>
            
            {Object.keys(EVENT_CATEGORY_SUBCATEGORIES).map(cat => {
              const catSlug = cat.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\//g, '-').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
              const count = events.filter(e => {
                // Check if event's normalized category matches this main category
                return normalizeCategory(e.category) === cat;
              }).length;
              
              const isActive = category === cat;
              const isDisabled = count === 0;
              
              return (
                <Link
                  key={cat}
                  href={isDisabled ? '#' : `/${resolved.slug}/${catSlug}/${dateParam}`}
                  style={{
                    padding: '8px 16px',
                    background: isActive ? '#404040' : '#f5f5f5',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: isDisabled ? '#9ca3af' : (isActive ? '#ffffff' : '#374151'),
                    fontWeight: 500,
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    pointerEvents: isDisabled ? 'none' : 'auto'
                  }}
                >
                  {cat}
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>({count})</span>
                </Link>
              );
            })}
          </div>
        </div>

        <p style={{ color: '#AAAAAA', marginBottom: '32px', fontSize: '15px' }}>
          {events.length} Events gefunden
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {events.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: '#888', fontSize: '16px' }}>Keine {categoryPart}Events gefunden.</p>
            </div>
          )}

          {events.map((ev, i) => {
            const key = `${ev.title}-${ev.venue}-${ev.date}-${i}`;
            const microdata = generateEventMicrodata(ev);
            const canonicalUrl = generateCanonicalUrl(ev, 'https://www.where2go.at');

            return (
              <div key={key} className="dark-event-card" {...microdata}>
                <link itemProp="url" href={canonicalUrl} />
                <meta itemProp="eventStatus" content="https://schema.org/EventScheduled" />
                <meta itemProp="eventAttendanceMode" content="https://schema.org/OfflineEventAttendanceMode" />
                {ev.imageUrl && (
                  <>
                    <meta itemProp="image" content={ev.imageUrl} />
                    <div 
                      className="dark-event-card-image"
                      style={{
                        backgroundImage: `url(${ev.imageUrl})`
                      }}
                    />
                  </>
                )}

                <div className="dark-event-content">
                {ev.category && (
                  <a 
                    href={`/${resolved.slug}/${ev.category.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\//g, '-').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')}/${dateParam}`}
                    className="dark-event-category dark-event-category-link"
                  >
                    {ev.category}
                  </a>
                )}

                <h3 className="dark-event-title" itemProp="name">{ev.title}</h3>

                <div className="dark-event-details">
                  <div className="dark-event-detail">
                    <svg className="dark-event-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span itemProp="startDate" content={`${ev.date}T${(ev.time || '19:00')}:00`}>
                      {formatGermanDate(ev.date)}
                    </span>
                  </div>

                  {ev.time && (
                    <div className="dark-event-detail">
                      <svg className="dark-event-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{ev.time} Uhr</span>
                    </div>
                  )}

                  <div className="dark-event-detail" itemProp="location" itemScope itemType="https://schema.org/Place">
                    <svg className="dark-event-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((ev.venue || '') + (ev.address ? ', ' + ev.address : ''))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dark-event-venue-link"
                      itemProp="name"
                    >
                      {ev.venue}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px', opacity: 0.6, display: 'inline' }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </a>
                    {ev.address && <meta itemProp="address" content={ev.address} />}
                  </div>
                </div>

                {ev.description && (
                  <p className="dark-event-description" itemProp="description">{ev.description}</p>
                )}

                {ev.price && (
                  <div className="dark-event-price">{ev.price}</div>
                )}
                </div>
                
                {/* Source Badge - bottom-right corner */}
                {ev.source && (
                  <div className="dark-event-source-badge">
                    {ev.source === 'rss' ? 'RSS' :
                     ev.source === 'ai' ? 'KI' :
                     ev.source === 'ra' ? 'API' :
                     ev.source === 'cache' ? 'Cache' :
                     ev.source}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* SEO Content Section */}
        <div className="seo-content-section">
          <h2>{seoContent.title}</h2>
          <p>{seoContent.description}</p>

          <h3>Warum {resolved.name}?</h3>
          <p>{seoContent.whyVisit}</p>

          <h3>Beliebte Event-Kategorien in {resolved.name}</h3>
          <ul>
            {seoContent.popularCategories.map((cat, i) => (
              <li key={i}>{cat}</li>
            ))}
          </ul>

          <h3>Häufig gestellte Fragen</h3>
          {seoContent.faq.map((item, i) => (
            <div key={i} className="seo-faq-item" itemScope itemType="https://schema.org/Question">
              <div className="seo-faq-question" itemProp="name">{item.question}</div>
              <div className="seo-faq-answer" itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                <div itemProp="text">{item.answer}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
