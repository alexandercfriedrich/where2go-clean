/**
 * Enhanced Search Bar with Autocomplete
 * Searches events AND venues with live suggestions
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

interface EventSearchResult {
  type: 'event';
  id: string;
  title: string;
  category: string;
  venue: string;
  start_date_time: string;
  slug?: string;
  city?: string;
  image_url?: string;
}

interface VenueSearchResult {
  type: 'venue';
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string | null;
  event_count: number;
}

type SearchResult = EventSearchResult | VenueSearchResult;

interface SearchBarProps {
  placeholder?: string;
  className?: string;
}

/**
 * Helper to check if event is today and calculate time until start
 */
function getCountdownInfo(startDateTime: string): { isToday: boolean; timeUntil: string | null; hasStarted: boolean } {
  const now = new Date();
  const eventDate = new Date(startDateTime);
  
  // Check if same day
  const isToday = 
    eventDate.getDate() === now.getDate() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getFullYear() === now.getFullYear();
  
  if (!isToday) {
    return { isToday: false, timeUntil: null, hasStarted: false };
  }
  
  const diffMs = eventDate.getTime() - now.getTime();
  
  // Event has already started
  if (diffMs <= 0) {
    return { isToday: true, timeUntil: null, hasStarted: true };
  }
  
  // Calculate hours and minutes
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  const timeUntil = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  
  return { isToday: true, timeUntil, hasStarted: false };
}

/**
 * Countdown component for today's events
 */
function EventCountdown({ startDateTime }: { startDateTime: string }) {
  const [countdown, setCountdown] = useState<{ timeUntil: string | null; hasStarted: boolean }>(() => {
    const info = getCountdownInfo(startDateTime);
    return { timeUntil: info.timeUntil, hasStarted: info.hasStarted };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const info = getCountdownInfo(startDateTime);
      setCountdown({ timeUntil: info.timeUntil, hasStarted: info.hasStarted });
    }, 1000); // Update every second for smooth countdown

    return () => clearInterval(timer);
  }, [startDateTime]);

  if (countdown.hasStarted) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-500 animate-pulse">
        🔴 LIVE
      </span>
    );
  }

  if (!countdown.timeUntil) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-light animate-pulse tracking-wide" style={{ color: '#20B8CD' }}>
      ⏱️ startet in {countdown.timeUntil}
    </span>
  );
}

export function SearchBar({ 
  placeholder = "Search events, venues, or categories...",
  className = ""
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search for both venues and events
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Search venues first (use venue_slug for navigation)
        const venuePromise = supabase
          .from('venues')
          .select('id, name, venue_slug, city, address')
          .ilike('name', `%${query}%`)
          .not('venue_slug', 'is', null)
          .limit(3);

        // Search events
        const eventPromise = supabase
          .from('events')
          .select('id, title, category, custom_venue_name, start_date_time, slug, city, image_urls')
          .or(`title.ilike.%${query}%,custom_venue_name.ilike.%${query}%,category.ilike.%${query}%`)
          .gte('start_date_time', new Date().toISOString())
          .eq('is_cancelled', false)
          .limit(6);

        const [venueResponse, eventResponse] = await Promise.all([venuePromise, eventPromise]);

        const combinedResults: SearchResult[] = [];

        // Add venues with event counts (optimized: single query for all venue names)
        if (!venueResponse.error && venueResponse.data && venueResponse.data.length > 0) {
          const venues = venueResponse.data as any[];
          const venueNames = venues.map(v => v.name);
          
          // Get event counts for all venues in a single aggregated query
          const { data: eventCounts } = await supabase
            .from('events')
            .select('custom_venue_name')
            .in('custom_venue_name', venueNames)
            .gte('start_date_time', new Date().toISOString())
            .eq('is_cancelled', false);
          
          // Count events per venue
          const countMap: Record<string, number> = {};
          if (eventCounts) {
            eventCounts.forEach((e: any) => {
              countMap[e.custom_venue_name] = (countMap[e.custom_venue_name] || 0) + 1;
            });
          }

          venues.forEach((venue) => {
            combinedResults.push({
              type: 'venue',
              id: venue.id,
              name: venue.name,
              slug: venue.venue_slug,  // Use venue_slug for navigation
              city: venue.city,
              address: venue.address,
              event_count: countMap[venue.name] || 0
            });
          });
        }

        // Add events
        if (!eventResponse.error && eventResponse.data) {
          (eventResponse.data as any[]).forEach((event: any) => {
            combinedResults.push({
              type: 'event',
              id: event.id,
              title: event.title,
              category: event.category,
              venue: event.custom_venue_name || 'TBA',
              start_date_time: event.start_date_time,
              slug: event.slug,
              city: event.city,
              image_url: event.image_urls?.[0] || undefined
            });
          });
        }

        setResults(combinedResults);
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        if (isOpen && results.length > 0) {
          e.preventDefault();
          setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        }
        break;
      case 'ArrowUp':
        if (isOpen && results.length > 0) {
          e.preventDefault();
          setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (isOpen && selectedIndex >= 0 && results.length > 0) {
          // Navigate to selected result from dropdown
          navigateToResult(results[selectedIndex]);
        } else if (query.length >= 2) {
          // Navigate to search results page when Enter is pressed
          setIsOpen(false);
          router.push(`/search/results?q=${encodeURIComponent(query)}`);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const navigateToResult = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    
    if (result.type === 'venue') {
      router.push(`/venues/${result.slug}`);
    } else {
      // Navigate to event detail page
      if (result.slug && result.city) {
        const citySlug = result.city.toLowerCase().replace(/\s+/g, '-');
        router.push(`/events/${citySlug}/${result.slug}`);
      } else {
        router.push(`/event/${result.id}`);
      }
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  };

  // Separate venues and events for display
  const venueResults = results.filter((r): r is VenueSearchResult => r.type === 'venue');
  const eventResults = results.filter((r): r is EventSearchResult => r.type === 'event');

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            if (query.length >= 2) setIsOpen(true);
            e.currentTarget.style.setProperty('--tw-ring-color', '#20B8CD');
          }}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 md:py-4 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 transition-colors"
          style={{
            '--tw-ring-color': '#20B8CD',
          } as React.CSSProperties}
          aria-label="Search events and venues"
          aria-autocomplete="list"
          aria-controls="search-results"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#20B8CD', borderTopColor: 'transparent' }} />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div 
          id="search-results"
          role="listbox"
          className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-[28rem] overflow-y-auto"
        >
          {/* Venue Results Section */}
          {venueResults.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
                📍 Venues
              </div>
              {venueResults.map((venue, index) => (
                <button
                  key={`venue-${venue.id}`}
                  role="option"
                  aria-selected={selectedIndex === index}
                  onClick={() => navigateToResult(venue)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 ${
                    selectedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(32, 184, 205, 0.1)' }}>
                        <svg className="w-5 h-5" style={{ color: '#20B8CD' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {venue.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {venue.address || venue.city}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(32, 184, 205, 0.1)', color: '#20B8CD' }}>
                        <span className="font-bold">{venue.event_count}</span>
                        <span>Events</span>
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Event Results Section */}
          {eventResults.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
                🎭 Events
              </div>
              {eventResults.map((event, index) => {
                const resultIndex = venueResults.length + index;
                const countdownInfo = getCountdownInfo(event.start_date_time);
                
                return (
                  <button
                    key={`event-${event.id}`}
                    role="option"
                    aria-selected={selectedIndex === resultIndex}
                    onClick={() => navigateToResult(event)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      selectedIndex === resultIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                    } ${countdownInfo.isToday ? 'bg-opacity-50' : ''}`}
                    style={countdownInfo.isToday ? { backgroundColor: 'rgba(32, 184, 205, 0.05)' } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      {/* Event Image */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                        {event.image_url ? (
                          <img 
                            src={event.image_url} 
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                              <circle cx="8.5" cy="8.5" r="1.5"/>
                              <polyline points="21 15 16 10 5 21"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {/* Event Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {event.title}
                          </p>
                          {countdownInfo.isToday && (
                            <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: 'rgba(32, 184, 205, 0.1)', color: '#20B8CD' }}>
                              HEUTE
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          📍 {event.venue}
                        </p>
                        {/* Countdown Timer for today's events */}
                        {countdownInfo.isToday && (
                          <div className="mt-0.5">
                            <EventCountdown startDateTime={event.start_date_time} />
                          </div>
                        )}
                      </div>
                      
                      {/* Category & Date */}
                      <div className="flex-shrink-0 text-right">
                        <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(32, 184, 205, 0.1)', color: '#20B8CD' }}>
                          {event.category}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDate(event.start_date_time)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {isOpen && results.length === 0 && !isLoading && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-center text-gray-600 dark:text-gray-400">
            Keine Ergebnisse für &quot;{query}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
