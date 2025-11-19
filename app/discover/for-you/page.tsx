/**
 * For You Page - Personalized Events
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { getPersonalizedEvents } from '../../../lib/events/queries';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { DiscoveryNav } from '@/components/discovery/DiscoveryNav';
import { LocationBar } from '@/components/discovery/LocationBar';
import { EventCard } from '@/components/discovery/EventCard';

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
                <EventCard key={event.id} event={event} city={city} />
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
