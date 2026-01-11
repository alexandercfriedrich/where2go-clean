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
import { getImageUrl } from '@/lib/utils/imageProxy';

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
  const rawEventImage = event.image_urls && event.image_urls.length > 0
    ? event.image_urls[0]
    : event.imageUrl || getVenueFallbackImage(venue);
  
  // Apply image proxy to external URLs for better reliability
  const eventImage = getImageUrl(rawEventImage);
  
  // Check if we have a valid image or need to show title fallback
  const showTitleFallback = !hasValidImage(eventImage);
  const fallbackColor = getFallbackColor(event.title);

  const cardContent = (
    <div className="mini-event-card group">
      {/* Event Image with Liquid Glass Effect */}
      <div 
        className="mini-event-image"
        style={{
          backgroundImage: !showTitleFallback && eventImage 
            ? `url(${eventImage})` 
            : undefined,
          backgroundColor: showTitleFallback ? fallbackColor : undefined,
        }}
      >
        {showTitleFallback && (
          <h4 className="mini-event-fallback-title">
            {event.title}
          </h4>
        )}
      </div>

      {/* Glassmorphismus-Overlay */}
      <div className="mini-event-glass-overlay"></div>

      {/* Gradient Overlay für Textlesbarkeit */}
      <div className="mini-event-gradient-overlay"></div>

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
