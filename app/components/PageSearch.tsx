/**
 * Enhanced PageSearch with Autocomplete
 * Matches Discovery SearchBar functionality with dropdown, countdown, images
 */

'use client';

import React, { useState, useEffect, useRef, FormEvent } from 'react';
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

interface PageSearchProps {
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

export default function PageSearch({ className = '' }: PageSearchProps) {
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
        // Search venues first
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

        // Add venues with event counts
        if (!venueResponse.error && venueResponse.data && venueResponse.data.length > 0) {
          const venues = venueResponse.data as any[];
          const venueNames = venues.map(v => v.name);
          
          // Get event counts for all venues
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
              slug: venue.venue_slug,
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
          navigateToResult(results[selectedIndex]);
        } else if (query.length >= 2) {
          setIsOpen(false);
          router.push(`/search/results?q=${encodeURIComponent(query)}`);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setIsOpen(false);
      router.push(`/search/results?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleIconClick = () => {
    if (query.trim().length >= 2) {
      setIsOpen(false);
      router.push(`/search/results?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const navigateToResult = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    
    if (result.type === 'venue') {
      router.push(`/venues/${result.slug}`);
    } else {
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
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.length >= 2) setIsOpen(true);
          }}
          placeholder="Events, Venues suchen..."
          className="w-full px-4 py-2 pr-10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#20B8CD]"
          style={{
            backgroundColor: '#091717', // Offblack
            border: '1px solid #FCFAF6', // Paper White
            color: '#FCFAF6', // Paper White
          }}
          aria-label="Search events and venues"
          aria-autocomplete="list"
          aria-controls="page-search-results"
        />
        {isLoading && (
          <div className="absolute inset-y-0 right-10 pr-2 flex items-center">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#20B8CD', borderTopColor: 'transparent' }} />
          </div>
        )}
        <button
          type="button"
          onClick={handleIconClick}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: '#FCFAF6' }}
          aria-label="Suchen"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="hover:opacity-80"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </form>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div 
          id="page-search-results"
          role="listbox"
          className="absolute z-50 w-full mt-2 rounded-lg shadow-xl border max-h-[28rem] overflow-y-auto"
          style={{
            backgroundColor: '#13343B', // Teal Dark
            borderColor: '#2E565D', // Teal Medium
          }}
        >
          {/* Venue Results Section */}
          {venueResults.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b" style={{ color: '#BADFDE', backgroundColor: '#091717', borderColor: '#2E565D' }}>
                📍 Venues
              </div>
              {venueResults.map((venue, index) => (
                <button
                  key={`venue-${venue.id}`}
                  role="option"
                  aria-selected={selectedIndex === index}
                  onClick={() => navigateToResult(venue)}
                  className={`w-full text-left px-4 py-3 transition-colors border-b ${
                    selectedIndex === index ? 'bg-opacity-70' : ''
                  }`}
                  style={{
                    borderColor: '#2E565D',
                    backgroundColor: selectedIndex === index ? '#2E565D' : 'transparent'
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
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
                        <p className="font-semibold truncate" style={{ color: '#FCFAF6' }}>
                          {venue.name}
                        </p>
                        <p className="text-sm truncate" style={{ color: '#BADFDE' }}>
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
              <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide border-b" style={{ color: '#BADFDE', backgroundColor: '#091717', borderColor: '#2E565D' }}>
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
                    className={`w-full text-left px-4 py-3 transition-colors border-b last:border-b-0 ${
                      selectedIndex === resultIndex ? 'bg-opacity-70' : ''
                    }`}
                    style={{
                      borderColor: '#2E565D',
                      backgroundColor: selectedIndex === resultIndex ? '#2E565D' : (countdownInfo.isToday ? 'rgba(32, 184, 205, 0.05)' : 'transparent')
                    }}
                    onMouseEnter={() => setSelectedIndex(resultIndex)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Event Image */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden" style={{ backgroundColor: '#2E565D' }}>
                        {event.image_url ? (
                          <img 
                            src={event.image_url} 
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">
                            🎭
                          </div>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: '#FCFAF6' }}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 text-sm" style={{ color: '#BADFDE' }}>
                          <span className="truncate">{event.venue}</span>
                          <span>•</span>
                          <span className="flex-shrink-0">{formatDate(event.start_date_time)}</span>
                        </div>
                        {countdownInfo.isToday && (
                          <div className="mt-1">
                            <EventCountdown startDateTime={event.start_date_time} />
                          </div>
                        )}
                      </div>

                      {/* Category Badge */}
                      <div className="flex-shrink-0">
                        <span className="inline-flex px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: 'rgba(32, 184, 205, 0.1)', color: '#20B8CD' }}>
                          {event.category}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
