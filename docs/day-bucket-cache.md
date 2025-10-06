# Day-Bucket Cache Implementation

## Overview

The day-bucket cache is a hybrid caching model that materializes all valid events for a city+date into a single cache entry, while preserving existing per-category shards for backward compatibility.

## Architecture

### Cache Key Format
```
events:v3:day:{city}_{date}
```

Example: `events:v3:day:wien_2025-01-20`

### Data Structure

```typescript
interface DayBucket {
  eventsById: { [eventId: string]: EventData };
  index: { [category: string]: string[] }; // sorted unique eventIds per category
  updatedAt: string; // ISO timestamp
}
```

### Event ID Generation

Event IDs are generated using a stable hash of:
- Normalized title (lowercase, NFKD, stripped punctuation, collapsed spaces)
- Date (first 10 chars, typically YYYY-MM-DD)
- Normalized venue

```typescript
eventId = normalizeForEventId(title) + "|" + date.slice(0,10) + "|" + normalizeForEventId(venue)
```

This ensures that the same event from different sources gets the same ID.

## Features

### 1. Upsert Merge Logic

When upserting events into the day-bucket:
- **Field-wise merge**: Prefer non-empty fields
- **Longer description wins**: If both events have descriptions, keep the longer one
- **Keep earliest price/links**: If existing event has price/link, keep it
- **Union sources**: Combine source tags from multiple ingestions

### 2. TTL Computation

TTL is computed dynamically based on event data:
- Until the latest `endTime` among all events
- At least until 23:59 of the day
- Never more than 7 days (safety limit)
- Minimum 60 seconds

### 3. Category Index

The `index` field maintains a sorted list of event IDs per category for efficient filtering:

```typescript
{
  "Music": ["event1|2025-01-20|venue1", "event2|2025-01-20|venue2"],
  "Art": ["event3|2025-01-20|venue3"]
}
```

## Usage

### Reading from Day-Bucket

```typescript
import { eventsCache } from '@/lib/cache';

const bucket = await eventsCache.getDayEvents('Wien', '2025-01-20');

if (bucket) {
  // Get all events
  const allEvents = Object.values(bucket.eventsById);
  
  // Get events for specific category
  const musicEventIds = bucket.index['Music'] || [];
  const musicEvents = musicEventIds.map(id => bucket.eventsById[id]);
  
  console.log(`Last updated: ${bucket.updatedAt}`);
}
```

### Writing to Day-Bucket

```typescript
import { eventsCache } from '@/lib/cache';

const newEvents: EventData[] = [
  {
    title: 'Concert',
    category: 'Music',
    date: '2025-01-20',
    time: '19:00',
    venue: 'Arena',
    price: '20€',
    website: 'example.com'
  }
];

// Upsert events (merge with existing)
await eventsCache.upsertDayEvents('Wien', '2025-01-20', newEvents);

// With explicit TTL
await eventsCache.upsertDayEvents('Wien', '2025-01-20', newEvents, 3600);
```

## Benefits

1. **Immediate Availability**: All valid events for a city+date are immediately available from one cache key
2. **Incremental Enrichment**: Events from different sources can be merged over time, enriching the data
3. **Deduplication**: Same events from multiple sources are automatically merged using stable IDs
4. **Backward Compatible**: Existing per-category cache (`events:v2:`) continues to work
5. **Efficient TTL**: Cache entries expire appropriately based on event timing

## Integration with Existing Code

The day-bucket cache is designed to work alongside the existing per-category cache:

1. **Event Aggregator**: Uses shared `generateEventId()` for consistent deduplication
2. **Cache Module**: Provides both `getDayEvents/upsertDayEvents` and legacy `getEventsByCategories/setEventsByCategory`
3. **Gradual Migration**: Code can progressively adopt day-bucket while maintaining backward compatibility

## Testing

Comprehensive tests are available in:
- `app/lib/__tests__/dayBucket.test.ts` - Event ID generation and structure tests
- `app/lib/__tests__/dayBucket-integration.test.ts` - Merge logic and TTL computation tests

Run tests:
```bash
npm test -- dayBucket
```

## Implementation Files

- `app/lib/eventId.ts` - Event ID generation utilities
- `app/lib/cache.ts` - Day-bucket cache operations (getDayEvents, upsertDayEvents)
- `app/lib/types.ts` - DayBucket interface definition
- `app/lib/aggregator.ts` - Uses shared eventId for deduplication consistency
