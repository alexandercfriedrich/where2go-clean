import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export const runtime = 'nodejs'

type DbEvent = Database['public']['Tables']['events']['Row']
type DbEventUpdate = Database['public']['Tables']['events']['Update']

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
    
    // Validate that body is not empty
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Update data required' },
        { status: 400 }
      )
    }

    // Update timestamps
    const updates: DbEventUpdate = {
      ...body,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

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
