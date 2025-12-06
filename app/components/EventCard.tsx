/**
 * Unified Event Card Component
 * 
 * Single source of truth for event card design across the entire application.
 * Used on: Discovery pages, City pages, Venue pages, Guide pages, Search results
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { normalizeCitySlug } from '@/lib/slugGenerator';
import { getVenueFallbackImage } from '@/lib/venueFallbackImages';
import { getFallbackColor, hasValidImage } from '@/lib/eventImageFallback';
import { AddToCalendar } from './discovery/AddToCalendar';
import { ShareButtons } from './discovery/ShareButtons';
import { FavoriteButton } from './discovery/FavoriteButton';
import type { EventData } from '@/lib/types';

/**
 * Universal event interface that accepts both EventData and database event formats
 */
export interface UnifiedEventCardProps {
  event: EventData | {
    id?: string;
    title: string;
    category?: string;
    date?: string;
    time?: string;
    venue?: string;
    address?: string;
    description?: string;
    price?: string;
    imageUrl?: string;
    image_urls?: string[];
    source?: string;
    start_date_time?: string;
    end_date_time?: string;
    price_min?: number | null;
    price_max?: number | null;
    is_free?: boolean;
    custom_venue_name?: string;
    website?: string;
    bookingLink?: string;
    slug?: string;
  };
  city?: string;
  /** Optional: Show/hide action buttons (favorite, calendar, share) */
  showActions?: boolean;
  /** Optional: Show/hide info/ticket buttons */
  showButtons?: boolean;
}

// Helper function to format date in German format
function formatGermanDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('de-DE', options);
  } catch {
    return dateStr;
  }
}

// Helper to parse time from ISO datetime or separate time field
function getEventTime(event: any): string | null {
  if (event.time) {
    // Check if time should be treated as all-day
    // Only 00:00:01 is recognized as the all-day marker for data integrity
    if (event.time === '00:00:01' || event.time === 'ganztags') {
      return null; // Will display as "ganztags"
    }
    return event.time;
  }
  if (event.start_date_time) {
    try {
      const date = new Date(event.start_date_time);
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const seconds = date.getUTCSeconds();
      // Only treat 00:00:01 as all-day (the Supabase marker)
      if (hours === 0 && minutes === 0 && seconds === 1) {
        return null; // Will display as "ganztags"
      }
      const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      return timeStr;
    } catch {
      return null;
    }
  }
  return null;
}

// Helper to get display date
function getEventDate(event: any): string {
  if (event.date) return event.date;
  if (event.start_date_time) {
    try {
      const date = new Date(event.start_date_time);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
  return '';
}

// Generate a unique ID for events without one
function generateEventId(event: any): string {
  if (event.id) return event.id;
  // Create a hash-like string from event properties for uniqueness
  const base = `${event.title || ''}-${event.venue || ''}-${event.date || ''}`;
  // Add a simple hash to help ensure uniqueness
  const hash = base.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return `${base.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()}-${hash}`;
}

export function EventCard({ 
  event, 
  city = 'Wien',
  showActions = true,
  showButtons = true
}: UnifiedEventCardProps) {
  const venue = (event as any).custom_venue_name || event.venue || '';
  const eventDate = getEventDate(event);
  const eventTime = getEventTime(event);
  const displayDate = eventDate ? formatGermanDate(eventDate) : '';
  
  // IMPORTANT: Only use slug from database to prevent URL mismatch
  // Database slugs include a UUID suffix (e.g., "event-title-2025-12-03-abc12345")
  // Generating slugs on-the-fly creates mismatched URLs without the UUID suffix
  const databaseSlug = (event as any).slug;
  
  // Log error if slug is missing (this should never happen)
  if (!databaseSlug) {
    console.error(
      `[EVENTCARD] Event missing database slug - card will be non-clickable:`,
      {
        eventId: (event as any).id,
        eventTitle: event.title,
        eventDate: eventDate,
        eventVenue: venue,
        city: city,
      }
    );
  }
  
  const citySlug = normalizeCitySlug(city);
  
  // Event detail page URL - only set if we have a valid database slug
  const eventDetailUrl = databaseSlug ? `/events/${citySlug}/${databaseSlug}` : null;
  
  // Get first image from image_urls array or use imageUrl field
  // If no event image, fall back to venue logo image
  const imageUrls = 'image_urls' in event ? event.image_urls : undefined;
  const eventImage = imageUrls && imageUrls.length > 0
    ? imageUrls[0]
    : event.imageUrl || getVenueFallbackImage(venue);
  
  // Price display - check multiple fields that might contain price information
  let priceDisplay = 'Preis auf Anfrage';
  if ((event as any).is_free) {
    priceDisplay = 'Kostenlos';
  } else if (event.price && event.price !== 'Preis auf Anfrage') {
    priceDisplay = event.price;
  } else if ((event as any).price_info && (event as any).price_info !== 'Preis auf Anfrage') {
    priceDisplay = (event as any).price_info;
  } else if ((event as any).price_min !== null && (event as any).price_min !== undefined) {
    if ((event as any).price_max && (event as any).price_max !== (event as any).price_min) {
      priceDisplay = `€${(event as any).price_min} - €${(event as any).price_max}`;
    } else if ((event as any).price_min > 0) {
      priceDisplay = `ab €${(event as any).price_min}`;
    } else {
      priceDisplay = 'Kostenlos';
    }
  } else if ((event as any).ticketPrice) {
    priceDisplay = (event as any).ticketPrice;
  }

  // Map source to display text
  const sourceDisplay = event.source === 'rss' ? 'RSS' :
    event.source === 'ai' ? 'KI' :
    event.source === 'ra' ? 'API' :
    event.source === 'wien-info' ? 'Wien.info' :
    event.source === 'cache' ? 'Cache' :
    event.source || 'Event';

  // Generate a stable ID for action buttons
  const eventId = generateEventId(event);
  
  // Check if we have a valid image or need to show title fallback
  const showTitleFallback = !hasValidImage(eventImage);
  const fallbackColor = getFallbackColor(event.title);

  // Common card content - maja-event.com inspired design
  const cardContent = (
    <div className="maja-event-card">
      {/* Top Section: Image with overlaid info */}
      <div 
        className="maja-event-image-section"
        style={{
          backgroundImage: !showTitleFallback && eventImage 
            ? `url(${eventImage})` 
            : undefined,
          backgroundColor: showTitleFallback ? fallbackColor : undefined,
        }}
      >
        {showTitleFallback && (
          <div className="maja-event-fallback-title">
            {event.title}
          </div>
        )}
        
        {/* Event info overlay on image */}
        {!showTitleFallback && (
          <div className="maja-event-image-overlay">
            {/* Event category or type at top */}
            {event.category && (
              <div className="maja-event-image-category">
                {event.category}
              </div>
            )}
            
            {/* Date badge */}
            {displayDate && (
              <div className="maja-event-image-date-badge">
                {displayDate.split('.')[1]?.trim().toUpperCase() || ''} {displayDate.split('.')[0]}
              </div>
            )}
            
            {/* Event title on image */}
            <h3 className="maja-event-image-title">
              {event.title}
            </h3>
            
            {/* Venue on image */}
            {venue && (
              <div className="maja-event-image-venue">
                {venue}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Content with gray/blue background */}
      <div className="maja-event-content-section">
        {/* Title (repeated for accessibility) */}
        <h3 className="maja-event-content-title">
          {event.title}
        </h3>

        {/* Date, Time and Location in one line */}
        <div className="maja-event-content-meta">
          <span className="maja-event-meta-item">
            {displayDate}
          </span>
          {eventTime && (
            <>
              <span className="maja-event-meta-separator">|</span>
              <span className="maja-event-meta-item">
                {eventTime} Uhr
              </span>
            </>
          )}
          {venue && (
            <>
              <span className="maja-event-meta-separator">|</span>
              <span className="maja-event-meta-item">
                {venue}
              </span>
            </>
          )}
        </div>

        {/* Action Button - Prominent CTA */}
        {showButtons && (
          <div className="maja-event-cta-container">
            {event.bookingLink ? (
              <a
                href={event.bookingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="maja-event-cta-button"
                onClick={(e) => e.stopPropagation()}
              >
                TICKET
              </a>
            ) : (
              <a
                href={event.website || eventDetailUrl || '#'}
                {...(event.website && { target: "_blank", rel: "noopener noreferrer" })}
                className="maja-event-cta-button maja-event-cta-button-secondary"
                onClick={(e) => e.stopPropagation()}
              >
                DETAILS
              </a>
            )}
          </div>
        )}

        {/* Additional action buttons (optional, hidden by default for maja design) */}
        {showActions && (
          <div className="mt-2 flex items-center gap-2 flex-wrap opacity-60 hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
            <FavoriteButton eventId={eventId} size="sm" />
            <AddToCalendar event={event} size="sm" />
            <ShareButtons 
              event={event} 
              url={`https://www.where2go.at/event/${eventId}`}
              size="sm"
            />
          </div>
        )}
      </div>

      {/* Source Badge - Minimal, top-right corner */}
      <div className="maja-event-source-badge">
        {sourceDisplay}
      </div>
    </div>
  );

  // Only render as a link if we have a valid database slug
  // This prevents URL mismatch when slug is missing
  if (eventDetailUrl) {
    return (
      <Link href={eventDetailUrl} className="block">
        {cardContent}
      </Link>
    );
  }

  // Render as a non-clickable div when slug is missing
  return (
    <div className="block">
      {cardContent}
    </div>
  );
}
