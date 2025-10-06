# Day-Bucket Cache Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Event Sources                                │
├──────────────┬──────────────┬──────────────┬─────────────────────────┤
│   RSS Feed   │   AI/LLM     │  wien.info   │   Other Sources         │
└──────┬───────┴──────┬───────┴──────┬───────┴─────────────┬───────────┘
       │              │              │                     │
       │ EventData[]  │ EventData[]  │ EventData[]         │ EventData[]
       │              │              │                     │
       └──────────────┴──────────────┴─────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Event Aggregator    │
                    │  deduplicateEvents()  │
                    │  (uses generateEventId)│
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │  Cache Layer (Redis)  │
                    │                       │
                    │  events:v3:day:...    │◄── Day-Bucket (NEW)
                    │  events:v2:...        │◄── Per-Category (Legacy)
                    └───────────────────────┘
```

## Event ID Generation Flow

```
┌────────────────────┐
│  Input Event       │
│  ───────────────   │
│  title: "Rock'n'   │
│         Roll!"     │
│  date: "2025-01-20"│
│  venue: "The Arena"│
└──────┬─────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  normalizeForEventId(title)      │
│  └─ lowercase                    │
│  └─ NFKD normalization           │
│  └─ strip punctuation            │
│  └─ collapse spaces              │
│  └─ trim                         │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Normalized Components           │
│  ─────────────────────           │
│  title:  "rock n roll"           │
│  date:   "2025-01-20"           │
│  venue:  "the arena"             │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Event ID                        │
│  "rock n roll|2025-01-20|        │
│   the arena"                     │
└──────────────────────────────────┘
```

## Upsert Merge Logic

```
┌──────────────────────────────────────────────────────────────┐
│  Incoming Event                  Existing Event               │
├──────────────────────────────────────────────────────────────┤
│  title: "Concert"               title: "Concert"             │
│  date: "2025-01-20"            date: "2025-01-20"           │
│  venue: "Arena"                venue: "Arena"               │
│  price: ""                     price: "20€"      ← KEEP     │
│  description: "Long detailed   description: "Short"         │
│               text..."          ← REPLACE (longer wins)     │
│  source: "ai"                  source: "rss"                │
│                                 ↓                            │
│                          source: "rss,ai" ← UNION          │
└──────────────────────────────────────────────────────────────┘
```

## Day-Bucket Structure

```json
{
  "eventsById": {
    "concert|2025-01-20|arena": {
      "title": "Concert",
      "category": "Music",
      "date": "2025-01-20",
      "time": "20:00",
      "venue": "Arena",
      "price": "20€",
      "website": "example.com",
      "description": "Long detailed description...",
      "source": "rss,ai"
    },
    "art show|2025-01-20|gallery": {
      "title": "Art Show",
      "category": "Art",
      "date": "2025-01-20",
      "time": "14:00",
      "venue": "Gallery",
      "price": "Free",
      "website": "gallery.com",
      "source": "rss"
    }
  },
  "index": {
    "Music": ["concert|2025-01-20|arena"],
    "Art": ["art show|2025-01-20|gallery"]
  },
  "updatedAt": "2025-01-20T12:00:00Z"
}
```

## TTL Computation Flow

```
┌────────────────────────────────────┐
│  Events in Bucket                  │
│  ──────────────────                │
│  Event 1: endTime = 21:00         │
│  Event 2: endTime = 23:30         │
│  Event 3: endTime = null          │
│  Date: 2025-01-20                 │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│  Find Latest EndTime               │
│  23:30 (from Event 2)              │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│  Compare with Day End              │
│  max(23:30, 23:59)                │
│  = 23:59                           │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│  Apply Constraints                 │
│  min = 60 seconds                  │
│  max = 7 days                      │
└──────┬─────────────────────────────┘
       │
       ▼
┌────────────────────────────────────┐
│  Final TTL                         │
│  (23:59 - now) seconds             │
└────────────────────────────────────┘
```

## Category Index Lookup

```
Query: "Get all Music events for Wien on 2025-01-20"
       │
       ▼
┌──────────────────────────────────────┐
│  1. Fetch Day-Bucket                 │
│     key = "events:v3:day:wien_       │
│            2025-01-20"               │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  2. Lookup Category Index            │
│     bucket.index["Music"]            │
│     = ["concert1|...", "concert2|..."]│
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  3. Map IDs to Events                │
│     ids.map(id => bucket.eventsById[id])│
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  Result: EventData[]                 │
│  All music events for that day       │
└──────────────────────────────────────┘
```

## Backward Compatibility

```
┌───────────────────────────────────────────────────────┐
│  Redis Cache Namespaces                               │
├───────────────────────────────────────────────────────┤
│                                                       │
│  events:v2:wien_2025-01-20_music          ◄─────────┤
│  events:v2:wien_2025-01-20_art                      │
│  events:v2:wien_2025-01-20_...                      │
│                                                      │
│  ↑ Legacy per-category cache (UNCHANGED)            │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  events:v3:day:wien_2025-01-20         ◄────────────┤
│                                                      │
│  ↑ New day-bucket cache                             │
│                                                      │
└──────────────────────────────────────────────────────┘

Both namespaces coexist without interference
```

## Usage Pattern Example

```
┌─────────────────────────────────────────────────────┐
│  Scenario: Multiple sources for same day            │
└─────────────────────────────────────────────────────┘

Time: 09:00 - RSS scraper runs
   │
   ▼
┌──────────────────────────────────┐
│  upsertDayEvents(Wien, 2025-01-20)│
│  [Concert A, Concert B]          │
│  source: "rss"                   │
└──────────────────────────────────┘
   │
   │  Day-Bucket: 2 events
   │
Time: 10:00 - AI enrichment runs
   │
   ▼
┌──────────────────────────────────┐
│  upsertDayEvents(Wien, 2025-01-20)│
│  [Concert A (with description),  │
│   Concert C]                     │
│  source: "ai"                    │
└──────────────────────────────────┘
   │
   │  Day-Bucket: 3 events
   │  - Concert A: merged (rss,ai)
   │  - Concert B: unchanged (rss)
   │  - Concert C: new (ai)
   │
Time: 11:00 - User queries
   │
   ▼
┌──────────────────────────────────┐
│  getDayEvents(Wien, 2025-01-20)  │
│  → Returns all 3 events          │
│  → Enriched with AI data         │
│  → No duplicates                 │
└──────────────────────────────────┘
```

## Performance Characteristics

```
Operation                  Complexity    Description
───────────────────────────────────────────────────────
getDayEvents()            O(1)          Single Redis GET
upsertDayEvents(n)        O(n)          n events to merge
Filter by category        O(k)          k = category size
Generate event ID         O(1)          String operations
Merge two events          O(1)          Field-wise copy
Build category index      O(n)          n = total events

Storage per event: ~1-2KB JSON
TTL management: Automatic via Redis
```
