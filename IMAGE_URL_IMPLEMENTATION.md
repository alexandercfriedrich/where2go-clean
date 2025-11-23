# Image URL Support Implementation Summary

## Issue
KI Abfragen (AI queries) were not searching for or returning image URLs. Events should include image URLs in responses and store them in Supabase.

## Solution Overview
Added image URL support to AI queries (Perplexity) and response parsing pipeline, enabling events to include visual content.

## Changes Made

### 1. AI Prompt Updates (`app/lib/perplexity.ts`)

#### System Prompt
```typescript
REQUIRED FIELDS for each event:
title, category, date, time, venue, price, website, endTime, address, 
ticketPrice, eventType, description, bookingLink, ageRestrictions, imageUrl
```

#### Category-Specific Prompts
```typescript
OUTPUT: Return comprehensive JSON array of real ${mainCategory} events.
Include booking/ticket links where available.
Include event image URLs (imageUrl field) from venue websites, social media posts, or event platforms.
```

#### Example Format
```json
{
  "title": "Event Name",
  "category": "Live-Konzerte",
  "date": "2025-12-01",
  "time": "19:30",
  "venue": "Venue Name",
  "price": "€15-25",
  "website": "https://example.com",
  "address": "Street Address",
  "description": "Event description",
  "imageUrl": "https://example.com/image.jpg"
}
```

### 2. Response Parser Updates (`app/lib/aggregator.ts`)

#### Image URL Extraction
Added support for multiple field name variants:
- `imageUrl` (primary)
- `image_url` (snake_case)
- `imageURL` (all caps)
- `image` (short form)
- `poster` (event poster)
- `thumbnail` (thumbnail image)

```typescript
imageUrl: this.extractField(raw, [
  'imageUrl', 
  'image_url', 
  'imageURL', 
  'image', 
  'poster', 
  'thumbnail'
])
```

#### Deduplication Preservation
```typescript
// First merge (by event ID)
imageUrl: existing.imageUrl || ev.imageUrl

// Fuzzy merge (similar events)
imageUrl: base.imageUrl || list[j].imageUrl
```

### 3. Database Integration
No changes needed - already configured:
- **Database field**: `image_urls TEXT[]` in events table
- **EventData interface**: `imageUrl?: string` field exists
- **Repository mapping**: `image_urls: event.imageUrl ? [event.imageUrl] : null`

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. AI Query (Perplexity API)                                    │
│    - System prompt includes "imageUrl" in REQUIRED FIELDS       │
│    - Example JSON shows imageUrl field                          │
│    - Instructions to search venue websites & social media       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. AI Response (JSON)                                           │
│    [{                                                            │
│      "title": "Concert",                                         │
│      "imageUrl": "https://venue.com/concert.jpg",               │
│      ...                                                         │
│    }]                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Aggregator.parseEventsFromResponse()                         │
│    - Extracts imageUrl from JSON                                │
│    - Supports multiple field name variants                      │
│    - Returns EventData[] with imageUrl property                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Aggregator.deduplicateEvents()                               │
│    - Preserves imageUrl during merge (first non-empty)          │
│    - Handles both exact and fuzzy deduplication                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. EventRepository.eventDataToDbInsert()                        │
│    - Maps: imageUrl → image_urls: [imageUrl]                    │
│    - Converts string to array for database                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Supabase Database                                            │
│    - Stored in: events.image_urls (TEXT[] field)                │
│    - Available for event cards, detail pages, etc.              │
└─────────────────────────────────────────────────────────────────┘
```

## Testing

### Unit Tests (`imageUrl-parsing.test.ts`)
✅ 10 tests covering:
- Basic imageUrl parsing from JSON
- Alternative field name support (image_url, poster, etc.)
- Missing imageUrl handling
- Deduplication preservation
- Edge cases (empty string, null, mixed data)

### Integration Tests (`imageUrl-integration.test.ts`)
✅ 4 tests covering:
- Complete AI response parsing
- aggregateResults workflow
- Deduplication scenarios
- Missing data backfill

### Results
- **All 14 tests passing** ✅
- **Build successful** ✅
- **Lint: 0 warnings/errors** ✅
- **CodeQL: 0 security alerts** ✅

## Example AI Response

**Before:**
```json
[{
  "title": "Jazz Night",
  "category": "Live-Konzerte",
  "date": "2025-12-01",
  "time": "20:00",
  "venue": "Blue Note",
  "price": "€15",
  "website": "https://bluenote.com"
}]
```

**After:**
```json
[{
  "title": "Jazz Night",
  "category": "Live-Konzerte",
  "date": "2025-12-01",
  "time": "20:00",
  "venue": "Blue Note",
  "price": "€15",
  "website": "https://bluenote.com",
  "imageUrl": "https://bluenote.com/images/jazz-night.jpg"
}]
```

## Impact

### User Experience
- Events now include images from AI queries
- Visual content from venue websites and social media
- Enhanced event cards with proper imagery

### Technical Benefits
- Consistent image handling across all event sources
- Flexible field name parsing (multiple variants)
- Proper deduplication preserves image URLs
- Database-ready format (TEXT[] array)

### Future Extensibility
- Easy to add more field name variants if needed
- Image validation/quality checks can be added later
- CDN integration possible for image optimization
- Fallback images can be implemented

## Files Modified

1. `app/lib/perplexity.ts` (2 locations)
   - Line 167: Added imageUrl to REQUIRED FIELDS
   - Line 254: Added imageUrl to example format and instructions

2. `app/lib/aggregator.ts` (3 locations)
   - Line 242: Added imageUrl extraction with field variants
   - Line 383: Added imageUrl to first deduplication merge
   - Line 416: Added imageUrl to fuzzy deduplication merge

3. **New test files:**
   - `app/lib/__tests__/imageUrl-parsing.test.ts` (10 tests)
   - `app/lib/__tests__/imageUrl-integration.test.ts` (4 tests)

## Backward Compatibility

✅ **Fully backward compatible:**
- Existing events without imageUrl continue to work
- No database schema changes required
- EventData interface already had imageUrl field
- EventRepository already handled imageUrl mapping
- Wien.info source already used imageUrl

## Security Notes

- ✅ No SQL injection risks (uses parameterized queries)
- ✅ No XSS risks (URLs stored as data, not executed)
- ✅ No SSRF risks (URLs not fetched server-side)
- ✅ CodeQL scan passed with 0 alerts
- ℹ️ Image URL validation can be added in future if needed

## Deployment Notes

- No environment variable changes needed
- No database migrations required
- No configuration updates necessary
- Changes take effect immediately upon deployment

## Issue Resolution

✅ **Issue completely resolved:**
- AI queries now explicitly request image URLs
- Image URLs are parsed from AI responses
- Multiple field name variants supported
- Data stored in Supabase image_urls field
- Comprehensive test coverage added
- No breaking changes introduced
