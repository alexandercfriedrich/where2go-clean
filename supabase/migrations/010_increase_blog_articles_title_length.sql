-- Migration: Increase Blog Articles Title Field Length
-- Description: Extend title field from VARCHAR(500) to VARCHAR(1000) to accommodate longer AI-generated titles
-- Created: 2025-12-12

-- Alter the title column to allow longer values
ALTER TABLE blog_articles
ALTER COLUMN title TYPE VARCHAR(1000);

-- Add comment for documentation
COMMENT ON COLUMN blog_articles.title IS 'Article title (up to 1000 characters), generated from city-category-content';
