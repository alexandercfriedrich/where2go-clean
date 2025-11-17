import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

type DbEvent = Database['public']['Tables']['events']['Row']

/**
 * GET /api/v1/events/[id]
 * Get a single event by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Event ID required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Event not found' },
          { status: 404 }
        )
      }
      
      console.error('[API v1/events/[id]] Query error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch event', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('[API v1/events/[id]] Exception:', error)
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

/**
 * PATCH /api/v1/events/[id]
 * Update an event by ID (server-side only with admin client)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Event ID required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // Define fields that are allowed to be updated
    const ALLOWED_UPDATE_FIELDS = [
      'title',
      'description',
      'short_description',
      'category',
      'subcategory',
      'tags',
      'custom_venue_name',
      'custom_venue_address',
      'venue_id',
      'start_date_time',
      'end_date_time',
      'timezone',
      'is_all_day',
      'is_free',
      'price_min',
      'price_max',
      'price_currency',
      'price_info',
      'website_url',
      'booking_url',
      'ticket_url',
      'source_url',
      'image_urls',
      'video_url',
      'source',
      'source_api',
      'external_id',
      'is_verified',
      'is_featured',
      'is_cancelled',
      'published_at'
    ]
    
    // Filter body to only include allowed fields
    const filteredBody: Record<string, any> = {}
    for (const [key, value] of Object.entries(body)) {
      if (ALLOWED_UPDATE_FIELDS.includes(key)) {
        filteredBody[key] = value
      }
    }
    
    // Validate that filteredBody is not empty
    if (Object.keys(filteredBody).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    // Add updated_at timestamp
    const updateData = {
      ...filteredBody,
      updated_at: new Date().toISOString()
    }

    // Use type assertion to work around Supabase SDK limitations at build time
    const result = await (supabaseAdmin as any)
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    const { data, error } = result

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Event not found' },
          { status: 404 }
        )
      }
      
      console.error('[API v1/events/[id]] Update error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update event', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('[API v1/events/[id]] Exception:', error)
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

/**
 * DELETE /api/v1/events/[id]
 * Delete an event by ID (server-side only with admin client)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Event ID required' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[API v1/events/[id]] Delete error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete event', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    })
  } catch (error) {
    console.error('[API v1/events/[id]] Exception:', error)
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
