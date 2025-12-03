/**
 * Event query utilities for Discovery Homepage
 * Supabase queries for different event sections
 */

import { supabase } from '@/lib/supabase/client';
import { EventData } from '@/lib/types';

export interface EventQueryParams {
  city?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get trending events (high popularity/view count)
 */
export async function getTrendingEvents(params: EventQueryParams = {}) {
  const { city = 'Wien', limit = 20, offset = 0 } = params;
  
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('city', city)
    .gte('start_date_time', now)
    .neq('is_cancelled', true)
    .order('popularity_score', { ascending: false })
    .order('view_count', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching trending events:', error);
    return [];
  }

  return data || [];
}

/**
 * Get weekend events (Friday 00:00 to Monday 04:00 of upcoming weekend)
 */
export async function getWeekendEvents(params: EventQueryParams = {}) {
  const { city = 'Wien', limit = 20 } = params;
  
  // Calculate next weekend
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7; // 0 = today if Friday
  
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);
  
  const monday = new Date(friday);
  monday.setDate(friday.getDate() + 3);
  monday.setHours(4, 0, 0, 0); // Monday 04:00
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('city', city)
    .gte('start_date_time', friday.toISOString())
    .lte('start_date_time', monday.toISOString())
    .neq('is_cancelled', true)
    .order('is_featured', { ascending: false })
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching weekend events:', error);
    return [];
  }

  return data || [];
}

/**
 * Get nearby events based on location
 */
export async function getNearbyEvents(
  location: { latitude: number; longitude: number },
  params: EventQueryParams = {}
) {
  const { city = 'Wien', limit = 20 } = params;
  
  const now = new Date().toISOString();
  
  // Fetch events with coordinates
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('city', city)
    .gte('start_date_time', now)
    .neq('is_cancelled', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(limit * 2) as any; // Fetch more to filter by distance

  if (error) {
    console.error('Error fetching nearby events:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Calculate distances and sort
  const eventsWithDistance = data
    .filter((event: any) => event.latitude != null && event.longitude != null)
    .map((event: any) => {
      const eventLat = event.latitude as number;
      const eventLon = event.longitude as number;
      return {
        ...event,
        distance: calculateDistanceSimple(
          location.latitude,
          location.longitude,
          eventLat,
          eventLon
        )
      };
    });

  // Sort by distance and take top results
  return eventsWithDistance
    .sort((a: any, b: any) => a.distance - b.distance)
    .slice(0, limit);
}

/**
 * Get personalized events (simplified - actual implementation in personalization engine)
 */
export async function getPersonalizedEvents(params: EventQueryParams = {}) {
  const { city = 'Wien', limit = 50 } = params;
  
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('city', city)
    .gte('start_date_time', now)
    .neq('is_cancelled', true)
    .order('start_date_time', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching personalized events:', error);
    return [];
  }

  return data || [];
}

/**
 * Get events by category
 */
export async function getEventsByCategory(
  category: string,
  params: EventQueryParams = {}
) {
  const { city = 'Wien', limit = 20 } = params;
  
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('city', city)
    .eq('category', category)
    .gte('start_date_time', now)
    .neq('is_cancelled', true)
    .order('start_date_time', { ascending: true })
    .limit(limit);

  if (error) {
    console.error(`Error fetching ${category} events:`, error);
    return [];
  }

  return data || [];
}

/**
 * Get weekend nightlife events from venue scrapers
 * Returns events grouped by day (Friday, Saturday, Sunday)
 */
export async function getWeekendNightlifeEvents(params: EventQueryParams = {}) {
  const { city = 'Wien', limit = 18 } = params; // 6 per day * 3 days
  
  // Calculate this weekend's dates
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // If it's already the weekend, use this weekend
  // Otherwise use next weekend
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0 && dayOfWeek === 5) {
    daysUntilFriday = 0; // It's Friday, use today
  } else if (daysUntilFriday === 0) {
    daysUntilFriday = 7; // Not Friday, get next Friday
  }
  
  const friday = new Date(now);
  friday.setDate(now.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);
  
  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);
  
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  
  const mondayEnd = new Date(friday);
  mondayEnd.setDate(friday.getDate() + 3);
  mondayEnd.setHours(4, 0, 0, 0);
  
  // Fetch Clubs & Nachtleben events from venue scrapers for the weekend
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('city', city)
    .eq('category', 'Clubs & Nachtleben')
    .ilike('source', '%scraper%')
    .gte('start_date_time', friday.toISOString())
    .lt('start_date_time', mondayEnd.toISOString())
    .neq('is_cancelled', true)
    .order('start_date_time', { ascending: true })
    .limit(limit * 2); // Fetch more to ensure we have enough after grouping

  if (error) {
    console.error('Error fetching weekend nightlife events:', error);
    return { friday: [], saturday: [], sunday: [] };
  }

  const events = data || [];
  
  // Group events by day
  const fridayDate = friday.toISOString().split('T')[0];
  const saturdayDate = saturday.toISOString().split('T')[0];
  const sundayDate = sunday.toISOString().split('T')[0];
  
  const grouped = {
    friday: events.filter((e: any) => e.start_date_time?.startsWith(fridayDate)).slice(0, 6),
    saturday: events.filter((e: any) => e.start_date_time?.startsWith(saturdayDate)).slice(0, 6),
    sunday: events.filter((e: any) => e.start_date_time?.startsWith(sundayDate)).slice(0, 6),
  };
  
  return grouped;
}

/**
 * Simple distance calculation (Haversine formula)
 */
function calculateDistanceSimple(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get upcoming events for the next N days (for Schema.org EventList)
 */
export async function getUpcomingEvents(
  days: number = 7,
  params: EventQueryParams = {}
) {
  const { city = 'Wien', limit = 100 } = params;
  
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + days);
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('city', city)
    .gte('start_date_time', now.toISOString())
    .lte('start_date_time', endDate.toISOString())
    .neq('is_cancelled', true)
    .order('start_date_time', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching upcoming events:', error);
    return [];
  }

  return data || [];
}

/**
 * Validate that event has slug before processing
 * Logs error if slug is missing for monitoring
 * @returns true if slug exists, false otherwise
 */
function validateEventSlug(event: any): boolean {
  if (!event.slug) {
    console.error(
      `[SLUG_MISSING] Event without slug detected - will be excluded from results:`,
      {
        id: event.id,
        title: event.title,
        date: event.start_date_time,
        source: event.source || 'unknown',
      }
    );
    return false;
  }
  return true;
}

/**
 * Convert Supabase event to EventData format for Schema.org
 * IMPORTANT: Always include slug from database to avoid URL mismatch issues
 * 
 * NOTE: We use string parsing instead of Date objects to avoid timezone issues.
 * Database stores UTC timestamps, and we want to extract date/time exactly as stored
 * without local timezone conversion that could shift dates by ±1 day.
 * 
 * @returns EventData object or null if event has no slug (invalid event)
 */
export function convertToEventData(event: any): EventData | null {
  // Validate slug presence - return null if missing
  if (!validateEventSlug(event)) {
    return null;
  }
  
  // Extract date and time directly from ISO string to avoid timezone issues
  // Format: "2025-12-03T00:00:00.000Z" or "2025-12-03T19:30:00.000Z"
  let date = '';
  let time = '00:00';
  
  if (event.start_date_time) {
    const dateMatch = event.start_date_time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (dateMatch) {
      date = dateMatch[1];
      time = dateMatch[2];
    } else {
      // Fallback: try to extract date from the beginning
      date = event.start_date_time.split('T')[0] || '';
    }
  }
  
  return {
    title: event.title || event.name || 'Event',
    category: event.category || 'Event',
    date: date,
    time: time,
    venue: event.custom_venue_name || event.location || 'Wien',
    price: event.price_info || event.price || 'Preis auf Anfrage', // TODO: Externalize to i18n
    website: event.url || event.website || '',
    address: event.address || '',
    description: event.description || '',
    bookingLink: event.ticket_url || event.booking_url || '',
    city: event.city || 'Wien',
    imageUrl: event.image_url || event.imageUrl || '',
    latitude: event.latitude,
    longitude: event.longitude,
    // Include slug from database to prevent URL mismatch between frontend and database
    slug: event.slug,
  };
}
