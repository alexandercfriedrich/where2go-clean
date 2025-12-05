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
    // Use 00:00:01 as the marker for all-day events to distinguish from midnight
    if (timeStr && /ganztags|all[- ]?day|ganztagig|fullday/i.test(timeStr)) {
      return `${dateStr}T00:00:01.000Z`;
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
    
    // Parse endTime if available, handling events that go past midnight
    let endDateTime = this.parseDateTime(event.date, event.endTime);
    
    // If endTime exists and is before startTime, it means the event goes into the next day
    if (endDateTime && event.endTime && event.time) {
      const endTimeValue = event.endTime.split(':').map(Number);
      const startTimeValue = event.time.split(':').map(Number);
      
      // Compare times: if end time is earlier than start time, add a day
      if (endTimeValue[0] < startTimeValue[0] || 
          (endTimeValue[0] === startTimeValue[0] && endTimeValue[1] < startTimeValue[1])) {
        // Add one day to the end date
        const endDate = new Date(event.date);
        endDate.setDate(endDate.getDate() + 1);
        const nextDay = endDate.toISOString().split('T')[0];
        endDateTime = this.parseDateTime(nextDay, event.endTime);
      }
    }
    
    // NOTE: Do NOT generate slug in TypeScript - let the database trigger handle it
    // The database trigger (generate_event_slug in supabase/migrations/004_add_event_slug.sql)
    // adds a UUID suffix for uniqueness. This ensures all slugs are unique and prevents
    // duplicate key violations on the idx_events_slug_unique constraint.
    // Format: {title}-{venue}-{date}-{8-char-uuid-suffix}
    
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
      slug: null, // Let database trigger generate unique slug with UUID suffix
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
      // Use custom_venue_name if available
      venue: dbEvent.custom_venue_name || '',
      address: dbEvent.custom_venue_address || undefined,
      price: priceStr,
      website: dbEvent.source_url || '',
      bookingLink: dbEvent.booking_url || undefined,
      source: dbEvent.source as 'cache' | 'ai' | 'rss' | 'ra' | string,
      city: dbEvent.city,
      imageUrl: dbEvent.image_urls?.[0],
      latitude: dbEvent.latitude || undefined,
      longitude: dbEvent.longitude || undefined,
      slug: dbEvent.slug || undefined,
    }
  }

  /**
   * Bulk upsert events into PostgreSQL
   * IMPORTANT: Use this in background jobs or migrations
   */
  static async bulkInsertEvents(
    events: EventData[],
    city: string
  ): Promise<{ success: boolean; inserted: number; errors: string[] }> {
    const errors: string[] = []
    const dbEvents = events.map(e => this.eventDataToDbInsert(e, city))

    // Deduplicate events by (title, start_date_time, city) - keep last occurrence
    const seen = new Map<string, DbEventInsert>()
    for (const event of dbEvents) {
      const key = `${event.title}|${event.start_date_time}|${event.city}`
      seen.set(key, event)
    }
    const uniqueDbEvents = Array.from(seen.values())

    try {
      // Type assertion needed due to Supabase SDK type inference limitations
      // Based on testing: NO spaces in the onConflict column list (e.g., 'title,start_date_time,city')
      // ignoreDuplicates: false means UPDATE on conflict (true would mean INSERT only, skip duplicates)
      const { data, error } = await supabaseAdmin
        .from('events')
        .upsert(uniqueDbEvents as any, { 
          onConflict: 'title,start_date_time,city',
          ignoreDuplicates: false 
        })
        .select()

      if (error) {
        errors.push(`Bulk upsert error: ${error.message}`)
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

    // Deduplicate events by (title, start_date_time, city) - keep last occurrence
    const seen = new Map<string, DbEventInsert>()
    for (const event of dbEvents) {
      const key = `${event.title}|${event.start_date_time}|${event.city}`
      seen.set(key, event)
    }
    const uniqueDbEvents = Array.from(seen.values())

    try {
      // Type assertion needed due to Supabase SDK type inference limitations
      // Based on testing: NO spaces in the onConflict column list (e.g., 'title,start_date_time,city')
      // ignoreDuplicates: false means UPDATE on conflict (true would mean INSERT only, skip duplicates)
      const { data, error } = await supabaseAdmin
        .from('events')
        .upsert(uniqueDbEvents as any, { 
          onConflict: 'title,start_date_time,city',
          ignoreDuplicates: false 
        })
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

  /**
   * Fetch existing events for deduplication check
   * Only fetches events from same date and city to minimize data transfer
   * Returns events in EventData format for compatibility with deduplication logic
   * Uses case-insensitive matching for city names
   * 
   * @param date - Date string in YYYY-MM-DD format
   * @param city - City name
   * @returns Array of EventData objects from the database
   */
  static async fetchRelevantExistingEvents(
    date: string,
    city: string
  ): Promise<EventData[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Use case-insensitive matching for city
    const normalizedCity = city.trim().toLowerCase();
    
    // Use a type-safe query with explicit type annotation
    const { data, error } = await supabase
      .from('events')
      .select('id, title, city, start_date_time, source, category, custom_venue_name')
      .ilike('city', normalizedCity)
      .gte('start_date_time', startOfDay.toISOString())
      .lte('start_date_time', endOfDay.toISOString()) as {
        data: Array<{
          id: string;
          title: string;
          city: string;
          start_date_time: string;
          source: string;
          category: string;
          custom_venue_name: string | null;
        }> | null;
        error: any;
      };
    
    if (error) {
      console.error('[EventRepository:Dedup] Error fetching existing events:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Convert DB events to EventData format for deduplication
    return data.map(dbEvent => {
      // Extract date and time from ISO timestamp
      const startDateTime = dbEvent.start_date_time || '';
      const dateMatch = startDateTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
      const eventDate = dateMatch ? dateMatch[1] : startDateTime.split('T')[0] || '';
      const time = dateMatch ? dateMatch[2] : '';

      return {
        title: dbEvent.title || '',
        category: dbEvent.category || '',
        date: eventDate,
        time: time,
        venue: dbEvent.custom_venue_name || '',
        price: '',
        website: '',
        city: dbEvent.city || '',
        source: (dbEvent.source || 'ai') as 'cache' | 'ai' | 'rss' | 'ra' | string
      };
    });
  }

  /**
   * Fetch existing events for enrichment with more fields
   * Returns events with all fields needed for enrichment comparison
   * Uses case-insensitive matching for city names
   * 
   * @param date - Date string in YYYY-MM-DD format
   * @param city - City name
   * @returns Array of EventData objects from the database with enrichable fields
   */
  static async fetchRelevantExistingEventsForEnrichment(
    date: string,
    city: string
  ): Promise<EventData[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Use case-insensitive matching for city
    const normalizedCity = city.trim().toLowerCase();
    
    // Fetch more fields for enrichment comparison
    const { data, error } = await supabase
      .from('events')
      .select(`
        id, title, city, start_date_time, source, category, 
        custom_venue_name, custom_venue_address, description,
        image_urls, price_info, website_url, booking_url, ticket_url,
        latitude, longitude
      `)
      .ilike('city', normalizedCity)
      .gte('start_date_time', startOfDay.toISOString())
      .lte('start_date_time', endOfDay.toISOString()) as {
        data: Array<{
          id: string;
          title: string;
          city: string;
          start_date_time: string;
          source: string;
          category: string;
          custom_venue_name: string | null;
          custom_venue_address: string | null;
          description: string | null;
          image_urls: string[] | null;
          price_info: string | null;
          website_url: string | null;
          booking_url: string | null;
          ticket_url: string | null;
          latitude: number | null;
          longitude: number | null;
        }> | null;
        error: any;
      };
    
    if (error) {
      console.error('[EventRepository:Enrich] Error fetching existing events:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Convert DB events to EventData format with all enrichable fields
    return data.map(dbEvent => {
      // Extract date and time from ISO timestamp
      const startDateTime = dbEvent.start_date_time || '';
      const dateMatch = startDateTime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
      const eventDate = dateMatch ? dateMatch[1] : startDateTime.split('T')[0] || '';
      const time = dateMatch ? dateMatch[2] : '';

      return {
        title: dbEvent.title || '',
        category: dbEvent.category || '',
        date: eventDate,
        time: time,
        venue: dbEvent.custom_venue_name || '',
        address: dbEvent.custom_venue_address || undefined,
        description: dbEvent.description || undefined,
        imageUrl: dbEvent.image_urls?.[0] || undefined,
        price: dbEvent.price_info || '',
        website: dbEvent.website_url || '',
        bookingLink: dbEvent.booking_url || undefined,
        ticketPrice: dbEvent.ticket_url || undefined,
        latitude: dbEvent.latitude || undefined,
        longitude: dbEvent.longitude || undefined,
        city: dbEvent.city || '',
        source: (dbEvent.source || 'ai') as 'cache' | 'ai' | 'rss' | 'ra' | string
      };
    });
  }

  /**
   * Insert events in batches to prevent timeout
   * Uses fuzzy deduplication to filter out duplicates before insertion
   * 
   * @param events - Events to insert
   * @param city - City name for the events
   * @param batchSize - Number of events per batch (default: 50)
   * @param date - Optional date to fetch existing events for deduplication
   * @returns Result with success status and count of inserted events
   */
  static async insertEventsInBatches(
    events: EventData[],
    city: string,
    batchSize: number = 50,
    date?: string
  ): Promise<{ success: boolean; inserted: number; duplicatesRemoved: number; errors: string[] }> {
    const errors: string[] = [];
    
    // If date is provided, fetch existing events and perform fuzzy deduplication
    let eventsToInsert = events;
    let duplicatesRemoved = 0;
    
    if (date) {
      try {
        // Import deduplication function
        const { deduplicateEvents } = await import('../eventDeduplication');
        
        const existingEvents = await this.fetchRelevantExistingEvents(date, city);
        console.log(`[EventRepository:Dedup] Found ${existingEvents.length} existing events for ${date} in ${city}`);
        
        eventsToInsert = deduplicateEvents(events, existingEvents);
        duplicatesRemoved = events.length - eventsToInsert.length;
        
        console.log(`[EventRepository:Dedup] ${events.length} total → ${eventsToInsert.length} unique (removed ${duplicatesRemoved} duplicates)`);
      } catch (error) {
        console.error('[EventRepository:Dedup] Error during deduplication:', error);
        // Continue with all events if deduplication fails
        errors.push(`Deduplication error: ${error}`);
      }
    }
    
    if (eventsToInsert.length === 0) {
      console.log('[EventRepository:Batch] No unique events to insert');
      return { success: true, inserted: 0, duplicatesRemoved, errors: [] };
    }
    
    // Convert to DB format
    const dbEvents = eventsToInsert.map(e => this.eventDataToDbInsert(e, city));
    
    // Deduplicate events by (title, start_date_time, city) - keep last occurrence
    const seen = new Map<string, DbEventInsert>();
    for (const event of dbEvents) {
      const key = `${event.title}|${event.start_date_time}|${event.city}`;
      seen.set(key, event);
    }
    const uniqueDbEvents = Array.from(seen.values());
    
    // Insert in batches
    const totalBatches = Math.ceil(uniqueDbEvents.length / batchSize);
    let totalInserted = 0;
    
    for (let i = 0; i < uniqueDbEvents.length; i += batchSize) {
      const batch = uniqueDbEvents.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`[EventRepository:Batch] Writing batch ${batchNumber}/${totalBatches} (${batch.length} events)`);
      
      try {
        const { data, error } = await supabaseAdmin
          .from('events')
          .upsert(batch as any, {
            onConflict: 'title,start_date_time,city',
            ignoreDuplicates: false
          })
          .select();
        
        if (error) {
          errors.push(`Batch ${batchNumber} failed: ${error.message}`);
          console.error(`[EventRepository:Batch] Batch ${batchNumber} failed:`, error);
        } else {
          totalInserted += data?.length || 0;
        }
      } catch (error) {
        errors.push(`Batch ${batchNumber} exception: ${error}`);
        console.error(`[EventRepository:Batch] Batch ${batchNumber} exception:`, error);
      }
    }
    
    console.log(`[EventRepository:Batch] Successfully wrote ${totalInserted} events in ${totalBatches} batches`);
    
    return {
      success: errors.length === 0,
      inserted: totalInserted,
      duplicatesRemoved,
      errors
    };
  }

  /**
   * Link events to venues using the database function
   * This should be called after every bulk insert operation to ensure events are properly linked
   * 
   * NOTE: The function signature changed in Nov 2025:
   * - Removed p_city parameter (city filtering no longer supported)
   * - Added p_sources and p_sim_match_threshold for fuzzy matching
   * - Return value is now a single integer, not a table
   * 
   * @param sources - Optional array of source names to filter events (null = all sources)
   * @param similarityThreshold - Similarity threshold for fuzzy matching (0.0-1.0, default 0.7)
   * @param context - Context string for logging (e.g., 'Wien.info Importer', 'API Process')
   * @returns Object with events_linked count, or null on error
   */
  static async linkEventsToVenues(
    sources: string[] | null = null,
    similarityThreshold: number = 0.7,
    context: string = 'EventRepository'
  ): Promise<{ events_linked: number } | null> {
    try {
      console.log(`[${context}] Calling link_events_to_venues with sources: ${sources || 'all'}, threshold: ${similarityThreshold}`);
      
      // Note: Using type assertion because RPC functions are not in the generated Supabase types
      // The function now returns a single integer (events_linked), not a table
      const { data: eventsLinked, error: linkError } = await (supabaseAdmin as any).rpc('link_events_to_venues', {
        p_sources: sources,
        p_sim_match_threshold: similarityThreshold
      });
      
      if (linkError) {
        console.error(`[${context}] Error linking events to venues:`, linkError);
        return null;
      }
      
      console.log(`[${context}] Linked ${eventsLinked} events to venues`);
      return { events_linked: eventsLinked || 0 };
    } catch (error: any) {
      console.error(`[${context}] Exception linking events to venues:`, error);
      return null;
    }
  }
}
