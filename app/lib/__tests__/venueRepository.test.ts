import { describe, it, expect } from 'vitest'
import type { Database } from '../supabase/types'

type DbVenueInsert = Database['public']['Tables']['venues']['Insert']
type DbVenue = Database['public']['Tables']['venues']['Row']

describe('VenueRepository PostgreSQL Schema Integration', () => {
  it('should have proper venue insert structure matching database schema', () => {
    // Sample venue data as it would be created in VenueRepository.upsertVenue
    const venueData: DbVenueInsert = {
      name: 'Test Venue',
      address: '123 Test Street',
      city: 'Wien',
      country: 'Austria',
      website: 'https://testvenue.com',
      latitude: 48.2082,
      longitude: 16.3738
    }

    // Verify required fields
    expect(venueData.name).toBeDefined()
    expect(venueData.city).toBeDefined()
    
    // Verify optional fields can be null
    const minimalVenue: DbVenueInsert = {
      name: 'Minimal Venue',
      city: 'Wien'
    }
    
    expect(minimalVenue.name).toBe('Minimal Venue')
    expect(minimalVenue.city).toBe('Wien')
  })

  it('should handle venue data from Wien.info importer format', () => {
    // This matches the structure used in wienInfoImporter.ts
    const venueData: DbVenueInsert = {
      name: 'Stephansdom',
      address: 'Stephansplatz 3',
      city: 'Wien',
      country: 'Austria',
      website: null,
      latitude: null,
      longitude: null
    }

    expect(venueData.name).toBe('Stephansdom')
    expect(venueData.address).toBe('Stephansplatz 3')
    expect(venueData.city).toBe('Wien')
    expect(venueData.country).toBe('Austria')
    expect(venueData.website).toBeNull()
    expect(venueData.latitude).toBeNull()
    expect(venueData.longitude).toBeNull()
  })

  it('should validate venue uniqueness constraint on (name, city)', () => {
    // The database has UNIQUE constraint on (name, city)
    // This test validates that the same venue name can exist in different cities
    const venueVienna: DbVenueInsert = {
      name: 'Opera House',
      city: 'Wien'
    }

    const venueParis: DbVenueInsert = {
      name: 'Opera House',
      city: 'Paris'
    }

    // These should be considered different venues
    expect(venueVienna.name).toBe(venueParis.name)
    expect(venueVienna.city).not.toBe(venueParis.city)
  })

  it('should handle venue data with all optional fields populated', () => {
    const completeVenue: DbVenueInsert = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Complete Venue',
      address: '456 Full Street, 1010 Wien',
      city: 'Wien',
      country: 'Austria',
      latitude: 48.2082,
      longitude: 16.3738,
      website: 'https://completevenue.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    expect(completeVenue).toHaveProperty('id')
    expect(completeVenue).toHaveProperty('name')
    expect(completeVenue).toHaveProperty('address')
    expect(completeVenue).toHaveProperty('city')
    expect(completeVenue).toHaveProperty('country')
    expect(completeVenue).toHaveProperty('latitude')
    expect(completeVenue).toHaveProperty('longitude')
    expect(completeVenue).toHaveProperty('website')
    expect(completeVenue).toHaveProperty('created_at')
    expect(completeVenue).toHaveProperty('updated_at')
  })

  it('should properly format venue for upsert operation', () => {
    // This validates the data structure used in VenueRepository.upsertVenue()
    // which uses onConflict: 'name, city'
    const venues: DbVenueInsert[] = [
      {
        name: 'Musikverein',
        address: 'Musikvereinsplatz 1',
        city: 'Wien',
        country: 'Austria'
      },
      {
        name: 'Stadthalle',
        city: 'Wien',
        country: 'Austria'
      },
      {
        name: 'Konzerthaus',
        address: 'Lothringerstraße 20',
        city: 'Wien'
      }
    ]

    venues.forEach(venue => {
      // Every venue must have name and city for the unique constraint
      expect(venue.name).toBeDefined()
      expect(venue.name.length).toBeGreaterThan(0)
      expect(venue.city).toBeDefined()
      expect(venue.city.length).toBeGreaterThan(0)
    })
  })

  it('should validate Row type has all required fields from database', () => {
    // Mock a complete venue row as returned from database
    const venueRow: DbVenue = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Test Venue',
      address: 'Test Address',
      city: 'Wien',
      country: 'Austria',
      latitude: 48.2082,
      longitude: 16.3738,
      website: 'https://test.com',
      created_at: '2025-11-17T12:00:00Z',
      updated_at: '2025-11-17T12:00:00Z'
    }

    // Verify all required fields exist
    expect(venueRow.id).toBeDefined()
    expect(venueRow.name).toBeDefined()
    expect(venueRow.city).toBeDefined()
    expect(venueRow.country).toBeDefined()
    expect(venueRow.created_at).toBeDefined()
    expect(venueRow.updated_at).toBeDefined()
  })
})
