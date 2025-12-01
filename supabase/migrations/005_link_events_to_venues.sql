-- Migration: Create link_events_to_venues function
-- Description: Links events to venues by matching custom_venue_name with venue name and city
-- Updated: 2025-11-27 - Added fuzzy matching with similarity threshold

-- Enable pg_trgm extension for similarity matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to link events to venues with fuzzy matching
-- This function matches events with venues based on venue name and city.
-- It updates the venue_id field on events where:
-- 1. The event has a custom_venue_name
-- 2. A venue exists with matching name (exact or fuzzy) and city
-- 3. The event's venue_id is currently NULL (not already linked)
-- 4. Optionally filters by source (if p_sources is provided)
CREATE OR REPLACE FUNCTION link_events_to_venues(
  p_sources text[] DEFAULT NULL,
  p_sim_match_threshold real DEFAULT 0.7,
  OUT events_linked integer
)
RETURNS integer AS $$
DECLARE
  v_linked_exact integer := 0;
  v_linked_fuzzy integer := 0;
BEGIN
  -- Step 1: Exact matches (case-insensitive trimmed equality)
  WITH to_match AS (
    SELECT e.id, e.custom_venue_name, e.city
    FROM events e
    WHERE (p_sources IS NULL OR e.source = ANY(p_sources))
      AND e.venue_id IS NULL
      AND e.custom_venue_name IS NOT NULL
      AND trim(e.custom_venue_name) <> ''
  ),
  exact_candidates AS (
    SELECT t.id AS event_id, v.id AS venue_id
    FROM to_match t
    JOIN venues v
      ON lower(trim(v.name)) = lower(trim(t.custom_venue_name))
      AND v.city = t.city
  )
  UPDATE events e
  SET venue_id = ec.venue_id
  FROM exact_candidates ec
  WHERE e.id = ec.event_id;
  
  GET DIAGNOSTICS v_linked_exact = ROW_COUNT;
  
  -- Step 2: Fuzzy matching with similarity
  WITH to_match AS (
    SELECT e.id, e.custom_venue_name, e.city
    FROM events e
    WHERE (p_sources IS NULL OR e.source = ANY(p_sources))
      AND e.venue_id IS NULL
      AND e.custom_venue_name IS NOT NULL
      AND trim(e.custom_venue_name) <> ''
  ),
  fuzzy_candidates AS (
    SELECT DISTINCT ON (t.id)
      t.id AS event_id,
      v.id AS venue_id,
      similarity(lower(v.name), lower(t.custom_venue_name)) AS sim
    FROM to_match t
    JOIN venues v ON v.city = t.city
    WHERE similarity(lower(v.name), lower(t.custom_venue_name)) >= p_sim_match_threshold
    ORDER BY t.id, sim DESC
  )
  UPDATE events e
  SET venue_id = fc.venue_id
  FROM fuzzy_candidates fc
  WHERE e.id = fc.event_id;
  
  GET DIAGNOSTICS v_linked_fuzzy = ROW_COUNT;
  
  events_linked := v_linked_exact + v_linked_fuzzy;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Set search_path to ensure function can find tables in public schema
ALTER FUNCTION link_events_to_venues(text[], real) SET search_path = public;

-- Add comment for documentation
COMMENT ON FUNCTION link_events_to_venues(text[], real) IS 'Links events to venues by matching custom_venue_name with venue name and city. Uses exact matching first, then fuzzy matching with similarity threshold. Filters by source if provided. Returns count of events linked.';
