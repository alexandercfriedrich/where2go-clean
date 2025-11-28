import Link from 'next/link';
import SchemaOrg from '@/components/SchemaOrg';
import Breadcrumb from '@/components/Breadcrumb';
import { TLDRBox } from '@/components/TLDRBox';
import { FAQSection } from '@/components/FAQSection';
import { generateEventListSchema, generateEventMicrodata, generateCanonicalUrl } from '@/lib/schemaOrg';
import { resolveCityFromParam, dateTokenToISO, formatGermanDate } from '@/lib/city';
import { getRevalidateFor } from '@/lib/isr';
import { EventRepository } from '@/lib/repositories/EventRepository';
import { normalizeCategory, EVENT_CATEGORY_SUBCATEGORIES } from '@/lib/eventCategories';
import { generateCitySEO } from '@/lib/seoContent';
import { getCityContent } from '@/data/cityContent';
import type { EventData } from '@/lib/types';

// Mark as dynamic for fresh data on each request
export const dynamic = 'force-dynamic';

/**
 * Fetch events directly from Supabase (single source of truth)
 * This replaces the previous Upstash cache-based approach for better consistency
 */
async function fetchEvents(city: string, dateISO: string, category: string | null = null): Promise<EventData[]> {
  try {
    console.log(`[fetchEvents] Supabase direct: city=${city}, date=${dateISO}, category=${category}`);
    
    // Parse requested categories
    const requestedCategories = category
      ? Array.from(new Set(
          category.split(',')
            .map(c => c.trim())
            .filter(Boolean)
            .map(c => normalizeCategory(c))
        ))
      : null;

    // Fetch events directly from Supabase
    // If category is specified, fetch only that category; otherwise fetch all
    const singleCategory = requestedCategories && requestedCategories.length === 1 
      ? requestedCategories[0] 
      : undefined;

    const allEvents = await EventRepository.getEvents({
      city,
      date: dateISO,
      category: singleCategory,
      limit: 500 // Reasonable limit for a day's events
    });

    // Filter by multiple requested categories if more than one
    let filteredEvents = allEvents;
    if (requestedCategories && requestedCategories.length > 1) {
      filteredEvents = allEvents.filter(event => {
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

export default async function CityPage({ params }: { params: { city: string } }) {
  // Disable strict mode by default - allow any city name (filtered by middleware)
  const strictMode = process.env.CITY_STRICT_MODE === 'true'; // Default to non-strict
  const resolved = await resolveCityFromParam(params.city, strictMode);
  if (!resolved) {
    return <div style={{ padding: 24 }}>Unbekannte Stadt.</div>;
  }

  const dateISO = dateTokenToISO('heute');
  const events = await fetchEvents(resolved.name, dateISO);
  const listSchema = generateEventListSchema(events, resolved.name, dateISO, 'https://www.where2go.at');
  const seoContent = generateCitySEO(resolved.name);
  const cityContent = getCityContent(resolved.name);

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

        {/* Category Filter Row */}
        <div style={{ marginBottom: '24px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', gap: '10px', paddingBottom: '8px', minWidth: 'min-content' }}>
            {/* "Alle Events anzeigen" button - always active on base city page */}
            <Link
              href={`/${resolved.slug}/heute`}
              style={{
                padding: '8px 16px',
                background: '#404040',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                color: '#ffffff',
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
              
              const isDisabled = count === 0;
              
              return (
                <Link
                  key={cat}
                  href={isDisabled ? '#' : `/${resolved.slug}/${catSlug}/heute`}
                  style={{
                    padding: '8px 16px',
                    background: '#f5f5f5',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: isDisabled ? '#9ca3af' : '#374151',
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
                    href={`/${resolved.slug}/${ev.category.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\//g, '-').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')}/heute`}
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

        {/* City Intro Content Section */}
        <div style={{ marginTop: '48px', marginBottom: '48px' }}>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: 700, 
            color: '#FFFFFF', 
            marginBottom: '20px' 
          }}>
            Was macht {resolved.name} besonders für Events?
          </h2>
          <p style={{ 
            fontSize: '16px', 
            lineHeight: '1.8', 
            color: 'rgba(255, 255, 255, 0.85)', 
            marginBottom: '24px' 
          }}>
            {cityContent.intro}
          </p>

          <TLDRBox
            title={`${resolved.name} Event-Highlights`}
            items={cityContent.highlights}
          />

          <FAQSection 
            faqs={cityContent.faqs} 
            title={`Häufige Fragen zu Events in ${resolved.name}`}
          />
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
