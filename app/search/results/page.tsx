/**
 * Search Results Page
 * 
 * Displays comprehensive search results with full light/dark mode support
 * Venue-style design with search bar in navigation
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { EventCard } from '@/components/EventCard';
import PageSearch from '@/components/PageSearch';
import { sortEventsWithImagesFirstThenByDate } from '@/lib/eventSortUtils';
import { useTheme } from '@/components/ui/ThemeProvider';

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
  const { theme } = useTheme();
  const query = searchParams.get('q') || '';
  const city = searchParams.get('city') || 'Wien';
  
  const [events, setEvents] = useState<EventResult[]>([]);
  const [venues, setVenues] = useState<VenueResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme colors
  const bgColor = theme === 'dark' ? '#091717' : '#FCFAF6';
  const cardBg = theme === 'dark' ? '#13343B' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#FCFAF6' : '#091717';
  const textSecondary = theme === 'dark' ? '#BADFDE' : '#2E565D';
  const borderColor = theme === 'dark' ? '#2E565D' : '#E5E3D4';

  useEffect(() => {
    if (!query || query.length < 2) {
      setLoading(false);
      return;
    }

    async function fetchResults() {
      setLoading(true);
      setError(null);

      try {
        const eventQuery = supabase
          .from('events')
          .select('id, title, category, custom_venue_name, start_date_time, slug, city, image_urls')
          .or(`title.ilike.%${query}%,custom_venue_name.ilike.%${query}%,category.ilike.%${query}%`)
          .gte('start_date_time', new Date().toISOString())
          .eq('is_cancelled', false)
          .order('start_date_time', { ascending: true })
          .limit(50);

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

        if (eventResponse.error) throw new Error(eventResponse.error.message);
        if (venueResponse.error) throw new Error(venueResponse.error.message);

        const eventData = eventResponse.data as EventResult[];
        const venueData = venueResponse.data as VenueResult[];

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

        const sortedEvents = sortEventsWithImagesFirstThenByDate(eventDataForSorting);
        
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
      <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4" style={{ color: textPrimary }}>
              Suchergebnisse
            </h1>
            <p style={{ color: textSecondary }}>
              Bitte gib mindestens 2 Zeichen ein, um zu suchen.
            </p>
            <button
              onClick={() => router.back()}
              className="mt-6 px-6 py-3 rounded-lg transition-colors"
              style={{ backgroundColor: '#20B8CD', color: '#FCFAF6' }}
            >
              Zurück
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      <div className="border-b" style={{ borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 transition-colors hover:opacity-80"
              style={{ color: textSecondary }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span style={{ color: textPrimary }}>Zurück zur Übersicht</span>
            </button>
            <div className="flex-1 max-w-md ml-auto">
              <PageSearch />
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: theme === 'dark' ? 'linear-gradient(to bottom, #13343B, #091717)' : 'linear-gradient(to bottom, #FCFAF6, #FFFFFF)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: textPrimary }}>
            Suchergebnisse
          </h1>
          <p className="text-lg" style={{ color: textSecondary }}>
            Suche nach: <span className="font-semibold">&ldquo;{query.replace(/</g, '&lt;').replace(/>/g, '&gt;')}&rdquo;</span>
          </p>
          {!loading && (
            <div className="mt-4 flex items-center gap-4 text-sm" style={{ color: textSecondary }}>
              <span>{events.length} Events</span>
              <span>•</span>
              <span>{venues.length} Venues</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{
              borderColor: 'rgba(32, 184, 205, 0.2)',
              borderTopColor: '#20B8CD'
            }} />
          </div>
        )}

        {error && (
          <div className="rounded-lg p-4 mb-8" style={{
            backgroundColor: theme === 'dark' ? 'rgba(169, 75, 48, 0.2)' : 'rgba(169, 75, 48, 0.1)',
            border: `1px solid ${theme === 'dark' ? '#A94B30' : 'rgba(169, 75, 48, 0.3)'}`
          }}>
            <p style={{ color: theme === 'dark' ? '#FFD2A6' : '#A94B30' }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {events.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold mb-6" style={{ color: textPrimary }}>
                  Events ({events.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                  {events.map(event => (
                    <EventCard
                      key={event.id}
                      event={{
                        id: event.id,
                        title: event.title,
                        venue: event.custom_venue_name,
                        custom_venue_name: event.custom_venue_name,
                        start_date_time: event.start_date_time,
                        imageUrl: event.image_urls?.[0],
                        image_urls: event.image_urls,
                        slug: event.slug,
                        category: event.category,
                        city: event.city,
                        date: event.start_date_time
                      }}
                      city={event.city || city}
                    />
                  ))}
                </div>
              </section>
            )}

            {venues.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6" style={{ color: textPrimary }}>
                  Venues ({venues.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {venues.map(venue => (
                    <Link
                      key={venue.id}
                      href={`/venues/${venue.venue_slug}`}
                      className="block p-4 rounded-lg border transition-colors hover:border-opacity-100"
                      style={{ backgroundColor: cardBg, borderColor }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate mb-1" style={{ color: textPrimary }}>
                            {venue.name}
                          </h3>
                          {venue.address && (
                            <p className="text-sm truncate" style={{ color: textSecondary }}>
                              {venue.address}
                            </p>
                          )}
                          <p className="text-xs mt-1" style={{ color: textSecondary }}>
                            {venue.city}
                          </p>
                        </div>
                        {venue.event_count !== undefined && venue.event_count > 0 && (
                          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ 
                            backgroundColor: 'rgba(32, 184, 205, 0.2)', 
                            color: '#20B8CD' 
                          }}>
                            {venue.event_count} Events
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {events.length === 0 && venues.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4" style={{ color: textSecondary }}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{ color: textPrimary }}>
                  Keine Ergebnisse gefunden
                </h3>
                <p style={{ color: textSecondary }}>
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#091717' }}>
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{
          borderColor: 'rgba(32, 184, 205, 0.2)',
          borderTopColor: '#20B8CD'
        }} />
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
}
