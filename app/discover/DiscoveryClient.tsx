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
import { EventCard } from '@/components/discovery/EventCard';

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

  // Helper function to filter events by date
  const filterEventsByDate = (events: any[], filter: string) => {
    if (filter === 'all') return events;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return events.filter((event: any) => {
      const eventDate = event.start_date_time 
        ? new Date(event.start_date_time)
        : event.date 
          ? new Date(event.date)
          : null;
      
      if (!eventDate) return false;
      
      switch (filter) {
        case 'today':
          return eventDate.toDateString() === today.toDateString();
          
        case 'this-week':
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return eventDate >= today && eventDate < weekEnd;
          
        case 'weekend':
          const nextSaturday = new Date(today);
          nextSaturday.setDate(nextSaturday.getDate() + ((6 - today.getDay() + 7) % 7));
          const nextMonday = new Date(nextSaturday);
          nextMonday.setDate(nextMonday.getDate() + 2);
          return eventDate >= nextSaturday && eventDate < nextMonday;
          
        case 'next-week':
          const nextWeekStart = new Date(today);
          nextWeekStart.setDate(nextWeekStart.getDate() + 7);
          const nextWeekEnd = new Date(nextWeekStart);
          nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
          return eventDate >= nextWeekStart && eventDate < nextWeekEnd;
          
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
        
        {/* Location Bar */}
        <LocationBar 
          initialCity={city}
          onCityChange={(newCity) => console.log('City changed:', newCity)}
          onDateFilterChange={(filter) => setSelectedDateFilter(filter)}
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
          {/* Category Browser */}
          <section className="mb-16">
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

          {/* For You Section */}
          {filteredEvents.personalized.length > 0 && (
            <section className="mb-16">
              <SectionHeader
                title="For You"
                subtitle="Personalized recommendations based on your interests"
                action={{ label: 'See all', href: '/discover/for-you' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredEvents.personalized.slice(0, 8).map((event) => (
                  <EventCard key={event.id} event={event} city={city} />
                ))}
              </div>
            </section>
          )}

          {/* Trending Section */}
          {filteredEvents.trending.length > 0 && (
            <section className="mb-16">
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
            <section className="mb-16">
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
        </div>
      </div>
    </ThemeProvider>
  );
}
