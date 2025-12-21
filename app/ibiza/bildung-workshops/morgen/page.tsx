import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getWeekendNightlifeEvents, getUpcomingEvents } from '../../../../lib/events/queries';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventListSchema } from '@/lib/schemaOrg';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: 'ibiza', category: 'bildung-workshops', date: 'morgen' });
}

export const dynamic = 'force-dynamic';

export default async function IbizaBildungWorkshopsMorgenPage() {
  try {
    const [trending, weekend, personalized, nightlife, upcoming] = await Promise.all([
      getTrendingEvents({ city: 'Ibiza', limit: 50 }),
      getWeekendEvents({ city: 'Ibiza', limit: 30 }),
      getPersonalizedEvents({ city: 'Ibiza', limit: 500 }),
      getWeekendNightlifeEvents({ city: 'Ibiza' }),
      getUpcomingEvents(7, { city: 'Ibiza', limit: 100 }),
    ]);

    const sorted = {
      trending: sortEventsWithImagesFirstThenByDate(trending),
      weekend: sortEventsWithImagesFirstThenByDate(weekend),
      personalized: sortEventsWithImagesFirstThenByDate(personalized),
    };

    const schema = generateEventListSchema(
      upcoming.map((e: any) => ({ ...e, date: e.start_date_time?.split('T')[0] || '' })),
      'Ibiza',
      new Date().toISOString().split('T')[0]
    );

    return (
      <>
        <SchemaOrg schema={schema} />
        <DiscoveryClient
          initialTrendingEvents={sorted.trending}
          initialWeekendEvents={sorted.weekend}
          initialPersonalizedEvents={sorted.personalized}
          initialWeekendNightlifeEvents={nightlife}
          city="Ibiza"
          initialDateFilter="morgen"
          initialCategory="Bildung & Workshops"
        />
      </>
    );
  } catch (error) {
    console.error('Error in IbizaBildungWorkshopsMorgenPage:', error);
    return (
      <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city="Ibiza"
        initialDateFilter="morgen"
        initialCategory="Bildung & Workshops"
      />
    );
  }
}
