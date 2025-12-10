/**
 * City Discovery Page - Shows full discovery experience for each city
 * This page should look exactly like the homepage but for the specific city
 */

import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getUpcomingEvents, getWeekendNightlifeEvents, convertToEventData } from '../../lib/events/queries';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventListSchema, generateBreadcrumbSchema } from '@/lib/schemaOrg';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { resolveCityFromParam } from '@/lib/city';
import type { EventData } from '@/lib/types';

// Mark as dynamic for fresh data on each request
export const dynamic = 'force-dynamic';

interface PageProps {
  params: { city: string };
  searchParams: Promise<{ date?: string }>;
}

export default async function CityPage({ params, searchParams }: PageProps) {
  // Disable strict mode by default - allow any city name (filtered by middleware)
  const strictMode = process.env.CITY_STRICT_MODE === 'true';
  const resolved = await resolveCityFromParam(params.city, strictMode);
  
  if (!resolved) {
    return <div style={{ padding: 24 }}>Unbekannte Stadt.</div>;
  }

  // Await searchParams (Next.js 15 requires this)
  const urlParams = await searchParams;
  const initialDateFilter = urlParams.date || 'all';
  
  try {
    // Fetch the same data as homepage for full discovery experience
    const [trendingEvents, weekendEvents, personalizedEvents, weekendNightlifeEvents, upcomingEvents] = await Promise.all([
      getTrendingEvents({ city: resolved.name, limit: 50 }),
      getWeekendEvents({ city: resolved.name, limit: 30 }),
      getPersonalizedEvents({ city: resolved.name, limit: 500 }),
      getWeekendNightlifeEvents({ city: resolved.name }),
      getUpcomingEvents(7, { city: resolved.name, limit: 100 }),
    ]);

    // Convert upcoming events from Supabase format to EventData format
    const upcomingEventsData = upcomingEvents
      .map(convertToEventData)
      .filter((event): event is EventData => event !== null);
    
    // Sort all events to prioritize those with images
    const sortedTrendingEvents = sortEventsWithImagesFirstThenByDate(trendingEvents);
    const sortedWeekendEvents = sortEventsWithImagesFirstThenByDate(weekendEvents);
    const sortedPersonalizedEvents = sortEventsWithImagesFirstThenByDate(personalizedEvents);
    
    // Generate schemas
    const today = new Date().toISOString().split('T')[0];
    const eventListSchema = generateEventListSchema(upcomingEventsData, resolved.name, today);
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: resolved.name, url: `/${resolved.slug}` },
    ]);

    return (
      <>
        <SchemaOrg schema={eventListSchema} />
        <SchemaOrg schema={breadcrumbSchema} />
        <DiscoveryClient
          initialTrendingEvents={sortedTrendingEvents}
          initialWeekendEvents={sortedWeekendEvents}
          initialPersonalizedEvents={sortedPersonalizedEvents}
          initialWeekendNightlifeEvents={weekendNightlifeEvents}
          city={resolved.name}
          initialDateFilter={initialDateFilter}
        />
      </>
    );
  } catch (error) {
    console.error('Error fetching city discovery data:', error);
    
    // Fallback to client-side only
    return (
      <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city={resolved.name}
        initialDateFilter={initialDateFilter}
      />
    );
  }
}
