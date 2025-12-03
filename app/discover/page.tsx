/**
 * Discovery Homepage - Main Page Component
 * Server Component for initial data fetching
 */

import { Metadata } from 'next';
import DiscoveryClient from './DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getWeekendNightlifeEvents } from '../../lib/events/queries';
import { discoverPageMetadata } from '../lib/content/discoverPageContent';

// Force dynamic rendering to always fetch fresh event data
export const dynamic = 'force-dynamic';

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

    return (
      <DiscoveryClient
        initialTrendingEvents={trendingEvents}
        initialWeekendEvents={weekendEvents}
        initialPersonalizedEvents={personalizedEvents}
        initialWeekendNightlifeEvents={weekendNightlifeEvents}
        city={city}
        initialDateFilter={initialDateFilter}
      />
    );
  } catch (error) {
    console.error('Error fetching discovery data:', error);
    
    // Fallback to client-side only
    return (
      <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city={city}
        initialDateFilter={initialDateFilter}
      />
    );
  }
}
