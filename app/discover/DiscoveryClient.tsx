'use client';

/**
 * Discovery Homepage - Client Component
 * Handles client-side interactivity and state
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { SectionHeader } from '@/components/discovery/SectionHeader';
import { Badge } from '@/components/discovery/Badge';
import { getCategoryColor } from '../../lib/events/category-utils';

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

  useEffect(() => {
    setMounted(true);
  }, []);

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
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Discover Events in {city}
            </h1>
            <p className="text-xl text-indigo-100 mb-8">
              Your personalized guide to the best events happening now
            </p>
            
            {/* Simple Search Bar */}
            <div className="max-w-2xl">
              <input
                type="text"
                placeholder="Search events, venues, or categories..."
                className="w-full px-6 py-4 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* For You Section */}
          {initialPersonalizedEvents.length > 0 && (
            <section className="mb-16">
              <SectionHeader
                title="For You"
                subtitle="Personalized recommendations based on your interests"
                action={{ label: 'See all', href: '/discover/for-you' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {initialPersonalizedEvents.slice(0, 8).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {/* Trending Section */}
          {initialTrendingEvents.length > 0 && (
            <section className="mb-16">
              <SectionHeader
                title="Trending Now"
                subtitle="Popular events everyone is talking about"
                action={{ label: 'See all', href: '/discover/trending' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {initialTrendingEvents.slice(0, 8).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {/* Weekend Section */}
          {initialWeekendEvents.length > 0 && (
            <section className="mb-16">
              <SectionHeader
                title="This Weekend"
                subtitle="Plan your perfect weekend"
                action={{ label: 'See all', href: '/discover/weekend' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {initialWeekendEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {/* Fallback message */}
          {initialPersonalizedEvents.length === 0 &&
            initialTrendingEvents.length === 0 &&
            initialWeekendEvents.length === 0 && (
              <div className="text-center py-16">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  No events found
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Check back soon for upcoming events in {city}
                </p>
              </div>
            )}
        </div>
      </div>
    </ThemeProvider>
  );
}

/**
 * Simple Event Card Component
 */
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
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer">
      {/* Image placeholder */}
      <div 
        className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600"
        style={{
          background: event.image_urls?.[0] 
            ? `url(${event.image_urls[0]}) center/cover` 
            : undefined
        }}
      />
      
      {/* Content */}
      <div className="p-4">
        {/* Category Badge */}
        <Badge 
          variant="default" 
          size="sm" 
          className="mb-2"
          style={{ backgroundColor: categoryColor + '20', color: categoryColor }}
        >
          {event.category}
        </Badge>

        {/* Title */}
        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
          {event.title}
        </h3>

        {/* Venue */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
          📍 {event.custom_venue_name || 'Venue TBA'}
        </p>

        {/* Date & Time */}
        <p className="text-sm text-gray-600 dark:text-gray-400">
          🗓 {dateStr} · ⏰ {timeStr}
        </p>

        {/* Price */}
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
    </div>
  );
}
