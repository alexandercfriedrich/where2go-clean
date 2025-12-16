# Architecture - Ibiza Spotlight Scraper System

## System Overview

```
User Interface Layer
├─ Django Admin Panel
├─ REST API
└─ CLI (future)
       │
       ↓
Business Logic Layer
├─ ScraperRegistry (register all scrapers)
├─ ScraperRun (track executions)
├─ ScraperSchedule (manage schedules)
└─ ScraperLog (logging)
       │
       ↓
Scraper Engine Layer
├─ IbizaSpotlightScraper
├─ [Future Scrapers]
└─ BaseScraper (interface)
       │
       ↓
Data Layer
├─ PostgreSQL/MySQL
├─ Cache (Redis/Memcached)
└─ External APIs (ibiza-spotlight.de)
```

## Data Flow

### Manual Trigger Flow
```
Admin clicks "Run Now"
    │
    ↓
Views: run_scraper_now()
    │
    ↓
Create ScraperRun(status=pending)
    │
    ↓
Import scraper dynamically
    │
    ↓
Update ScraperRun(status=running)
    │
    ↓
Execute: scraper.start_scraping()
    │
    ├─ get_events_calendar()
    ├─ Optional: enhance_events_with_details()
    └─ save_to_database()
    │
    ↓
Log results to ScraperLog
    │
    ↓
Update ScraperRun(status=completed)
    │
    ↓
Return to admin (dashboard auto-refreshes)
```

### Scheduled Execution Flow
```
Celery Beat checks schedules (hourly)
    │
    ↓
Find due schedules
    │
    ↓
Create ScraperRun(triggered_by=scheduled)
    │
    ↓
Queue Celery task
    │
    ↓
Worker executes task
    │
    ↓
Update ScraperRun with results
    │
    ↓
Email notification (if configured)
```

## Database Schema

### ScraperRegistry
Registers available scrapers with metadata.

**Fields:**
- id (UUID): Primary key
- scraper_key: Unique identifier
- display_name: User-friendly name
- module_path: Python module path
- class_name: Scraper class name
- status: available|disabled|maintenance
- is_active: Enable/disable flag
- default_delay: Delay between requests
- timeout: Request timeout
- max_retries: Retry attempts

**Relationships:**
- Has many: ScraperRun
- Has one: ScraperSchedule

### ScraperRun
Tracks individual scraper executions.

**Fields:**
- id (UUID): Primary key
- scraper_id (FK): Reference to registry
- status: pending|running|completed|failed|cancelled
- triggered_by: manual|scheduled|api
- started_at: Timestamp
- completed_at: Timestamp
- duration: Seconds
- items_found: Count
- items_saved: Count
- items_updated: Count
- errors: Count
- message: Success message
- error_message: Error details
- result_data: JSON with results

**Relationships:**
- Belongs to: ScraperRegistry
- Has many: ScraperLog

### ScraperSchedule
Configures automatic execution.

**Fields:**
- id (UUID): Primary key
- scraper_id (FK): Reference to registry (unique)
- is_active: Enable/disable
- frequency: once|hourly|daily|weekly|monthly
- next_run: Datetime
- last_run: Datetime
- parameters: JSON custom config

**Relationships:**
- Belongs to: ScraperRegistry (1-to-1)

### ScraperLog
Detailed logging for debugging.

**Fields:**
- id (UUID): Primary key
- run_id (FK): Reference to run
- level: DEBUG|INFO|WARNING|ERROR|CRITICAL
- message: Log message
- created_at: Timestamp

**Relationships:**
- Belongs to: ScraperRun

## Admin Interface Design

### ScraperRegistryAdmin
- **List View**: All scrapers with status, last run, stats
- **Detail View**: Full configuration, run history
- **Actions**: Run Now, View Logs, Configure Schedule

### ScraperRunAdmin
- **List View**: All runs filtered by status, scraper, date
- **Detail View**: Full results, parameters, error messages
- **Read-only**: Cannot add/delete runs manually

### ScraperScheduleAdmin
- **List View**: All schedules with frequency and next run
- **Detail View**: Configuration and execution history
- **Actions**: Edit, Enable/Disable

### ScraperLogAdmin
- **List View**: Searchable logs with level filtering
- **Detail View**: Full log message with context
- **Read-only**: Automatic cleanup after retention period

## REST API Design

### Authentication
- Token-based (TokenAuthentication)
- Header: `Authorization: Bearer <token>`

### Endpoints

#### GET /api/scrapers/
List all scrapers.
```json
[
  {
    "id": "uuid",
    "name": "Ibiza Spotlight",
    "status": "available",
    "stats": {
      "total_runs": 10,
      "successful": 9,
      "failed": 1
    }
  }
]
```

#### POST /api/scrapers/{id}/run/
Start a scraper.
```json
Response:
{
  "success": true,
  "run_id": "uuid",
  "message": "Scraper started"
}
```

#### GET /api/scrapers/run/{id}/status/
Check run status.
```json
{
  "status": "completed",
  "items_found": 42,
  "items_saved": 42,
  "errors": 0,
  "duration": 125.5
}
```

#### GET /api/scrapers/stats/
Overall statistics.
```json
{
  "total_runs": 100,
  "successful_runs": 95,
  "failed_runs": 5,
  "success_rate": 95.0
}
```

## Error Handling Strategy

### Scraper Level
1. Try-catch around HTTP requests
2. Timeout handling
3. Retry logic with exponential backoff
4. Detailed error logging

### Database Level
1. Transaction rollback on errors
2. Unique constraint handling
3. Connection error recovery

### API Level
1. HTTP status code responses
2. JSON error messages
3. Input validation
4. Rate limiting (future)

## Performance Considerations

### Scraper Performance
- Rate limiting (2 sec delays) prevents server overload
- BeautifulSoup for efficient HTML parsing
- Minimal data storage (only necessary fields)

### Database Performance
- Indexes on frequently queried fields
- Pagination for large result sets
- Log cleanup after retention period
- Connection pooling

### API Performance
- Cached statistics queries
- Pagination of results
- Async execution via Celery (future)

## Security Architecture

### Authentication & Authorization
- Django staff permission required for admin
- Token-based API authentication
- CSRF token verification for POST requests

### Data Protection
- SQL injection prevention via ORM
- Input validation on all endpoints
- Audit trail for all operations
- Secure error messages (no data leakage)

### Scraping Ethics
- Respectful rate limiting
- robots.txt compliance
- User-agent identification
- Terms of Service review

## Scalability Design

### Horizontal Scalability
- Stateless scraper instances
- Database-backed state
- Celery for distributed execution
- Redis for task queue

### Vertical Scalability
- Efficient database queries
- Caching layer (Redis)
- Async processing
- Log cleanup and archival

### Future Extensions
- Support for additional scrapers (same framework)
- Webhook notifications
- Advanced analytics
- Performance optimization

---

**Version**: 1.0.0
**Last Updated**: December 15, 2025
