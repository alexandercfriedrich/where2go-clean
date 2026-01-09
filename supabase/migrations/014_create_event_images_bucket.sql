-- Create event-images storage bucket for event image uploads
-- This bucket stores images downloaded from external sources to ensure availability

-- Insert the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,  -- Public bucket for event images
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for the event-images bucket
-- Allow public read access to all images
CREATE POLICY "Public read access for event images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-images');

-- Allow service role to insert images
CREATE POLICY "Service role can upload event images"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'event-images');

-- Allow service role to update images
CREATE POLICY "Service role can update event images"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'event-images');

-- Allow service role to delete images
CREATE POLICY "Service role can delete event images"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'event-images');

-- Create index on bucket_id for faster queries
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_id
ON storage.objects(bucket_id);
