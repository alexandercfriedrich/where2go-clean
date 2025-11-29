'use client';

/**
 * Trending Page Client Component
 * Handles filtering for trending events
 */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { DiscoveryNav } from '@/components/discovery/DiscoveryNav';
import { LocationBar } from '@/components/discovery/LocationBar';
import { EventCard } from '@/components/EventCard';
import { matchesCategory } from '../../../lib/events/category-utils';
import { filterEventsByDateRange, filterOutPastEvents } from '../../../lib/utils/eventDateFilter';

interface TrendingClientProps {
  initialEvents: any[];
  city: string;
}

export function TrendingClient({ initialEvents, city }: TrendingClientProps) {
  const searchParams = useSearchParams();
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');

  // Read filters from URL
  const urlCategories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
  const urlDateRange = searchParams.get('dateRange') || searchParams.get('date') || 'all';
  const urlFreeOnly = searchParams.get('free') === 'true';
  const urlMinPrice = parseInt(searchParams.get('minPrice') || '0');
  const urlMaxPrice = parseInt(searchParams.get('maxPrice') || '100');

  useEffect(() => {
    setSelectedDateFilter(urlDateRange);
  }, [urlDateRange]);

  // Filter events based on URL parameters - uses shared utility for date filtering
  const filteredEvents = useMemo(() => {
    // First, filter out past events using shared utility
    let filtered = filterOutPastEvents(initialEvents);

    // Category filter
    if (urlCategories.length > 0) {
      filtered = filtered.filter((event: any) => 
        event.category && urlCategories.some(cat => matchesCategory(event.category, cat))
      );
    }

    // Free only filter
    if (urlFreeOnly) {
      filtered = filtered.filter((event: any) => 
        event.price === 0 || event.price === '0' || event.price === 'Free' || !event.price
      );
    }

    // Price range filter
    if (!urlFreeOnly && (urlMinPrice > 0 || urlMaxPrice < 100)) {
      filtered = filtered.filter((event: any) => {
        const price = typeof event.price === 'number' ? event.price : parseFloat(event.price) || 0;
        return price >= urlMinPrice && price <= urlMaxPrice;
      });
    }

    // Apply date filter using shared utility
    return filterEventsByDateRange(filtered, selectedDateFilter);
  }, [initialEvents, urlCategories, urlFreeOnly, urlMinPrice, urlMaxPrice, selectedDateFilter]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <DiscoveryNav />
        <LocationBar 
          initialCity={city}
        />
        
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
              🔥 Trending Now
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Popular events everyone is talking about
              {urlCategories.length > 0 && ` • Filtered by: ${urlCategories.join(', ')}`}
              {selectedDateFilter !== 'all' && ` • Date: ${selectedDateFilter}`}
            </p>
          </div>
          
          {/* Events Grid */}
          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredEvents.map((event: any) => (
                <EventCard key={event.id} event={event} city={city} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                No trending events found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {urlCategories.length > 0 || selectedDateFilter !== 'all'
                  ? 'Try adjusting your filters to see more events'
                  : `Check back soon for popular events in ${city}`}
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
