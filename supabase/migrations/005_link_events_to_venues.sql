-- Migration: Create link_events_to_venues function
-- Description: Links events to venues by matching custom_venue_name with venue name and city
-- Created: 2025-11-22

-- Function to link events to venues
-- This function matches events with venues based on venue name and city.
-- It updates the venue_id field on events where:
-- 1. The event has a custom_venue_name
-- 2. A venue exists with matching name and city
-- 3. The event's venue_id is currently NULL (not already linked)
CREATE OR REPLACE FUNCTION link_events_to_venues(
  p_city TEXT DEFAULT NULL
)
RETURNS TABLE (
  events_linked INTEGER,
  events_processed INTEGER
) AS $$
DECLARE
  v_events_linked INTEGER := 0;
  v_events_processed INTEGER := 0;
BEGIN
  -- Update events to link them with venues based on name and city match
  WITH matched_venues AS (
    SELECT 
      e.id as event_id,
      v.id as venue_id
    FROM events e
    INNER JOIN venues v ON 
      LOWER(TRIM(e.custom_venue_name)) = LOWER(TRIM(v.name))
      AND e.city = v.city
    WHERE 
      e.venue_id IS NULL
      AND e.custom_venue_name IS NOT NULL
      AND e.custom_venue_name != ''
      AND (p_city IS NULL OR e.city = p_city)
  ),
  update_result AS (
    UPDATE events e
    SET venue_id = mv.venue_id
    FROM matched_venues mv
    WHERE e.id = mv.event_id
    RETURNING e.id
  )
  SELECT 
    COUNT(*) INTO v_events_linked
  FROM update_result;
  
  -- Count total events processed (checked for matching)
  SELECT 
    COUNT(*) INTO v_events_processed
  FROM events e
  WHERE 
    e.venue_id IS NULL
    AND e.custom_venue_name IS NOT NULL
    AND e.custom_venue_name != ''
    AND (p_city IS NULL OR e.city = p_city);
  
  RETURN QUERY SELECT v_events_linked, v_events_processed;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION link_events_to_venues(TEXT) IS 'Links events to venues by matching custom_venue_name with venue name and city. Returns count of events linked and processed.';
