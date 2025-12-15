-- Migration: Fix Blog Articles Unique Constraint
-- Description: Remove incorrect UNIQUE(city, category) constraint and ensure correct UNIQUE(city, category, slug) constraint exists
-- Created: 2025-12-15
-- Issue: Production database has blog_articles_city_category_key constraint that prevents multiple articles per city-category

-- Drop the incorrect constraint if it exists
-- This constraint enforces one article per city-category, which contradicts the design
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'blog_articles_city_category_key'
  ) THEN
    ALTER TABLE blog_articles DROP CONSTRAINT blog_articles_city_category_key;
    RAISE NOTICE 'Dropped incorrect constraint: blog_articles_city_category_key';
  ELSE
    RAISE NOTICE 'Constraint blog_articles_city_category_key does not exist, skipping';
  END IF;
END $$;

-- Ensure the correct constraint exists: UNIQUE(city, category, slug)
-- This allows multiple articles per city-category, differentiated by title (slug)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_city_category_slug'
  ) THEN
    ALTER TABLE blog_articles ADD CONSTRAINT unique_city_category_slug UNIQUE (city, category, slug);
    RAISE NOTICE 'Added correct constraint: unique_city_category_slug';
  ELSE
    RAISE NOTICE 'Constraint unique_city_category_slug already exists';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_city_category_slug ON blog_articles IS 
  'Allows multiple articles per city-category combination, differentiated by slug (which includes title). Articles with identical titles will update the existing article.';
