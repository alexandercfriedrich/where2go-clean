import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getWeekendNightlifeEvents, getUpcomingEvents } from '../../../../lib/events/queries';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventListSchema } from '@/lib/schemaOrg';
import EventListSSR from '@/components/EventListSSR';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: 'ibiza', category: 'kulinarik-maerkte', date: 'morgen' });
}

export const dynamic = 'force-dynamic';

export default async function IbizaKulinarikMaerkteMorgenPage() {
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
        
        {/* Server-Rendered Events für AI Crawler */}
        <noscript>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold mb-8">Events in Ibiza</h1>
            <EventListSSR events={sorted.personalized} city="Ibiza" limit={100} />
          </div>
        </noscript>
        
        <div className="sr-only" data-crawler-visible="true">
          <h2>Events für AI Crawler</h2>
          <EventListSSR events={sorted.personalized} city="Ibiza" limit={100} />
        </div>
        <DiscoveryClient
          initialTrendingEvents={sorted.trending}
          initialWeekendEvents={sorted.weekend}
          initialPersonalizedEvents={sorted.personalized}
          initialWeekendNightlifeEvents={nightlife}
          city="Ibiza"
          initialDateFilter="tomorrow"
          initialCategory="Kulinarik & Märkte"
        />
      </>
    );
  } catch (error) {
    console.error('Error in IbizaKulinarikMaerkteMorgenPage:', error);
    return (
      <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city="Ibiza"
        initialDateFilter="tomorrow"
        initialCategory="Kulinarik & Märkte"
      />
    );
  }
}
