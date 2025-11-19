-- Migration: Add slug column to events table
-- Description: Add slug column with auto-generation trigger for SEO-friendly event URLs
-- Created: 2025-11-19

-- Add slug column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug column
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug_unique ON events(slug);

-- Create function to generate event slug
-- Format: event-title-venue-YYYY-MM-DD-{8-char-id}
CREATE OR REPLACE FUNCTION generate_event_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  date_part TEXT;
  id_suffix TEXT;
  final_slug TEXT;
BEGIN
  -- If slug is already provided, use it
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    RETURN NEW;
  END IF;
  
  -- Generate base slug from title
  base_slug := slugify(NEW.title);
  
  -- Add venue if available (use custom_venue_name if venue_id is null)
  IF NEW.custom_venue_name IS NOT NULL AND NEW.custom_venue_name != '' THEN
    base_slug := base_slug || '-' || slugify(NEW.custom_venue_name);
  END IF;
  
  -- Extract date from start_date_time (YYYY-MM-DD format)
  date_part := TO_CHAR(NEW.start_date_time, 'YYYY-MM-DD');
  
  -- Generate 8-character ID suffix from UUID
  id_suffix := SUBSTRING(REPLACE(NEW.id::TEXT, '-', ''), 1, 8);
  
  -- Combine all parts
  final_slug := base_slug || '-' || date_part || '-' || id_suffix;
  
  -- Ensure slug is not too long (max 255 characters)
  IF LENGTH(final_slug) > 255 THEN
    final_slug := SUBSTRING(final_slug, 1, 255);
  END IF;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate slug for new events
DROP TRIGGER IF EXISTS trigger_generate_event_slug ON events;
CREATE TRIGGER trigger_generate_event_slug
  BEFORE INSERT OR UPDATE OF title, custom_venue_name, start_date_time
  ON events
  FOR EACH ROW
  EXECUTE FUNCTION generate_event_slug();

-- Backfill slugs for existing events (only if slug is null)
UPDATE events
SET slug = NULL  -- Force trigger to regenerate
WHERE slug IS NULL OR slug = '';

-- Add comment for documentation
COMMENT ON COLUMN events.slug IS 'SEO-friendly URL slug: {title}-{venue}-{date}-{id-suffix}';
COMMENT ON FUNCTION generate_event_slug() IS 'Auto-generates unique slug for events on insert/update';
