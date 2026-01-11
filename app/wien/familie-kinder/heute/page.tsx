import { Metadata } from 'next';
import DiscoveryClient from '@/discover/DiscoveryClient';
import { getTrendingEvents, getWeekendEvents, getPersonalizedEvents, getWeekendNightlifeEvents, getUpcomingEvents } from '../../../../lib/events/queries';
import SchemaOrg from '@/components/SchemaOrg';
import { generateEventListSchema } from '@/lib/schemaOrg';
import EventListSSR from '@/components/EventListSSR';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { generateCityMetadata } from '@/lib/seo/metadataGenerator';
import { SeoContent } from '@/components/SeoContent';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export async function generateMetadata(): Promise<Metadata> {
  return generateCityMetadata({ city: 'wien', category: 'familie-kinder', date: 'heute' });
}

export const dynamic = 'force-dynamic';

export default async function WienFamilieKinderHeutePage() {
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
      <>        <Breadcrumbs items={[{ label: 'Wien', href: '/wien' }, { label: 'Familie & Kinder', href: '/wien/familie-kinder' }, { label: 'Heute', href: '/wien/familie-kinder/heute' }]} />

        <SchemaOrg schema={schema} />
        
        {/* Server-Rendered Events für AI Crawler */}
        <noscript>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold mb-8">Events in Wien</h1>
            <EventListSSR events={sorted.personalized} city="Wien" limit={100} />
          </div>
        </noscript>
        
        <div className="sr-only" data-crawler-visible="true">
          <h2>Events für AI Crawler</h2>
          <EventListSSR events={sorted.personalized} city="Wien" limit={100} />
        </div>
        <DiscoveryClient
          initialTrendingEvents={sorted.trending}
          initialWeekendEvents={sorted.weekend}
          initialPersonalizedEvents={sorted.personalized}
          initialWeekendNightlifeEvents={nightlife}
          city="Wien"
          initialDateFilter="today"
          initialCategory="Familie & Kinder"
        />
      <SeoContent category="familie-kinder" date="heute" />

      </>
    );
  } catch (error) {
    console.error('Error in WienFamilieKinderHeutePage:', error);
    return (
      <>
        <Breadcrumbs items={[{ label: 'Wien', href: '/wien' }, { label: 'Familie & Kinder', href: '/wien/familie-kinder' }, { label: 'Heute', href: '/wien/familie-kinder/heute' }]} />
        <DiscoveryClient
        initialTrendingEvents={[]}
        initialWeekendEvents={[]}
        initialPersonalizedEvents={[]}
        initialWeekendNightlifeEvents={{ friday: [], saturday: [], sunday: [] }}
        city="Wien"
        initialDateFilter="today"
        initialCategory="Familie & Kinder"
      />
        <SeoContent category="familie-kinder" date="heute" />
      </>
    );
  }
}
