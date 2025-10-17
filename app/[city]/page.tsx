import Link from 'next/link';
import SchemaOrg from '@/components/SchemaOrg';
import Breadcrumb from '@/components/Breadcrumb';
import { generateEventListSchema, generateEventMicrodata, generateCanonicalUrl } from '@/lib/schemaOrg';
import { resolveCityFromParam, dateTokenToISO, formatGermanDate } from '@/lib/city';
import { getRevalidateFor } from '@/lib/isr';
import { getActiveHotCities, slugify as slugifyCity } from '@/lib/hotCityStore';
import { getDayEvents, isEventValidNow } from '@/lib/dayCache';
import { eventsCache } from '@/lib/cache';
import { eventAggregator } from '@/lib/aggregator';
import { EVENT_CATEGORIES, normalizeCategory } from '@/lib/eventCategories';
import { generateCitySEO } from '@/lib/seoContent';
import type { EventData } from '@/lib/types';

async function fetchEvents(city: string, dateISO: string, category: string | null = null): Promise<EventData[]> {
  try {
    console.log(`[fetchEvents] Direct call: city=${city}, date=${dateISO}, category=${category}`);
    
    // Direct call to cache logic (no HTTP request needed for SSG)
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

// SSG: Generate static params for all cities
export async function generateStaticParams() {
  const cities = await getActiveHotCities();
  return cities.map(city => ({
    city: slugifyCity(city.name)
  }));
}

// Enable ISR with revalidation
export async function generateMetadata({ params }: { params: { city: string } }) {
  const resolved = await resolveCityFromParam(params.city);
  if (!resolved) return {};
  
  return {
    title: `Events in ${resolved.name} | Where2Go`,
    description: `Entdecke Events in ${resolved.name}`,
  };
}

export const revalidate = 900; // Revalidate every 15 minutes

export default async function CityPage({ params }: { params: { city: string } }) {
  const resolved = await resolveCityFromParam(params.city);
  if (!resolved) {
    return <div style={{ padding: 24 }}>Unbekannte Stadt.</div>;
  }

  const dateISO = dateTokenToISO('heute');
  const events = await fetchEvents(resolved.name, dateISO);
  const listSchema = generateEventListSchema(events, resolved.name, dateISO, 'https://www.where2go.at');
  const seoContent = generateCitySEO(resolved.name);

  const breadcrumbItems = [
    { label: resolved.name, href: `/${resolved.slug}` }
  ];

  return (
    <div style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)', minHeight: '100vh', padding: '24px 16px' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <SchemaOrg schema={listSchema} />
        <Breadcrumb items={breadcrumbItems} />

        <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#FFFFFF', marginBottom: '24px' }}>
          Events in {resolved.name}
        </h1>

        <nav className="mb-6" aria-label="Zeitraum">
          <ul style={{ display: 'flex', gap: 12, listStyle: 'none', padding: 0, margin: '0 0 24px 0', flexWrap: 'wrap' }}>
            <li>
              <Link 
                href={`/${resolved.slug}/heute`} 
                style={{ 
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: '#4A90E2',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              >
                Heute
              </Link>
            </li>
            <li>
              <Link 
                href={`/${resolved.slug}/morgen`}
                style={{ 
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              >
                Morgen
              </Link>
            </li>
            <li>
              <Link 
                href={`/${resolved.slug}/wochenende`}
                style={{ 
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
              >
                Wochenende
              </Link>
            </li>
          </ul>
        </nav>

        <p style={{ color: '#AAAAAA', marginBottom: '32px', fontSize: '15px' }}>
          {formatGermanDate(dateISO)} • {events.length} Events gefunden
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {events.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: '#888', fontSize: '16px' }}>Für heute sind keine Events verfügbar.</p>
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
                {ev.imageUrl && <meta itemProp="image" content={ev.imageUrl} />}

                {ev.category && (
                  <div className="dark-event-category">{ev.category}</div>
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
                    <span itemProp="name">{ev.venue}</span>
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
