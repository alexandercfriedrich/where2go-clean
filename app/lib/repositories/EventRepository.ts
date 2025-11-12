import { supabase, supabaseAdmin } from '../supabase/client'
import type { Database } from '../supabase/types'
import type { EventData } from '../types'

type DbEvent = Database['public']['Tables']['events']['Row']
type DbEventInsert = Database['public']['Tables']['events']['Insert']

export class EventRepository {
  /**
   * Convert EventData (from existing code) to Database Insert format
   */
  private static eventDataToDbInsert(event: EventData, city: string): DbEventInsert {
    return {
      title: event.title,
      description: event.description || null,
      category: event.category,
      subcategory: null,
      start_date_time: event.date || new Date().toISOString(),
      end_date_time: null,
      city: city,
      country: 'Austria',
      source: event.source || 'unknown',
      source_url: event.website || null,
      image_urls: event.imageUrl ? [event.imageUrl] : null,
      tags: null,
      is_free: event.price?.toLowerCase().includes('free') || event.price?.toLowerCase().includes('gratis') || false,
      price_min: null,
      price_max: null,
      price_currency: 'EUR',
      popularity_score: 0
    }
  }

  /**
   * Convert Database Event to EventData format (for compatibility)
   */
  private static dbEventToEventData(dbEvent: DbEvent): EventData {
    return {
      title: dbEvent.title,
      description: dbEvent.description || undefined,
      category: dbEvent.category,
      date: dbEvent.start_date_time,
      time: dbEvent.start_date_time.split('T')[1]?.slice(0, 5) || '',
      venue: '',
      price: dbEvent.is_free ? 'Free' : '',
      website: dbEvent.source_url || '',
      source: dbEvent.source as any,
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
      .gte('start_date_time', new Date().toISOString())
      .order('start_date_time', { ascending: true })

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
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('city', params.city)
      .or(`title.ilike.%${params.searchTerm}%,description.ilike.%${params.searchTerm}%`)
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
