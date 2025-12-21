import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getWeekendNightlifeEvents } from '../../../../lib/events/queries';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: 'wien', category: 'bildung-workshops', date: 'morgen' });
}

export const dynamic = 'force-dynamic';

export default async function WienBildungWorkshopsMorgenPage() {
  try {
    const [trending, weekend, personalized, nightlife] = await Promise.all([
      getTrendingEvents({ city: 'Wien', limit: 50 }),
      getWeekendEvents({ city: 'Wien', limit: 30 }),
      getPersonalizedEvents({ city: 'Wien', limit: 500 }),
      getWeekendNightlifeEvents({ city: 'Wien' }),
    ]);

    const sorted = {
      trending: sortEventsWithImagesFirstThenByDate(trending),
      weekend: sortEventsWithImagesFirstThenByDate(weekend),
      personalized: sortEventsWithImagesFirstThenByDate(personalized),
    };

    return (
      <DiscoveryClient
        initialTrendingEvents={sorted.trending}
        initialWeekendEvents={sorted.weekend}
        initialPersonalizedEvents={sorted.personalized}
        initialWeekendNightlifeEvents={nightlife}
        city="Wien"
        initialDateFilter="morgen"
        initialCategory="Bildung & Workshops"
      />
    );
  } catch (error) {
    console.error('Error in WienBildungWorkshopsMorgenPage:', error);
    return (
      <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city="Wien"
        initialDateFilter="morgen"
        initialCategory="Bildung & Workshops"
      />
    );
  }
}
