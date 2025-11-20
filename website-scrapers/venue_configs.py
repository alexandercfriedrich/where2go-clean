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
    
    'babenberger-passage': {
        'venue_name': 'Babenberger Passage',
        'venue_address': 'Babenbergerstraße 5, 1010 Wien',
        'base_url': 'https://www.babenbergerpassage.at',
        'events_url': 'https://www.babenbergerpassage.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'cabaret-fledermaus': {
        'venue_name': 'Cabaret Fledermaus',
        'venue_address': 'Spiegelgasse 2, 1010 Wien',
        'base_url': 'https://www.fledermaus.at',
        'events_url': 'https://www.fledermaus.at/programm/',
        'category': 'Bars',
        'subcategory': 'Live Music',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'camera-club': {
        'venue_name': 'Camera Club',
        'venue_address': 'Neubaugasse 2, 1070 Wien',
        'base_url': 'https://camera-club.at',
        'events_url': 'https://camera-club.at',
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'celeste': {
        'venue_name': 'Celeste',
        'venue_address': 'Hamburgerstraße 18, 1050 Wien',
        'base_url': 'https://www.celeste.co.at',
        'events_url': 'https://www.celeste.co.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'chelsea': {
        'venue_name': 'Chelsea',
        'venue_address': 'Lerchenfelder Gürtel 29-31, 1080 Wien',
        'base_url': 'https://chelsea.co.at',
        'events_url': 'https://chelsea.co.at/programm/',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'club-u': {
        'venue_name': 'Club U',
        'venue_address': 'Karlsplatz 5, 1010 Wien',
        'base_url': 'https://club-u.at',
        'events_url': 'https://club-u.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'donau': {
        'venue_name': 'Donau',
        'venue_address': 'Donaukanal, Karl-Schweighofer-Gasse 8, 1070 Wien',
        'base_url': 'https://www.donautechno.com',
        'events_url': 'https://www.donautechno.com/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Techno',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'flucc': {
        'venue_name': 'Flucc / Flucc Wanne',
        'venue_address': 'Praterstern 5, 1020 Wien',
        'base_url': 'https://www.flucc.at',
        'events_url': 'https://www.flucc.at/programm/',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'o-der-klub': {
        'venue_name': 'O - der Klub',
        'venue_address': 'Albertinapassage, 1010 Wien',
        'base_url': 'https://www.albertinapassage.at',
        'events_url': 'https://www.albertinapassage.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'ponyhof': {
        'venue_name': 'Ponyhof',
        'venue_address': 'Burggasse 104, 1070 Wien',
        'base_url': 'https://ponyhof-official.at',
        'events_url': 'https://ponyhof-official.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'prater-dome': {
        'venue_name': 'Prater DOME',
        'venue_address': 'Riesenradplatz 7, 1020 Wien',
        'base_url': 'https://www.praterdome.com',
        'events_url': 'https://www.praterdome.com/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'praterstrasse': {
        'venue_name': 'Praterstrasse',
        'venue_address': 'Praterstraße 38, 1020 Wien',
        'base_url': 'https://praterstrasse.wien',
        'events_url': 'https://praterstrasse.wien/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'sass-music-club': {
        'venue_name': 'SASS Music Club',
        'venue_address': 'Karlsplatz 1, 1010 Wien',
        'base_url': 'https://www.sassvienna.com',
        'events_url': 'https://www.sassvienna.com/events/',
        'category': 'Bars',
        'subcategory': 'Live Music',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'tanzcafe-jenseits': {
        'venue_name': 'Tanzcafé Jenseits',
        'venue_address': 'Nelkengasse 3, 1060 Wien',
        'base_url': 'https://www.tanzcafe-jenseits.at',
        'events_url': 'https://www.tanzcafe-jenseits.at/',
        'category': 'Bars',
        'subcategory': 'Dance',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'the-loft': {
        'venue_name': 'The Loft',
        'venue_address': 'Donaukanal, Lerchenfelder Gürtel 37, 1160 Wien',
        'base_url': 'https://www.theloft.at',
        'events_url': 'https://www.theloft.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'vieipee': {
        'venue_name': 'VIEiPEE',
        'venue_address': 'Mariahilfer Straße 1, 1060 Wien',
        'base_url': 'https://www.vieipee.at',
        'events_url': 'https://www.vieipee.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'why-not': {
        'venue_name': 'Why Not',
        'venue_address': 'Tiefer Graben 22, 1010 Wien',
        'base_url': 'https://www.why-not.at',
        'events_url': 'https://www.why-not.at/events/',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'div.event, article',
            'title': 'h2, h3',
            'date': '.date',
            'link': 'a',
        },
    },
    
    'rhiz': {
        'venue_name': 'rhiz',
        'venue_address': 'Lerchenfeldergürtel, Stadtbahnbogen 37-38, 1080 Wien',
        'base_url': 'https://rhiz.wien',
        'events_url': 'https://rhiz.wien/programm/',
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
