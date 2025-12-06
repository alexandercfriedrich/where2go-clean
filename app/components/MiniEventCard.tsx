/**
 * Mini Event Card Component
 * 
 * Compact version of EventCard for grid layouts with 6 cards per row.
 * Designed for weekend nightlife section on Discovery page.
 * Note: Time is intentionally not displayed on mini event cards per design requirements.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { normalizeCitySlug } from '@/lib/slugGenerator';
import { getVenueFallbackImage } from '@/lib/venueFallbackImages';

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

export function MiniEventCard({ event, city = 'Wien' }: MiniEventCardProps) {
  const venue = event.custom_venue_name || event.venue || '';
  
  const databaseSlug = event.slug;
  const citySlug = normalizeCitySlug(city);
  const eventDetailUrl = databaseSlug ? `/events/${citySlug}/${databaseSlug}` : null;
  
  // Get first image from image_urls array or use imageUrl field
  // If no event image, fall back to venue logo image
  const eventImage = event.image_urls && event.image_urls.length > 0
    ? event.image_urls[0]
    : event.imageUrl || getVenueFallbackImage(venue);

  const cardContent = (
    <div className="mini-event-card group">
      {/* Event Image - no time overlay per design requirements */}
      <div 
        className="mini-event-image"
        style={{
          backgroundImage: eventImage 
            ? `url(${eventImage})` 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      />

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
