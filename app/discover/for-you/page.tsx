/**
 * For You Page - Personalized Events
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { getPersonalizedEvents } from '../../../lib/events/queries';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { DiscoveryNav } from '@/components/discovery/DiscoveryNav';
import { LocationBar } from '@/components/discovery/LocationBar';
import { Badge } from '@/components/discovery/Badge';
import { getCategoryColor } from '../../../lib/events/category-utils';

export const metadata: Metadata = {
  title: 'For You - Personalized Events | Where2Go',
  description: 'Your personalized event recommendations based on your interests and preferences',
};

export default async function ForYouPage({
  searchParams,
}: {
  searchParams: { city?: string };
}) {
  const city = searchParams.city || 'Wien';
  
  let events: any[] = [];
  try {
    events = await getPersonalizedEvents({ city, limit: 100 });
  } catch (error) {
    console.error('Error fetching personalized events:', error);
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <DiscoveryNav />
        <LocationBar initialCity={city} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Link 
                href="/discover"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                ← Back to Discover
              </Link>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              For You
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Personalized recommendations based on your interests and preferences
            </p>
          </div>
          
          {/* Events Grid */}
          {events.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {events.map((event: any) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                No personalized events found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Browse more events to help us learn your preferences!
              </p>
              <Link
                href="/discover"
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Browse All Events
              </Link>
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  );
}

function EventCard({ event }: { event: any }) {
  const categoryColor = getCategoryColor(event.category);
  const startDate = new Date(event.start_date_time);
  const dateStr = startDate.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'short',
  });
  const timeStr = startDate.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link 
      href={`/event/${event.id}`}
      className="block bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
    >
      <div 
        className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600"
        style={{
          background: event.image_urls?.[0] 
            ? `url(${event.image_urls[0]}) center/cover` 
            : undefined
        }}
      />
      
      <div className="p-4">
        <Badge 
          variant="default" 
          size="sm" 
          className="mb-2"
          style={{ backgroundColor: categoryColor + '20', color: categoryColor }}
        >
          {event.category}
        </Badge>

        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
          {event.title}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
          📍 {event.custom_venue_name || 'Venue TBA'}
        </p>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          🗓 {dateStr} · ⏰ {timeStr}
        </p>

        {event.is_free ? (
          <p className="text-sm font-medium text-green-600 dark:text-green-400 mt-2">
            Free Entry
          </p>
        ) : event.price_min ? (
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-2">
            From €{event.price_min}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
