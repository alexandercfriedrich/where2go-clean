/**
 * Mini Event Card Component
 * 
 * Compact version of EventCard for grid layouts with 6 cards per row.
 * Designed for weekend nightlife section on Discovery page.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { normalizeCitySlug } from '@/lib/slugGenerator';

export interface MiniEventCardProps {
  event: {
    id?: string;
    title: string;
    venue?: string;
    custom_venue_name?: string;
    start_date_time?: string;
    time?: string;
    imageUrl?: string;
    image_urls?: string[];
    slug?: string;
  };
  city?: string;
}

// Helper to parse time from ISO datetime
function getEventTime(event: any): string | null {
  if (event.time) {
    if (event.time === '00:00:01' || event.time === 'ganztags') {
      return null;
    }
    return event.time;
  }
  if (event.start_date_time) {
    try {
      const date = new Date(event.start_date_time);
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const seconds = date.getUTCSeconds();
      if (hours === 0 && minutes === 0 && seconds === 1) {
        return null;
      }
      return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  }
  return null;
}

export function MiniEventCard({ event, city = 'Wien' }: MiniEventCardProps) {
  const venue = (event as any).custom_venue_name || event.venue || '';
  const eventTime = getEventTime(event);
  
  const databaseSlug = event.slug;
  const citySlug = normalizeCitySlug(city);
  const eventDetailUrl = databaseSlug ? `/events/${citySlug}/${databaseSlug}` : null;
  
  // Get first image from image_urls array or use imageUrl field
  const eventImage = event.image_urls && event.image_urls.length > 0
    ? event.image_urls[0]
    : event.imageUrl;

  const cardContent = (
    <div className="mini-event-card group">
      {/* Event Image */}
      <div 
        className="mini-event-image"
        style={{
          backgroundImage: eventImage 
            ? `url(${eventImage})` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        {/* Time overlay */}
        {eventTime && (
          <div className="mini-event-time">
            {eventTime}
          </div>
        )}
      </div>

      {/* Event Content */}
      <div className="mini-event-content">
        <h4 className="mini-event-title">
          {event.title}
        </h4>
        {venue && (
          <p className="mini-event-venue">
            {venue}
          </p>
        )}
      </div>
    </div>
  );

  if (eventDetailUrl) {
    return (
      <Link href={eventDetailUrl} className="block">
        {cardContent}
      </Link>
    );
  }

  return <div className="block">{cardContent}</div>;
}
