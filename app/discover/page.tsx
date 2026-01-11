/**
 * Discovery Homepage - Main Page Component
 * Server Component for initial data fetching
 */

import { Metadata } from 'next';
import DiscoveryClient from './DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getWeekendNightlifeEvents } from '../../lib/events/queries';
import { discoverPageMetadata } from '../lib/content/discoverPageContent';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventListSchema } from '@/lib/schemaOrg';
import EventListSSR from '@/components/EventListSSR';

// Force dynamic rendering to always fetch fresh event data
export const dynamic = 'force-dynamic';

/**
 * Helper function to extract time from ISO datetime string
 */
function extractTime(isoString: string): string {
  try {
    const timeMatch = isoString.match(/T(\d{2}:\d{2})/);
    return timeMatch ? timeMatch[1] : '00:00';
  } catch {
    return '00:00';
  }
}

export const metadata: Metadata = {
  title: discoverPageMetadata.title,
  description: discoverPageMetadata.description,
  keywords: discoverPageMetadata.keywords,
  alternates: {
    canonical: 'https://www.where2go.at/discover',
    languages: {
      'de-AT': 'https://www.where2go.at/discover',
    },
  },
  openGraph: {
    title: discoverPageMetadata.openGraph.title,
    description: discoverPageMetadata.openGraph.description,
    locale: discoverPageMetadata.openGraph.locale,
    type: discoverPageMetadata.openGraph.type,
    siteName: discoverPageMetadata.openGraph.siteName,
    url: 'https://www.where2go.at/discover',
  },
  other: {
    'geo.region': 'AT-9',
    'geo.placename': 'Wien',
    'geo.position': '48.2082;16.3738',
    'ICBM': '48.2082, 16.3738',
  },
};

interface PageProps {
  searchParams: Promise<{ city?: string; date?: string }>;
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  // Await searchParams (Next.js 15 requires this)
  const params = await searchParams;
  
  // Get city and date filter from URL params
  const city = params.city || 'Wien';
  const initialDateFilter = params.date || 'all';
  
  try {
    const [trendingEvents, weekendEvents, personalizedEvents, weekendNightlifeEvents] = await Promise.all([
      getTrendingEvents({ city, limit: 50 }), // Increased limit for better filtering
      getWeekendEvents({ city, limit: 30 }),
      getPersonalizedEvents({ city, limit: 100 }), // Increased for 30-day range
      getWeekendNightlifeEvents({ city }),
    ]);

    // Log weekend nightlife results for debugging
    console.log('[DiscoverPage] Weekend nightlife events fetched:', {
      friday: weekendNightlifeEvents.friday.length,
      saturday: weekendNightlifeEvents.saturday.length,
      sunday: weekendNightlifeEvents.sunday.length,
      total: weekendNightlifeEvents.friday.length + weekendNightlifeEvents.saturday.length + weekendNightlifeEvents.sunday.length,
    });

    // Combine all events for JSON-LD schema (prioritize personalized events)
    const allEvents = [...personalizedEvents, ...trendingEvents, ...weekendEvents];
    
    // Transform database events to EventData format for schema generation
    const eventsForSchema = allEvents.slice(0, 100).map((e: any) => ({
      ...e,
      date: e.start_date_time?.split('T')[0] || new Date().toISOString().split('T')[0],
      time: e.start_date_time ? extractTime(e.start_date_time) : '00:00',
      venue: e.custom_venue_name || e.venue || 'Veranstaltungsort',
      price: e.is_free ? 'Gratis' : (e.price_min ? `Ab ${e.price_min}€` : e.price || 'Preis auf Anfrage'),
      website: e.website || 'https://www.where2go.at/discover',
      address: e.full_address || e.address || '',
      description: e.description || `${e.title} - Veranstaltung in ${city}`,
      bookingLink: e.website || '',
      city: city,
    }));

    // Generate Schema.org structured data for AI crawlers and search engines
    const schema = generateEventListSchema(
      eventsForSchema,
      city,
      new Date().toISOString().split('T')[0]
    );

    return (
      <>
        <SchemaOrg schema={schema} />
        
        {/* Server-Rendered Event List - Visible to AI Crawlers */}
        <noscript>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold mb-8">Events in {city}</h1>
            <EventListSSR events={allEvents} city={city} limit={100} />
          </div>
        </noscript>
        
        {/* Hidden Server-Rendered Content for AI Crawlers (with display:none removed by crawler) */}
        <div className="sr-only" data-crawler-visible="true">
          <h2>All Events for AI Crawlers and Search Engines</h2>
          <EventListSSR events={allEvents} city={city} limit={100} />
        </div>
        
        {/* Client-Side Interactive Component */}
        <DiscoveryClient
          initialTrendingEvents={trendingEvents}
          initialWeekendEvents={weekendEvents}
          initialPersonalizedEvents={personalizedEvents}
          initialWeekendNightlifeEvents={weekendNightlifeEvents}
          city={city}
          initialDateFilter={initialDateFilter}
        />
      </>
    );
  } catch (error) {
    console.error('Error fetching discovery data:', error);
    
    // Fallback to client-side only with minimal schema
    const emptySchema = generateEventListSchema([], city, new Date().toISOString().split('T')[0]);
    
    return (
      <>
        <SchemaOrg schema={emptySchema} />
        <DiscoveryClient
          initialTrendingEvents={[]}
          initialWeekendEvents={[]}
          initialPersonalizedEvents={[]}
          initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
          city={city}
          initialDateFilter={initialDateFilter}
        />
      </>
    );
  }
}
