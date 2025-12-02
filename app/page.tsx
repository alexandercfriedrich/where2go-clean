/**
 * Main Homepage - Discovery Experience
 * Server Component for initial data fetching
 */

import { Metadata } from 'next';
import DiscoveryClient from './discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getUpcomingEvents, convertToEventData } from '../lib/events/queries';
import { discoverPageMetadata } from './lib/content/discoverPageContent';
import SchemaOrg from './components/SchemaOrg';
import { generateEventListSchema, generateBreadcrumbSchema } from './lib/schemaOrg';
import type { EventData } from './lib/types';

export const metadata: Metadata = {
  title: discoverPageMetadata.title,
  description: discoverPageMetadata.description,
  keywords: discoverPageMetadata.keywords,
  alternates: {
    canonical: 'https://www.where2go.at',
    languages: {
      'de-AT': 'https://www.where2go.at',
    },
  },
  openGraph: {
    title: discoverPageMetadata.openGraph.title,
    description: discoverPageMetadata.openGraph.description,
    locale: discoverPageMetadata.openGraph.locale,
    type: discoverPageMetadata.openGraph.type,
    siteName: discoverPageMetadata.openGraph.siteName,
    url: 'https://www.where2go.at',
    images: [
      {
        url: 'https://www.where2go.at/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Where2Go - Entdecke Events in Wien',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: discoverPageMetadata.openGraph.title,
    description: discoverPageMetadata.openGraph.description,
    images: ['https://www.where2go.at/og-image.jpg'],
  },
  other: {
    'geo.region': 'AT-9',
    'geo.placename': 'Wien',
    'geo.position': '48.2082;16.3738',
    'ICBM': '48.2082, 16.3738',
  },
};

export default async function HomePage() {
  // Fetch initial data server-side
  const city = 'Wien';
  
  try {
    const [trendingEvents, weekendEvents, personalizedEvents, upcomingEvents] = await Promise.all([
      getTrendingEvents({ city, limit: 12 }),
      getWeekendEvents({ city, limit: 8 }),
      getPersonalizedEvents({ city, limit: 20 }),
      getUpcomingEvents(7, { city, limit: 100 }),
    ]);

    // Convert upcoming events from Supabase format to EventData format
    // Filter out null values (events without slugs are excluded)
    const upcomingEventsData = upcomingEvents
      .map(convertToEventData)
      .filter((event): event is EventData => event !== null);
    
    // Generate schemas
    const today = new Date().toISOString().split('T')[0];
    const eventListSchema = generateEventListSchema(upcomingEventsData, city, today);
    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Discover Events', url: '/discover' },
    ]);

    return (
      <>
        <SchemaOrg schema={eventListSchema} />
        <SchemaOrg schema={breadcrumbSchema} />
        <DiscoveryClient
          initialTrendingEvents={trendingEvents}
          initialWeekendEvents={weekendEvents}
          initialPersonalizedEvents={personalizedEvents}
          city={city}
        />
      </>
    );
  } catch (error) {
    console.error('Error fetching discovery data:', error);
    
    // Fallback to client-side only
    return (
      <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        city={city}
      />
    );
  }
}
