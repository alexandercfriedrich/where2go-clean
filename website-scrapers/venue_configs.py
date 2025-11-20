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
    # ============================================================================
    # VENUE 0: GRELLE FORELLE (Working - Keep original config)
    # ============================================================================
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
    
    # ============================================================================
    # VENUE 1: FLEX
    # ============================================================================
    'flex': {
        'venue_name': 'Flex',
        'venue_address': 'Donaukanal, Augartenbrücke 1, 1010 Wien',
        'base_url': 'https://flex.at',
        'events_url': 'https://flex.at/events/',  # ✓ KORRIGIERT: war /programm/
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'article.eventBox, div.event-item',
            'title': 'h3.eventBox-title, h2.event-title',
            'date': 'time.eventBox-date, .event-date',
            'image': 'img.eventBox-image, .event-thumbnail img',
            'link': 'a.eventBox-link, a[href*="/event/"]',
        },
        
        'detail_selectors': {
            'description': 'div.event-description, .entry-content',
            'ticket_link': 'a[href*="ticket"], a.buy-ticket',
            'time': 'time.event-time, .event-start-time',
        },
        
        'use_detail_pages': True,
    },
    
    # ============================================================================
    # VENUE 2: PRATERSAUNA
    # ============================================================================
    'pratersauna': {
        'venue_name': 'Pratersauna',
        'venue_address': 'Waldsteingartenstraße 135, 1020 Wien',
        'base_url': 'https://pratersauna.tv',
        'events_url': 'https://pratersauna.tv',  # ✓ KORRIGIERT: Hauptseite statt /events/
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            # WordPress Block Editor Struktur
            'event_container': 'div.wp-block-group, article.event-post, div.event-item',
            'title': 'h2, h3.event-title, .wp-block-heading',
            'date': 'time, .event-date, p.has-text-align-center',
            'image': 'figure.wp-block-image img, .event-image img, img.wp-image',
            'link': 'a[href*="/event/"]',  # Event-URLs: /event/{slug}/
        },
        
        'detail_selectors': {
            'description': 'div.entry-content p, .event-description, .wp-block-paragraph',
            'ticket_link': 'a[href*="ticket"], a.button, a.wp-block-button__link',
            'lineup': 'div.lineup, .artists',
        },
        
        'use_detail_pages': True,
        'javascript_rendered': True,  # Möglicherweise dynamisch geladen
    },
    
    # ============================================================================
    # VENUE 3: B72
    # ============================================================================
    'b72': {
        'venue_name': 'B72',
        'venue_address': 'Hernalser Gürtel, Stadtbahnbogen 72-73, 1080 Wien',
        'base_url': 'https://www.b72.at',
        'events_url': 'https://www.b72.at/program',  # ✓ KORRIGIERT: /program statt /programm/
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            # Monatsbasierte Struktur mit h3-Headers
            'month_header': 'h3',  # z.B. "SEPTEMBER"
            'event_container': 'div.event-item, li.program-event, p',
            'title': 'h4, .event-name, strong',
            'date': 'span.date, time',  # Format: "15.09"
            'link': 'a[href*="ticket"], a.event-link',
        },
        
        'use_detail_pages': False,
        'date_format': 'DD.MM',  # Nur Tag.Monat, Jahr aus Section-Header
        'parsing_strategy': 'grouped_by_month',  # Events gruppiert nach Monaten
    },
    
    # ============================================================================
    # VENUE 4: DAS WERK
    # ============================================================================
    'das-werk': {
        'venue_name': 'Das WERK',
        'venue_address': 'Spittelauer Lände 12, 1090 Wien',
        'base_url': 'https://www.daswerk.org',  # ✓ KORRIGIERT: .org statt .at
        'events_url': 'https://www.daswerk.org/programm/',  # ✓ KORRIGIERT: Domain
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            'event_container': 'article.event, div.program-item, div.tribe-event',
            'title': 'h2.event-title, h3.entry-title',
            'date': 'time.event-date, .tribe-event-date-start',
            'image': 'img.event-image, .tribe-events-event-image img',
            'link': 'a.event-link, a[href*="/event/"]',
        },
        
        'detail_selectors': {
            'description': 'div.event-description, .tribe-events-content',
            'ticket_link': 'a[href*="ticket"]',
        },
        
        'use_detail_pages': True,
    },
    
    # ============================================================================
    # VENUE 5: U4
    # ============================================================================
    'u4': {
        'venue_name': 'U4',
        'venue_address': 'Schönbrunner Straße 222, 1120 Wien',
        'base_url': 'https://www.u4.at',
        'events_url': 'https://www.u4.at/events-veranstaltungen/',  # ✓ VERBESSERT
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        'list_selectors': {
            # EventON WordPress Plugin Struktur
            'event_container': 'div.eventon_list_event, article.evo_event, div.event-card',
            'title': 'h3.evo_event_title, .event-title, h2.entry-title',
            'date': 'span.evo_date, time.event-date, .tribe-event-date',
            'time': 'span.evo_time, .event-time',
            'image': 'img.evo_event_img, .event-image img',
            'link': 'a.evo_event_link, a[href*="/event/"]',
        },
        
        'detail_selectors': {
            'description': 'div.event-description, .evo_content_details, .entry-content',
            'ticket_link': 'a[href*="ticket"], a.evo_cus_button',
            'location': 'span.evo_event_location',
        },
        
        'use_detail_pages': True,
        'wordpress_eventon': True,  # Nutzt EventON Plugin
    },
    
    # ============================================================================
    # VENUE 6: VOLKSGARTEN
    # ============================================================================
    'volksgarten': {
        'venue_name': 'Volksgarten',
        'venue_address': 'Burgring 1, 1010 Wien',
        'base_url': 'https://volksgarten.at',  # ✓ KORRIGIERT: ohne www
        'events_url': 'https://volksgarten.at',  # Hauptseite
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        # ⚠️ WICHTIG: Volksgarten postet Events hauptsächlich auf Social Media
        'alternative_sources': {
            'facebook': 'https://www.facebook.com/dervolksgarten',
            'instagram': '@volksgarten',
            'events_at': 'https://events.at/venue/volksgarten-clubdisco',
        },
        
        'list_selectors': {
            # Fallback für Website (sehr wenige Events)
            'event_container': 'div.event-card, article.event, div.wp-block-group',
            'title': 'h2, h3.event-title',
            'date': 'time, .event-date',
            'image': 'img, figure img',
            'link': 'a[href*="event"]',
        },
        
        'use_detail_pages': False,
        'primary_source': 'social_media',  # Events primär über Social Media
        'scraping_strategy': 'external_aggregators',  # Empfehlung: events.at nutzen
    },
    
    # ============================================================================
    # VENUE 7: BABENBERGER PASSAGE
    # ============================================================================
    'babenberger-passage': {
        'venue_name': 'Babenberger Passage',
        'venue_address': 'Burgring 3, 1010 Wien',
        'base_url': 'https://www.babenbergerpassage.at',
        'events_url': 'https://www.babenbergerpassage.at',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        # ⚠️ PROBLEM: Website zeigt nur wiederkehrende Events (Do/Fr/Sa)
        'recurring_events_only': True,
        
        'list_selectors': {
            # Statisches Programm auf Hauptseite
            'program_section': 'div.program, section#program, div.content',
            'day_title': 'h4, h3',  # z.B. "FRIday"
            'description': 'p',  # z.B. "ROTATING SPECIAL PROGRAMME"
        },
        
        # Alternative: Events via externe Quellen
        'alternative_sources': {
            'facebook': 'https://www.facebook.com/babenberger.passage',
            'instagram': '@babenbergerpassage',
            'eventfinder': 'https://www.eventfinder.at/veranstaltungsort/123311/',
            'events_at': 'https://events.at/venue/passage',
            'eventbrite': True,
        },
        
        'use_detail_pages': False,
        'scraping_strategy': 'external_aggregators',  # Empfehlung: events.at scrapen
    },
    
    # ============================================================================
    # VENUE 8: CABARET FLEDERMAUS
    # ============================================================================
    'cabaret-fledermaus': {
        'venue_name': 'Cabaret Fledermaus',
        'venue_address': 'Spiegelgasse 2, 1010 Wien',
        'base_url': 'https://www.fledermaus.at',
        'events_url': 'https://www.fledermaus.at/program',  # ✓ KORRIGIERT: /program
        'category': 'Bars',
        'subcategory': 'Live Music',
        
        'list_selectors': {
            # Programm-Tabelle mit wöchentlichen Events
            'event_container': 'div.program-item, tr.event-row, div.event',
            'date': 'td.date, .program-date, span.date',  # Format: "Do.20.November"
            'title': 'td.title, .program-title, h3',  # z.B. "COOL FOR CATS"
            'description': 'td.description, .program-description, p',
            'time': 'td.time, .program-time',  # z.B. "ab 21h"
        },
        
        # Wiederkehrende Events (jeden Mo/Do/Fr/Sa/So)
        'recurring_events': {
            'Montag': 'MERCY - 80\'s, Wave, Synthie Pop',
            'Donnerstag': 'COOL FOR CATS - Rock\'n\'Roll, 50\'s',
            'Freitag': 'CLASSIC - Die Kultnacht',
            'Samstag': 'BOOGIE NIGHT (jeden 4. Sa im Monat)',
            'Sonntag': 'FREAK OUT - 60\'s & 70\'s',
        },
        
        'use_detail_pages': False,
        'date_format': 'DD.MMMM',  # z.B. "20.November"
    },
    
    # ============================================================================
    # VENUE 9: CAMERA CLUB
    # ============================================================================
    'camera-club': {
        'venue_name': 'Camera Club',
        'venue_address': 'Neubaugasse 2, 1070 Wien',
        'base_url': 'https://camera-club.at',
        'events_url': 'https://camera-club.at/events/list/',  # WordPress Event-Liste
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        # ⚠️ WICHTIG: Website sagt "Events findest du auf Instagram/Facebook"
        'primary_source': 'social_media',
        
        'list_selectors': {
            # WordPress "The Events Calendar" Plugin
            'event_container': 'article.tribe-events-list-widget-events, .tribe-event, article.event',
            'title': 'h3.tribe-event-title, .entry-title, h2',
            'date': 'time.tribe-event-date, .tribe-events-list-event-date, .event-date',
            'link': 'a.tribe-event-url, a[href*="/event/"]',
            'image': 'img.tribe-events-event-image, .event-image img',
        },
        
        'alternative_sources': {
            'facebook': 'https://www.facebook.com/camera.vienna',
            'instagram': '@camera_club_vienna',
            'goodnight': 'https://goodnight.at/locations/291-camera-club',
        },
        
        'use_detail_pages': True,
        'wordpress_tribe_events': True,  # Nutzt "The Events Calendar" Plugin
    },
    
    # ============================================================================
    # VENUE 10: CELESTE
    # ============================================================================
    'celeste': {
        'venue_name': 'Celeste',
        'venue_address': 'Hamburgerstraße 18, 1050 Wien',
        'base_url': 'https://www.celeste.co.at',
        'events_url': 'https://www.celeste.co.at',  # Events auf Hauptseite
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        'list_selectors': {
            # ⚠️ SEHR spezielle Struktur: Tabellenzeilen mit allen Infos in einer Zelle
            'event_container': 'table tr, div.event-row',
            'title': 'td:nth-child(1), .event-cell',  # Erste Spalte
            'date': 'td:nth-child(1)',  # Format: "28-11"
            'time': 'td:nth-child(1)',  # Format: "20:00-06:00"
            'type': 'td:nth-child(1)',  # "Club" oder "Concert"
            'lineup': 'td:nth-child(1)',  # Artists/DJs
        },
        
        # Celeste hat einzigartige Struktur: Alle Infos in einer Zelle, Pipe-separiert
        # Beispiel: "EMMA RELEASE Party 28-11 | 20:00-06:00| Club LD Smash & GHC |live"
        'parsing_strategy': 'single_cell_pipe_separated',
        
        'regex_patterns': {
            'title': r'^([A-Z\s!]+)',  # Großbuchstaben am Anfang
            'date': r'(\d{1,2}-\d{1,2})',  # DD-MM Format
            'time': r'(\d{2}:\d{2}-\d{2}:\d{2})',  # HH:MM-HH:MM
            'type': r'\|\s*(Club|Concert)',
            'lineup': r'\|(.*?)\|',
        },
        
        'use_detail_pages': False,  # Alle Infos auf Hauptseite
        'date_format': 'DD-MM',  # z.B. "28-11"
    },
    
    # ============================================================================
    # VENUE 11: CHELSEA
    # ============================================================================
    'chelsea': {
        'venue_name': 'Chelsea',
        'venue_address': 'Lerchenfelder Gürtel 29-31, 1080 Wien',
        'base_url': 'https://www.chelsea.co.at',
        'events_url': 'https://www.chelsea.co.at/concerts.php',  # ✓ Concerts page
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        # ⚠️ WICHTIG: Chelsea hat separate Pages für Concerts und Clubs
        'additional_urls': {
            'clubs': 'https://www.chelsea.co.at/clubs.php',  # Club Events
            'concerts': 'https://www.chelsea.co.at/concerts.php',  # Concert Events
        },
        
        'list_selectors': {
            # Tabellenbasierte Struktur mit Event-Informationen
            'event_container': 'table tr, div.event-row',
            'date': 'td:first-child',  # Format: "So, 27.07."
            'title': 'td:nth-child(2), strong',  # Band/Event Name
            'description': 'td:nth-child(2)',  # Volle Beschreibung
            'price': 'td:nth-child(2)',  # z.B. "VVK: 28,-/AK: 32,-"
            'doors_time': 'td:nth-child(2)',  # z.B. "Doors: 20h"
            'show_time': 'td:nth-child(2)',  # z.B. "Show: 21h"
        },
        
        # Chelsea hat sehr detaillierte Event-Beschreibungen in Tabellenzellen
        'parsing_strategy': 'table_with_inline_data',
        
        'use_detail_pages': False,  # Alle Infos auf List-Page
        'date_format': 'ddd, DD.MM.',  # z.B. "So, 27.07."
        'requires_dual_scraping': True,  # Concerts UND Clubs scrapen
    },
    
    # ============================================================================
    # VENUE 12: CLUB U
    # ============================================================================
    'club-u': {
        'venue_name': 'Club U',
        'venue_address': 'Karlsplatz 5, 1010 Wien',  # ✓ Otto Wagner Pavillon
        'base_url': 'https://club-u.at',
        'events_url': 'https://club-u.at',  # ✓ Hauptseite, dann zu Events navigieren
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        # ⚠️ PROBLEM: Website zeigt oft "coming soon" oder nur aktuelle Events
        'list_selectors': {
            'event_container': 'div.event, article.event-item',
            'title': 'h2, h3.event-title',
            'date': '.event-date, time',
            'time': '.event-time',
            'link': 'a[href*="event"]',
        },
        
        # Alternative Quellen für verlässlichere Event-Daten
        'alternative_sources': {
            'freytag': 'https://frey-tag.at/locations/club-u',  # Aktuelle Events
            'wien_info': 'https://www.wien.info/de/essen-trinken/bars-clubs/clubs-discos/club-u-343420',
        },
        
        'use_detail_pages': False,
        'scraping_strategy': 'external_aggregators',  # Empfehlung: frey-tag.at nutzen
    },
    
    # ============================================================================
    # VENUE 13: DONAU
    # ============================================================================
    'donau': {
        'venue_name': 'Donau',
        'venue_address': 'Donaukanal, Karl-Schweighofer-Gasse 8, 1070 Wien',
        'base_url': 'https://www.donautechno.com',
        'events_url': 'https://www.donautechno.com',  # Hauptseite
        'category': 'Clubs/Discos',
        'subcategory': 'Techno',
        
        # ⚠️ PROBLEM: Website zeigt hauptsächlich wöchentliche Residents, keine Event-Liste
        'weekly_program': True,  # 7 Tage/Woche DJs
        
        'list_selectors': {
            # Minimale Website-Struktur
            'event_container': 'div.event, section.events',
            'date': '.date',
            'dj': '.dj-name',
        },
        
        # Donau hat primär Social Media für Event-Ankündigungen
        'alternative_sources': {
            'instagram': '@donautechno',  # Haupt-Quelle
            'facebook': 'Donautechno',
            'wien_info': 'https://www.wien.info/de/essen-trinken/bars-clubs/szenetreffs/donau-344696',
        },
        
        'use_detail_pages': False,
        'primary_source': 'social_media',
        'scraping_strategy': 'external_aggregators',
    },
    
    # ============================================================================
    # VENUE 14: FLUCC
    # ============================================================================
    'flucc': {
        'venue_name': 'Flucc / Flucc Wanne',
        'venue_address': 'Praterstern 5, 1020 Wien',
        'base_url': 'https://flucc.at',  # ✓ flucc.at (nicht www.fluc.at!)
        'events_url': 'https://flucc.at/musik/',  # ✓ Musik-Programm
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        # ⚠️ WICHTIG: Alte Domain fluc.at leitet zu flucc.at
        'legacy_urls': {
            'old': 'http://www.fluc.at/programm/',  # Veraltete URL
        },
        
        'list_selectors': {
            # Moderne Event-Card Struktur
            'event_container': 'article.event, div.tribe-events-list-widget-events',
            'title': 'h2.entry-title, h3.tribe-event-title',
            'date': 'time.tribe-event-date-start, .event-date',
            'time': 'span.tribe-event-time, .event-time',
            'image': 'img.tribe-events-event-image, .event-image img',
            'link': 'a.tribe-event-url, a[href*="/events/"]',
            'location': '.tribe-events-venue, .event-location',  # DECK oder WANNE
        },
        
        'detail_selectors': {
            'description': 'div.tribe-events-content, .event-description',
            'ticket_link': 'a[href*="ticket"]',
        },
        
        'use_detail_pages': True,
        'has_multiple_rooms': True,  # FLUCC DECK + FLUCC WANNE
    },
    
    # ============================================================================
    # VENUE 15: O DER KLUB
    # ============================================================================
    'o-der-klub': {
        'venue_name': 'O - der Klub',
        'venue_address': 'Passage Opernring/Operngasse, 1010 Wien',  # ✓ Bei Staatsoper
        'base_url': 'https://o-klub.at',
        'events_url': 'https://o-klub.at/events/',  # ✓ Events-Page
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        # Modernes Club-Website Design
        'list_selectors': {
            'event_container': 'div.event-card, article.event',
            'title': 'h2.event-title, h3',
            'date': 'time.event-date, .event-date',
            'time': 'span.event-time',
            'image': 'img.event-image',
            'link': 'a[href*="/event/"]',
            'event_series': '.event-series',  # z.B. "SIGNAL", "Super Disco"
        },
        
        # O hat wiederkehrende Event-Serien
        'recurring_series': {
            'Freitag': 'Elektronische Musik / SIGNAL',
            'Samstag': 'Super Disco (90s/00s/10s)',
        },
        
        'detail_selectors': {
            'lineup': '.lineup, .artists',
            'ticket_link': 'a[href*="ticket"]',
        },
        
        'use_detail_pages': True,
        'opening_hours': {
            'friday': '23:00 - 06:00',
            'saturday': '23:00 - 06:00',
        },
    },
    
    # ============================================================================
    # VENUE 16: PONYHOF
    # ============================================================================
    'ponyhof': {
        'venue_name': 'Ponyhof',
        'venue_address': 'Burggasse 104, 1070 Wien',
        'base_url': 'https://ponyhof-official.at',
        'events_url': 'https://ponyhof-official.at',
        'category': 'Clubs/Discos',
        'subcategory': 'Mixed',
        
        # ⚠️ KRITISCH: Ponyhof hat im Juli 2025 geschlossen!
        'status': 'CLOSED_INDEFINITELY',  # Geschlossen seit Juli 2025
        'closure_date': '2025-07-24',
        'closure_reason': 'Finanzielle Schwierigkeiten',
        
        # Hinweis: Diese Config sollte NICHT aktiv scrapen!
        'scraping_enabled': False,
        
        # Info aus Closure-Announcement
        'alternative_sources': {
            'instagram': '@ponyhof_official',  # Für mögliche Wiedereröffnung
            'note': 'Club temporarily closed - monitoring for reopening',
        },
        
        'use_detail_pages': False,
    },
    
    # ============================================================================
    # VENUE 17: PRATER DOME
    # ============================================================================
    'prater-dome': {
        'venue_name': 'Prater DOME',
        'venue_address': 'Riesenradplatz 7, 1020 Wien',
        'base_url': 'https://praterdome.at',
        'events_url': 'https://praterdome.at/events',  # ✓ Events-Page
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        # Großer Club mit 3 Floors und wiederkehrenden Events
        'list_selectors': {
            'event_container': 'div.event-card, article.event-item',
            'title': 'h2.event-title, h3',
            'date': 'time.event-date, .date',
            'time': '.event-time',  # Üblicherweise 23:00
            'image': 'img.event-image',
            'link': 'a[href*="/event/"]',
            'series': '.event-series',  # z.B. "F I R S T", "SURREAL"
        },
        
        # Prater Dome hat wiederkehrende Event-Serien
        'recurring_series': {
            'Freitag': 'F I R S T (Fridays)',
            'Samstag': 'SURREAL (Saturdays)',
            'Special': 'CHROM:E Techno, CINEMATIC Drum & Bass',
        },
        
        'detail_selectors': {
            'lineup': '.lineup, .artists',
            'ticket_link': 'a[href*="ticket"]',
            'floor': '.floor',  # Welcher Floor (Main, Club, Hip Hop)
        },
        
        'use_detail_pages': True,
        'has_multiple_floors': True,  # 3 Floors
        'opening_hours': {
            'friday': '23:00 - 06:00',
            'saturday': '23:00 - 06:00',
            'before_holidays': '23:00 - 06:00',
        },
    },
    
    # ============================================================================
    # VENUE 18: PRATERSTRASSE
    # ============================================================================
    'praterstrasse': {
        'venue_name': 'Praterstrasse',
        'venue_address': 'Praterstraße 38, 1020 Wien',
        'base_url': 'https://praterstrasse.wien',
        'events_url': 'https://praterstrasse.wien/en/praterstrasse-tickets-9djnDeMk/',  # ✓ Tickets-Page
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        # Alternative: Website zeigt Events strukturiert
        'list_selectors': {
            'event_container': 'div.event-item, article.ticket-item',
            'title': 'h2, h3.event-title',
            'date': 'time, .event-date',
            'time': 'span.time',
            'link': 'a[href*="/event/"]',
            'series': '.event-series',  # z.B. "KLUBNACHT", "GAZE"
        },
        
        # Praterstrasse hat viele Event-Serien
        'recurring_series': {
            'KLUBNACHT': 'Techno',
            'GAZE': 'Electronic',
            'PLASTIC DREAMS': 'House',
            'EUPHORIA': 'Electronic',
        },
        
        'detail_selectors': {
            'lineup': '.lineup',
            'ticket_link': 'a[href*="ticket"]',
        },
        
        'use_detail_pages': True,
        'opening_hours': {
            'thursday_saturday': '23:00 - late',
        },
    },
    
    # ============================================================================
    # VENUE 19: SASS MUSIC CLUB
    # ============================================================================
    'sass-music-club': {
        'venue_name': 'SASS Music Club',
        'venue_address': 'Karlsplatz 1, 1010 Wien',
        'base_url': 'https://sassvienna.com',
        'events_url': 'https://sassvienna.com/programm',  # ✓ Programm-Page
        'category': 'Bars',
        'subcategory': 'Live Music',
        
        # SASS hat sehr strukturiertes Programm
        'list_selectors': {
            'event_container': 'div.event-item, article.program-item',
            'date': 'div.event-date, .date',  # z.B. "Do 7. Aug"
            'time': 'div.event-time',  # z.B. "23:00 - 06:00"
            'title': 'h3, .event-title',
            'lineup': 'div.lineup, .artists',  # DJ-Namen mit Instagram-Handles
            'link': 'a[href*="/programm/event/"]',
        },
        
        # SASS zeigt sehr detaillierte Event-Infos mit DJ Social Media
        'parsing_strategy': 'structured_with_social',
        
        'detail_selectors': {
            'description': '.event-description',
            'dj_socials': 'a[href*="instagram.com"]',  # Instagram-Links der DJs
        },
        
        'use_detail_pages': True,
        'opening_hours': {
            'thursday': '23:00 - 06:00',
            'friday': '23:00 - 06:00',
            'saturday': '23:00 - 05:00',
            'sunday': '06:00 - 11:00',  # Morgengymnastik
        },
    },
    
    # ============================================================================
    # VENUE 20: TANZCAFE JENSEITS
    # ============================================================================
    'tanzcafe-jenseits': {
        'venue_name': 'Tanzcafé Jenseits',
        'venue_address': 'Nelkengasse 3, 1060 Wien',
        'base_url': 'https://tanzcafejenseits.com',
        'events_url': 'https://tanzcafejenseits.com',  # Hauptseite
        'category': 'Bars',
        'subcategory': 'Dance',
        
        # ⚠️ PROBLEM: Tanzcafé Jenseits hat KEINE Event-Liste
        # Es ist eine klassische Bar mit wiederkehrendem Programm
        'weekly_program_only': True,
        
        'recurring_schedule': {
            'Dienstag_Samstag': 'Jazz, Swing, Soul, Boogie, Disco (wechselnd)',
            'Freitag': 'Groovy/Funky',
            'Samstag': 'Soul, Disco, 80er, Funk, Hip-Hop',
        },
        
        'list_selectors': {
            # Keine echten Events, nur allgemeine Beschreibungen
            'description': '.description, p',
        },
        
        # Keine Event-Liste verfügbar
        'scraping_strategy': 'static_weekly_program',
        
        'use_detail_pages': False,
        'opening_hours': {
            'tuesday_saturday': '21:00 - 04:00',
            'sunday_monday': 'geschlossen',
            'summer': 'Dienstag geschlossen (Juni-September)',
        },
    },
    
    # ============================================================================
    # VENUE 21: THE LOFT
    # ============================================================================
    'the-loft': {
        'venue_name': 'The Loft',
        'venue_address': 'Lerchenfelder Gürtel 37, 1160 Wien',  # ✓ Bei U6 Thaliastraße
        'base_url': 'https://www.theloft.at',
        'events_url': 'https://www.theloft.at/programm/',  # ✓ Programm-Page
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        # The Loft hat sehr strukturiertes Programm
        'list_selectors': {
            'event_container': 'div.event-item, article.program-entry',
            'title': 'h3, .event-title',
            'date': '.event-date',  # z.B. "Do. 20.11.2025"
            'time': '.event-time',  # z.B. "19:30"
            'location': '.event-location',  # "Oben", "Unten", "Wohnzimmer"
            'price': '.event-price',  # z.B. "€ 24/26"
            'ticket_status': '.event-status',  # VVK, Abendkassa, Frei
            'link': 'a[href*="/programm/"]',
        },
        
        # The Loft hat mehrere Räume
        'has_multiple_rooms': True,
        'rooms': ['Oben', 'Unten', 'Wohnzimmer'],
        
        # Wiederkehrende Events
        'recurring_series': {
            'Samstag': '90ies & 2000s SINGLE Party, 2000s & 2010s Club',
            'Donnerstag': 'Beat Melange, Funk Session Vienna',
        },
        
        'detail_selectors': {
            'description': '.event-description',
            'lineup': '.lineup',
        },
        
        'use_detail_pages': True,
        'date_format': 'ddd. DD.MM.YYYY',
    },
    
    # ============================================================================
    # VENUE 22: VIEIPEE
    # ============================================================================
    'vieipee': {
        'venue_name': 'VIEiPEE',
        'venue_address': 'Waldsteingartenstraße 135, 1020 Wien',  # ✓ Im Prater
        'base_url': 'https://vieipee.com',
        'events_url': 'https://vieipee.com',  # Hauptseite
        'category': 'Clubs/Discos',
        'subcategory': 'Hip Hop',  # ✓ Wiens erster Hip-Hop Club
        
        # VIEiPEE ist spezialisiert auf Hip-Hop/Urban
        'genre_focus': 'Hip-Hop & RnB',
        
        'list_selectors': {
            'event_container': 'div.event-card, article.event',
            'title': 'h2, h3.event-title',
            'date': 'time, .event-date',
            'time': '.event-time',
            'image': 'img.event-image',
            'link': 'a[href*="/event/"]',
        },
        
        # VIEiPEE hat wiederkehrende Wochen-Events
        'recurring_schedule': {
            'Mittwoch': 'Mixwoch (wechselnde Themes: Latin, Throwback, Urban, Afrobeats)',
            'Freitag': 'Wechselnde Events',
            'Samstag': 'Main Party Nights',
        },
        
        'detail_selectors': {
            'lineup': '.lineup, .artists',
            'ticket_link': 'a[href*="ticket"]',
        },
        
        'use_detail_pages': True,
        'opening_hours': {
            'wednesday': 'Gratis vor Mitternacht',
            'friday_saturday': '23:00 - late',
        },
    },
    
    # ============================================================================
    # VENUE 23: WHY NOT
    # ============================================================================
    'why-not': {
        'venue_name': 'Why Not',
        'venue_address': 'Tiefer Graben 22, 1010 Wien',
        'base_url': 'https://why-not.at',
        'events_url': 'https://why-not.at',  # Hauptseite
        'category': 'Clubs/Discos',
        'subcategory': 'LGBTQ+',  # ✓ Queerer Club seit 45 Jahren
        
        # ⚠️ PROBLEM: Why Not hat KEINE Event-Liste auf Website
        # Primär wiederkehrende Club-Nächte
        'weekly_program_only': True,
        
        'recurring_schedule': {
            'Freitag': 'Elektronische Musik, Chart Hits',
            'Samstag': 'Super Disco, Elektronische Musik',
            'Special_Events': 'Drag Shows, Themen-Partys, Fetisch Events',
        },
        
        'list_selectors': {
            # Keine Event-Liste, nur statische Beschreibungen
            'description': '.content, p',
        },
        
        # Why Not fokussiert auf wiederkehrende Partys
        'scraping_strategy': 'static_weekly_program',
        
        'use_detail_pages': False,
        'opening_hours': {
            'friday_saturday_holidays': '22:00 - 06:00',
        },
        
        'venue_features': {
            'queer_club': True,
            'age_limit': 18,
            'areas': ['3 Bars', 'Dancefloor', 'Fun Room', 'Men Only Areas'],
        },
    },
    
    # ============================================================================
    # VENUE 24: RHIZ
    # ============================================================================
    'rhiz': {
        'venue_name': 'rhiz',
        'venue_address': 'Lerchenfeldergürtel, Stadtbahnbogen 37-38, 1080 Wien',
        'base_url': 'https://rhiz.wien',
        'events_url': 'https://rhiz.wien/programm/',  # ✓ Programm-Page
        'category': 'Clubs/Discos',
        'subcategory': 'Electronic',
        
        # rhiz hat sehr gut strukturiertes Programm
        'list_selectors': {
            'event_container': 'article.event, div.event-item',
            'title': 'h2, h3.event-title',
            'date': 'time.event-date, .date',
            'time': 'span.event-time',
            'event_type': '.event-type',  # "Live", "Club", etc.
            'image': 'img.event-image',
            'link': 'a[href*="/programm/event/"]',
            'ticket_status': '.ticket-status',  # VVK, Abendkassa
        },
        
        # rhiz zeigt Mix aus Live-Konzerten und Club-Events
        'event_types': ['Live', 'Club', 'DJ Set'],
        
        'detail_selectors': {
            'description': '.event-description, .entry-content',
            'lineup': '.lineup',
            'ticket_link': 'a[href*="ticket"]',
        },
        
        'use_detail_pages': True,
        'date_format': 'ddd DDMMYY',  # z.B. "do 100725"
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
