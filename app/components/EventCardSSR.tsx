/**
 * Server-Side Event Card Component
 * Renders events in the initial HTML for AI crawlers and search engines
 * This is a Server Component (no 'use client' directive)
 */

import React from 'react';
import Link from 'next/link';
import { normalizeCitySlug } from '@/lib/slugGenerator';
import { getVenueFallbackImage } from '@/lib/venueFallbackImages';
import { getFallbackColor, hasValidImage } from '@/lib/eventImageFallback';
import type { EventData } from '@/lib/types';

/**
 * Universal event interface that accepts both EventData and database event formats
 */
export interface EventCardSSRProps {
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
    if (event.time === '00:00:01' || event.time === 'ganztags') {
      return null;
    }
    return event.time;
  }
  if (event.start_date_time) {
    try {
      const timeMatch = event.start_date_time.match(/T(\d{2}:\d{2})/);
      if (timeMatch) {
        const time = timeMatch[1];
        if (time === '00:00' && event.start_date_time.includes(':01')) {
          return null;
        }
        return time;
      }
      const date = new Date(event.start_date_time);
      const hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const seconds = date.getUTCSeconds();
      if (hours === 0 && minutes === 0 && seconds === 1) {
        return null;
      }
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch {
      return null;
    }
  }
  return null;
}

// Get event date
function getEventDate(event: any): string {
  if (event.date) return event.date;
  if (event.start_date_time) {
    return event.start_date_time.split('T')[0];
  }
  return '';
}

// Get venue name
function getVenueName(event: any): string {
  return event.custom_venue_name || event.venue || 'Veranstaltungsort';
}

// Get price display
function getPriceDisplay(event: any): string {
  if (event.is_free) return 'Gratis';
  if (event.price_min !== null && event.price_min !== undefined) {
    if (event.price_max && event.price_max !== event.price_min) {
      return `${event.price_min}€ - ${event.price_max}€`;
    }
    return `Ab ${event.price_min}€`;
  }
  if (event.price) return event.price;
  return 'Preis auf Anfrage';
}

// Get event image
function getEventImage(event: any): string | null {
  // Priority: imageUrl > image_urls[0] > venue fallback
  if (event.imageUrl) {
    return event.imageUrl;
  }
  if (event.image_urls && Array.isArray(event.image_urls) && event.image_urls.length > 0) {
    return event.image_urls[0];
  }
  return getVenueFallbackImage(getVenueName(event));
}

/**
 * Server-Side Rendered Event Card
 * Visible to AI crawlers in initial HTML
 */
export default function EventCardSSR({ event, city = 'Wien' }: EventCardSSRProps) {
  const eventDate = getEventDate(event);
  const eventTime = getEventTime(event);
  const venueName = getVenueName(event);
  const priceDisplay = getPriceDisplay(event);
  const imageUrl = getEventImage(event);
  const fallbackColor = getFallbackColor(event.category || '');

  // Generate event URL
  const citySlug = normalizeCitySlug(city);
  const eventUrl = event.slug 
    ? `/events/${citySlug}/${event.slug}`
    : `/event/${citySlug}/${event.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <article 
      className="event-card-ssr group relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-xl"
      style={{ backgroundColor: 'var(--color-card-bg)', minHeight: '380px' }}
      itemScope
      itemType="https://schema.org/Event"
    >
      <Link href={eventUrl} className="block">
        {/* Event Image */}
        <div className="relative h-48 overflow-hidden">
          {imageUrl && hasValidImage(imageUrl) ? (
            <img
              src={imageUrl}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              itemProp="image"
              loading="lazy"
            />
          ) : (
            <div 
              className="w-full h-full flex items-center justify-center text-white text-6xl font-bold"
              style={{ backgroundColor: fallbackColor }}
              aria-label={`Category: ${event.category}`}
            >
              {event.category?.[0] || '?'}
            </div>
          )}
          
          {/* Category Badge */}
          {event.category && (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
              <span itemProp="genre">{event.category}</span>
            </div>
          )}

          {/* Source Badge */}
          {event.source && (
            <div className="absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium bg-blue-500/90 text-white">
              {event.source}
            </div>
          )}
        </div>

        {/* Event Details */}
        <div className="p-4">
          {/* Title */}
          <h3 
            className="text-lg font-bold mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
            style={{ color: 'var(--color-text)' }}
            itemProp="name"
          >
            {event.title}
          </h3>

          {/* Date & Time */}
          <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <time itemProp="startDate" content={eventDate}>
              {formatGermanDate(eventDate)}
            </time>
            {eventTime && (
              <>
                <span>•</span>
                <time itemProp="startTime" content={eventTime}>{eventTime}</time>
              </>
            )}
            {!eventTime && <span itemProp="startTime" content="00:00:01">ganztags</span>}
          </div>

          {/* Venue */}
          <div 
            className="flex items-center gap-2 text-sm mb-2" 
            style={{ color: 'var(--color-text-secondary)' }}
            itemProp="location"
            itemScope
            itemType="https://schema.org/Place"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="line-clamp-1" itemProp="name">{venueName}</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span itemProp="offers" itemScope itemType="https://schema.org/Offer">
              <meta itemProp="price" content={(event as any).is_free ? '0' : ((event as any).price_min?.toString() || '0')} />
              <meta itemProp="priceCurrency" content="EUR" />
              {priceDisplay}
            </span>
          </div>

          {/* Hidden metadata for Schema.org */}
          {event.website && <meta itemProp="url" content={event.website} />}
          {event.description && <meta itemProp="description" content={event.description} />}
          <meta itemProp="eventStatus" content="https://schema.org/EventScheduled" />
          <meta itemProp="eventAttendanceMode" content="https://schema.org/OfflineEventAttendanceMode" />
        </div>
      </Link>
    </article>
  );
}
