-- Migration: Add slug field to get_venue_with_events function
-- Description: Include the slug field in event data returned by get_venue_with_events
-- Created: 2025-11-28

-- Update get_venue_with_events to include event slug
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
  -- First try exact match on venue_slug, then fallback to slugified name
  SELECT * INTO v_venue
  FROM venues
  WHERE LOWER(venue_slug) = LOWER(p_venue_slug)
     OR LOWER(slugify(name)) = LOWER(p_venue_slug)
  LIMIT 1;
  
  -- Return null if venue not found
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Build result JSON with venue, stats, and upcoming events
  SELECT json_build_object(
    'venue', json_build_object(
      'id', v_venue.id,
      'slug', COALESCE(v_venue.venue_slug, slugify(v_venue.name)),
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
          'slug', slug,  -- Include slug for event detail page navigation
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

COMMENT ON FUNCTION get_venue_with_events(TEXT, TEXT) IS 'Returns venue details with stats and upcoming events (including slug) by venue slug, optionally filtered by source';
