'use client';

/**
 * For You Page Client Component
 * Handles filtering for personalized events
 */

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { DiscoveryNav } from '@/components/discovery/DiscoveryNav';
import { LocationBar } from '@/components/discovery/LocationBar';
import { EventCard } from '@/components/EventCard';
import { matchesCategory } from '../../../lib/events/category-utils';

interface ForYouClientProps {
  initialEvents: any[];
  city: string;
}

export function ForYouClient({ initialEvents, city }: ForYouClientProps) {
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

  // Filter events based on URL parameters - always excludes past events
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // First, always filter out past events
    let filtered = initialEvents.filter((event: any) => {
      const eventDate = event.start_date_time 
        ? new Date(event.start_date_time)
        : event.date 
          ? new Date(event.date)
          : null;
      
      if (!eventDate) return false;
      
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      return eventDateOnly >= today;
    });

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

    // Date filter (only apply if not 'all')
    if (selectedDateFilter !== 'all') {
      filtered = filtered.filter((event: any) => {
        const eventDate = event.start_date_time 
          ? new Date(event.start_date_time)
          : event.date 
            ? new Date(event.date)
            : null;
        
        if (!eventDate) return false;
        
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        
        switch (selectedDateFilter) {
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
          case 'this-weekend':
            const dayOfWeek = today.getDay();
            let daysUntilFriday: number;
            
            if (dayOfWeek === 5) daysUntilFriday = 0;
            else if (dayOfWeek === 6) daysUntilFriday = -1;
            else if (dayOfWeek === 0) daysUntilFriday = -2;
            else daysUntilFriday = 5 - dayOfWeek;
            
            const nextFriday = new Date(today);
            nextFriday.setDate(today.getDate() + daysUntilFriday);
            
            const nextMonday = new Date(nextFriday);
            nextMonday.setDate(nextFriday.getDate() + 3);
            
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
    }

    return filtered;
  }, [initialEvents, urlCategories, urlFreeOnly, urlMinPrice, urlMaxPrice, selectedDateFilter]);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <DiscoveryNav />
        <LocationBar 
          initialCity={city} 
          onDateFilterChange={setSelectedDateFilter}
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
              For You
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Personalized recommendations based on your interests and preferences
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
                No personalized events found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {urlCategories.length > 0 || selectedDateFilter !== 'all'
                  ? 'Try adjusting your filters to see more events'
                  : 'Browse more events to help us learn your preferences!'}
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
