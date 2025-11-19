export type Database = {
  public: {
    Tables: {
      venues: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string
          country: string
          latitude: number | null
          longitude: number | null
          website: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city: string
          country?: string
          latitude?: number | null
          longitude?: number | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          city?: string
          country?: string
          latitude?: number | null
          longitude?: number | null
          website?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          short_description: string | null
          category: string
          subcategory: string | null
          tags: string[] | null
          city: string
          country: string
          latitude: number | null
          longitude: number | null
          venue_id: string | null
          custom_venue_name: string | null
          custom_venue_address: string | null
          start_date_time: string
          end_date_time: string | null
          timezone: string
          is_all_day: boolean
          is_free: boolean
          price_min: number | null
          price_max: number | null
          price_currency: string
          price_info: string | null
          website_url: string | null
          booking_url: string | null
          ticket_url: string | null
          source_url: string | null
          image_urls: string[] | null
          video_url: string | null
          source: string
          source_api: string | null
          external_id: string | null
          is_verified: boolean
          is_featured: boolean
          is_cancelled: boolean
          view_count: number
          popularity_score: number
          slug: string | null
          created_at: string
          updated_at: string
          published_at: string | null
          last_validated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          short_description?: string | null
          category: string
          subcategory?: string | null
          tags?: string[] | null
          city: string
          country?: string
          latitude?: number | null
          longitude?: number | null
          venue_id?: string | null
          custom_venue_name?: string | null
          custom_venue_address?: string | null
          start_date_time: string
          end_date_time?: string | null
          timezone?: string
          is_all_day?: boolean
          is_free?: boolean
          price_min?: number | null
          price_max?: number | null
          price_currency?: string
          price_info?: string | null
          website_url?: string | null
          booking_url?: string | null
          ticket_url?: string | null
          source_url?: string | null
          image_urls?: string[] | null
          video_url?: string | null
          source: string
          source_api?: string | null
          external_id?: string | null
          is_verified?: boolean
          is_featured?: boolean
          is_cancelled?: boolean
          view_count?: number
          popularity_score?: number
          slug?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
          last_validated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          short_description?: string | null
          category?: string
          subcategory?: string | null
          tags?: string[] | null
          city?: string
          country?: string
          latitude?: number | null
          longitude?: number | null
          venue_id?: string | null
          custom_venue_name?: string | null
          custom_venue_address?: string | null
          start_date_time?: string
          end_date_time?: string | null
          timezone?: string
          is_all_day?: boolean
          is_free?: boolean
          price_min?: number | null
          price_max?: number | null
          price_currency?: string
          price_info?: string | null
          website_url?: string | null
          booking_url?: string | null
          ticket_url?: string | null
          source_url?: string | null
          image_urls?: string[] | null
          video_url?: string | null
          source?: string
          source_api?: string | null
          external_id?: string | null
          is_verified?: boolean
          is_featured?: boolean
          is_cancelled?: boolean
          view_count?: number
          popularity_score?: number
          slug?: string | null
          created_at?: string
          updated_at?: string
          published_at?: string | null
          last_validated_at?: string
        }
      }
    }
  }
}
