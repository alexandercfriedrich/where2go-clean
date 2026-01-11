/**
 * Trending Page - Popular Events
 */

import { Metadata } from 'next';
import { getTrendingEvents } from '../../../lib/events/queries';
import { TrendingClient } from './TrendingClient';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventListSchema } from '@/lib/schemaOrg';
import EventListSSR from '@/components/EventListSSR';

export const metadata: Metadata = {
  title: 'Trending Now - Popular Events | Where2Go',
  description: 'Discover the most popular and trending events everyone is talking about',
};

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

export default async function TrendingPage({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const city = searchParams.city || 'Wien';
  
  let events: any[] = [];
  try {
    events = await getTrendingEvents({ city, limit: 100 });
  } catch (error) {
    console.error('Error fetching trending events:', error);
  }

  // Transform database events to EventData format for schema generation
  const eventsForSchema = events.slice(0, 100).map((e: any) => ({
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
          <h1 className="text-3xl font-bold mb-8">Trending Events in {city}</h1>
          <EventListSSR events={events} city={city} limit={100} />
        </div>
      </noscript>
      
      {/* Hidden Server-Rendered Content for AI Crawlers */}
      <div className="sr-only" data-crawler-visible="true">
        <h2>Trending Events for AI Crawlers and Search Engines</h2>
        <EventListSSR events={events} city={city} limit={100} />
      </div>
      
      {/* Client-Side Interactive Component */}
      <TrendingClient initialEvents={events} city={city} />
    </>
  );
}
