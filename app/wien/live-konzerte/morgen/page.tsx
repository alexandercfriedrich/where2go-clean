import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getWeekendNightlifeEvents, getUpcomingEvents } from '../../../../lib/events/queries';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventListSchema } from '@/lib/schemaOrg';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: 'wien', category: 'live-konzerte', date: 'morgen' });
}

export const dynamic = 'force-dynamic';

export default async function WienLiveKonzerteMorgenPage() {
  try {
    const [trending, weekend, personalized, nightlife, upcoming] = await Promise.all([
      getTrendingEvents({ city: 'Wien', limit: 50 }),
      getWeekendEvents({ city: 'Wien', limit: 30 }),
      getPersonalizedEvents({ city: 'Wien', limit: 500 }),
      getWeekendNightlifeEvents({ city: 'Wien' }),
      getUpcomingEvents(7, { city: 'Wien', limit: 100 }),
    ]);

    const sorted = {
      trending: sortEventsWithImagesFirstThenByDate(trending),
      weekend: sortEventsWithImagesFirstThenByDate(weekend),
      personalized: sortEventsWithImagesFirstThenByDate(personalized),
    };

    const schema = generateEventListSchema(
      upcoming.map((e: any) => ({ ...e, date: e.start_date_time?.split('T')[0] || '' })),
      'Wien',
      new Date().toISOString().split('T')[0]
    );

    return (
      <>        <Breadcrumbs items={[{ label: 'Wien', href: '/wien' }, { label: 'Live-Konzerte', href: '/wien/live-konzerte' }, { label: 'Morgen', href: '/wien/live-konzerte/morgen' }]} />

        <SchemaOrg schema={schema} />
        <DiscoveryClient
          initialTrendingEvents={sorted.trending}
          initialWeekendEvents={sorted.weekend}
          initialPersonalizedEvents={sorted.personalized}
          initialWeekendNightlifeEvents={nightlife}
          city="Wien"
          initialDateFilter="morgen"
          initialCategory="Live-Konzerte"
        />

      </>
    );
  } catch (error) {
    console.error('Error in WienLiveKonzerteMorgenPage:', error);
    return (
      <>
        <Breadcrumbs items={[{ label: 'Wien', href: '/wien' }, { label: 'Live-Konzerte', href: '/wien/live-konzerte' }, { label: 'Morgen', href: '/wien/live-konzerte/morgen' }]} />
        <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city="Wien"
        initialDateFilter="morgen"
        initialCategory="Live-Konzerte"
      />
      </>
    );
  }
}
