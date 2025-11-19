-- Migration: Create Venue Query Functions
-- Description: Create RPC functions for venue statistics and detail pages
-- Created: 2025-11-19

-- Helper function to create URL-friendly slugs from venue names
-- Mirrors the slugify function in app/lib/hotCityStore.ts
CREATE OR REPLACE FUNCTION slugify(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            input_text,
            '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special chars (ASCII only, matches JS slugify)
          ),
          '[\s_-]+', '-', 'g'    -- Replace spaces and underscores with hyphens
        ),
        '^-+|-+$', '', 'g'       -- Remove leading/trailing hyphens
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get top venues ranked by upcoming event count
-- Returns venues with aggregated statistics about their events
CREATE OR REPLACE FUNCTION get_top_venues(
  p_city TEXT,
  p_limit INTEGER,
  p_source TEXT DEFAULT NULL
)
RETURNS TABLE (
  venue_id UUID,
  venue_slug TEXT,
  name TEXT,
  full_address TEXT,
  city TEXT,
  total_events INTEGER,
  upcoming_events INTEGER,
  next_event_date TIMESTAMPTZ,
  categories TEXT[],
  sources TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH venue_events AS (
    SELECT 
      v.id,
      v.name,
      v.address,
      v.city,
      COUNT(e.id) AS total_count,
      COUNT(*) FILTER (WHERE e.start_date_time >= NOW()) AS upcoming_count,
      MIN(e.start_date_time) FILTER (WHERE e.start_date_time >= NOW()) AS next_event,
      ARRAY_AGG(DISTINCT e.category) FILTER (WHERE e.category IS NOT NULL) AS event_categories,
      ARRAY_AGG(DISTINCT e.source) FILTER (WHERE e.source IS NOT NULL) AS event_sources
    FROM venues v
    INNER JOIN events e ON v.id = e.venue_id
    WHERE 
      v.city = p_city
      AND (p_source IS NULL OR e.source = p_source)
      AND (e.is_cancelled IS NULL OR e.is_cancelled = false)
    GROUP BY v.id, v.name, v.address, v.city
    HAVING COUNT(*) FILTER (WHERE e.start_date_time >= NOW()) > 0
  )
  SELECT 
    ve.id::UUID,
    slugify(ve.name)::TEXT,
    ve.name::TEXT,
    ve.address::TEXT,
    ve.city::TEXT,
    ve.total_count::INTEGER,
    ve.upcoming_count::INTEGER,
    ve.next_event::TIMESTAMPTZ,
    ve.event_categories::TEXT[],
    ve.event_sources::TEXT[]
  FROM venue_events ve
  ORDER BY ve.upcoming_count DESC, ve.next_event ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get venue details with upcoming events
-- Returns JSON object with venue info, stats, and event list
CREATE OR REPLACE FUNCTION get_venue_with_events(
  p_venue_slug TEXT,
  p_source TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_venue venues%ROWTYPE;
  v_result JSON;
BEGIN
  -- Find venue by slug (case-insensitive match)
  SELECT * INTO v_venue
  FROM venues
  WHERE slugify(name) = LOWER(p_venue_slug)
  LIMIT 1;
  
  -- Return null if venue not found
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Build result JSON with venue, stats, and upcoming events
  SELECT json_build_object(
    'venue', json_build_object(
      'id', v_venue.id,
      'slug', slugify(v_venue.name),
      'name', v_venue.name,
      'full_address', v_venue.address,
      'city', v_venue.city,
      'country', v_venue.country,
      'phone', NULL::TEXT,  -- Not in current schema
      'email', NULL::TEXT,  -- Not in current schema
      'website', v_venue.website,
      'latitude', v_venue.latitude,
      'longitude', v_venue.longitude
    ),
    'stats', (
      SELECT json_build_object(
        'total_events', COUNT(*),
        'upcoming_events', COUNT(*) FILTER (WHERE start_date_time >= NOW()),
        'categories', COALESCE(ARRAY_AGG(DISTINCT category) FILTER (WHERE category IS NOT NULL), ARRAY[]::TEXT[]),
        'sources', COALESCE(ARRAY_AGG(DISTINCT source) FILTER (WHERE source IS NOT NULL), ARRAY[]::TEXT[])
      )
      FROM events
      WHERE 
        venue_id = v_venue.id
        AND (p_source IS NULL OR source = p_source)
        AND (is_cancelled IS NULL OR is_cancelled = false)
    ),
    'upcoming_events', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', id,
          'title', title,
          'description', description,
          'short_description', short_description,
          'category', category,
          'subcategory', subcategory,
          'tags', tags,
          'city', city,
          'country', country,
          'latitude', latitude,
          'longitude', longitude,
          'venue_id', venue_id,
          'custom_venue_name', custom_venue_name,
          'custom_venue_address', custom_venue_address,
          'start_date_time', start_date_time,
          'end_date_time', end_date_time,
          'timezone', timezone,
          'is_all_day', is_all_day,
          'is_free', is_free,
          'price_min', price_min,
          'price_max', price_max,
          'price_currency', price_currency,
          'price_info', price_info,
          'website_url', website_url,
          'booking_url', booking_url,
          'ticket_url', ticket_url,
          'source_url', source_url,
          'image_urls', image_urls,
          'video_url', video_url,
          'source', source,
          'source_api', source_api,
          'external_id', external_id
        )
        ORDER BY start_date_time ASC
      )
      FROM events
      WHERE 
        venue_id = v_venue.id
        AND start_date_time >= NOW()
        AND (p_source IS NULL OR source = p_source)
        AND (is_cancelled IS NULL OR is_cancelled = false)
      LIMIT 100
    ), '[]'::json)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments for documentation
COMMENT ON FUNCTION slugify(TEXT) IS 'Converts text to URL-friendly slug format (lowercase, hyphens, no special chars)';
COMMENT ON FUNCTION get_top_venues(TEXT, INTEGER, TEXT) IS 'Returns top venues for a city ranked by upcoming event count, optionally filtered by source';
COMMENT ON FUNCTION get_venue_with_events(TEXT, TEXT) IS 'Returns venue details with stats and upcoming events by venue slug, optionally filtered by source';
