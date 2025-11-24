-- Migration: Add venue_slug column to venues table
-- Description: Add venue_slug column for SEO-friendly URLs and indexing
-- Created: 2025-11-24

-- Add venue_slug column
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS venue_slug TEXT;

-- Create index on venue_slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_venues_slug ON venues(venue_slug);

-- Backfill venue_slug for existing venues using the slugify function
UPDATE venues
SET venue_slug = slugify(name)
WHERE venue_slug IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN venues.venue_slug IS 'SEO-friendly URL slug generated from venue name';
