/**
 * Discovery Homepage - Main Page Component
 * Server Component for initial data fetching
 */

import { Metadata } from 'next';
import DiscoveryClient from './DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents } from '../../lib/events/queries';

export const metadata: Metadata = {
  title: 'Discover Events in Wien | Where2Go',
  description: 'Discover personalized events, trending happenings, and weekend activities in Wien',
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
