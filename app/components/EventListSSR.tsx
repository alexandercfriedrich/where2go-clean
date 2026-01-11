/**
 * Server-Side Event List Component
 * Renders events in the initial HTML for AI crawlers and search engines
 * This is a Server Component (no 'use client' directive)
 */

import React from 'react';
import EventCardSSR from './EventCardSSR';
import type { EventData } from '@/lib/types';

export interface EventListSSRProps {
  events: any[];
  city?: string;
  limit?: number;
  className?: string;
}

/**
 * Server-Side Rendered Event List
 * Visible to AI crawlers in initial HTML
 * 
 * This component renders a static grid of events that's included
 * in the initial HTML response, making it visible to:
 * - AI Crawlers (ChatGPT, Perplexity, Claude, etc.)
 * - Search Engine Bots (Google, Bing, etc.)
 * - Social Media Scrapers (Facebook, Twitter, etc.)
 * 
 * The client component (DiscoveryClient) will hydrate on top
 * to add interactivity without replacing this content.
 */
export default function EventListSSR({ 
  events, 
  city = 'Wien', 
  limit,
  className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6'
}: EventListSSRProps) {
  const displayEvents = limit ? events.slice(0, limit) : events;

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">
          Keine Events gefunden.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {displayEvents.map((event, index) => (
        <EventCardSSR 
          key={event.id || index} 
          event={event} 
          city={city} 
        />
      ))}
    </div>
  );
}
