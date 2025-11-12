import { NextRequest, NextResponse } from 'next/server'
import { EventRepository } from '@/lib/repositories/EventRepository'
import { eventsCache } from '@/lib/cache'
import type { EventData } from '@/lib/types'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const city = searchParams.get('city')
    const date = searchParams.get('date') || undefined
    const category = searchParams.get('category') || undefined
    const search = searchParams.get('search') || undefined
    const limit = parseInt(searchParams.get('limit') || '50')
    const useCache = searchParams.get('cache') !== 'false'

    if (!city) {
      return NextResponse.json(
        { error: 'City parameter required' },
        { status: 400 }
      )
    }

    // 1) Try Redis cache first (if enabled)
    let events: EventData[] = []
    let fromCache = false

    if (useCache && date && category) {
      const cacheKey = `${city.toLowerCase()}_${date}_${category}`
      const cached = await eventsCache.get<EventData[]>(cacheKey)
      if (cached && Array.isArray(cached) && cached.length > 0) {
        events = cached
        fromCache = true
      }
    }

    // 2) Fallback to PostgreSQL
    if (events.length === 0) {
      if (search) {
        events = await EventRepository.searchEvents({ city, searchTerm: search, limit })
      } else {
        events = await EventRepository.getEvents({ city, date, category, limit })
      }
      fromCache = false
    }

    return NextResponse.json({
      success: true,
      data: events,
      count: events.length,
      meta: {
        fromCache,
        source: fromCache ? 'redis' : 'postgresql',
        city,
        date,
        category
      }
    })
  } catch (error) {
    console.error('[API v1/events] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch events',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
