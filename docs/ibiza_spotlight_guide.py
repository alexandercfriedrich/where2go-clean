"""
Ibiza Spotlight Scraper - Advanced Configuration & Usage Guide
"""

# ============================================================================
# INSTALLATION
# ============================================================================

# Required packages:
# pip install requests beautifulsoup4 lxml pandas

# Optional for better HTML parsing:
# pip install playwright  # For JavaScript-rendered content


# ============================================================================
# BASIC USAGE EXAMPLES
# ============================================================================

from ibiza_scraper import IbizaSpotlightScraper

# Example 1: Quick calendar scrape (only this week)
def example_quick_scrape():
    """Get events for the next 7 days without detailed info"""
    scraper = IbizaSpotlightScraper(max_days=7, language="de")
    events = scraper.get_events_calendar()
    
    for event in events:
        print(f"{event['date']} - {event['title']} @ {event['venue']}")
        print(f"  Price: €{event['price_from']}")
        print(f"  DJs: {', '.join(event['djs'])}")
        print()


# Example 2: Full scrape with details
def example_full_scrape():
    """Get events with full details from event pages"""
    scraper = IbizaSpotlightScraper(max_days=7, language="de")
    
    # This will take longer but includes photos, descriptions, etc.
    events = scraper.scrape_full_event_data(
        start_date="15/01/2026",  # Format: DD/MM/YYYY
        include_details=True,
        delay=2.0  # 2 second delay between requests (respectful)
    )
    
    scraper.save_to_json(events, "events_2026_jan.json")
    scraper.save_to_csv(events, "events_2026_jan.csv")
    
    return events


# Example 3: Get specific event details
def example_single_event():
    """Get detailed info for a single event"""
    scraper = IbizaSpotlightScraper()
    
    event_url = "https://www.ibiza-spotlight.de/night/promoters/pacha-new-years-eve"
    details = scraper.get_event_details(event_url)
    
    print(f"Event: {details['title']}")
    print(f"Description: {details['description']}")
    print(f"Venue: {details['venue']}")
    print(f"\nDJs:")
    for dj in details['djs']:
        print(f"  - {dj['name']} ({dj['time']})")
    
    print(f"\nTickets:")
    for ticket in details['tickets']:
        print(f"  - {ticket['name']}: {ticket['price']}")
    
    return details


# Example 4: Scrape multiple date ranges
def example_multiple_weeks():
    """Scrape multiple weeks of events"""
    scraper = IbizaSpotlightScraper(max_days=7)
    all_events = []
    
    # Scrape weeks starting from different dates
    dates = [
        "31/12/2025",
        "07/01/2026",
        "14/01/2026",
        "21/01/2026",
    ]
    
    for date in dates:
        print(f"Scraping week starting {date}...")
        events = scraper.get_events_calendar(start_date=date)
        all_events.extend(events)
    
    scraper.save_to_json(all_events, "all_january_events.json")
    print(f"Total events scraped: {len(all_events)}")


# ============================================================================
# ADVANCED USAGE - FILTERING & PROCESSING
# ============================================================================

def filter_by_venue(events, venue_name):
    """Filter events by venue"""
    return [e for e in events if venue_name.lower() in e['venue'].lower()]


def filter_by_dj(events, dj_name):
    """Filter events by DJ"""
    return [e for e in events if any(dj_name.lower() in dj.lower() for dj in e['djs'])]


def filter_by_price_range(events, min_price, max_price):
    """Filter events by price range"""
    filtered = []
    for e in events:
        try:
            price = float(e['price_from'].replace('€', '').replace(',', '.'))
            if min_price <= price <= max_price:
                filtered.append(e)
        except:
            pass
    return filtered


def example_advanced_filtering():
    """Advanced filtering example"""
    scraper = IbizaSpotlightScraper()
    events = scraper.get_events_calendar()
    
    # Filter to only Pacha events under €50
    pacha_events = filter_by_venue(events, "Pacha")
    cheap_pacha = filter_by_price_range(pacha_events, 0, 50)
    
    print(f"Found {len(cheap_pacha)} Pacha events under €50")
    for event in cheap_pacha:
        print(f"  {event['date']}: {event['title']} (€{event['price_from']})")


# ============================================================================
# EXPORT & REPORTING
# ============================================================================

def example_create_report(events):
    """Create a formatted report from events"""
    import pandas as pd
    
    # Convert to DataFrame for easy analysis
    df = pd.DataFrame([
        {
            'title': e['title'],
            'venue': e['venue'],
            'date': e['date'],
            'time': e['time'],
            'price': e['price_from'],
            'dj_count': len(e['djs']),
            'url': e['url']
        }
        for e in events
    ])
    
    print("=== EVENTS SUMMARY ===")
    print(f"Total events: {len(df)}")
    print(f"\nEvents by venue:")
    print(df['venue'].value_counts())
    print(f"\nPrice statistics:")
    # Extract numeric prices
    df['price_numeric'] = df['price'].str.replace('€', '').str.replace(',', '.').astype(float)
    print(df['price_numeric'].describe())
    
    return df


# ============================================================================
# DATABASE STORAGE EXAMPLE
# ============================================================================

def example_store_in_database(events):
    """Example: Store events in SQLite database"""
    import sqlite3
    from datetime import datetime
    
    conn = sqlite3.connect('ibiza_events.db')
    c = conn.cursor()
    
    # Create table
    c.execute('''CREATE TABLE IF NOT EXISTS events
                 (event_id TEXT PRIMARY KEY,
                  title TEXT,
                  venue TEXT,
                  date TEXT,
                  time TEXT,
                  price TEXT,
                  djs TEXT,
                  url TEXT,
                  scraped_at TEXT)''')
    
    # Insert events
    import json
    for event in events:
        c.execute('''INSERT OR REPLACE INTO events 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (event.get('event_id', ''),
                   event['title'],
                   event['venue'],
                   event['date'],
                   event['time'],
                   event['price_from'],
                   json.dumps(event['djs']),
                   event['url'],
                   datetime.now().isoformat()))
    
    conn.commit()
    conn.close()
    print("Events saved to ibiza_events.db")


# ============================================================================
# WEB SCRAPING BEST PRACTICES
# ============================================================================

"""
IMPORTANT CONSIDERATIONS:

1. RESPECT robots.txt:
   - Check ibiza-spotlight.de/robots.txt
   - Follow any guidelines about scraping frequency

2. RATE LIMITING:
   - Use delay between requests (1-2 seconds minimum)
   - Don't make concurrent requests to same domain
   - Consider running scrapes during off-peak hours

3. USER AGENT:
   - Use realistic User-Agent string
   - Don't pretend to be search engines

4. CACHING:
   - Cache responses locally to avoid repeated requests
   - Use ETags and Last-Modified headers

5. ERROR HANDLING:
   - Handle network timeouts gracefully
   - Implement retry logic with exponential backoff
   - Log all errors for debugging

6. TERMS OF SERVICE:
   - Review ibiza-spotlight.de terms
   - Ensure your use case is permitted
   - Consider contacting site owners for permissions

7. DATA STORAGE:
   - Store only necessary data
   - Clean up old data regularly
   - Respect copyright and data privacy laws
"""


# ============================================================================
# MONITORING & LOGGING
# ============================================================================

import logging
from logging.handlers import RotatingFileHandler

def setup_logging():
    """Setup comprehensive logging"""
    logger = logging.getLogger('ibiza_scraper')
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        'ibiza_scraper.log',
        maxBytes=1024*1024,  # 1MB
        backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)
    
    # Formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    logger.setLevel(logging.DEBUG)
    
    return logger


# ============================================================================
# SCHEDULED SCRAPING (Cron Job Example)
# ============================================================================

"""
For scheduled scraping, use APScheduler:

pip install APScheduler

Example:

from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

scheduler = BackgroundScheduler()

def scheduled_scrape():
    scraper = IbizaSpotlightScraper()
    events = scraper.scrape_full_event_data(include_details=True)
    scraper.save_to_json(events, f"events_{datetime.now().date()}.json")

# Run every Monday at 2 AM
scheduler.add_job(scheduled_scrape, 'cron', day_of_week=0, hour=2)
scheduler.start()
"""


if __name__ == "__main__":
    # Uncomment the example you want to run:
    
    # example_quick_scrape()
    # example_full_scrape()
    # example_single_event()
    # example_multiple_weeks()
    # example_advanced_filtering()
    
    pass
