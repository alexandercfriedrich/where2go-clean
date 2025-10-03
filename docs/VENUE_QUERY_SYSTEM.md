# Vienna Venue Multi-Query System

## Overview

The Vienna Venue Multi-Query System enables targeted event discovery by querying specific venues alongside category-based searches. This implementation utilizes the 20 Vienna venues configured with `aiQueryTemplate` fields to significantly increase event discovery rates.

## Architecture

### Components

1. **VenueQueryService** (`app/lib/services/VenueQueryService.ts`)
   - Manages venue data retrieval and filtering
   - Provides priority-based venue grouping
   - Generates venue-specific AI prompts

2. **Perplexity Integration** (`app/lib/perplexity.ts`)
   - Executes venue queries in batches
   - Handles concurrent query execution
   - Integrates with existing category query system

3. **API Route** (`app/api/events/process/route.ts`)
   - Enables venue queries by default
   - Configures query limits and concurrency
   - Tracks venue queries in debug mode

## How It Works

### 1. Venue Loading

```typescript
const venues = await venueQueryService.getActiveVenueQueries('Wien');
```

- Loads all active venues for the specified city
- Filters by `isActive = true` and valid `aiQueryTemplate` (>10 chars)
- Sorts by priority (descending: 10 → 1)
- Caches results for 1 hour

### 2. Priority Grouping

```typescript
const { high, medium, low } = venueQueryService.getVenuesByPriority(venues);
```

- **High Priority (8-10)**: Major venues like Staatsoper, Konzerthaus
- **Medium Priority (6-7)**: Popular venues like Arena Wien, Chelsea
- **Low Priority (<6)**: Smaller or specialized venues

### 3. Query Execution

The system executes venue queries in batches:

```typescript
// Configure in API route
{
  enableVenueQueries: true,          // Enable venue queries
  venueQueryLimit: 20,               // Process up to 20 venues
  venueQueryConcurrency: 2,          // 2 concurrent venue queries
}
```

### 4. Venue-Specific Prompts

Each venue query includes:
- Venue's custom `aiQueryTemplate`
- Venue name, location, and date
- Official website and events page URLs
- Category context
- Structured JSON response requirements

Example prompt structure:
```
VENUE-SPECIFIC EVENT SEARCH: Classical music events at Wiener Konzerthaus

TARGET VENUE: Wiener Konzerthaus
LOCATION: Wien
DATE: 2025-10-03
CATEGORIES: Live-Konzerte, Kultur/Traditionen

SEARCH INSTRUCTIONS:
- Focus specifically on events at "Wiener Konzerthaus" in Wien
- Check the venue's official website: https://konzerthaus.at
- Look for events page: https://konzerthaus.at/programm
- Include events happening on 2025-10-03
...
```

## Configuration

### API Options

When calling `/api/events/process`, you can configure venue queries:

```json
{
  "jobId": "my-job-id",
  "city": "Wien",
  "date": "2025-10-03",
  "categories": ["Live-Konzerte", "DJ Sets/Electronic"],
  "options": {
    "debug": true,                    // Enable debug logging
    "enableVenueQueries": true,       // Enable venue queries (default: true)
    "venueQueryLimit": 20,            // Max venues to query (default: 20)
    "venueQueryConcurrency": 2        // Concurrent venue queries (default: 3)
  }
}
```

### Venue Configuration

Venues are configured in `app/lib/data/hotCities/viennaVenues.ts`:

```typescript
{
  id: 'venue-staatsoper-wien',
  name: 'Wiener Staatsoper',
  categories: ['Live-Konzerte', 'Theater/Performance', 'Kultur/Traditionen'],
  description: 'World-famous Vienna State Opera',
  priority: 10,                       // High priority (8-10)
  isActive: true,                     // Must be active
  address: { /* ... */ },
  website: 'https://www.wiener-staatsoper.at',
  eventsUrl: 'https://www.wiener-staatsoper.at/spielplan',
  aiQueryTemplate: 'Opera performances and events at Vienna State Opera Wiener Staatsoper'
}
```

## Performance Optimization

### 1. Caching
- Venue queries are cached for 1 hour
- Reduces repeated lookups for the same city
- Cache cleared automatically after TTL

### 2. Batching
- Venues processed in configurable batch sizes
- Default concurrency: 3 parallel queries
- Prevents API rate limiting

### 3. Priority-Based Execution
- High-priority venues processed first
- Medium-priority venues processed second
- Low-priority venues skipped by default
- Ensures most important venues are always queried

## Debug Mode

Enable debug mode to track venue query execution:

```json
{
  "options": {
    "debug": true
  }
}
```

Debug logs show:
```
[PPLX:VENUES] Found 20 venue queries for Wien
[PPLX:VENUE] Querying Wiener Staatsoper (priority: 10)
[PPLX:VENUE] Querying Wiener Konzerthaus (priority: 9)
...
[PPLX:VENUES] Completed 20 venue queries
```

Debug steps include:
- `venueId`: Venue identifier
- `venueName`: Venue display name
- `isVenueQuery`: Flag indicating venue-specific query
- `parsedCount`: Number of events found for this venue

## Expected Results

### Before Implementation
- ~50 Vienna events per search
- Category-only queries
- No venue-specific targeting

### After Implementation
- **150-200+ Vienna events expected**
- **300-400% increase in event discovery**
- Dual-strategy: categories + venue-specific queries
- Better coverage of venue-specific events

## Testing

### 1. Run Unit Tests
```bash
npm test -- VenueQueryService.test.ts
```

### 2. Run Integration Tests
```bash
npm test -- VenueQueryIntegration.test.ts
```

### 3. Seed Hot Cities Data
```bash
curl -X POST http://localhost:3000/api/admin/hot-cities/seed
```

### 4. Test Event Search
```bash
curl -X POST http://localhost:3000/api/events/process \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-venues",
    "city": "Wien",
    "date": "2025-10-03",
    "categories": ["Live-Konzerte"],
    "options": { "debug": true }
  }'
```

## Vienna Venues (Priority Order)

### High Priority (8-10)
1. **Wiener Staatsoper** (10) - Opera performances
2. **Wiener Konzerthaus** (9) - Classical concerts
3. **Burgtheater** (9) - Theater performances
4. **Flex Wien** (8) - Electronic music & club events
5. **Belvedere Museum** (8) - Art exhibitions
6. **Wiener Stadthalle** (8) - Large concerts & events
7. **Porgy & Bess** (8) - Jazz club
8. **Radiokulturhaus** (8) - Radio concerts
9. **Volkstheater** (8) - Contemporary theater
10. **WUK** (8) - Alternative arts & culture

### Medium Priority (6-7)
11. **Arena Wien** (7) - Concerts & festivals
12. **Kulturzentrum Sargfabrik** (7) - Community culture
13. **MuTh** (7) - Children's concert hall
14. **Orpheum** (7) - Variety shows
15. **Praterdome** (7) - Electronic music
16. **Reigen** (7) - Indie concerts
17. **Chelsea Wien** (6) - Alternative music
18. **Globe Wien** (6) - Shakespeare theater
19. **Marx Halle** (6) - Large events
20. **Ottakringer Brauerei** (6) - Brewery events

## Troubleshooting

### No Venues Found
- Check that hot cities data is seeded: `POST /api/admin/hot-cities/seed`
- Verify Vienna is active in hot cities configuration
- Confirm venues have valid `aiQueryTemplate` (>10 characters)

### Low Event Count
- Check debug logs for venue query execution
- Verify `enableVenueQueries: true` in options
- Increase `venueQueryLimit` to process more venues
- Check venue priority configuration

### Performance Issues
- Reduce `venueQueryConcurrency` to lower API load
- Reduce `venueQueryLimit` to process fewer venues
- Check cache TTL settings
- Monitor API rate limits

## Future Enhancements

1. **Adaptive Concurrency**: Adjust based on API response times
2. **Venue Performance Metrics**: Track which venues yield most events
3. **Dynamic Priority Adjustment**: Learn from event discovery success rates
4. **Cross-City Support**: Extend to other cities beyond Vienna
5. **Real-Time Updates**: WebSocket integration for live venue events

## Related Documentation

- [Hot Cities Configuration](../app/lib/data/hotCities/README.md)
- [Event Aggregation](./EVENT_AGGREGATION.md)
- [Perplexity Integration](./PERPLEXITY_INTEGRATION.md)
- [Testing Strategy](./TESTING.md)
