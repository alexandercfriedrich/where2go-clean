export type Database = {
  public: {
    Tables: {
      blog_articles: {
        Row: {
          id: string
          city: string
          category: string
          slug: string
          title: string
          content: string
          seo_keywords: string | null
          meta_description: string | null
          featured_image: string | null
          status: string
          generated_by: string
          generated_at: string
          published_at: string | null
          updated_at: string
          event_ids: string[] | null
        }
        Insert: {
          id?: string
          city: string
          category: string
          slug: string
          title: string
          content: string
          seo_keywords?: string | null
          meta_description?: string | null
          featured_image?: string | null
          status?: string
          generated_by: string
          generated_at?: string
          published_at?: string | null
          updated_at?: string
          event_ids?: string[] | null
        }
        Update: {
          id?: string
          city?: string
          category?: string
          slug?: string
          title?: string
          content?: string
          seo_keywords?: string | null
          meta_description?: string | null
          featured_image?: string | null
          status?: string
          generated_by?: string
          generated_at?: string
          published_at?: string | null
          updated_at?: string
          event_ids?: string[] | null
        }
      }
      venues: {
        Row: {
          id: string
          slug: string  // NOT NULL constraint in production DB
          venue_slug: string | null  // Also exists in production DB
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
          slug: string  // Required - NOT NULL constraint
          venue_slug?: string | null
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
          slug?: string
          venue_slug?: string | null
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
