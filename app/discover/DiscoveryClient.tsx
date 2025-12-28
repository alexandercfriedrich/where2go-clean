'use client';

/**
 * Discovery Homepage - Client Component
 * Handles client-side interactivity and state
 */

import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { SectionHeader } from '@/components/discovery/SectionHeader';
import { DiscoveryNav } from '@/components/discovery/DiscoveryNav';
import { LocationBar } from '@/components/discovery/LocationBar';
import { CategoryBrowser } from '@/components/discovery/CategoryBrowser';
import { SearchBar } from '@/components/discovery/SearchBar';
import { EventCard } from '@/components/EventCard';
import { FAQSection } from '@/components/FAQSection';
import { HowToSection } from '@/components/HowToSection';
import { DateFilterLinks } from '@/components/discovery/DateFilterLinks';
import { WeekendNightlifeSection } from '@/components/discovery/WeekendNightlifeSection';
import { discoverPageFAQs, discoverPageHowTo, getDiscoverPageFAQs, getDiscoverPageHowTo } from '@/lib/content/discoverPageContent';
import { VenueStats } from '@/components/VenueStats';
import { filterEventsByDateRange } from '../../lib/utils/eventDateFilter';

interface DiscoveryClientProps {
  initialTrendingEvents: any[];
  initialWeekendEvents: any[];
  initialPersonalizedEvents: any[];
  initialWeekendNightlifeEvents?: {
    friday: any[];
    saturday: any[];
    sunday: any[];
  };
  city: string;
  initialDateFilter?: string;
  initialCategory?: string; // NEW: Support for pre-selected category
}

export default function DiscoveryClient({
  initialTrendingEvents,
  initialWeekendEvents,
  initialPersonalizedEvents,
  initialWeekendNightlifeEvents = { friday: [], saturday: [], sunday: [] },
  city,
  initialDateFilter = 'all',
  initialCategory, // NEW: Add to destructuring
}: DiscoveryClientProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategory || null // NEW: Initialize with initialCategory if provided
  );
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(initialDateFilter);
  const [filteredEvents, setFilteredEvents] = useState({
    personalized: initialPersonalizedEvents,
    trending: initialTrendingEvents,
    weekend: initialWeekendEvents,
  });
  
  // Ref for the events section to scroll to
  const eventsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync selectedDateFilter with initialDateFilter prop changes
  useEffect(() => {
    setSelectedDateFilter(initialDateFilter);
  }, [initialDateFilter]);

  // NEW: Sync selectedCategory with initialCategory prop changes
  // Only update if initialCategory is explicitly provided (not undefined)
  useEffect(() => {
    if (initialCategory !== undefined) {
      const nextCategory = initialCategory || null;
      setSelectedCategory(prevCategory => 
        prevCategory === nextCategory ? prevCategory : nextCategory
      );
    }
  }, [initialCategory]);

  // Filter events by category and date using the shared utility
  useEffect(() => {
    const { matchesCategory } = require('../../lib/events/category-utils');
    
    let categoryFiltered = {
      personalized: initialPersonalizedEvents,
      trending: initialTrendingEvents,
      weekend: initialWeekendEvents,
    };
    
    // Apply category filter
    if (selectedCategory) {
      categoryFiltered = {
        personalized: initialPersonalizedEvents.filter(
          (e: any) => e.category && matchesCategory(e.category, selectedCategory)
        ),
        trending: initialTrendingEvents.filter(
          (e: any) => e.category && matchesCategory(e.category, selectedCategory)
        ),
        weekend: initialWeekendEvents.filter(
          (e: any) => e.category && matchesCategory(e.category, selectedCategory)
        ),
      };
    }
    
    // Apply date filter using the shared utility function
    setFilteredEvents({
      personalized: filterEventsByDateRange(categoryFiltered.personalized, selectedDateFilter),
      trending: filterEventsByDateRange(categoryFiltered.trending, selectedDateFilter),
      weekend: filterEventsByDateRange(categoryFiltered.weekend, selectedDateFilter),
    });
  }, [selectedCategory, selectedDateFilter, initialPersonalizedEvents, initialTrendingEvents, initialWeekendEvents]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-r-transparent" style={{ borderColor: '#20B8CD', borderRightColor: 'transparent' }}></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading Discovery...</p>
        </div>
      </div>
    );
  }

  // NEW: Dynamic H1 based on filters with proper German grammar
  const getDateFilterLabelForTitle = (filter: string): string => {
    const DATE_FILTER_TITLE_LABELS: Record<string, string> = {
      heute: 'heute',
      morgen: 'morgen',
      wochenende: 'dieses Wochenende',
    };

    return DATE_FILTER_TITLE_LABELS[filter] ?? filter;
  };

  const getPageTitle = (): string => {
    const dateLabel = selectedDateFilter !== 'all'
      ? getDateFilterLabelForTitle(selectedDateFilter)
      : '';

    if (selectedCategory && selectedDateFilter !== 'all') {
      return `${selectedCategory} Events in ${city} ${dateLabel}`;
    } else if (selectedCategory) {
      return `${selectedCategory} Events in ${city}`;
    } else if (selectedDateFilter !== 'all') {
      return `Events in ${city} ${dateLabel}`;
    }
    return `Discover Events in ${city}`;
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
        {/* Navigation */}
        <DiscoveryNav />
        
        {/* Location Bar (simplified - city display only) */}
        <LocationBar 
          initialCity={city}
        />

        {/* Hero Section */}
        <div style={{ backgroundColor: '#091717' }} className="text-white"> {/* Offblack */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              {getPageTitle()}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              {selectedCategory 
                ? `Alle ${selectedCategory.toLowerCase()} Veranstaltungen in ${city}`
                : `Your personalized guide to the best events happening now`}
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="max-w-2xl">
              <SearchBar placeholder="Search events, venues, or categories..." />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Weekend Nightlife Section - Clubs & Nachtleben from Venue Scrapers */}
          {/* Positioned right after search field as per requirements */}
          {!selectedCategory && (
            <WeekendNightlifeSection 
              events={initialWeekendNightlifeEvents} 
              city={city} 
            />
          )}

          {/* Date Filter Links */}
          <DateFilterLinks
            city={city}
            selectedFilter={selectedDateFilter}
            onFilterChange={setSelectedDateFilter}
          />

          {/* Category Browser */}
          <section className="mb-16" aria-label="Browse events by category">
            <SectionHeader
              title="Browse by Category"
              subtitle="Explore events that match your interests"
            />
            <CategoryBrowser 
              onCategoryClick={(cat) => {
                const newCategory = selectedCategory === cat ? null : cat;
                setSelectedCategory(newCategory);
                
                // Smooth scroll to events section after category is selected
                if (newCategory && eventsGridRef.current) {
                  setTimeout(() => {
                    eventsGridRef.current?.scrollIntoView({ 
                      behavior: 'smooth', 
                      block: 'start' 
                    });
                  }, 100);
                }
              }}
              selectedCategory={selectedCategory || undefined}
            />
            {selectedCategory && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Filtered by: <strong>{selectedCategory}</strong>
                </span>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Clear filter
                </button>
              </div>
            )}
          </section>

          {/* For You Section - Show ALL events when category is selected */}
          {filteredEvents.personalized.length > 0 && (
            <section ref={eventsGridRef} className="mb-16" aria-label="Personalized event recommendations">
              <SectionHeader
                title={selectedCategory ? `${selectedCategory} Events` : "For You"}
                subtitle={selectedCategory 
                  ? `All ${filteredEvents.personalized.length} events in this category`
                  : "Personalized recommendations based on your interests"}
                action={!selectedCategory ? { label: 'See all', href: '/discover/for-you' } : undefined}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Show all events when category is selected, otherwise limit to 8 */}
                {(selectedCategory ? filteredEvents.personalized : filteredEvents.personalized.slice(0, 8)).map((event) => (
                  <EventCard key={event.id} event={event} city={city} />
                ))}
              </div>
            </section>
          )}

          {/* Trending Section */}
          {filteredEvents.trending.length > 0 && (
            <section className="mb-16" aria-label="Trending events">
              <SectionHeader
                title="Trending Now"
                subtitle="Popular events everyone is talking about"
                action={{ label: 'See all', href: '/discover/trending' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredEvents.trending.slice(0, 8).map((event) => (
                  <EventCard key={event.id} event={event} city={city} />
                ))}
              </div>
            </section>
          )}

          {/* Weekend Section */}
          {filteredEvents.weekend.length > 0 && (
            <section className="mb-16" aria-label="Weekend events">
              <SectionHeader
                title="This Weekend"
                subtitle="Plan your perfect weekend"
                action={{ label: 'See all', href: '/discover/weekend' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredEvents.weekend.map((event) => (
                  <EventCard key={event.id} event={event} city={city} />
                ))}
              </div>
            </section>
          )}

          {/* Top Venues Section */}
          <section className="mb-16">
            <VenueStatsSection city={city} />
          </section>

          {/* Fallback message */}
          {filteredEvents.personalized.length === 0 &&
            filteredEvents.trending.length === 0 &&
            filteredEvents.weekend.length === 0 && (
              <div className="text-center py-16">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  {selectedCategory ? 'No events found in this category' : 'No events found'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedCategory 
                    ? 'Try selecting a different category or clear the filter' 
                    : `Check back soon for upcoming events in ${city}`}
                </p>
              </div>
            )}

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <FAQSection
              faqs={getDiscoverPageFAQs(city)}
              title={`Häufig gestellte Fragen zu Events in ${city}`}
            />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

function VenueStatsSection({ city }: { city: string }) {
  return <VenueStats city={city} limit={15} layout="grid" />;
}
