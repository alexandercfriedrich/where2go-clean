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
      // Extract time directly from ISO timestamp using regex (same as EventRepository)
      // This avoids timezone conversion issues
      const timeMatch = event.start_date_time.match(/T(\d{2}:\d{2})/);
      if (timeMatch) {
        const time = timeMatch[1];
        // Only treat 00:00:01 as all-day (the Supabase marker)
        if (time === '00:00' && event.start_date_time.includes(':01')) {
          return null; // Will display as "ganztags"
        }
        return time;
      }
      
      // Fallback to Date parsing with explicit UTC timezone
      const date = new Date(event.start_date_time);
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const seconds = date.getUTCSeconds();
      // Only treat 00:00:01 as all-day (the Supabase marker)
      if (hours === 0 && minutes === 0 && seconds === 1) {
        return null; // Will display as "ganztags"
      }
      // Format with explicit UTC timezone to avoid local timezone conversion
      const timeStr = date.toLocaleTimeString('de-DE', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'UTC'
      });
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

  // Common card content - extracted to avoid duplication
  const cardContent = (
    <div className="dark-event-card">
      {/* Source Badge - Always Visible */}
      <div className="dark-event-source-badge">
        {sourceDisplay}
      </div>

      {/* Event Image */}
      <div 
        className="dark-event-card-image"
        style={{
          backgroundImage: !showTitleFallback && eventImage 
            ? `url(${eventImage})` 
            : undefined,
          backgroundColor: showTitleFallback ? fallbackColor : undefined,
          minHeight: '240px',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: showTitleFallback ? 'flex' : undefined,
          alignItems: showTitleFallback ? 'center' : undefined,
          justifyContent: showTitleFallback ? 'center' : undefined,
          padding: showTitleFallback ? '24px' : undefined,
        }}
      >
        {showTitleFallback && (
          <h3 className="event-fallback-title">
            {event.title}
          </h3>
        )}
      </div>

      {/* Event Content */}
      <div className="dark-event-content">
        {/* Category Badge */}
        {event.category && (
          <span className="dark-event-category">
            {event.category}
          </span>
        )}

        {/* Title */}
        <h3 className={`dark-event-title transition-colors ${eventDetailUrl ? 'hover:text-brand-turquoise cursor-pointer' : ''}`} style={eventDetailUrl ? { '--hover-color': '#20B8CD' } as React.CSSProperties : undefined}>
          {event.title}
        </h3>

        {/* Event Details with Icons */}
        <div className="dark-event-details">
          {/* Date */}
          {displayDate && (
            <div className="dark-event-detail">
              <svg className="dark-event-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{displayDate}</span>
            </div>
          )}

          {/* Time */}
          <div className="dark-event-detail">
            <svg className="dark-event-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span {...(!eventTime && { 'aria-label': 'Ganztägige Veranstaltung' })}>
              {eventTime ? `${eventTime} Uhr` : 'ganztags'}
            </span>
          </div>

          {/* Venue (clickable to Google Maps) */}
          {venue && (
            <div className="dark-event-detail">
              <svg className="dark-event-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue + (event.address ? ', ' + event.address : ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="dark-event-venue-link"
                onClick={(e) => e.stopPropagation()}
              >
                {venue}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px', opacity: 0.6, display: 'inline' }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="dark-event-description">
            {event.description}
          </p>
        )}

        {/* Price */}
        <div className="dark-event-price">
          {priceDisplay}
        </div>

        {/* Info and Ticket Links */}
        {showButtons && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {/* Mehr Info button - subtle, less dominant styling */}
            <a
              href={event.website || `/event/${eventId}`}
              {...(event.website && { target: "_blank", rel: "noopener noreferrer" })}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-transparent border border-gray-400 dark:border-gray-500 text-gray-600 dark:text-gray-300 text-xs font-normal rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Mehr Info
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
            {/* Ticket button - only when bookingLink is available */}
            {event.bookingLink && (
              <a
                href={event.bookingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-white text-sm font-medium rounded-md transition-colors"
                style={{ backgroundColor: '#20B8CD' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#218090'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#20B8CD'}
                onClick={(e) => e.stopPropagation()}
              >
                Tickets
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="mt-2 flex items-center gap-2 flex-wrap" onClick={(e) => e.preventDefault()}>
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
