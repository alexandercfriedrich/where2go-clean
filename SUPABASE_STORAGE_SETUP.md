# Supabase Storage Setup Guide

## Event Images Bucket Configuration

This guide explains how to set up the `event-images` storage bucket in Supabase Dashboard. Storage buckets cannot be created via SQL migrations and must be configured through the UI.

## Why Manual Setup?

Supabase Storage buckets and their policies require special permissions that are not available through regular SQL migrations. The `storage.objects` table is managed by Supabase's Storage API and can only be configured through:
1. Supabase Dashboard UI (recommended)
2. Supabase Management API
3. Supabase CLI with proper authentication

## Setup Steps

### 1. Create the Storage Bucket

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"Create a new bucket"** button
5. Configure the bucket:

   | Setting | Value |
   |---------|-------|
   | **Bucket name** | `event-images` |
   | **Public bucket** | ✅ ON (checked) |
   | **File size limit** | `10 MB` |
   | **Allowed MIME types** | `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif` |

6. Click **"Create bucket"**

### 2. Configure Storage Policies

After creating the bucket, you need to set up access policies:

1. Go to **Storage** > **event-images** > **Policies** tab
2. Click **"New Policy"** for each policy below

#### Policy 1: Public Read Access

Allows anyone to view images via public URLs.

```
Name: Public read access for event images
Allowed operation: SELECT
Target roles: public
Policy definition (USING):
  bucket_id = 'event-images'
```

#### Policy 2: Service Role Upload

Allows the backend to upload new images.

```
Name: Service role can upload event images
Allowed operation: INSERT
Target roles: service_role
Policy definition (WITH CHECK):
  bucket_id = 'event-images'
```

#### Policy 3: Service Role Update

Allows the backend to replace existing images.

```
Name: Service role can update event images
Allowed operation: UPDATE
Target roles: service_role
Policy definition (USING):
  bucket_id = 'event-images'
```

#### Policy 4: Service Role Delete

Allows the backend to delete images if needed.

```
Name: Service role can delete event images
Allowed operation: DELETE
Target roles: service_role
Policy definition (USING):
  bucket_id = 'event-images'
```

## Verification

After completing the setup, verify everything is configured correctly:

### Check Bucket Configuration

Run this SQL query in the Supabase SQL Editor:

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'event-images';
```

Expected result:
```
id: event-images
name: event-images
public: true
file_size_limit: 10485760
allowed_mime_types: {image/jpeg, image/jpg, image/png, image/webp, image/gif}
```

### Check Policies

Run this SQL query:

```sql
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%event images%';
```

You should see 4 policies (SELECT, INSERT, UPDATE, DELETE).

### Test Upload

Test the upload functionality by running the application with debug mode:

```bash
# Set debug flag in your .env.local
DEBUG_IMAGE_UPLOAD=true

# Watch the logs for successful uploads
npm run dev
```

Look for log messages like:
```
[ImageStorage] Uploading to: event-images/wien/event-title-2025-01-09-abc123.jpg
[ImageStorage] Successfully uploaded: https://[project].supabase.co/storage/v1/object/public/event-images/...
```

## Troubleshooting

### Error: "must be owner of table objects"

This error occurs when trying to create storage policies via SQL migration. **Solution**: Follow the manual setup steps above using the Supabase Dashboard.

### Images Not Uploading

1. **Check Service Role Key**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
2. **Verify Bucket Exists**: Check Storage dashboard for `event-images` bucket
3. **Check Policies**: Verify all 4 policies are created (especially INSERT policy)
4. **Check File Size**: Images must be under 10MB
5. **Check MIME Type**: Only JPEG, PNG, WebP, and GIF are allowed

### Images Not Loading (404)

1. **Public Access**: Ensure bucket is set to "Public"
2. **Public Read Policy**: Verify the SELECT policy for `public` role exists
3. **Correct URL Format**: URLs should be:
   ```
   https://[project].supabase.co/storage/v1/object/public/event-images/[city]/[filename]
   ```

## Environment Variables

Ensure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

⚠️ **Security Note**: Never commit the service role key to version control. It has admin access to your database.

## Architecture

```
External Image URL
       ↓
[AI Search discovers event with image]
       ↓
[Unified Pipeline downloads image]
       ↓
[Upload to Supabase Storage]
       ↓
event-images/
  ├── wien/
  │   ├── jazz-night-2025-01-09-abc123.jpg
  │   └── techno-party-2025-01-10-def456.jpg
  ├── ibiza/
  │   └── beach-party-2025-06-15-ghi789.jpg
       ↓
[Database stores Supabase CDN URL]
       ↓
[Frontend loads from Supabase CDN]
```

## Benefits

✅ **Reliability**: Images persist even if original source goes offline  
✅ **Performance**: Served via Supabase's global CDN  
✅ **Consistency**: Same storage solution as venue scrapers  
✅ **Fallback**: Original URL used if upload fails  

## Related Files

- Migration: `supabase/migrations/014_create_event_images_bucket.sql`
- Utility: `app/lib/utils/imageStorage.ts`
- Pipeline: `lib/events/unified-event-pipeline.ts`
- Tests: `app/lib/utils/__tests__/imageStorage.test.ts`
