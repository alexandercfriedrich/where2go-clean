-- Migration: Add slug field to events table
-- Description: Add slug column for SEO-friendly event detail page URLs
-- Created: 2025-11-19

-- Add slug column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug VARCHAR(200);

-- Create index for slug lookups (critical for event detail pages)
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);

-- Create unique index on city+slug combination to prevent duplicates
-- Note: If the same event occurs at different venues in the same city,
-- the slug generation should include venue name to differentiate them
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_city_slug_unique ON events(city, slug) WHERE slug IS NOT NULL;

-- Add comment to document the slug field
COMMENT ON COLUMN events.slug IS 'SEO-friendly URL slug for event detail pages. Format: title-venue-date. Must be unique per city.';
