#!/usr/bin/env python3
"""
Link Events to Venues

This script links events to their corresponding venues based on custom_venue_name.
It matches events with venues by name and city, then updates the venue_id field.

Usage:
    python website-scrapers/link_events_to_venue.py [--dry-run] [--debug]
"""

import sys
import os
import argparse
from typing import Dict, List, Optional

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    print("⚠️  supabase-py not installed. Install with: pip install supabase")
    SUPABASE_AVAILABLE = False
    sys.exit(1)


def normalize_venue_name(name: str) -> str:
    """Normalize venue name for matching"""
    if not name:
        return ""
    # Convert to lowercase and remove extra spaces
    return ' '.join(name.lower().strip().split())


def init_supabase() -> Optional[Client]:
    """Initialize Supabase client from environment variables"""
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase credentials not found in environment variables")
        print("   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return None
    
    try:
        client = create_client(supabase_url, supabase_key)
        print("✓ Supabase client initialized")
        return client
    except Exception as e:
        print(f"❌ Failed to initialize Supabase: {e}")
        return None


def get_venues(supabase: Client) -> Dict[str, Dict]:
    """Fetch all venues and create a lookup dict by normalized name and city"""
    try:
        response = supabase.table('venues').select('*').execute()
        venues = response.data
        
        # Create lookup dict: (normalized_name, city) -> venue
        venue_lookup = {}
        for venue in venues:
            key = (normalize_venue_name(venue['name']), venue['city'].lower())
            venue_lookup[key] = venue
        
        print(f"✓ Loaded {len(venues)} venues")
        return venue_lookup
    except Exception as e:
        print(f"❌ Error fetching venues: {e}")
        return {}


def get_unlinked_events(supabase: Client) -> List[Dict]:
    """Fetch events that have custom_venue_name but no venue_id"""
    try:
        response = supabase.table('events').select('id, custom_venue_name, city').is_('venue_id', 'null').not_.is_('custom_venue_name', 'null').execute()
        events = response.data
        print(f"✓ Found {len(events)} unlinked events")
        return events
    except Exception as e:
        print(f"❌ Error fetching events: {e}")
        return []


def link_events_to_venues(supabase: Client, dry_run: bool = False, debug: bool = False) -> Dict:
    """Link events to venues based on custom_venue_name"""
    
    print("=" * 70)
    print("Linking Events to Venues")
    print("=" * 70)
    
    if dry_run:
        print("⚠️  Running in DRY-RUN mode (no database writes)\n")
    
    # Get all venues
    venue_lookup = get_venues(supabase)
    if not venue_lookup:
        print("❌ No venues found. Please run venue scrapers first.")
        return {'linked': 0, 'errors': 0, 'not_found': 0}
    
    # Get unlinked events
    unlinked_events = get_unlinked_events(supabase)
    if not unlinked_events:
        print("✓ No unlinked events found. All events are already linked!")
        return {'linked': 0, 'errors': 0, 'not_found': 0}
    
    stats = {'linked': 0, 'errors': 0, 'not_found': 0}
    
    print(f"\nProcessing {len(unlinked_events)} events...\n")
    
    for event in unlinked_events:
        event_id = event['id']
        venue_name = event.get('custom_venue_name', '')
        city = event.get('city', 'Wien')
        
        if not venue_name:
            continue
        
        # Try to find matching venue
        key = (normalize_venue_name(venue_name), city.lower())
        venue = venue_lookup.get(key)
        
        if venue:
            if debug:
                print(f"  Linking event {event_id[:8]}... to venue '{venue['name']}'")
            
            if not dry_run:
                try:
                    supabase.table('events').update({
                        'venue_id': venue['id']
                    }).eq('id', event_id).execute()
                    stats['linked'] += 1
                    print(f"  ✓ Linked: {venue_name} -> {venue['name']}")
                except Exception as e:
                    stats['errors'] += 1
                    print(f"  ❌ Error linking event {event_id[:8]}...: {e}")
            else:
                stats['linked'] += 1
                print(f"  ✓ Would link: {venue_name} -> {venue['name']}")
        else:
            stats['not_found'] += 1
            if debug:
                print(f"  ⚠️  No venue found for: {venue_name} (city: {city})")
    
    # Print summary
    print(f"\n{'=' * 70}")
    print("Summary:")
    print("=" * 70)
    print(f"  Events linked:       {stats['linked']}")
    print(f"  Venues not found:    {stats['not_found']}")
    print(f"  Errors:              {stats['errors']}")
    print("=" * 70)
    
    if stats['not_found'] > 0:
        print("\n💡 Tip: Some venues were not found. Make sure to:")
        print("   1. Run venue scrapers or import venue data first")
        print("   2. Check that venue names match between events and venues")
    
    return stats


def main():
    parser = argparse.ArgumentParser(description='Link events to venues based on custom_venue_name')
    parser.add_argument('--dry-run', action='store_true', help='Run without updating database')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    args = parser.parse_args()
    
    # Initialize Supabase
    supabase = init_supabase()
    if not supabase:
        return 1
    
    # Link events to venues
    stats = link_events_to_venues(supabase, dry_run=args.dry_run, debug=args.debug)
    
    return 0 if stats['errors'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
