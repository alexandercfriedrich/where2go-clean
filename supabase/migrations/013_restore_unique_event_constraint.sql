-- Migration: Restore unique_event constraint
-- Description: Re-add composite unique constraint to enable UPSERT functionality
-- Date: 2026-01-03
-- Reason: Migration 012 removed this constraint which broke the upsert mechanism in EventRepository
-- The constraint (title, start_date_time, city) is necessary for ON CONFLICT to work

-- Restore the unique constraint that enables upsert operations
-- This constraint prevents duplicate events (same title, date, city)
ALTER TABLE events ADD CONSTRAINT unique_event UNIQUE (title, start_date_time, city);

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_event ON events IS 'Composite unique constraint: prevents duplicate events with same title, start date, and city. Required for upsert operations via ON CONFLICT.';

-- Note: If there are existing duplicate events, this migration will fail.
-- To handle duplicates, run these queries BEFORE the migration:
-- DELETE FROM events WHERE id NOT IN (
--   SELECT DISTINCT ON (title, start_date_time, city) id
--   FROM events
--   ORDER BY title, start_date_time, city, created_at DESC
-- );
