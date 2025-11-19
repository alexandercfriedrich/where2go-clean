/**
 * Discovery Homepage - Main Page Component
 * Server Component for initial data fetching
 */

import { Metadata } from 'next';
import DiscoveryClient from './DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents } from '../../lib/events/queries';
import { discoverPageMetadata } from '../lib/content/discoverPageContent';

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

export default async function DiscoverPage() {
  // Fetch initial data server-side
  const city = 'Wien';
  
  try {
    const [trendingEvents, weekendEvents, personalizedEvents] = await Promise.all([
      getTrendingEvents({ city, limit: 12 }),
      getWeekendEvents({ city, limit: 8 }),
      getPersonalizedEvents({ city, limit: 20 }),
    ]);

    return (
      <DiscoveryClient
        initialTrendingEvents={trendingEvents}
        initialWeekendEvents={weekendEvents}
        initialPersonalizedEvents={personalizedEvents}
        city={city}
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
        city={city}
      />
    );
  }
}
