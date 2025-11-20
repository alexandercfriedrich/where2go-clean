#!/usr/bin/env python3
"""
Venue Configuration Validation Script

This script validates the updated venue configurations and demonstrates
the improvements made to fix the 4% scraping success rate.

Run with: python3 validate_configs.py
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

from venue_configs import VENUE_CONFIGS, list_venues, get_venue_config


def validate_configs():
    """Validate all venue configurations"""
    
    print("=" * 70)
    print("VENUE CONFIGURATION VALIDATION")
    print("=" * 70)
    
    all_venues = list_venues()
    print(f"\n✓ Total venues configured: {len(all_venues)}\n")
    
    # Check critical fixes
    print("CRITICAL FIXES VERIFICATION:")
    print("-" * 70)
    
    fixes = [
        ("Flex URL", 
         "flex.at/events/" in VENUE_CONFIGS['flex']['events_url'],
         "flex.at/events/ (was flex.at/programm/)"),
        
        ("Das Werk Domain",
         ".org" in VENUE_CONFIGS['das-werk']['base_url'],
         "daswerk.org (was das-werk.at)"),
        
        ("Pratersauna URL",
         VENUE_CONFIGS['pratersauna']['events_url'] == 'https://pratersauna.tv',
         "pratersauna.tv (main page, was /events/)"),
        
        ("B72 URL",
         "/program" in VENUE_CONFIGS['b72']['events_url'],
         "b72.at/program (was /programm/)"),
        
        ("Flucc URL",
         "flucc.at" in VENUE_CONFIGS['flucc']['base_url'] and "/musik/" in VENUE_CONFIGS['flucc']['events_url'],
         "flucc.at/musik/ (was www.flucc.at/programm/)"),
        
        ("Volksgarten Domain",
         "volksgarten.at" == VENUE_CONFIGS['volksgarten']['base_url'].replace('https://', ''),
         "volksgarten.at (was www.volksgarten.at)"),
        
        ("Fledermaus URL",
         "/program" in VENUE_CONFIGS['cabaret-fledermaus']['events_url'],
         "fledermaus.at/program (was /programm/)"),
    ]
    
    for name, status, detail in fixes:
        symbol = "✓" if status else "✗"
        print(f"  {symbol} {name:20s} → {detail}")
    
    # Count new features
    print(f"\n{'=' * 70}")
    print("NEW CONFIGURATION FEATURES:")
    print("-" * 70)
    
    features = {
        'alternative_sources': 0,
        'parsing_strategy': 0,
        'scraping_enabled': 0,
        'wordpress_eventon': 0,
        'wordpress_tribe_events': 0,
        'requires_dual_scraping': 0,
        'has_multiple_rooms': 0,
        'has_multiple_floors': 0,
        'weekly_program_only': 0,
        'recurring_events_only': 0,
        'javascript_rendered': 0,
        'regex_patterns': 0,
    }
    
    for venue_key in all_venues:
        config = VENUE_CONFIGS[venue_key]
        for feature in features.keys():
            if feature in config:
                features[feature] += 1
    
    print(f"  Venues with alternative sources:    {features['alternative_sources']}")
    print(f"  Venues with special parsing:        {features['parsing_strategy']}")
    print(f"  Closed venues (disabled):           {features['scraping_enabled']}")
    print(f"  WordPress EventON venues:           {features['wordpress_eventon']}")
    print(f"  WordPress Tribe Events venues:      {features['wordpress_tribe_events']}")
    print(f"  Dual scraping venues:               {features['requires_dual_scraping']}")
    print(f"  Multi-room venues:                  {features['has_multiple_rooms']}")
    print(f"  Multi-floor venues:                 {features['has_multiple_floors']}")
    print(f"  Weekly program only:                {features['weekly_program_only']}")
    print(f"  Recurring events only:              {features['recurring_events_only']}")
    print(f"  JavaScript rendered:                {features['javascript_rendered']}")
    print(f"  Regex pattern venues:               {features['regex_patterns']}")
    
    # Categorize venues
    print(f"\n{'=' * 70}")
    print("VENUE CATEGORIES:")
    print("-" * 70)
    
    direct_scraping = []
    external_aggregators = []
    static_weekly = []
    closed = []
    
    for venue_key in all_venues:
        config = VENUE_CONFIGS[venue_key]
        
        if config.get('scraping_enabled') == False:
            closed.append(venue_key)
        elif config.get('scraping_strategy') == 'external_aggregators':
            external_aggregators.append(venue_key)
        elif config.get('weekly_program_only') or config.get('scraping_strategy') == 'static_weekly_program':
            static_weekly.append(venue_key)
        else:
            direct_scraping.append(venue_key)
    
    print(f"\n✅ Direct Scraping ({len(direct_scraping)} venues):")
    for venue in direct_scraping:
        config = get_venue_config(venue)
        special = []
        if config.get('wordpress_eventon'):
            special.append("EventON")
        if config.get('wordpress_tribe_events'):
            special.append("Tribe")
        if config.get('parsing_strategy'):
            special.append(config['parsing_strategy'])
        special_str = f" [{', '.join(special)}]" if special else ""
        print(f"  • {config['venue_name']}{special_str}")
    
    print(f"\n⚠️  External Aggregators ({len(external_aggregators)} venues):")
    for venue in external_aggregators:
        config = get_venue_config(venue)
        sources = []
        if 'alternative_sources' in config:
            alt = config['alternative_sources']
            if 'facebook' in alt:
                sources.append("FB")
            if 'instagram' in alt:
                sources.append("IG")
            if 'events_at' in alt:
                sources.append("events.at")
        source_str = f" [{', '.join(sources)}]" if sources else ""
        print(f"  • {config['venue_name']}{source_str}")
    
    print(f"\n📅 Static Weekly Programs ({len(static_weekly)} venues):")
    for venue in static_weekly:
        config = get_venue_config(venue)
        print(f"  • {config['venue_name']}")
    
    print(f"\n🚫 Closed Venues ({len(closed)} venue):")
    for venue in closed:
        config = get_venue_config(venue)
        status = config.get('status', 'Unknown')
        closure = config.get('closure_date', 'Unknown')
        print(f"  • {config['venue_name']} - {status} (since {closure})")
    
    # Success rate calculation
    print(f"\n{'=' * 70}")
    print("SUCCESS RATE PROJECTION:")
    print("-" * 70)
    
    total_active = len(all_venues) - len(closed)
    direct_scrapable = len(direct_scraping)
    
    print(f"\n  Total venues:              {len(all_venues)}")
    print(f"  Active venues:             {total_active}")
    print(f"  Closed venues:             {len(closed)}")
    print(f"\n  Direct scraping ready:     {direct_scrapable}")
    print(f"  Need external sources:     {len(external_aggregators)}")
    print(f"  Static weekly programs:    {len(static_weekly)}")
    
    success_rate_current = (direct_scrapable / total_active) * 100 if total_active > 0 else 0
    success_rate_with_ext = ((direct_scrapable + len(external_aggregators)) / total_active) * 100 if total_active > 0 else 0
    
    print(f"\n  Expected success rate:")
    print(f"    Direct scraping only:    {success_rate_current:.1f}% ({direct_scrapable}/{total_active})")
    print(f"    With external sources:   {success_rate_with_ext:.1f}% ({direct_scrapable + len(external_aggregators)}/{total_active})")
    
    print(f"\n  Previous success rate:     4.0% (1/25)")
    improvement = success_rate_current - 4.0
    print(f"  Improvement:               +{improvement:.1f} percentage points")
    
    # Final status
    print(f"\n{'=' * 70}")
    all_passed = all(status for _, status, _ in fixes)
    if all_passed:
        print("✓ ALL VALIDATIONS PASSED!")
    else:
        print("✗ SOME VALIDATIONS FAILED")
    print("=" * 70)
    
    return all_passed


if __name__ == '__main__':
    success = validate_configs()
    sys.exit(0 if success else 1)
