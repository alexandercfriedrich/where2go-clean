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
          category: string
          subcategory: string | null
          start_date_time: string
          end_date_time: string | null
          venue_id: string | null
          city: string
          country: string
          source: string
          source_url: string | null
          image_urls: string[] | null
          tags: string[] | null
          is_free: boolean
          price_min: number | null
          price_max: number | null
          price_currency: string
          popularity_score: number
          created_at: string
          updated_at: string
          last_validated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category: string
          subcategory?: string | null
          start_date_time: string
          end_date_time?: string | null
          venue_id?: string | null
          city: string
          country?: string
          source: string
          source_url?: string | null
          image_urls?: string[] | null
          tags?: string[] | null
          is_free?: boolean
          price_min?: number | null
          price_max?: number | null
          price_currency?: string
          popularity_score?: number
          created_at?: string
          updated_at?: string
          last_validated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: string
          subcategory?: string | null
          start_date_time?: string
          end_date_time?: string | null
          venue_id?: string | null
          city?: string
          country?: string
          source?: string
          source_url?: string | null
          image_urls?: string[] | null
          tags?: string[] | null
          is_free?: boolean
          price_min?: number | null
          price_max?: number | null
          price_currency?: string
          popularity_score?: number
          created_at?: string
          updated_at?: string
          last_validated_at?: string
        }
      }
    }
  }
}
