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
import { getFallbackColor, hasValidImage } from '@/lib/eventImageFallback';

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
  
  // Check if we have a valid image or need to show title fallback
  const showTitleFallback = !hasValidImage(eventImage);
  const fallbackColor = getFallbackColor(event.title);

  const cardContent = (
    <div className="mini-event-card group">
      {/* Event Image with overlay and venue */}
      <div 
        className="mini-event-image"
        style={{
          backgroundImage: !showTitleFallback && eventImage 
            ? `url(${eventImage})` 
            : undefined,
          backgroundColor: showTitleFallback ? fallbackColor : undefined,
        }}
      >
        {/* Dark overlay for better text readability */}
        {!showTitleFallback && (
          <div className="mini-event-image-overlay" />
        )}
        
        {showTitleFallback && (
          <h4 className="mini-event-fallback-title">
            {event.title}
          </h4>
        )}
        
        {/* Venue overlay at bottom of image */}
        {venue && !showTitleFallback && (
          <div className="mini-event-venue-overlay">
            {venue}
          </div>
        )}
      </div>

      {/* Event Content */}
      <div className="mini-event-content">
        <h4 className="mini-event-title">
          {event.title}
        </h4>
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
