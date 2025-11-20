"""
Venue Scraper Configurations

This file contains configurations for different venue websites.
Each configuration defines the structure and selectors needed to scrape that venue.

Configuration Format:
{
    'venue_name': 'Venue Name',
    'venue_address': 'Full Address',
    'base_url': 'https://venue-website.com',
    'events_url': 'https://venue-website.com/events',
    'category': 'Clubs/Discos',
    'subcategory': 'Electronic',
    
    # Selectors for the event list page
    'list_selectors': {
        'event_container': 'div.event',  # CSS selector for event items
        'title': 'h2.title',
        'date': '.date',
        'time': '.time',
        'image': 'img',
        'link': 'a.event-link',
    },
    
    # Optional: Selectors for detail pages
    'detail_selectors': {
        'description': '.description',
        'full_lineup': '.lineup',
        'ticket_link': 'a.ticket',
        'price': '.price',
    },
    
    # Date parsing hints
    'date_format': 'DD.MM.YYYY',  # or 'DD/MM', etc.
    'use_detail_pages': True,  # Whether to visit detail pages
}
"""

VENUE_CONFIGS = {
    'grelle-forelle': {
        'venue_name': 'Grelle Forelle',
        'venue_address': 'Spittelauer Lände 12, 1090 Wien',
        'base_url': 'https://www.grelleforelle.com',
        'events_url': 'https://www.grelleforelle.com/programm/',
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            'event_container': 'div.et_pb_portfolio_item',
            'title': 'h2 a',
            'image': 'img',
            'link': 'a[href]',
        },
        
        'detail_selectors': {
            'title': 'h1.entry-title',
            'description': 'div.entry-content p',
            'image': 'img[src*="wp-content/uploads"]',
            'ticket_link': 'a[href*="ticket"]',
        },
        
        'date_in_title': True,  # Date is in event title (DD/MM format)
        'use_detail_pages': True,
    },
    
    'flex': {
        'venue_name': 'Flex',
        'venue_address': 'Donaukanal, Augartenbrücke 1, 1010 Wien',
        'base_url': 'https://flex.at',
        'events_url': 'https://flex.at/programm/',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'article.event, div.event-item',
            'title': 'h2, h3, .event-title',
            'date': '.date, time',
            'image': 'img',
            'link': 'a.event-link, a[href*="/event/"]',
        },
        
        'use_detail_pages': True,
    },
    
    'pratersauna': {
        'venue_name': 'Pratersauna',
        'venue_address': 'Waldsteingartenstraße 135, 1020 Wien',
        'base_url': 'https://pratersauna.tv',
        'events_url': 'https://pratersauna.tv/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3, .title',
            'date': '.date, time',
            'image': 'img',
            'link': 'a',
        },
        
        'use_detail_pages': True,
    },
    
    'b72': {
        'venue_name': 'B72',
        'venue_address': 'Hernalser Gürtel, Stadtbahnbogen 72-73, 1080 Wien',
        'base_url': 'https://www.b72.at',
        'events_url': 'https://www.b72.at/programm/',
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
        
        'use_detail_pages': False,
    },
    
    'das-werk': {
        'venue_name': 'Das WERK',
        'venue_address': 'Spittelauer Lände 12, 1090 Wien',
        'base_url': 'https://www.das-werk.at',
        'events_url': 'https://www.das-werk.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date, time',
            'link': 'a',
        },
    },
    
    'u4': {
        'venue_name': 'U4',
        'venue_address': 'Schönbrunner Straße 222, 1120 Wien',
        'base_url': 'https://www.u-4.at',
        'events_url': 'https://www.u-4.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'volksgarten': {
        'venue_name': 'Volksgarten',
        'venue_address': 'Burgring 1, 1010 Wien',
        'base_url': 'https://www.volksgarten.at',
        'events_url': 'https://www.volksgarten.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    # Template for adding new venues
    '_template': {
        'venue_name': 'Venue Name',
        'venue_address': 'Full Address, Postal Code Wien',
        'base_url': 'https://venue-website.com',
        'events_url': 'https://venue-website.com/events/',
        'category': 'Clubs/Discos',  # or 'Concerts', 'Bars', etc.
        'subcategory': 'Electronic',  # or 'Mixed', 'Rock', etc.
        
        'list_selectors': {
            'event_container': 'CSS_SELECTOR_FOR_EVENT_ITEM',
            'title': 'CSS_SELECTOR_FOR_TITLE',
            'date': 'CSS_SELECTOR_FOR_DATE',
            'time': 'CSS_SELECTOR_FOR_TIME',
            'image': 'CSS_SELECTOR_FOR_IMAGE',
            'link': 'CSS_SELECTOR_FOR_DETAIL_LINK',
        },
        
        'detail_selectors': {
            'description': 'CSS_SELECTOR',
            'ticket_link': 'CSS_SELECTOR',
            'price': 'CSS_SELECTOR',
        },
        
        'use_detail_pages': True,  # Set to False if all info is on list page
        'date_in_title': False,    # Set to True if date is part of title
    },
}


def get_venue_config(venue_key: str) -> dict:
    """Get configuration for a specific venue"""
    return VENUE_CONFIGS.get(venue_key)


def list_venues() -> list:
    """List all available venue configurations"""
    return [k for k in VENUE_CONFIGS.keys() if not k.startswith('_')]
