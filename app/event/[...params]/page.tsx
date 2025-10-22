import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventSchema, generateEventMicrodata, generateCanonicalUrl } from '@/lib/schemaOrg';
import { resolveCityFromParam, formatGermanDate } from '@/lib/city';
import { getDayEvents, isEventValidNow } from '@/lib/dayCache';
import { eventsCache } from '@/lib/cache';
import { eventAggregator } from '@/lib/aggregator';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';
import type { EventData } from '@/lib/types';

// Mark as dynamic to allow Redis reads
export const dynamic = 'force-dynamic';

/**
 * Legacy event route fallback
 * Handles URLs of the shape: /event/{cityOrVenue}/{date}/{title-slug...}
 * 
 * This route preserves compatibility with old external links that may have been
 * generated before the canonical URL format was changed to city-first routing.
 */

/**
 * Attempts to find an event by matching canonical URLs or slugified titles
 */
async function findEventInList(
  events: EventData[],
  titleSegments: string[],
  baseUrl: string
): Promise<EventData | null> {
  const titleSlug = titleSegments.join('-').toLowerCase();
  
  for (const event of events) {
    // Try matching by canonical URL
    const canonical = generateCanonicalUrl(event, baseUrl);
    const canonicalSlug = canonical.split('/').pop()?.toLowerCase();
    
    if (canonicalSlug === titleSlug) {
      return event;
    }
    
    // Try matching by normalized title
    const eventTitleSlug = event.title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    if (eventTitleSlug === titleSlug) {
      return event;
    }
  }
  
  return null;
}

export default async function LegacyEventPage({ params }: { params: { params: string[] } }) {
  const p = params.params || [];
  
  // Expected format: /event/{cityOrVenue}/{date}/{title-slug...}
  // Minimum 3 segments required
  if (p.length < 3) {
    console.log('[LegacyEventPage] Invalid params length:', p.length);
    notFound();
  }
  
  const [cityParam, dateParam, ...titleSegments] = p;
  
  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    console.log('[LegacyEventPage] Invalid date format:', dateParam);
    notFound();
  }
  
  console.log('[LegacyEventPage] Resolving:', { cityParam, dateParam, titleSegments });
  
  // Try to resolve city (non-strict mode to allow fallback)
  const resolved = await resolveCityFromParam(cityParam, false);
  const cityName = resolved?.name || cityParam;
  const citySlug = resolved?.slug || cityParam.toLowerCase();
  
  const baseUrl = 'https://www.where2go.at';
  let foundEvent: EventData | null = null;
  
  // Step 1: Try to load from day-bucket cache
  const dayBucket = await getDayEvents(cityName, dateParam);
  
  if (dayBucket && dayBucket.events.length > 0) {
    const now = new Date();
    const validEvents = dayBucket.events.filter(event => isEventValidNow(event, now));
    
    foundEvent = await findEventInList(validEvents, titleSegments, baseUrl);
    console.log('[LegacyEventPage] Day-bucket search result:', foundEvent ? 'found' : 'not found');
  }
  
  // Step 2: Fallback to per-category cache if not found
  if (!foundEvent) {
    const cacheResult = await eventsCache.getEventsByCategories(cityName, dateParam, EVENT_CATEGORIES);
    
    const cachedEventsList: EventData[] = [];
    for (const cat in cacheResult.cachedEvents) {
      cachedEventsList.push(...cacheResult.cachedEvents[cat]);
    }
    
    // Deduplicate events from different category shards
    const allEvents = eventAggregator.deduplicateEvents(cachedEventsList);
    
    // Filter to valid events only
    const now = new Date();
    const validEvents = allEvents.filter(event => isEventValidNow(event, now));
    
    foundEvent = await findEventInList(validEvents, titleSegments, baseUrl);
    console.log('[LegacyEventPage] Per-category cache search result:', foundEvent ? 'found' : 'not found');
  }
  
  // If event not found and we have a resolved city, redirect to the city day listing
  if (!foundEvent) {
    if (resolved) {
      console.log('[LegacyEventPage] Event not found, redirecting to city day listing');
      redirect(`/${citySlug}/${dateParam}`);
    }
    console.log('[LegacyEventPage] Event not found, no resolved city');
    notFound();
  }
  
  // Generate canonical URL for redirect to the proper city-first route
  const canonicalUrl = generateCanonicalUrl(foundEvent, baseUrl);
  const eventSchema = generateEventSchema(foundEvent, baseUrl);
  const microdata = generateEventMicrodata(foundEvent);
  
  // Render minimal event detail page with link back to city day listing
  return (
    <div style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)', minHeight: '100vh', padding: '24px 16px' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <SchemaOrg schema={eventSchema} />
        
        {/* Notice about legacy URL */}
        <div style={{ 
          background: 'rgba(74, 144, 226, 0.1)', 
          border: '1px solid rgba(74, 144, 226, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
          color: '#AAAAAA',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0 }}>
            Sie verwenden einen veralteten Link. Die aktuelle URL für dieses Event ist:{' '}
            <Link href={canonicalUrl} style={{ color: '#4A90E2', textDecoration: 'underline' }}>
              {canonicalUrl}
            </Link>
          </p>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <Link 
            href={`/${citySlug}/${dateParam}`}
            style={{ 
              color: '#4A90E2',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Zurück zu allen Events in {cityName} am {formatGermanDate(dateParam)}
          </Link>
        </div>
        
        <div 
          className="dark-event-card" 
          {...microdata}
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '100%'
          }}
        >
          <link itemProp="url" href={canonicalUrl} />
          <meta itemProp="eventStatus" content="https://schema.org/EventScheduled" />
          <meta itemProp="eventAttendanceMode" content="https://schema.org/OfflineEventAttendanceMode" />
          
          {foundEvent.imageUrl && (
            <>
              <meta itemProp="image" content={foundEvent.imageUrl} />
              <div 
                style={{
                  width: '100%',
                  height: '300px',
                  backgroundImage: `url(${foundEvent.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '8px',
                  marginBottom: '24px'
                }}
              />
            </>
          )}
          
          {foundEvent.category && (
            <div style={{ 
              display: 'inline-block',
              padding: '6px 12px',
              background: '#4A90E2',
              color: '#FFFFFF',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '16px'
            }}>
              {foundEvent.category}
            </div>
          )}
          
          <h1 
            style={{ 
              fontSize: '32px', 
              fontWeight: 700, 
              color: '#FFFFFF', 
              marginBottom: '24px',
              lineHeight: 1.2
            }}
            itemProp="name"
          >
            {foundEvent.title}
          </h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#CCCCCC' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span itemProp="startDate" content={`${foundEvent.date}T${foundEvent.time || '19:00'}:00`}>
                {formatGermanDate(foundEvent.date)}
              </span>
            </div>
            
            {foundEvent.time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#CCCCCC' }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{foundEvent.time} Uhr</span>
              </div>
            )}
            
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#CCCCCC' }}
              itemProp="location" 
              itemScope 
              itemType="https://schema.org/Place"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((foundEvent.venue || '') + (foundEvent.address ? ', ' + foundEvent.address : ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4A90E2', textDecoration: 'none' }}
                itemProp="name"
              >
                {foundEvent.venue}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px', opacity: 0.6, display: 'inline' }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
              {foundEvent.address && <meta itemProp="address" content={foundEvent.address} />}
            </div>
          </div>
          
          {foundEvent.description && (
            <p style={{ color: '#AAAAAA', lineHeight: 1.6, marginBottom: '24px' }} itemProp="description">
              {foundEvent.description}
            </p>
          )}
          
          {foundEvent.price && (
            <div style={{ 
              display: 'inline-block',
              padding: '10px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontWeight: 600,
              marginBottom: '16px'
            }}>
              {foundEvent.price}
            </div>
          )}
          
          {foundEvent.website && (
            <div style={{ marginTop: '24px' }}>
              <a
                href={foundEvent.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: '#4A90E2',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '16px'
                }}
              >
                Mehr Informationen
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '8px', display: 'inline' }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          )}
          
          {foundEvent.source && (
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '4px 8px',
              background: 'rgba(0, 0, 0, 0.6)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#FFFFFF'
            }}>
              {foundEvent.source === 'rss' ? 'RSS' :
               foundEvent.source === 'ai' ? 'KI' :
               foundEvent.source === 'ra' ? 'API' :
               foundEvent.source === 'cache' ? 'Cache' :
               foundEvent.source}
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <Link 
            href={`/${citySlug}/${dateParam}`}
            style={{ 
              display: 'inline-block',
              padding: '12px 24px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '16px'
            }}
          >
            Alle Events in {cityName} anzeigen
          </Link>
        </div>
      </div>
    </div>
  );
}
