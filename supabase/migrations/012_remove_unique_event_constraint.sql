-- Migration: Remove unique_event constraint from events table
-- Description: UUID is the sole unique identifier for events
-- Date: 2026-01-03
-- Fixes: UNIQUE constraint violations when updating event times/details

-- Remove the composite unique constraint that was causing duplicate key violations
-- UUID PRIMARY KEY is sufficient as the unique identifier for each event row
ALTER TABLE events DROP CONSTRAINT unique_event;

-- Add comment for documentation
COMMENT ON TABLE events IS 'Events table with UUID as sole unique identifier. No composite unique constraints on business logic fields.';
