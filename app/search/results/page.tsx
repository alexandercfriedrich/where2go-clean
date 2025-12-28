/**
 * Search Results Page
 * 
 * Displays comprehensive search results when user presses Enter in search bar:
 * 1. Events section - sorted by start date, displayed as mini event cards
 * 2. Venues section - sorted alphabetically
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { MiniEventCard } from '@/components/MiniEventCard';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import Link from 'next/link';

interface EventResult {
  id: string;
  title: string;
  category: string;
  custom_venue_name: string;
  start_date_time: string;
  slug: string;
  city: string;
  image_urls: string[];
}

interface VenueResult {
  id: string;
  name: string;
  venue_slug: string;
  city: string;
  address: string | null;
  event_count?: number;
}

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || 'Wien';
  
  const [events, setEvents] = useState<EventResult[]>([]);
  const [venues, setVenues] = useState<VenueResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setLoading(false);
      return;
    }

    async function fetchResults() {
      setLoading(true);
      setError(null);

      try {
        // Search events
        const eventQuery = supabase
          .from('events')
          .select('id, title, category, custom_venue_name, start_date_time, slug, city, image_urls')
          .or(`title.ilike.%${query}%,custom_venue_name.ilike.%${query}%,category.ilike.%${query}%`)
          .gte('start_date_time', new Date().toISOString())
          .eq('is_cancelled', false)
          .order('start_date_time', { ascending: true })
          .limit(50);

        // Search venues
        const venueQuery = supabase
          .from('venues')
          .select('id, name, venue_slug, city, address')
          .ilike('name', `%${query}%`)
          .not('venue_slug', 'is', null)
          .order('name', { ascending: true })
          .limit(20);

        const [eventResponse, venueResponse] = await Promise.all([
          eventQuery,
          venueQuery
        ]);

        if (eventResponse.error) {
          throw new Error(eventResponse.error.message);
        }

        if (venueResponse.error) {
          throw new Error(venueResponse.error.message);
        }

        const eventData = eventResponse.data as EventResult[];
        const venueData = venueResponse.data as VenueResult[];

        // Convert EventResult to EventData format for sorting
        const eventDataForSorting = eventData.map(e => ({
          id: e.id,
          title: e.title,
          category: e.category,
          venue: e.custom_venue_name,
          custom_venue_name: e.custom_venue_name,
          start_date_time: e.start_date_time,
          imageUrl: e.image_urls?.[0],
          image_urls: e.image_urls,
          slug: e.slug,
          city: e.city,
          date: e.start_date_time,
        }));

        // Sort events to prioritize those with images
        const sortedEvents = sortEventsWithImagesFirstThenByDate(eventDataForSorting);
        
        // Convert back to EventResult format
        const sortedEventResults = sortedEvents.map(e => ({
          id: e.id!,
          title: e.title,
          category: e.category || '',
          custom_venue_name: e.custom_venue_name || e.venue || '',
          start_date_time: e.start_date_time || e.date || '',
          slug: e.slug!,
          city: e.city || city,
          image_urls: e.image_urls || (e.imageUrl ? [e.imageUrl] : []),
        }));

        // Get event counts for venues
        if (venueData.length > 0) {
          const venueNames = venueData.map(v => v.name);
          const { data: eventCounts } = await supabase
            .from('events')
            .select('custom_venue_name')
            .in('custom_venue_name', venueNames)
            .gte('start_date_time', new Date().toISOString())
            .eq('is_cancelled', false);

          const countMap: Record<string, number> = {};
          if (eventCounts) {
            eventCounts.forEach((e: { custom_venue_name: string }) => {
              countMap[e.custom_venue_name] = (countMap[e.custom_venue_name] || 0) + 1;
            });
          }

          venueData.forEach(venue => {
            venue.event_count = countMap[venue.name] || 0;
          });
        }

        setEvents(sortedEventResults);
        setVenues(venueData);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch search results');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [query, city]);

  if (!query || query.length < 2) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Suchergebnisse
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Bitte gib mindestens 2 Zeichen ein, um zu suchen.
            </p>
            <button
              onClick={() => router.back()}
              className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Zurück
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Suchergebnisse
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Suche nach: <span className="font-semibold">&ldquo;{query.replace(/</g, '&lt;').replace(/>/g, '&gt;')}&rdquo;</span>
          </p>
          
          {!loading && (
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span>{events.length} Events</span>
              <span>•</span>
              <span>{venues.length} Venues</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <p className="text-red-800 dark:text-red-200">
              {error}
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && (
          <>
            {/* Events Section */}
            {events.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Events ({events.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {events.map(event => (
                    <MiniEventCard
                      key={event.id}
                      event={{
                        id: event.id,
                        title: event.title,
                        venue: event.custom_venue_name,
                        custom_venue_name: event.custom_venue_name,
                        start_date_time: event.start_date_time,
                        imageUrl: event.image_urls?.[0],
                        image_urls: event.image_urls,
                        slug: event.slug
                      }}
                      city={event.city || city}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Venues Section */}
            {venues.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Venues ({venues.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {venues.map(venue => (
                    <Link
                      key={venue.id}
                      href={`/venues/${venue.venue_slug}`}
                      className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                            {venue.name}
                          </h3>
                          {venue.address && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {venue.address}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {venue.city}
                          </p>
                        </div>
                        {venue.event_count !== undefined && venue.event_count > 0 && (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(32, 184, 205, 0.1)', color: '#20B8CD' }}>
                            {venue.event_count} Events
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Empty State */}
            {events.length === 0 && venues.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Keine Ergebnisse gefunden
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Versuche es mit anderen Suchbegriffen
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
