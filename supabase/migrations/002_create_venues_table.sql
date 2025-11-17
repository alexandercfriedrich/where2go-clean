-- Migration: Create Venues Table
-- Description: Create venues table with unique constraint on (name, city) to support upsert operations
-- Created: 2025-11-17

-- Create venues table
CREATE TABLE venues (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  address TEXT,
  
  -- Location
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Austria',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Additional Information
  website TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  -- This unique constraint is critical for the upsert operation in VenueRepository.upsertVenue()
  -- which uses onConflict: 'name, city'
  CONSTRAINT unique_venue_name_city UNIQUE (name, city)
);

-- Create indexes for performance
CREATE INDEX idx_venues_city ON venues(city);
CREATE INDEX idx_venues_name ON venues(name);
CREATE INDEX idx_venues_city_name ON venues(city, name);

-- Reuse the existing updated_at trigger function from events table
CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint from events to venues
-- This was planned in Phase 2 according to 001_create_events_schema.sql
ALTER TABLE events
  ADD CONSTRAINT fk_events_venue
  FOREIGN KEY (venue_id)
  REFERENCES venues(id)
  ON DELETE SET NULL;

-- Add index on events.venue_id for join performance
CREATE INDEX idx_events_venue_id ON events(venue_id);

-- Add comments for documentation
COMMENT ON TABLE venues IS 'Venues table with unique constraint on (name, city) for upsert operations';
COMMENT ON COLUMN venues.name IS 'Venue name (required)';
COMMENT ON COLUMN venues.city IS 'City where venue is located (required)';
COMMENT ON CONSTRAINT unique_venue_name_city ON venues IS 'Ensures venue name is unique within a city, enables upsert by (name, city)';
