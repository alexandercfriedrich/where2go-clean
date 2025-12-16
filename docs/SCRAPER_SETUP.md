# Ibiza Spotlight Scraper - Setup & Integration Guide

## Overview

Dies ist ein vollständiger Scraper für ibiza-spotlight.de mit:
- Event-Datenerfassung vom Party-Kalender
- Detaillierte Event-Informationen (Fotos, Beschreibungen, DJs, Tickets, Preise)
- Django Admin-Panel zur Verwaltung
- REST API für Scraper-Steuerung
- Celery-Integration für asynchrone Ausführung
- Scheduling und Monitoring

## Prerequisites

- Python 3.8 or higher
- Django 3.2 or higher
- PostgreSQL or SQLite database
- Virtual environment (recommended)

## Installation Steps

### 1. Install Dependencies

```bash
pip install requests beautifulsoup4 lxml python-dateutil django
```

### 2. Add to Django Settings

Add the scrapers app to your `INSTALLED_APPS` in `settings.py`:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # ... other apps
    'backend.scrapers',  # Add this line
]
```

### 3. Configure URLs

Include the scrapers URLs in your main `urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('backend.scrapers.urls')),  # Add this line
]
```

### 4. Run Migrations

Create and apply database migrations:

```bash
python manage.py makemigrations scrapers
python manage.py migrate
```

### 5. Create Superuser (if not exists)

```bash
python manage.py createsuperuser
```

### 6. Register Ibiza Spotlight Scraper

Open Django shell and register the scraper:

```bash
python manage.py shell
```

```python
from backend.scrapers.models import ScraperRegistry

ScraperRegistry.objects.create(
    scraper_key='ibiza_spotlight',
    display_name='Ibiza Spotlight',
    description='Scrapes events from ibiza-spotlight.de party calendar',
    module_path='scrapers.ibiza_spotlight',
    class_name='IbizaSpotlightScraper',
    website='https://www.ibiza-spotlight.de',
    status='available',
    is_active=True,
    default_delay=2.0,  # 2 seconds between requests
    timeout=10,
    max_retries=3
)
```

## Using the Admin Panel

### 1. Access the Admin Dashboard

Start the development server:

```bash
python manage.py runserver
```

Navigate to: `http://localhost:8000/admin/scrapers/`

### 2. Admin Features

**Scraper Dashboard:**
- View all registered scrapers
- See live statistics (total, active, success rate)
- Quick access to recent runs
- Status indicators for running scrapers

**Scraper Management:**
- Click on a scraper to view details
- View run history and statistics
- Access detailed logs
- Configure scraper settings

**Manual Execution:**
- Click "Run Now" button on dashboard
- Or use "Run Scraper" action in scraper detail view
- Monitor progress in real-time
- View results and logs immediately

**Schedule Management:**
- Navigate to "Scraper Schedules"
- Create new schedule for a scraper
- Choose frequency: hourly, daily, weekly, monthly
- Set specific time and day of week
- Enable/disable schedules as needed

### 3. Viewing Logs

Access logs through:
- Scraper detail page → "View Logs" button
- Recent activity section on dashboard
- Individual run detail pages
- Filter by log level (DEBUG, INFO, WARNING, ERROR)

## REST API Usage

### Authentication

All API endpoints require authentication. Add a Bearer token to your requests:

```bash
Authorization: Bearer YOUR_TOKEN_HERE
```

### Available Endpoints

#### 1. List All Scrapers

```bash
GET /api/scrapers/

curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/scrapers/
```

**Response:**
```json
{
  "scrapers": [
    {
      "id": 1,
      "scraper_key": "ibiza_spotlight",
      "display_name": "Ibiza Spotlight",
      "status": "available",
      "is_active": true,
      "last_run": "2024-01-15T10:30:00Z",
      "success_count": 42,
      "error_count": 2
    }
  ]
}
```

#### 2. Run a Scraper

```bash
POST /api/scrapers/{id}/run/

curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/scrapers/1/run/
```

**Response:**
```json
{
  "status": "started",
  "run_id": 123,
  "message": "Scraper started successfully"
}
```

#### 3. Check Run Status

```bash
GET /api/scrapers/run/{run_id}/status/

curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/scrapers/run/123/status/
```

**Response:**
```json
{
  "run_id": 123,
  "status": "completed",
  "started_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:35:00Z",
  "events_found": 15,
  "events_created": 12,
  "events_updated": 3,
  "errors": 0
}
```

#### 4. Get Statistics

```bash
GET /api/scrapers/stats/

curl -H "Authorization: Bearer TOKEN" \
  http://localhost:8000/api/scrapers/stats/
```

**Response:**
```json
{
  "total_scrapers": 1,
  "active_scrapers": 1,
  "total_runs": 44,
  "successful_runs": 42,
  "failed_runs": 2,
  "success_rate": 95.45,
  "total_events": 630
}
```

## Celery Integration (Optional)

For asynchronous execution, integrate with Celery:

### 1. Install Celery

```bash
pip install celery redis
```

### 2. Configure Celery

In `settings.py`:

```python
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
```

### 3. Create Celery Tasks

```python
# backend/scrapers/tasks.py
from celery import shared_task
from backend.scrapers.models import ScraperRegistry

@shared_task
def run_scraper(scraper_id):
    scraper = ScraperRegistry.objects.get(id=scraper_id)
    return scraper.run()
```

### 4. Start Celery Worker

```bash
celery -A your_project worker -l info
```

## Scheduling with Celery Beat

### 1. Install Celery Beat

```bash
pip install django-celery-beat
```

### 2. Add to INSTALLED_APPS

```python
INSTALLED_APPS = [
    # ...
    'django_celery_beat',
]
```

### 3. Run Migrations

```bash
python manage.py migrate django_celery_beat
```

### 4. Start Celery Beat

```bash
celery -A your_project beat -l info
```

### 5. Configure in Admin

Navigate to: `http://localhost:8000/admin/django_celery_beat/`

Create periodic tasks for your scrapers.

## Best Practices

### Rate Limiting

The Ibiza Spotlight scraper includes a default 2-second delay between requests. Adjust if needed:

```python
scraper = ScraperRegistry.objects.get(scraper_key='ibiza_spotlight')
scraper.default_delay = 3.0  # 3 seconds
scraper.save()
```

### Error Handling

- All errors are logged to the database
- Check logs regularly for issues
- Set up email notifications for critical errors
- Use the admin dashboard to monitor health

### Data Quality

- Review scraped events regularly
- Check for duplicates
- Validate event information
- Update scraper logic if website changes

### Performance

- Run scrapers during off-peak hours
- Use Celery for long-running tasks
- Monitor database performance
- Archive old scraper runs periodically

## Troubleshooting

### Common Issues

**1. Scraper not appearing in admin:**
- Verify app is in INSTALLED_APPS
- Run migrations: `python manage.py migrate`
- Register scraper in Django shell

**2. "Module not found" error:**
- Check `module_path` and `class_name` are correct
- Verify scraper file exists in correct location
- Check Python path includes scraper directory

**3. Request timeout errors:**
- Increase timeout in scraper settings
- Check internet connection
- Verify website is accessible

**4. No events found:**
- Check scraper logs for errors
- Verify website structure hasn't changed
- Test scraper logic manually

**5. Database errors:**
- Check database connection
- Verify migrations are applied
- Review database logs

### Debug Mode

Enable debug logging in `settings.py`:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'backend.scrapers': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## Security Considerations

- **Authentication:** Always require authentication for API endpoints
- **Rate Limiting:** Respect target website's resources
- **Data Privacy:** Only store necessary event information
- **Access Control:** Use Django permissions for admin access
- **Audit Trail:** All operations are logged
- **CSRF Protection:** Enabled by default in Django
- **SQL Injection:** Protected by Django ORM

## Support & Documentation

For more information:

- **Usage Guide:** See `docs/ibiza_spotlight_guide.py` for Python examples
- **Django Admin:** Built-in help text in admin panels
- **API Documentation:** Available at `/api/docs/` (if configured)
- **Logs:** Check scraper logs in admin panel

## Next Steps

1. ✅ Complete installation steps above
2. ✅ Register Ibiza Spotlight scraper
3. ✅ Test manual execution in admin panel
4. ✅ Configure scheduling (optional)
5. ✅ Set up Celery for async execution (optional)
6. ✅ Monitor first few runs
7. ✅ Review and validate event data

## License & Legal

- Respect ibiza-spotlight.de terms of service
- Use scraped data responsibly
- Include proper attribution when required
- Review robots.txt before scraping
- Implement rate limiting to avoid server overload

---

**For questions or issues, consult the logs and documentation first!**