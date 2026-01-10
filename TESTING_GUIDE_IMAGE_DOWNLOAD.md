# Quick Start: Testing ImageDownloadService

## Prerequisites
1. Ensure you have Supabase credentials:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY (service role key, not anon key)
   
2. Verify the `event-images` bucket exists in Supabase Storage

## Local Testing

### Step 1: Set Environment Variables
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Trigger Image Download
```bash
curl -X POST http://localhost:3000/api/events/process \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-images-001",
    "city": "Wien",
    "date": "2025-01-20",
    "categories": ["Live-Konzerte", "Theater & Comedy"],
    "options": { "debug": true }
  }'
```

### Step 4: Monitor Console Output
Look for these log messages:
```
[ImageDownload] Starting download for X images...
✅ Event Title: Image stored in Supabase
✅ Another Event: Image stored in Supabase
❌ Failed Event: Image download failed for reason...
```

### Step 5: Verify in Supabase Dashboard
1. Go to Supabase Dashboard → Storage → event-images bucket
2. You should see folders like: `wien/{event-id}/image-{timestamp}.jpg`
3. Click an image to verify it loads correctly

### Step 6: Check Database
```sql
SELECT 
  title, 
  venue,
  image_urls,
  start_date_time
FROM events 
WHERE city = 'Wien' 
  AND image_urls IS NOT NULL
  AND image_urls LIKE '%supabase%'
ORDER BY created_at DESC 
LIMIT 10;
```

## Expected Results

### Success Scenario (85-90% of images)
```bash
# Console
✅ Jazz Night at Stadtpark: Image stored in Supabase
✅ Opera Gala at Staatsoper: Image stored in Supabase

# Storage
event-images/
  wien/
    jazz-night-stadtpark-20250120/
      image-1736513200000.jpg (120KB, optimized)
    opera-gala-staatsoper-20250120/
      image-1736513205000.jpg (95KB, optimized)

# Database
image_urls: ["https://xyz.supabase.co/storage/v1/object/public/event-images/wien/jazz-night-stadtpark-20250120/image-1736513200000.jpg"]
```

### Failure Scenarios (10-15% of images)
```bash
# Common reasons for failure:
❌ HTTP 403: URL not accessible (hotlink protection)
❌ HTTP 404: Image not found
❌ Timeout after 30000ms
❌ Image too small: 50x50px (min: 100x100px)
❌ Invalid content type: text/html

# Events still work - they keep original URLs
image_urls: ["https://external-site.com/original-image.jpg"]
```

## Testing Different Scenarios

### Test 1: Multiple Categories
```bash
curl -X POST http://localhost:3000/api/events/process \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-multi-category",
    "city": "Wien",
    "date": "2025-01-21",
    "categories": ["Live-Konzerte", "Clubs & Nachtleben", "Klassik & Oper"],
    "options": { "debug": true }
  }'
```

### Test 2: Without Supabase Credentials
```bash
# Unset environment variables
unset SUPABASE_URL
unset SUPABASE_SERVICE_ROLE_KEY

# Start server and make request
# Expected: "[ImageDownload] Supabase credentials not configured - skipping image downloads"
```

### Test 3: Different Cities
```bash
curl -X POST http://localhost:3000/api/events/process \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-berlin",
    "city": "Berlin",
    "date": "2025-01-22",
    "categories": ["Live-Konzerte"],
    "options": { "debug": true }
  }'
```

## Troubleshooting

### Issue: No images downloaded
**Check:**
1. Are environment variables set? `echo $SUPABASE_URL`
2. Is service role key correct? (Not anon key)
3. Does `event-images` bucket exist in Supabase?
4. Are events actually returning imageUrl fields from AI?

**Solution:**
```bash
# Verify environment variables are set
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..." # Shows first 20 chars

# Check if events have images
curl http://localhost:3000/api/events/search?city=Wien&date=2025-01-20 | jq '.events[] | {title, imageUrl}'
```

### Issue: "Upload failed" errors
**Check:**
1. Bucket permissions (should be public)
2. Service role key has storage.objects.create permission
3. Bucket name is exactly `event-images`

**Solution:**
```bash
# Verify bucket exists
# Go to Supabase Dashboard → Storage
# Create bucket if missing: Name = "event-images", Public = true
```

### Issue: Images too small / rejected
**This is expected behavior for:**
- Icons (< 100x100px)
- Thumbnails
- Invalid images

**Solution:** No action needed - service will skip these and keep original URLs

### Issue: Slow download times
**Expected:** 2-5 seconds per image with 3 concurrent downloads

**If slower:**
1. Check network connection
2. Increase timeout in ImageDownloadService.ts (default: 30s)
3. Reduce concurrency from 3 to 2 in aggregator.ts

## Performance Monitoring

### Monitor Download Success Rate
```bash
# Count successful vs failed downloads in logs
grep "Image stored in Supabase" /var/log/app.log | wc -l  # Success count
grep "Image download failed" /var/log/app.log | wc -l     # Failure count
```

### Monitor Storage Usage
```sql
-- In Supabase SQL editor
SELECT 
  COUNT(*) as total_images,
  SUM(size) / 1024 / 1024 as total_mb,
  AVG(size) / 1024 as avg_size_kb
FROM storage.objects
WHERE bucket_id = 'event-images';
```

### Monitor Image Quality
1. Download a few images from Supabase Storage
2. Verify dimensions (should be ≤ 1200px on longest side)
3. Verify format (should be JPEG)
4. Verify quality (should look good despite compression)

## Production Deployment

### Before Deploying
- [ ] Set environment variables in Vercel/production environment
- [ ] Verify Supabase bucket is public
- [ ] Test with a small batch of events first
- [ ] Monitor logs for errors

### After Deploying
- [ ] Check production logs for successful downloads
- [ ] Verify images appear on event cards
- [ ] Monitor Supabase storage usage
- [ ] Track image 404 rate (should drop from ~90% to ~10-15%)

## Getting Help

If you encounter issues:
1. Check console logs for error messages
2. Review SECURITY_SUMMARY_IMAGE_DOWNLOAD.md
3. Review IMAGE_DOWNLOAD_SERVICE_IMPLEMENTATION.md
4. Check Supabase Dashboard → Storage → event-images for uploaded files
5. Verify environment variables are correctly set

---

**Quick Test Command:**
```bash
export SUPABASE_URL="your-url" && \
export SUPABASE_SERVICE_ROLE_KEY="your-key" && \
npm run dev &
sleep 5 && \
curl -X POST http://localhost:3000/api/events/process \
  -H "Content-Type: application/json" \
  -d '{"jobId":"test-001","city":"Wien","date":"2025-01-20","categories":["Live-Konzerte"],"options":{"debug":true}}'
```

**Expected Output:**
```
[ImageDownload] Starting download for 5 images...
✅ Jazz Night: Image stored in Supabase
✅ Rock Concert: Image stored in Supabase
❌ Theater Show: HTTP 403: URL not accessible
✅ Opera Performance: Image stored in Supabase
✅ Comedy Night: Image stored in Supabase
```

Success rate: 80% (4/5) ✅
