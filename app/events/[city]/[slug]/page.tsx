/**
 * Event Detail Page
 * Dedicated page for individual events with full SEO optimization
 * Route: /events/[city]/[slug]
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { generateEventSchema, generateBreadcrumbSchema } from '@/lib/schemaOrg';
import { normalizeCitySlug } from '@/lib/slugGenerator';
import { getVenueFallbackImage } from '@/lib/venueFallbackImages';
import SchemaOrg from '@/components/SchemaOrg';
import PageSearch from '@/components/PageSearch';
import type { EventData } from '@/lib/types';
import type { Database } from '@/lib/supabase/types';

type DbEvent = Database['public']['Tables']['events']['Row'];

/**
 * Compact event interface for related events list
 */
interface RelatedEvent {
  id: string;
  title: string;
  slug: string | null;
  start_date_time: string;
  image_urls: string[] | null;
  city: string;
}

interface EventPageProps {
  params: {
    city: string;
    slug: string;
  };
}

// Base URL for the application
const BASE_URL = 'https://www.where2go.at';

/**
 * Convert database event to EventData format
 */
function dbEventToEventData(dbEvent: DbEvent): EventData {
  // Extract date and time from ISO timestamp
  const dateMatch = dbEvent.start_date_time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  const date = dateMatch ? dateMatch[1] : dbEvent.start_date_time.split('T')[0] || '';
  const time = dateMatch ? dateMatch[2] : '';

  // Extract end time if available
  let endTime: string | undefined;
  if (dbEvent.end_date_time) {
    const endMatch = dbEvent.end_date_time.match(/T(\d{2}:\d{2})/);
    endTime = endMatch ? endMatch[1] : undefined;
  }

  // Format price string
  let priceStr = '';
  if (dbEvent.is_free) {
    priceStr = 'Gratis';
  } else if (dbEvent.price_info) {
    priceStr = dbEvent.price_info;
  } else if (dbEvent.price_min !== null || dbEvent.price_max !== null) {
    const currency = dbEvent.price_currency || 'EUR';
    const symbol = currency === 'EUR' ? '€' : currency;
    if (dbEvent.price_min !== null && dbEvent.price_max !== null) {
      priceStr = `${symbol}${dbEvent.price_min} - ${symbol}${dbEvent.price_max}`;
    } else if (dbEvent.price_min !== null) {
      priceStr = `ab ${symbol}${dbEvent.price_min}`;
    } else if (dbEvent.price_max !== null) {
      priceStr = `bis ${symbol}${dbEvent.price_max}`;
    }
  }

  return {
    title: dbEvent.title,
    description: dbEvent.description || undefined,
    category: dbEvent.category,
    date: date,
    time: time,
    endTime: endTime,
    venue: dbEvent.custom_venue_name || '',
    address: dbEvent.custom_venue_address || undefined,
    price: priceStr,
    website: dbEvent.website_url || dbEvent.source_url || '',
    bookingLink: dbEvent.booking_url || undefined,
    source: dbEvent.source as 'cache' | 'ai' | 'rss' | 'ra' | string,
    city: dbEvent.city,
    imageUrl: dbEvent.image_urls?.[0],
    latitude: dbEvent.latitude || undefined,
    longitude: dbEvent.longitude || undefined,
  };
}

/**
 * Fetch event by city and slug, returns event with venue name for related events query
 */
async function getEventBySlug(city: string, slug: string): Promise<{ event: EventData; venueName: string | null; currentEventSlug: string } | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .ilike('city', city)  // Changed from .eq() to .ilike() for case-insensitive match
    .eq('slug', slug)
    .eq('is_cancelled', false)
    .single();

  if (error || !data) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching event:', error);
    } else {
      console.error('Error fetching event:', error?.message || 'Unknown error');
    }
    return null;
  }

  const dbEvent = data as DbEvent;
  
  return {
    event: dbEventToEventData(dbEvent),
    venueName: dbEvent.custom_venue_name,
    currentEventSlug: dbEvent.slug || ''
  };
}

/**
 * Fetch other events at the same venue
 */
async function getEventsAtSameVenue(venueName: string, city: string, currentEventSlug: string, limit: number = 5): Promise<RelatedEvent[]> {
  if (!venueName) return [];
  
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('events')
    .select('id, title, slug, start_date_time, image_urls, city')
    .eq('custom_venue_name', venueName)
    .ilike('city', city)
    .eq('is_cancelled', false)
    .neq('slug', currentEventSlug)  // Exclude current event
    .gte('start_date_time', now)    // Only future events
    .order('start_date_time', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching related events:', error?.message || 'Unknown error');
    return [];
  }

  return data || [];
}

/**
 * Format date in German format
 */
function formatGermanDate(date: string): string {
  try {
    const [year, month, day] = date.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const weekday = weekdays[dateObj.getDay()];
    return `${weekday}, ${day}.${month}.${year}`;
  } catch {
    return date;
  }
}

/**
 * Generate SEO metadata for event detail page
 */
export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const result = await getEventBySlug(params.city, params.slug);

  if (!result) {
    return {
      title: 'Event nicht gefunden | Where2Go',
    };
  }

  const event = result.event;
  const title = `${event.title} | ${event.venue} ${event.city}`;
  const description = event.description 
    ? event.description.substring(0, 155) + '...'
    : `${event.title} am ${formatGermanDate(event.date)}${event.time ? ` um ${event.time} Uhr` : ''} im ${event.venue}. Alle Infos und Tickets.`;

  // Get image URL with venue fallback for OpenGraph
  const imageUrl = event.imageUrl || getVenueFallbackImage(event.venue);

  return {
    title: title,
    description: description,
    keywords: [event.category, event.city, event.venue, 'Events', 'Veranstaltungen'].join(', '),
    openGraph: {
      title: event.title,
      description: description,
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630 }] : [],
      locale: 'de_AT',
      type: 'website',
      siteName: 'Where2Go',
    },
    alternates: {
      canonical: `${BASE_URL}/events/${params.city}/${params.slug}`,
    },
    other: {
      'geo.region': 'AT-9',
      'geo.placename': event.city || 'Wien',
    },
  };
}

/**
 * Generate static params for popular events
 * This enables static site generation for frequently accessed events
 */
export async function generateStaticParams() {
  try {
    const { data } = await supabase
      .from('events')
      .select('city, slug')
      .gte('start_date_time', new Date().toISOString())
      .eq('is_cancelled', false)
      .not('slug', 'is', null)
      .order('popularity_score', { ascending: false })
      .order('start_date_time', { ascending: true })
      .limit(100);

    if (!data) return [];
    
    return data
      .filter((e: { city: string; slug: string | null }) => e.slug !== null)
      .map((e: { city: string; slug: string | null }) => ({
        city: normalizeCitySlug(e.city),  // Normalize city name for URL consistency
        slug: e.slug as string
      }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

/**
 * Event Detail Page Component
 */
export default async function EventPage({ params }: EventPageProps) {
  const result = await getEventBySlug(params.city, params.slug);

  if (!result) {
    return notFound();
  }

  const { event, venueName, currentEventSlug } = result;
  
  // Fetch related events at the same venue
  const relatedEvents = await getEventsAtSameVenue(venueName || '', params.city, currentEventSlug);

  // Generate Schema.org structured data
  const eventSchema = generateEventSchema(event, BASE_URL);
  const citySlug = normalizeCitySlug(params.city);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Events', url: '/discover' },
    { name: params.city, url: `/${citySlug}` },
    { name: event.title, url: `/events/${params.city}/${params.slug}` },
  ], BASE_URL);

  return (
    <>
      <SchemaOrg schema={eventSchema} />
      <SchemaOrg schema={breadcrumbSchema} />
      
      <div className="min-h-screen text-white" style={{ backgroundColor: '#091717' }}> {/* Offblack background */}
        {/* Navigation with Search */}
        <div className="border-b" style={{ borderColor: '#2E565D' }}> {/* Teal Medium border */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 transition-colors hover:opacity-80"
                style={{ color: '#BADFDE' }} /* Sky color */
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                <span style={{ color: '#FCFAF6' }}>Zurück zur Übersicht</span> {/* Paper White */}
              </Link>
              
              {/* Search Bar */}
              <div className="flex-1 max-w-md ml-auto">
                <PageSearch />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section with Gradient */}
        <div style={{ background: 'linear-gradient(to bottom, #13343B, #091717)' }}> {/* Teal Dark to Offblack */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#FCFAF6' }}>{event.title}</h1>
            
            {/* Breadcrumb */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#BADFDE', marginBottom: '16px' }}> {/* Sky color */}
              <Link href="/" style={{ color: '#BADFDE', textDecoration: 'none' }}>Home</Link>
              <span>/</span>
              <Link href="/discover" style={{ color: '#BADFDE', textDecoration: 'none' }}>Events</Link>
              <span>/</span>
              <Link href={`/${citySlug}`} style={{ color: '#BADFDE', textDecoration: 'none' }}>{event.city}</Link>
              <span>/</span>
              <span style={{ color: '#FCFAF6' }}>{event.title}</span>
            </nav>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Event Card */}
          <article 
            itemScope 
            itemType="https://schema.org/Event"
            style={{ 
              background: '#13343B', /* Teal Dark for card */
              border: '1px solid #2E565D', /* Teal Medium border */
              borderRadius: '16px',
              overflow: 'hidden'
            }}
          >
            {/* Event Image - Using Next.js Image to avoid hotlinking issues */}
            {event.imageUrl && (
              <div style={{ position: 'relative', width: '100%', height: '400px' }}>
                <Image 
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  priority
                  unoptimized // Allow external images without configuration
                />
                <meta itemProp="image" content={event.imageUrl} />
              </div>
            )}
            
            <div style={{ padding: '32px' }}>
              {/* Category Badge */}
              {event.category && (
                <div style={{ 
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: '#091717', /* Offblack in dark mode */
                  color: '#20B8CD',
                  borderRadius: '8px',
                  border: '1px solid #2E565D',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '16px'
                }}>
                  {event.category}
                </div>
              )}
              
              {/* Event Title */}
              <h1 
                itemProp="name"
                style={{ 
                  fontSize: '36px', 
                  fontWeight: 700, 
                  color: '#FCFAF6', 
                  marginBottom: '24px',
                  lineHeight: 1.2
                }}
              >
                {event.title}
              </h1>
              
              {/* Event Meta Information */}
              <div style={{ 
                display: 'grid', 
                gap: '20px', 
                marginBottom: '32px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'
              }}>
                {/* Date & Time */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '12px',
                  padding: '16px',
                  background: '#091717',
                  borderRadius: '8px',
                  border: '1px solid #2E565D'
                }}>
                  <svg width="24" height="24" fill="none" stroke="#20B8CD" viewBox="0 0 24 24" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: '12px', color: '#BADFDE', marginBottom: '4px' }}>Datum & Uhrzeit</div>
                    <div style={{ color: '#FCFAF6', fontWeight: 600 }}>
                      <span itemProp="startDate" content={`${event.date}T${event.time || '00:00'}:00`}>
                        {formatGermanDate(event.date)}
                      </span>
                    </div>
                    {event.time && event.time !== '00:00' && (
                      <div style={{ color: '#FCFAF6', fontSize: '14px' }}>
                        {event.time} Uhr
                        {event.endTime && ` - ${event.endTime} Uhr`}
                      </div>
                    )}
                    {(!event.time || event.time === '00:00') && (
                      <div style={{ color: '#FCFAF6', fontSize: '14px' }}>
                        ganztags
                      </div>
                    )}
                    {event.endTime && <meta itemProp="endDate" content={`${event.date}T${event.endTime}:00`} />}
                  </div>
                </div>
                
                {/* Location */}
                <div 
                  itemProp="location" 
                  itemScope 
                  itemType="https://schema.org/Place"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px',
                    padding: '16px',
                    background: '#091717',
                    borderRadius: '8px',
                  border: '1px solid #2E565D'
                  }}
                >
                  <svg width="24" height="24" fill="none" stroke="#20B8CD" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: '12px', color: '#BADFDE', marginBottom: '4px' }}>Location</div>
                    <div style={{ color: '#FCFAF6', fontWeight: 600 }} itemProp="name">
                      {event.venue}
                    </div>
                    {event.address && (
                      <>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                          {event.address}
                        </div>
                        <meta itemProp="address" content={event.address} />
                      </>
                    )}
                    {(event.latitude && event.longitude) && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          color: '#20B8CD', 
                          fontSize: '14px',
                          textDecoration: 'none',
                          marginTop: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Auf Karte anzeigen
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
                
                {/* Price */}
                {event.price && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px',
                    padding: '16px',
                    background: '#091717',
                    borderRadius: '8px',
                  border: '1px solid #2E565D'
                  }}>
                    <svg width="24" height="24" fill="none" stroke="#20B8CD" viewBox="0 0 24 24" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <div>
                      <div style={{ fontSize: '12px', color: '#BADFDE', marginBottom: '4px' }}>Preis</div>
                      <div style={{ color: '#FCFAF6', fontWeight: 600 }}>
                        {event.price}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Description */}
              {event.description && (
                <div style={{ marginBottom: '32px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#FCFAF6', marginBottom: '12px' }}>
                    Über dieses Event
                  </h2>
                  <div 
                    itemProp="description"
                    style={{ 
                      color: '#FCFAF6', 
                      lineHeight: 1.6,
                      fontSize: '16px'
                    }}
                  >
                    {event.description}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {event.bookingLink && (
                  <a
                    href={event.bookingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '14px 28px',
                      background: '#20B8CD',
                      color: '#FCFAF6',
                      borderRadius: '8px',
                  border: '1px solid #2E565D',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: 600,
                      transition: 'background 0.2s'
                    }}
                  >
                    Tickets kaufen
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                )}
                
                {event.website && event.website !== event.bookingLink && (
                  <a
                    href={event.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '14px 28px',
                      background: '#13343B',
                      color: '#FCFAF6',
                      borderRadius: '8px',
                      border: '1px solid #2E565D',
                      textDecoration: 'none',
                      fontSize: '16px',
                      fontWeight: 600,
                      transition: 'background 0.2s'
                    }}
                  >
                    Mehr Informationen
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </article>
          
          {/* More Events at this Location */}
          {relatedEvents.length > 0 && event.venue && (
            <section style={{ marginTop: '32px' }}>
              <div 
                style={{ 
                  background: '#091717',
                  border: '1px solid #2E565D',
                  borderRadius: '16px',
                  padding: '24px'
                }}
              >
                <h2 style={{ 
                  fontSize: '20px', 
                  fontWeight: 700, 
                  color: '#FCFAF6', 
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="20" height="20" fill="none" stroke="#20B8CD" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Weitere Events im {event.venue}
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {relatedEvents.map((relatedEvent) => (
                    <RelatedEventRow 
                      key={relatedEvent.id} 
                      event={relatedEvent} 
                      citySlug={citySlug}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}
          
          {/* Back to Events Link */}
          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <Link 
              href="/"
              style={{ 
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: '#091717',
                color: '#FCFAF6',
                borderRadius: '8px',
                border: '1px solid #2E565D',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '16px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Alle Events in {event.city}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Format compact date for related event rows
 */
function formatCompactDate(dateTime: string): string {
  try {
    const date = new Date(dateTime);
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const weekday = weekdays[date.getDay()];
    
    // Only show time if not midnight
    const timeStr = hours === '00' && minutes === '00' ? '' : ` · ${hours}:${minutes}`;
    
    return `${weekday}, ${day}.${month}.${timeStr}`;
  } catch {
    return '';
  }
}

/**
 * Compact row component for related events at the same venue
 */
function RelatedEventRow({ event, citySlug }: { event: RelatedEvent; citySlug: string }) {
  const eventUrl = event.slug ? `/events/${citySlug}/${event.slug}` : '#';
  const imageUrl = event.image_urls?.[0];
  
  return (
    <Link 
      href={eventUrl}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '8px',
                  border: '1px solid #2E565D',
        textDecoration: 'none',
        transition: 'background 0.2s ease',
      }}
      className="hover:bg-white/10"
    >
      {/* Event Image */}
      <div 
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '8px',
                  border: '1px solid #2E565D',
          overflow: 'hidden',
          flexShrink: 0,
          background: '#13343B',
        }}
      >
        {imageUrl ? (
          <Image 
            src={imageUrl}
            alt={event.title}
            width={60}
            height={60}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div 
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" fill="none" stroke="rgba(255,255,255,0.4)" viewBox="0 0 24 24" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        )}
      </div>
      
      {/* Event Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#FCFAF6',
          marginBottom: '4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {event.title}
        </h3>
        <div style={{
          fontSize: '13px',
          color: '#BADFDE',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{formatCompactDate(event.start_date_time)}</span>
        </div>
      </div>
      
      {/* Arrow Icon */}
      <div style={{ color: 'rgba(255, 255, 255, 0.4)', flexShrink: 0 }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </Link>
  );
}
