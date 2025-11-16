-- Migration: Complete Events Schema
-- Description: Drop and recreate events table with full schema matching EventData structure
-- Created: 2025-11-16

-- Drop existing incomplete events table
DROP TABLE IF EXISTS events CASCADE;

-- Create complete events table with ALL required columns
CREATE TABLE events (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  title VARCHAR(500) NOT NULL,
  description TEXT,
  short_description TEXT,
  
  -- Category & Classification
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  tags TEXT[],
  
  -- Location Information
  city VARCHAR(100) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Austria',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Venue Information
  venue_id UUID REFERENCES venues(id),
  custom_venue_name VARCHAR(255),
  custom_venue_address TEXT,
  
  -- Time Information (Critical for EventRepository compatibility)
  start_date_time TIMESTAMPTZ NOT NULL,
  end_date_time TIMESTAMPTZ,
  timezone VARCHAR(50) DEFAULT 'Europe/Vienna',
  is_all_day BOOLEAN DEFAULT false,
  
  -- Price Information (Critical for EventRepository compatibility)
  is_free BOOLEAN DEFAULT false,
  price_min DECIMAL(10, 2),
  price_max DECIMAL(10, 2),
  price_currency VARCHAR(3) DEFAULT 'EUR',
  price_info TEXT,
  
  -- URLs
  website_url TEXT,
  booking_url TEXT,
  ticket_url TEXT,
  source_url TEXT,
  
  -- Media
  image_urls TEXT[],
  video_url TEXT,
  
  -- Source Information (Critical for EventRepository compatibility)
  source VARCHAR(50) NOT NULL,
  source_api VARCHAR(100),
  external_id VARCHAR(255),
  
  -- Metadata
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_cancelled BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  popularity_score INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_event UNIQUE (title, start_date_time, city),
  CONSTRAINT valid_price_range CHECK (price_min IS NULL OR price_max IS NULL OR price_min <= price_max),
  CONSTRAINT valid_date_range CHECK (end_date_time IS NULL OR end_date_time >= start_date_time)
);

-- Create indexes for performance
CREATE INDEX idx_events_city ON events(city);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_start_time ON events(start_date_time);
CREATE INDEX idx_events_date_range ON events(start_date_time, end_date_time);
CREATE INDEX idx_events_city_date ON events(city, start_date_time);
CREATE INDEX idx_events_source ON events(source);
CREATE INDEX idx_events_is_featured ON events(is_featured) WHERE is_featured = true;
CREATE INDEX idx_events_tags ON events USING GIN(tags);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE events IS 'Complete events table with full schema matching EventData structure';
COMMENT ON COLUMN events.start_date_time IS 'Start date and time in ISO 8601 format (TIMESTAMPTZ)';
COMMENT ON COLUMN events.is_free IS 'Boolean flag indicating if event is free (detected from price string)';
COMMENT ON COLUMN events.source IS 'Event source: cache, ai, rss, ra, wien-info, etc.';
COMMENT ON COLUMN events.custom_venue_name IS 'Venue name when venue_id is not used';
COMMENT ON COLUMN events.custom_venue_address IS 'Venue address when venue_id is not used';
