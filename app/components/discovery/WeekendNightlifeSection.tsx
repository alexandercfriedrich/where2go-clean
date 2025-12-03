/**
 * Weekend Nightlife Section Component
 * 
 * Displays Clubs & Nachtleben events from venue scrapers for the coming weekend.
 * Events are grouped by day (Friday, Saturday, Sunday) with 6 events per row.
 * Events are prioritized by venue order: Grelle Forelle, Pratersauna, Flex, das Werk, U4, o-klub
 * Mobile users can swipe horizontally to see more events.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { MiniEventCard } from '@/components/MiniEventCard';

interface WeekendNightlifeSectionProps {
  events: {
    friday: any[];
    saturday: any[];
    sunday: any[];
  };
  city?: string;
}

// Priority order for venues - events from these venues appear first
const PRIORITY_VENUES = [
  'grelle forelle',
  'pratersauna', 
  'flex',
  'das werk',
  'u4',
  'o der klub',
];

// Utility to normalize venue names for comparison
function normalizeVenueName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[\s\-]+/g, ' ') // replace hyphens and multiple spaces with single space
    .replace(/[^\w\s]/g, '')  // remove special characters except spaces
    .trim();
}

// Sort events by venue priority (preferred venues first), then by whether they have images
function sortEventsByPriority(events: any[]): any[] {
  return [...events].sort((a, b) => {
    const venueA = normalizeVenueName(a.custom_venue_name || a.venue || '');
    const venueB = normalizeVenueName(b.custom_venue_name || b.venue || '');
    
    const priorityA = PRIORITY_VENUES.findIndex(v => venueA.includes(v));
    const priorityB = PRIORITY_VENUES.findIndex(v => venueB.includes(v));
    
    // Priority venues first (lower index = higher priority)
    if (priorityA !== -1 && priorityB === -1) return -1;
    if (priorityA === -1 && priorityB !== -1) return 1;
    if (priorityA !== -1 && priorityB !== -1) {
      if (priorityA !== priorityB) return priorityA - priorityB;
    }
    
    // Then prioritize events with images
    const hasImageA = !!(a.image_urls?.length || a.imageUrl);
    const hasImageB = !!(b.image_urls?.length || b.imageUrl);
    if (hasImageA && !hasImageB) return -1;
    if (!hasImageA && hasImageB) return 1;
    
    return 0;
  });
}

// Format date as "Fr, 06.12."
function formatDayDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'short',
    day: '2-digit', 
    month: '2-digit' 
  };
  return date.toLocaleDateString('de-DE', options);
}

// Get weekend dates
function getWeekendDates(): { friday: Date; saturday: Date; sunday: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // If it's already the weekend (Fri/Sat/Sun), use this weekend
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (dayOfWeek === 5) {
    daysUntilFriday = 0;
  } else if (dayOfWeek === 6) {
    daysUntilFriday = -1;
  } else if (dayOfWeek === 0) {
    daysUntilFriday = -2;
  }
  
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);
  
  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);
  
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  
  return { friday, saturday, sunday };
}

// Component for a single day's events with show more functionality
function DaySection({ 
  dayName, 
  date, 
  events, 
  city 
}: { 
  dayName: string; 
  date: Date; 
  events: any[]; 
  city: string;
}) {
  const [showAll, setShowAll] = useState(false);
  
  // Memoize sorted events to avoid re-sorting on every render
  const sortedEvents = useMemo(() => sortEventsByPriority(events), [events]);
  
  // Show 6 events initially, all when expanded
  const visibleEvents = showAll ? sortedEvents : sortedEvents.slice(0, 6);
  const hasMore = sortedEvents.length > 6;
  
  if (events.length === 0) return null;
  
  return (
    <div className="weekend-day-section">
      <h3 className="weekend-day-title">
        {dayName} <span className="day-date">{formatDayDate(date)}</span>
      </h3>
      
      {/* Scrollable container for mobile, grid for desktop */}
      <div className="weekend-events-container">
        <div className={`weekend-events-grid ${showAll ? 'weekend-events-expanded' : ''}`}>
          {visibleEvents.map((event, index) => (
            <MiniEventCard 
              key={event.id || `${dayName.toLowerCase()}-${index}`} 
              event={event} 
              city={city} 
            />
          ))}
        </div>
        
        {/* Show more button */}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="weekend-show-more-btn"
            aria-expanded={showAll}
            aria-label={`${showAll ? 'Weniger' : 'Mehr'} ${dayName} Events anzeigen`}
          >
            {showAll ? 'Weniger anzeigen' : `+${sortedEvents.length - 6} mehr anzeigen`}
          </button>
        )}
      </div>
    </div>
  );
}

export function WeekendNightlifeSection({ events, city = 'Wien' }: WeekendNightlifeSectionProps) {
  const dates = getWeekendDates();
  
  const hasGroupedEvents = events.friday.length > 0 || events.saturday.length > 0 || events.sunday.length > 0;
  
  // If no events at all, don't render anything
  if (!hasGroupedEvents) {
    return null;
  }

  return (
    <section className="weekend-nightlife-section mb-16" aria-label="Weekend Nightlife Events">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🎵 Clubs & Nachtleben</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Die besten Club-Events dieses Wochenende</p>
      </div>

      <DaySection 
        dayName="Freitag" 
        date={dates.friday} 
        events={events.friday} 
        city={city} 
      />
      
      <DaySection 
        dayName="Samstag" 
        date={dates.saturday} 
        events={events.saturday} 
        city={city} 
      />
      
      <DaySection 
        dayName="Sonntag" 
        date={dates.sunday} 
        events={events.sunday} 
        city={city} 
      />
    </section>
  );
}
