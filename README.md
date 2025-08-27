# where2go-clean
Saubere Neuentwicklung der Eventsuchseite für Städte- und Zeitraumfilter.

## Setup

### Environment Variables

Create a `.env.local` file in the root directory and add your Perplexity API key:

```
PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

### Installation

```bash
npm install
npm run dev
```

The application will start on `http://localhost:3000`.

### Features

- Event search by city and date
- Multi-query Perplexity search with smart aggregation
- 5-minute caching for repeated queries
- Automatic event categorization and deduplication
- No UI changes required - fully backward compatible

### API

The existing API remains unchanged:
- `POST /api/events` - Submit search request, returns job ID
- `GET /api/jobs/[jobId]` - Check job status and get results

Optional request body fields for enhanced search:
```json
{
  "city": "Berlin",
  "date": "2025-01-20",
  "categories": ["musik", "theater", "museen"], // optional
  "options": { // optional
    "includeNearbyEvents": true,
    "maxResults": 50,
    "priceRange": "free",
    "accessibility": "wheelchair"
  }
}
