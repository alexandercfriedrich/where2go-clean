import { supabase, supabaseAdmin } from '../supabase/client'
import type { Database } from '../supabase/types'

type DbVenue = Database['public']['Tables']['venues']['Row']
type DbVenueInsert = Database['public']['Tables']['venues']['Insert']
type DbVenueUpdate = Database['public']['Tables']['venues']['Update']

export class VenueRepository {
  /**
   * Get venue by ID
   */
  static async getVenueById(id: string): Promise<DbVenue | null> {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[VenueRepository] Error fetching venue:', error)
      return null
    }

    return data
  }

  /**
   * Get venue by name and city (for lookups during event import)
   */
  static async getVenueByName(name: string, city: string): Promise<DbVenue | null> {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('name', name)
      .eq('city', city)
      .maybeSingle()

    if (error) {
      console.error('[VenueRepository] Error fetching venue by name:', error)
      return null
    }

    return data || null
  }

  /**
   * Search venues by name (case-insensitive)
   */
  static async searchVenues(params: {
    city: string
    searchTerm: string
    limit?: number
  }): Promise<DbVenue[]> {
    const sanitizedTerm = params.searchTerm.replace(/[%_]/g, '\\$&')
    
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('city', params.city)
      .ilike('name', `%${sanitizedTerm}%`)
      .limit(params.limit || 50)

    if (error) {
      console.error('[VenueRepository] Search error:', error)
      return []
    }

    return data || []
  }

  /**
   * Get all venues for a city
   */
  static async getVenuesByCity(city: string, limit?: number): Promise<DbVenue[]> {
    let query = supabase
      .from('venues')
      .select('*')
      .eq('city', city)
      .order('name', { ascending: true })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[VenueRepository] Query error:', error)
      return []
    }

    return data || []
  }

  /**
   * Create a new venue
   */
  static async createVenue(venue: DbVenueInsert): Promise<DbVenue | null> {
    // Type assertion needed due to Supabase SDK type inference limitations
    const { data, error } = await (supabaseAdmin as any)
      .from('venues')
      .insert(venue)
      .select()
      .single()

    if (error) {
      console.error('[VenueRepository] Create error:', error)
      return null
    }

    return data
  }

  /**
   * Update an existing venue
   */
  static async updateVenue(id: string, updates: DbVenueUpdate): Promise<DbVenue | null> {
    // Type assertion needed due to Supabase SDK type inference limitations
    const { data, error } = await (supabaseAdmin as any)
      .from('venues')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[VenueRepository] Update error:', error)
      return null
    }

    return data
  }

  /**
   * Delete a venue
   */
  static async deleteVenue(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('venues')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[VenueRepository] Delete error:', error)
      return false
    }

    return true
  }

  /**
   * Upsert venue (insert or update based on name + city uniqueness)
   * Returns the venue ID (existing or newly created)
   */
  static async upsertVenue(venue: DbVenueInsert): Promise<string | null> {
    // Try to find existing venue by name and city
    const existing = await this.getVenueByName(venue.name, venue.city)
    
    if (existing) {
      return existing.id
    }

    // Create new venue
    const created = await this.createVenue(venue)
    return created?.id || null
  }
}
