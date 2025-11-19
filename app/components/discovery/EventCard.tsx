/**
 * Discovery Event Card Component
 * Matches the design from city pages with icons and proper date/time display
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { generateEventSlug, normalizeCitySlug } from '@/lib/slugGenerator';
import { AddToCalendar } from './AddToCalendar';
import { ShareButtons } from './ShareButtons';
import { FavoriteButton } from './FavoriteButton';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    category?: string;
    date?: string;
    time?: string;
    venue?: string;
    address?: string;
    description?: string;
    price?: string;
    imageUrl?: string;
    image_urls?: string[]; // Array of images from database
    source?: string;
    start_date_time?: string;
    end_date_time?: string;
    price_min?: number | null;
    price_max?: number | null;
    is_free?: boolean;
    custom_venue_name?: string;
    website?: string;
    bookingLink?: string;
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
    // Check if time should be treated as all-day
    if (event.time === '00:00' || event.time === '01:00' || event.time === 'ganztags') {
      return null; // Will display as "ganztags"
    }
    return event.time;
  }
  if (event.start_date_time) {
    try {
      const date = new Date(event.start_date_time);
      const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      // Treat midnight and 1 AM as all-day events
      if (timeStr === '00:00' || timeStr === '01:00') {
        return null; // Will display as "ganztags"
      }
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

export function EventCard({ event, city = 'Wien' }: EventCardProps) {
  const venue = event.custom_venue_name || event.venue || '';
  const eventDate = getEventDate(event);
  const eventTime = getEventTime(event);
  const displayDate = eventDate ? formatGermanDate(eventDate) : '';
  
  // Generate slug for event detail page link
  const eventSlug = generateEventSlug({
    title: event.title,
    venue: venue,
    date: eventDate
  });
  
  const citySlug = normalizeCitySlug(city);
  
  // Event detail page URL
  const eventDetailUrl = `/events/${citySlug}/${eventSlug}`;
  
  // Get first image from image_urls array or use imageUrl field
  const eventImage = (event as any).image_urls && (event as any).image_urls.length > 0
    ? (event as any).image_urls[0]
    : event.imageUrl;
  
  // Price display
  let priceDisplay = 'Preis auf Anfrage';
  if (event.is_free) {
    priceDisplay = 'Kostenlos';
  } else if (event.price) {
    priceDisplay = event.price;
  } else if (event.price_min !== null && event.price_min !== undefined) {
    if (event.price_max && event.price_max !== event.price_min) {
      priceDisplay = `€${event.price_min} - €${event.price_max}`;
    } else {
      priceDisplay = `ab €${event.price_min}`;
    }
  }

  // Map source to display text
  const sourceDisplay = event.source === 'rss' ? 'RSS' :
    event.source === 'ai' ? 'KI' :
    event.source === 'ra' ? 'API' :
    event.source === 'wien-info' ? 'Wien.info' :
    event.source === 'cache' ? 'Cache' :
    event.source || 'Event';

  return (
    <Link href={eventDetailUrl} className="block">
      <div className="dark-event-card">
        {/* Source Badge - Always Visible */}
        <div className="dark-event-source-badge">
          {sourceDisplay}
        </div>

        {/* Event Image */}
        <div 
          className="dark-event-card-image"
          style={{
            backgroundImage: eventImage 
              ? `url(${eventImage})` 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            minHeight: '240px',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        {/* Event Content */}
        <div className="dark-event-content">
        {/* Category Badge */}
        {event.category && (
          <span className="dark-event-category">
            {event.category}
          </span>
        )}

        {/* Title */}
        <h3 className="dark-event-title hover:text-indigo-400 transition-colors cursor-pointer">
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
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {/* Mehr Info button - always displayed */}
          <a
            href={event.website || `/event/${event.id}`}
            {...(event.website && { target: "_blank", rel: "noopener noreferrer" })}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FF6B35] hover:bg-[#e55a2b] text-white text-sm font-medium rounded-md transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Mehr Info
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
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

        {/* Action Buttons */}
        <div className="mt-2 flex items-center gap-2 flex-wrap" onClick={(e) => e.preventDefault()}>
          <FavoriteButton eventId={event.id} size="sm" />
          <AddToCalendar event={event} size="sm" />
          <ShareButtons 
            event={event} 
            url={`https://www.where2go.at/event/${event.id}`}
            size="sm"
          />
        </div>
        </div>
      </div>
    </Link>
  );
}
