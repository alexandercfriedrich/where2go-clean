import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export const runtime = 'nodejs'

/**
 * GET /api/v1/search
 * Full-text search for events with advanced filtering
 * 
 * Query parameters:
 * - q: Search term (required)
 * - city: City filter (required)
 * - category: Category filter (optional)
 * - dateFrom: Start date filter YYYY-MM-DD (optional)
 * - dateTo: End date filter YYYY-MM-DD (optional)
 * - limit: Maximum number of results (default: 50, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const q = searchParams.get('q')
    const city = searchParams.get('city')
    const category = searchParams.get('category')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limitParam = searchParams.get('limit') || '50'

    // Validate required parameters
    if (!q) {
      return NextResponse.json(
        { success: false, error: 'Search term (q) required' },
        { status: 400 }
      )
    }

    if (!city) {
      return NextResponse.json(
        { success: false, error: 'City parameter required' },
        { status: 400 }
      )
    }

    // Validate and parse limit
    let limit = parseInt(limitParam, 10)
    if (isNaN(limit) || limit <= 0) {
      limit = 50
    }
    if (limit > 100) {
      limit = 100
    }

    // Sanitize search term
    const searchTerm = q.trim()
    if (searchTerm.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Search term cannot be empty' },
        { status: 400 }
      )
    }

    // Sanitize search term for SQL LIKE wildcards
    const sanitizedTerm = searchTerm.replace(/[%_]/g, '\\$&')

    // Build query
    let query = supabase
      .from('events')
      .select('*')
      .eq('city', city)
      .or(`title.ilike.%${sanitizedTerm}%,description.ilike.%${sanitizedTerm}%`)
      .order('start_date_time', { ascending: true })
      .limit(limit)

    // Apply category filter if provided
    if (category) {
      query = query.eq('category', category)
    }

    // Apply date range filters if provided
    if (dateFrom) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
        return NextResponse.json(
          { success: false, error: 'Invalid dateFrom format. Expected YYYY-MM-DD' },
          { status: 400 }
        )
      }
      const startOfDay = `${dateFrom}T00:00:00.000Z`
      query = query.gte('start_date_time', startOfDay)
    } else {
      // Default: only future events
      query = query.gte('start_date_time', new Date().toISOString())
    }

    if (dateTo) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        return NextResponse.json(
          { success: false, error: 'Invalid dateTo format. Expected YYYY-MM-DD' },
          { status: 400 }
        )
      }
      const endOfDay = `${dateTo}T23:59:59.999Z`
      query = query.lte('start_date_time', endOfDay)
    }

    const { data, error } = await query

    if (error) {
      console.error('[API v1/search] Query error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Search failed',
          message: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
      meta: {
        query: searchTerm,
        city,
        category,
        dateFrom,
        dateTo,
        limit
      }
    })
  } catch (error) {
    console.error('[API v1/search] Exception:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
