import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getWeekendNightlifeEvents } from '@/lib/events/queries';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: 'ibiza', category: 'film-kino', date: 'wochenende' });
}

export const dynamic = 'force-dynamic';

export default async function IbizaFilmKinoWochenendePage() {
  try {
    const [trending, weekend, personalized, nightlife] = await Promise.all([
      getTrendingEvents({ city: 'Ibiza', limit: 50 }),
      getWeekendEvents({ city: 'Ibiza', limit: 30 }),
      getPersonalizedEvents({ city: 'Ibiza', limit: 500 }),
      getWeekendNightlifeEvents({ city: 'Ibiza' }),
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
        city="Ibiza"
        initialDateFilter="wochenende"
        initialCategory="Film & Kino"
      />
    );
  } catch (error) {
    console.error('Error in IbizaFilmKinoWochenendePage:', error);
    return (
      <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city="Ibiza"
        initialDateFilter="wochenende"
        initialCategory="Film & Kino"
      />
    );
  }
}
