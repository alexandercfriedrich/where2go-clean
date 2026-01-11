# Image Proxy Debugging Guide

This guide helps diagnose and monitor the image proxy functionality in production.

## Problem Analysis

The image proxy was implemented to improve event image reliability from ~40% to ~95%. If images are still showing as 404 or not loading, this guide will help identify the issue.

## Diagnostic Tools

### 1. Server-Side Logging

The image proxy now logs every URL it processes. Check your Vercel logs for:

```
[ImageProxy] No URL provided, using placeholder
[ImageProxy] Local asset detected, passthrough: /images/...
[ImageProxy] Supabase URL detected, passthrough: https://...supabase.co/...
[ImageProxy] Proxying external URL through weserv.nl
[ImageProxy] Original domain: example.com
[ImageProxy] Proxied URL: https://images.weserv.nl/?url=...
[ImageProxy] Invalid URL (no http/https), using placeholder
[ImageProxy] Batch processing stats: {"total":10,"null":2,"supabase":1,"local":1,"external":6,"invalid":0}
```

### 2. Debug API Endpoint

Test the image proxy directly:

**Test with sample URLs:**
```
GET https://your-domain.vercel.app/api/debug/image-proxy?test=sample
```

**Test with a specific URL:**
```
GET https://your-domain.vercel.app/api/debug/image-proxy?url=https://example.com/image.jpg
```

This will show:
- Input URL
- Output URL (after proxy processing)
- Whether it was proxied through weserv.nl
- Whether it's using a placeholder
- Analysis of the URL structure

### 3. Client-Side Logging (Development Only)

In development mode, EventCard components log image processing:

```javascript
console.log('[EventCard] Image processing:', {
  eventTitle: 'Concert Title...',
  rawImage: 'https://example.com/...',
  processedImage: 'https://images.weserv.nl/?url=...',
  isProxied: true
});
```

## Common Issues & Solutions

### Issue 1: Images Still 404

**Symptoms:** Images are being proxied but still return 404

**Possible Causes:**
1. **Source URLs are invalid** - Perplexity is returning broken URLs
2. **weserv.nl can't access the source** - Source has hotlink protection or IP blocking
3. **Source requires authentication** - URLs contain expired tokens

**Diagnosis:**
1. Check logs for the original domain: `[ImageProxy] Original domain: example.com`
2. Try accessing the original URL directly in a browser
3. Check if the URL requires authentication or has parameters

**Solution:**
- If Perplexity is returning bad URLs, the prompts need further refinement
- If weserv.nl can't access certain domains, those need to be added to the bypass list
- Consider using alternative placeholders for problematic sources

### Issue 2: No Proxying Happening

**Symptoms:** URLs are not being proxied at all

**Possible Causes:**
1. **Image proxy not being called** - Component integration issue
2. **URLs matching bypass patterns** - Supabase/local URLs being passed through
3. **Build/deployment issue** - Old code still running

**Diagnosis:**
1. Check for `[ImageProxy]` logs in Vercel
2. Use the debug API endpoint to verify the function works
3. Check the deployment commit hash matches your latest commit

### Issue 3: All Images Show Placeholders

**Symptoms:** All images are Unsplash placeholders

**Possible Causes:**
1. **No imageUrl in events** - Perplexity not returning image URLs
2. **All URLs being rejected** - Validation too strict
3. **imageUrl field name mismatch** - Using wrong property name

**Diagnosis:**
1. Check batch processing stats: `{"total":10,"null":10,...}`
2. Check the raw event data structure
3. Verify imageUrl field exists in EventData type

## Monitoring in Production

### Vercel Logs

1. Go to Vercel Dashboard → Your Project → Logs
2. Filter for `[ImageProxy]` to see all image processing
3. Look for patterns:
   - High `null` count = Events without images
   - High `external` count = Most images being proxied (expected)
   - High `invalid` count = URLs from Perplexity are malformed

### Key Metrics to Track

```javascript
// From batch processing stats
{
  "total": 100,      // Total events processed
  "null": 5,         // Events with no imageUrl (5%)
  "supabase": 10,    // Internal images (10%)
  "local": 5,        // Local assets (5%)
  "external": 75,    // External images proxied (75%)
  "invalid": 5       // Invalid URLs replaced with placeholders (5%)
}
```

**Target:**
- null + invalid < 5% (good)
- external: 70-90% (most images should be proxied)
- supabase + local: 5-20% (internal assets)

## Testing Steps

1. **Verify proxy function works:**
   ```
   curl https://your-domain.vercel.app/api/debug/image-proxy?test=sample
   ```

2. **Test with real event URL:**
   - Get an imageUrl from your events data
   - Test it: `?url=<paste-url-here>`
   - Verify the output is a weserv.nl URL

3. **Check Vercel logs:**
   - Load an events page
   - Wait 10 seconds
   - Check logs for `[ImageProxy]` entries
   - Verify images are being processed

4. **Visual verification:**
   - Open browser DevTools → Network tab
   - Filter for "images"
   - Load events page
   - Check image requests - should see weserv.nl domains

## Quick Fixes

### Force Placeholder for Testing
Temporarily modify imageProxy.ts to always return placeholder:
```typescript
export function getImageUrl(originalUrl: string | null | undefined): string {
  return getPlaceholderUrl('event-default'); // Force placeholder
}
```

### Bypass Proxy for Testing
Temporarily return original URLs:
```typescript
export function getImageUrl(originalUrl: string | null | undefined): string {
  return originalUrl || getPlaceholderUrl('event-default'); // No proxy
}
```

### Enable Verbose Logging
All logging is already enabled. Check your Vercel log filters.

## Need More Help?

If images are still not working after following this guide:

1. Share the output of `/api/debug/image-proxy?test=sample`
2. Share a sample of Vercel logs showing `[ImageProxy]` entries
3. Share the network requests from browser DevTools
4. Provide example imageUrl from your events data

This information will help identify the root cause.
