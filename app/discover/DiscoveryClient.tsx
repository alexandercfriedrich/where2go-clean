'use client';

/**
 * Discovery Homepage - Client Component
 * Handles client-side interactivity and state
 */

import React, { useState, useEffect } from 'react';
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
import { discoverPageFAQs, discoverPageHowTo } from '@/lib/content/discoverPageContent';
import { VenueStats } from '@/components/VenueStats';

interface DiscoveryClientProps {
  initialTrendingEvents: any[];
  initialWeekendEvents: any[];
  initialPersonalizedEvents: any[];
  city: string;
}

export default function DiscoveryClient({
  initialTrendingEvents,
  initialWeekendEvents,
  initialPersonalizedEvents,
  city,
}: DiscoveryClientProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [filteredEvents, setFilteredEvents] = useState({
    personalized: initialPersonalizedEvents,
    trending: initialTrendingEvents,
    weekend: initialWeekendEvents,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper function to filter events by date (always excludes past events)
  const filterEventsByDate = (events: any[], filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // First, always filter out past events
    const futureEvents = events.filter((event: any) => {
      const eventDate = event.start_date_time 
        ? new Date(event.start_date_time)
        : event.date 
          ? new Date(event.date)
          : null;
      
      if (!eventDate) return false;
      
      // Normalize event date to midnight for comparison
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      // Only include events from today onwards
      return eventDateOnly >= today;
    });
    
    // If filter is 'all', just return future events (no additional filtering)
    if (filter === 'all') return futureEvents;
    
    // Apply specific date filter
    return futureEvents.filter((event: any) => {
      const eventDate = event.start_date_time 
        ? new Date(event.start_date_time)
        : event.date 
          ? new Date(event.date)
          : null;
      
      if (!eventDate) return false;
      
      // Normalize event date to midnight for comparison
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      switch (filter) {
        case 'today':
          return eventDateOnly.getTime() === today.getTime();
        
        case 'tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return eventDateOnly.getTime() === tomorrow.getTime();
          
        case 'this-week':
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return eventDateOnly >= today && eventDateOnly < weekEnd;
          
        case 'weekend':
          // Calculate next weekend (Friday, Saturday, and Sunday)
          const dayOfWeek = today.getDay();
          let daysUntilFriday: number;
          
          if (dayOfWeek === 5) {
            // Today is Friday - include today, tomorrow, and day after
            daysUntilFriday = 0;
          } else if (dayOfWeek === 6) {
            // Today is Saturday - include today and tomorrow
            daysUntilFriday = -1; // Go back to Friday
          } else if (dayOfWeek === 0) {
            // Today is Sunday - go back to Friday to include all weekend days (Friday, Saturday, Sunday)
            daysUntilFriday = -2;
          } else {
            // Monday to Thursday - calculate days until Friday
            daysUntilFriday = 5 - dayOfWeek;
          }
          
          const nextFriday = new Date(today);
          nextFriday.setDate(today.getDate() + daysUntilFriday);
          
          const nextMonday = new Date(nextFriday);
          nextMonday.setDate(nextFriday.getDate() + 3); // Friday + 3 = Monday
          
          return eventDateOnly >= nextFriday && eventDateOnly < nextMonday;
          
        case 'next-week':
          const nextWeekStart = new Date(today);
          nextWeekStart.setDate(nextWeekStart.getDate() + 7);
          const nextWeekEnd = new Date(nextWeekStart);
          nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
          return eventDateOnly >= nextWeekStart && eventDateOnly < nextWeekEnd;
          
        default:
          return true;
      }
    });
  };

  // Filter events by category and date
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
    
    // Apply date filter
    setFilteredEvents({
      personalized: filterEventsByDate(categoryFiltered.personalized, selectedDateFilter),
      trending: filterEventsByDate(categoryFiltered.trending, selectedDateFilter),
      weekend: filterEventsByDate(categoryFiltered.weekend, selectedDateFilter),
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
                setSelectedCategory(selectedCategory === cat ? null : cat);
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
            <section className="mb-16" aria-label="Personalized event recommendations">
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
