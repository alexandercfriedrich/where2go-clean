/**
 * Mini Event Card SSR Component
 * 
 * Server-Side Rendered compact version of EventCard for grid layouts with 6 cards per row.
 * Designed for weekend nightlife section on Discovery page.
 * This is a Server Component (no 'use client' directive) - visible to AI crawlers.
 */

import React from 'react';
import Link from 'next/link';
import { normalizeCitySlug } from '@/lib/slugGenerator';
import { getVenueFallbackImage } from '@/lib/venueFallbackImages';
import { getFallbackColor, hasValidImage } from '@/lib/eventImageFallback';

export interface MiniEventCardSSRProps {
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
    category?: string;
  };
  city?: string;
}

export default function MiniEventCardSSR({ event, city = 'Wien' }: MiniEventCardSSRProps) {
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
    <div 
      className="mini-event-card group"
      itemScope
      itemType="https://schema.org/Event"
      aria-label={`Event: ${event.title}${venue ? ` bei ${venue}` : ''}`}
    >
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
        <h4 className="mini-event-title" itemProp="name">
          {event.title}
        </h4>
        {venue && (
          <p 
            className="mini-event-venue"
            itemProp="location"
            itemScope
            itemType="https://schema.org/Place"
          >
            <span itemProp="name">{venue}</span>
          </p>
        )}
      </div>
      
      {/* Hidden metadata for Schema.org */}
      {event.start_date_time && (
        <meta itemProp="startDate" content={event.start_date_time.split('T')[0]} />
      )}
      {event.category && <meta itemProp="genre" content={event.category} />}
      {eventImage && !showTitleFallback && <meta itemProp="image" content={eventImage} />}
      <meta itemProp="eventStatus" content="https://schema.org/EventScheduled" />
      <meta itemProp="eventAttendanceMode" content="https://schema.org/OfflineEventAttendanceMode" />
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
