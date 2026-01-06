-- Migration: Restore unique_event constraint
-- Description: Clean up duplicates and re-add composite unique constraint to enable UPSERT functionality
-- Date: 2026-01-03 (Updated: 2026-01-06)
-- Reason: Migration 012 removed this constraint which broke the upsert mechanism in EventRepository
-- The constraint (title, start_date_time, city) is necessary for ON CONFLICT to work

-- Step 1: Identify and report duplicates
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count how many duplicate events exist
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT title, start_date_time, city, COUNT(*) as cnt
    FROM events
    GROUP BY title, start_date_time, city
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Found % groups of duplicate events to clean up', duplicate_count;
END $$;

-- Step 2: Delete duplicate events, keeping the best one from each group
-- Priority: Keep the one with most recent created_at, and if tied, the one with most complete data
WITH ranked_events AS (
  SELECT 
    id,
    title,
    start_date_time,
    city,
    ROW_NUMBER() OVER (
      PARTITION BY title, start_date_time, city 
      ORDER BY 
        created_at DESC,  -- Prefer newer entries
        CASE WHEN description IS NOT NULL THEN 1 ELSE 0 END DESC,  -- Prefer entries with description
        CASE WHEN image_urls IS NOT NULL AND array_length(image_urls, 1) > 0 THEN 1 ELSE 0 END DESC,  -- Prefer entries with images
        updated_at DESC  -- Final tiebreaker
    ) as rn
  FROM events
),
deleted_events AS (
  DELETE FROM events
  WHERE id IN (
    SELECT id FROM ranked_events WHERE rn > 1
  )
  RETURNING id, title, start_date_time, city
)
SELECT COUNT(*) as deleted_count FROM deleted_events;

-- Step 3: Add the unique constraint now that duplicates are cleaned
ALTER TABLE events ADD CONSTRAINT unique_event UNIQUE (title, start_date_time, city);

-- Step 4: Add comment for documentation
COMMENT ON CONSTRAINT unique_event ON events IS 'Composite unique constraint: prevents duplicate events with same title, start date, and city. Required for upsert operations via ON CONFLICT. Duplicates cleaned up on 2026-01-06.';

-- Step 5: Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 013 completed successfully';
  RAISE NOTICE 'Unique constraint "unique_event" restored on (title, start_date_time, city)';
END $$;
