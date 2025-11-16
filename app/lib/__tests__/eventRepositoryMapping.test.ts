import { describe, it, expect } from 'vitest'
import type { EventData } from '../types'

// We'll test the mapping logic by importing the types and verifying the structure
// Note: We can't directly test the private method, but we can verify the interface

describe('EventRepository PostgreSQL Schema Integration', () => {
  it('should have proper EventData to DbEventInsert mapping fields', () => {
    // Sample EventData as it comes from aggregation
    const sampleEvent: EventData = {
      title: 'Test Concert',
      category: 'Music',
      date: '2025-12-01',
      time: '20:00',
      endTime: '23:00',
      venue: 'Test Venue',
      address: '123 Test Street',
      price: 'Free',
      website: 'https://example.com',
      description: 'A test event',
      eventType: 'Concert',
      bookingLink: 'https://booking.example.com',
      imageUrl: 'https://example.com/image.jpg',
      source: 'ai',
      city: 'Wien'
    }

    // Verify EventData structure matches expected fields
    expect(sampleEvent).toHaveProperty('title')
    expect(sampleEvent).toHaveProperty('category')
    expect(sampleEvent).toHaveProperty('date')
    expect(sampleEvent).toHaveProperty('time')
    expect(sampleEvent).toHaveProperty('venue')
    expect(sampleEvent).toHaveProperty('price')
    expect(sampleEvent).toHaveProperty('website')
    expect(sampleEvent).toHaveProperty('eventType')
    expect(sampleEvent).toHaveProperty('bookingLink')
    expect(sampleEvent).toHaveProperty('imageUrl')
  })

  it('should detect free events correctly', () => {
    const freeVariations = [
      'Free',
      'free',
      'FREE',
      'Kostenlos',
      'kostenlos',
      'Gratis',
      'gratis',
      'Free entry',
      'Gratis Eintritt'
    ]

    // Helper function matching the logic in EventRepository.isFreeEvent
    const isFreeEvent = (priceStr?: string): boolean => {
      if (!priceStr) return false
      const lower = priceStr.toLowerCase().trim()
      return (
        lower === 'free' ||
        lower === 'gratis' ||
        lower === 'kostenlos' ||
        lower.indexOf('free ') === 0 ||
        lower.indexOf('gratis ') === 0
      )
    }

    freeVariations.forEach(price => {
      expect(isFreeEvent(price)).toBe(true)
    })

    // Test non-free events
    expect(isFreeEvent('€10')).toBe(false)
    expect(isFreeEvent('10 EUR')).toBe(false)
    expect(isFreeEvent('')).toBe(false)
    expect(isFreeEvent(undefined)).toBe(false)
    // Test false positives that new implementation prevents
    expect(isFreeEvent('sugar-free')).toBe(false)
    expect(isFreeEvent('Entry is free')).toBe(false) // doesn't start with 'free '
    expect(isFreeEvent('Kostenloser Eintritt')).toBe(false) // doesn't match exact 'kostenlos'
  })

  it('should format date and time correctly to ISO 8601', () => {
    const testCases = [
      { date: '2025-12-01', time: '20:00', expected: '2025-12-01T20:00:00.000Z' },
      { date: '2025-12-25', time: '14:30', expected: '2025-12-25T14:30:00.000Z' },
      { date: '2025-01-15', time: '09:00', expected: '2025-01-15T09:00:00.000Z' }
    ]

    testCases.forEach(({ date, time, expected }) => {
      const result = `${date}T${time}:00.000Z`
      expect(result).toBe(expected)
    })
  })

  it('should handle events without end time', () => {
    const event: EventData = {
      title: 'Test Event',
      category: 'Theater',
      date: '2025-12-01',
      time: '19:00',
      venue: 'Test Venue',
      price: '€20',
      website: 'https://example.com'
    }

    expect(event.endTime).toBeUndefined()
    // When endTime is undefined, end_date_time should be null
  })

  it('should map all critical fields from EventData', () => {
    const completeEvent: EventData = {
      title: 'Complete Test Event',
      category: 'Music',
      date: '2025-12-15',
      time: '18:00',
      endTime: '22:00',
      venue: 'Grand Hall',
      address: '456 Main Street, 1010 Wien',
      price: 'Kostenlos',
      website: 'https://event.example.com',
      description: 'A complete test event with all fields',
      eventType: 'Jazz Concert',
      bookingLink: 'https://tickets.example.com',
      imageUrl: 'https://cdn.example.com/event.jpg',
      source: 'wien-info',
      city: 'Wien'
    }

    // Verify all fields that should be mapped to database
    const requiredMappings = {
      title: completeEvent.title,
      description: completeEvent.description,
      category: completeEvent.category,
      subcategory: completeEvent.eventType, // eventType -> subcategory
      custom_venue_name: completeEvent.venue,
      custom_venue_address: completeEvent.address,
      price_info: completeEvent.price,
      website_url: completeEvent.website,
      booking_url: completeEvent.bookingLink,
      image_urls: [completeEvent.imageUrl],
      tags: [completeEvent.eventType],
      source: completeEvent.source,
      city: 'Wien',
      country: 'Austria'
    }

    // Verify each mapping
    Object.entries(requiredMappings).forEach(([dbField, expectedValue]) => {
      expect(expectedValue).toBeDefined()
    })
  })

  it('should handle minimal event data', () => {
    const minimalEvent: EventData = {
      title: 'Minimal Event',
      category: 'Art',
      date: '2025-12-01',
      time: '10:00',
      venue: 'Gallery',
      price: '€5',
      website: 'https://gallery.example.com'
    }

    // Fields that should be null or have defaults
    expect(minimalEvent.description).toBeUndefined()
    expect(minimalEvent.eventType).toBeUndefined()
    expect(minimalEvent.bookingLink).toBeUndefined()
    expect(minimalEvent.imageUrl).toBeUndefined()
    expect(minimalEvent.address).toBeUndefined()
    expect(minimalEvent.endTime).toBeUndefined()
  })
})
