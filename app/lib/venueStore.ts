// app/lib/venueStore.ts

import { createClient } from '@supabase/supabase-js';
import type { VenueData, VenueScraperResult } from '@/lib/types';
import { generateVenueSlug } from '@/lib/sources/wienInfoVenueScraper';

/**
 * Get or create Supabase client (lazy initialization)
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });
}

/**
 * Upserts a venue into database
 * Returns the venue ID
 */
export async function upsertVenue(
  venueData: VenueScraperResult
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const venueSlug = generateVenueSlug(venueData.name);
    
    const venueRecord: Partial<VenueData> = {
      venue_slug: venueSlug,
      name: venueData.name,
      street: venueData.street,
      street_number: venueData.street_number,
      postal_code: venueData.postal_code,
      city: venueData.city || 'Wien',
      country: venueData.country || 'Austria',
      full_address: venueData.full_address,
      phone: venueData.phone,
      email: venueData.email,
      website: venueData.website,
      latitude: venueData.latitude,
      longitude: venueData.longitude,
      description: venueData.description,
      accessibility_info: venueData.accessibility_info,
      source: 'wien.info',
    };

    // Upsert (insert or update)
    const { data, error } = await supabase
      .from('venues')
      .upsert(venueRecord, {
        onConflict: 'venue_slug',
        ignoreDuplicates: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[VENUE-STORE] Upsert error:', error);
      return null;
    }

    console.log(`[VENUE-STORE] ✓ Upserted: ${venueData.name} (${data.id})`);
    return data.id;

  } catch (error: any) {
    console.error('[VENUE-STORE] Error:', error);
    return null;
  }
}

/**
 * Get venue by name
 */
export async function getVenueByName(venueName: string): Promise<VenueData | null> {
  try {
    const supabase = getSupabaseClient();
    const venueSlug = generateVenueSlug(venueName);
    
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('venue_slug', venueSlug)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('[VENUE-STORE] Get error:', error);
      }
      return null;
    }

    return data as VenueData;

  } catch (error) {
    console.error('[VENUE-STORE] Error:', error);
    return null;
  }
}

/**
 * Batch upsert venues
 * Returns map of venue name -> venue ID
 */
export async function batchUpsertVenues(
  venues: Map<string, VenueScraperResult>
): Promise<Map<string, string>> {
  const venueIdMap = new Map<string, string>();
  
  console.log(`[VENUE-STORE] Batch upserting ${venues.size} venues`);

  for (const [venueName, venueData] of venues.entries()) {
    const venueId = await upsertVenue(venueData);
    if (venueId) {
      venueIdMap.set(venueName, venueId);
    }
    
    // Small delay to avoid overwhelming DB
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`[VENUE-STORE] ✓ Stored ${venueIdMap.size}/${venues.size} venues`);
  
  return venueIdMap;
}

/**
 * Get all venues by city
 */
export async function getVenuesByCity(city: string = 'Wien'): Promise<VenueData[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('city', city)
      .order('name');

    if (error) {
      console.error('[VENUE-STORE] Error:', error);
      return [];
    }

    return data as VenueData[];

  } catch (error) {
    console.error('[VENUE-STORE] Error:', error);
    return [];
  }
}
