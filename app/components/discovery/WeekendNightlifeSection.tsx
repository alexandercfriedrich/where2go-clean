/**
 * Weekend Nightlife Section Component
 * 
 * Displays Clubs & Nachtleben events from venue scrapers for the coming weekend.
 * Events are grouped by day (Friday, Saturday, Sunday) with 6 events per row.
 */

'use client';

import React from 'react';
import { MiniEventCard } from '@/components/MiniEventCard';

interface WeekendNightlifeSectionProps {
  events: {
    friday: any[];
    saturday: any[];
    sunday: any[];
  };
  city?: string;
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
  
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0 && dayOfWeek === 5) {
    daysUntilFriday = 0;
  } else if (daysUntilFriday === 0) {
    daysUntilFriday = 7;
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

export function WeekendNightlifeSection({ events, city = 'Wien' }: WeekendNightlifeSectionProps) {
  const dates = getWeekendDates();
  
  const hasEvents = events.friday.length > 0 || events.saturday.length > 0 || events.sunday.length > 0;
  
  if (!hasEvents) {
    return null;
  }

  return (
    <section className="weekend-nightlife-section" aria-label="Weekend Nightlife Events">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">🎵 Clubs & Nachtleben</h2>
        <p className="text-gray-400 text-sm">Die besten Club-Events dieses Wochenende</p>
      </div>

      {/* Friday */}
      {events.friday.length > 0 && (
        <div className="weekend-day-section">
          <h3 className="weekend-day-title">
            Freitag <span className="day-date">{formatDayDate(dates.friday)}</span>
          </h3>
          <div className="weekend-events-grid">
            {events.friday.map((event, index) => (
              <MiniEventCard 
                key={event.id || `friday-${index}`} 
                event={event} 
                city={city} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Saturday */}
      {events.saturday.length > 0 && (
        <div className="weekend-day-section">
          <h3 className="weekend-day-title">
            Samstag <span className="day-date">{formatDayDate(dates.saturday)}</span>
          </h3>
          <div className="weekend-events-grid">
            {events.saturday.map((event, index) => (
              <MiniEventCard 
                key={event.id || `saturday-${index}`} 
                event={event} 
                city={city} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Sunday */}
      {events.sunday.length > 0 && (
        <div className="weekend-day-section">
          <h3 className="weekend-day-title">
            Sonntag <span className="day-date">{formatDayDate(dates.sunday)}</span>
          </h3>
          <div className="weekend-events-grid">
            {events.sunday.map((event, index) => (
              <MiniEventCard 
                key={event.id || `sunday-${index}`} 
                event={event} 
                city={city} 
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
