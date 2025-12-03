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
import { discoverPageFAQs, discoverPageHowTo } from '@/lib/content/discoverPageContent';
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
}

export default function DiscoveryClient({
  initialTrendingEvents,
  initialWeekendEvents,
  initialPersonalizedEvents,
  initialWeekendNightlifeEvents = { friday: [], saturday: [], sunday: [] },
  city,
  initialDateFilter = 'all',
}: DiscoveryClientProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading Discovery...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* Navigation */}
        <DiscoveryNav />
        
        {/* Location Bar (simplified - city display only) */}
        <LocationBar 
          initialCity={city}
        />

        {/* Hero Section */}
        <div className="bg-[#1a2332] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Discover Events in {city}
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              Your personalized guide to the best events happening now
            </p>
            
            {/* Enhanced Search Bar */}
            <div className="max-w-2xl">
              <SearchBar placeholder="Search events, venues, or categories..." />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

          {/* Weekend Nightlife Section - Clubs & Nachtleben from Venue Scrapers */}
          {!selectedCategory && (
            <WeekendNightlifeSection 
              events={initialWeekendNightlifeEvents} 
              city={city} 
            />
          )}

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

          {/* HowTo Section */}
          <div className="max-w-4xl mx-auto">
            <HowToSection
              title={discoverPageHowTo.title}
              description={discoverPageHowTo.description}
              steps={discoverPageHowTo.steps}
            />
          </div>

          {/* FAQ Section */}
          <div className="max-w-4xl mx-auto">
            <FAQSection
              faqs={discoverPageFAQs}
              title="Häufig gestellte Fragen zu Events in Wien"
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
