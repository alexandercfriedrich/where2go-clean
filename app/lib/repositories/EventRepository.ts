import { supabase, supabaseAdmin } from '../supabase/client'
import type { Database } from '../supabase/types'
import type { EventData } from '../types'

type DbEvent = Database['public']['Tables']['events']['Row']
type DbEventInsert = Database['public']['Tables']['events']['Insert']

export class EventRepository {
  /**
   * Helper to parse time strings, handling 'ganztags' (all-day) events
   * @param dateStr - Date string (e.g., '2025-11-16')
   * @param timeStr - Time string (e.g., '19:00' or 'ganztags')
   * @returns ISO 8601 timestamp or null
   */
  private static parseDateTime(dateStr: string | undefined, timeStr: string | undefined): string | null {
    if (!dateStr) return null;
    
    // Handle all-day events (ganztags, all day, ganztagig, etc.)
    if (timeStr && /ganztags|all[- ]?day|ganztagig|fullday/i.test(timeStr)) {
      return `${dateStr}T00:00:00.000Z`;
    }
    
    // Handle normal time strings
    if (timeStr) {
      // Validate timeStr is in HH:mm format
      if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) {
        return `${dateStr}T${timeStr}:00.000Z`;
      } else {
        // Invalid time format; return null
        return null;
      }
    }
    
    return null;
  }

  private static eventDataToDbInsert(event: EventData, city: string): DbEventInsert {
    // Combine date and time for proper ISO timestamp
    const startDateTime = this.parseDateTime(event.date, event.time) || new Date().toISOString();
    // Parse endTime if available
    const endDateTime = this.parseDateTime(event.date, event.endTime);
    return {
      title: event.title,
      description: event.description || null,
      category: event.category,
      subcategory: event.eventType || null,
      city: city,
      country: 'Austria',
      start_date_time: startDateTime,
      end_date_time: endDateTime,
      custom_venue_name: event.venue || null,
      custom_venue_address: event.address || null,
      price_info: event.price || null,
      is_free: this.isFreeEvent(event.price),
      website_url: event.website || null,
      booking_url: event.bookingLink || null,
      image_urls: event.imageUrl ? [event.imageUrl] : null,
      tags: event.eventType ? [event.eventType] : null,
      source: event.source || 'ai',
      source_url: event.website || null,
      published_at: new Date().toISOString()
    };
  }

  /**
   * Helper method to detect if an event is free based on price string
   */
  private static isFreeEvent(priceStr?: string): boolean {
    if (!priceStr) return false;
    const lower = priceStr.toLowerCase().trim();
    return (
      lower === 'free' ||
      lower === 'gratis' ||
      lower === 'kostenlos' ||
      lower.indexOf('free ') === 0 ||
      lower.indexOf('gratis ') === 0
    );
  }

  /**
   * Convert Database Event to EventData format (for compatibility)
   */
  private static dbEventToEventData(dbEvent: DbEvent): EventData {
    // Extract date and time from ISO timestamp
    const dateMatch = dbEvent.start_date_time.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    const date = dateMatch ? dateMatch[1] : dbEvent.start_date_time.split('T')[0] || '';
    const time = dateMatch ? dateMatch[2] : '';

    // Format price string when available
    let priceStr = '';
    if (dbEvent.is_free) {
      priceStr = 'Free';
    } else if (dbEvent.price_min !== null || dbEvent.price_max !== null) {
      const currency = dbEvent.price_currency || 'EUR';
      const symbol = currency === 'EUR' ? '€' : currency;
      if (dbEvent.price_min !== null && dbEvent.price_max !== null) {
        priceStr = `${symbol}${dbEvent.price_min}-${dbEvent.price_max}`;
      } else if (dbEvent.price_min !== null) {
        priceStr = `${symbol}${dbEvent.price_min}`;
      } else if (dbEvent.price_max !== null) {
        priceStr = `up to ${symbol}${dbEvent.price_max}`;
      }
    }

    return {
      title: dbEvent.title,
      description: dbEvent.description || undefined,
      category: dbEvent.category,
      date: date,
      time: time,
      // Note: venue field is not populated from venue_id - requires join with venues table
      venue: '',
      price: priceStr,
      website: dbEvent.source_url || '',
      source: dbEvent.source as 'cache' | 'ai' | 'rss' | 'ra' | string,
      city: dbEvent.city,
      imageUrl: dbEvent.image_urls?.[0]
    }
  }

  /**
   * Bulk insert events into PostgreSQL
   * IMPORTANT: Use this in background jobs or migrations
   */
  static async bulkInsertEvents(
    events: EventData[],
    city: string
  ): Promise<{ success: boolean; inserted: number; errors: string[] }> {
    const errors: string[] = []
    const dbEvents = events.map(e => this.eventDataToDbInsert(e, city))

    try {
      // Type assertion needed due to Supabase SDK type inference limitations
      const { data, error } = await supabaseAdmin
        .from('events')
        .insert(dbEvents as any)
        .select()

      if (error) {
        errors.push(`Bulk insert error: ${error.message}`)
        return { success: false, inserted: 0, errors }
      }

      return { success: true, inserted: data?.length || 0, errors: [] }
    } catch (error) {
      errors.push(`Exception: ${error}`)
      return { success: false, inserted: 0, errors }
    }
  }

  /**
   * Query events from PostgreSQL with filters
   * Compatible with existing Redis cache structure
   */
  static async getEvents(params: {
    city: string
    date?: string
    category?: string
    limit?: number
  }): Promise<EventData[]> {
    let query = supabase
      .from('events')
      .select('*')
      .eq('city', params.city)
      .order('start_date_time', { ascending: true })

    // Only filter for future events if no specific date is requested
    if (!params.date) {
      query = query.gte('start_date_time', new Date().toISOString())
    }

    if (params.category) {
      query = query.eq('category', params.category)
    }

    if (params.date) {
      const startOfDay = `${params.date}T00:00:00.000Z`
      const endOfDay = `${params.date}T23:59:59.999Z`
      query = query.gte('start_date_time', startOfDay).lte('start_date_time', endOfDay)
    }

    if (params.limit) {
      query = query.limit(params.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[EventRepository] Query error:', error)
      return []
    }

    return (data || []).map(dbEvent => this.dbEventToEventData(dbEvent))
  }

  /**
   * Full-text search across events
   */
  static async searchEvents(params: {
    city: string
    searchTerm: string
    limit?: number
  }): Promise<EventData[]> {
    // Sanitize search term to prevent SQL injection
    const sanitizedTerm = params.searchTerm.replace(/[%_]/g, '\\$&');
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('city', params.city)
      .or(`title.ilike.%${sanitizedTerm}%,description.ilike.%${sanitizedTerm}%`)
      .gte('start_date_time', new Date().toISOString())
      .order('start_date_time', { ascending: true })
      .limit(params.limit || 50)

    if (error) {
      console.error('[EventRepository] Search error:', error)
      return []
    }

    return (data || []).map(dbEvent => this.dbEventToEventData(dbEvent))
  }

  /**
   * Upsert events (insert or update based on uniqueness)
   * Uses title + date + city as unique constraint
   */
  static async upsertEvents(
    events: EventData[],
    city: string
  ): Promise<{ success: boolean; upserted: number }> {
    const dbEvents = events.map(e => this.eventDataToDbInsert(e, city))

    try {
      // Type assertion needed due to Supabase SDK type inference limitations
      const { data, error } = await supabaseAdmin
        .from('events')
        .upsert(dbEvents as any, { onConflict: 'title,start_date_time,city' })
        .select()

      if (error) {
        console.error('[EventRepository] Upsert error:', error)
        return { success: false, upserted: 0 }
      }

      return { success: true, upserted: data?.length || 0 }
    } catch (error) {
      console.error('[EventRepository] Upsert exception:', error)
      return { success: false, upserted: 0 }
    }
  }
}
