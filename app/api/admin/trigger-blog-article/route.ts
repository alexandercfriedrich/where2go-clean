/**
 * API Endpoint: Manual Trigger for Blog Article Generation via Make.com
 * 
 * This endpoint allows admin users to manually trigger blog article generation
 * for a specific city and category via the Make.com webhook.
 */

import { NextRequest, NextResponse } from 'next/server';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';

// Valid cities for the platform
const VALID_CITIES = ['wien', 'berlin', 'linz', 'ibiza'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { city, category } = body;

    // Validate required fields
    if (!city || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: city, category' },
        { status: 400 }
      );
    }

    // Validate city
    if (!VALID_CITIES.includes(city.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid city. Must be one of: ${VALID_CITIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate category
    if (!EVENT_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${EVENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get Make.com webhook URL from environment
    const webhookUrl = process.env.MAKE_COM_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('[TRIGGER-BLOG-ARTICLE] MAKE_COM_WEBHOOK_URL not configured');
      return NextResponse.json(
        { 
          error: 'Make.com webhook URL not configured',
          message: 'Please set MAKE_COM_WEBHOOK_URL environment variable'
        },
        { status: 500 }
      );
    }

    // Trigger Make.com webhook
    console.log(`[TRIGGER-BLOG-ARTICLE] Triggering Make.com for: ${city} - ${category}`);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        city: city.toLowerCase(),
        category,
        timestamp: new Date().toISOString(),
        source: 'admin-manual-trigger',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TRIGGER-BLOG-ARTICLE] Make.com webhook failed: ${errorText}`);
      return NextResponse.json(
        { 
          error: 'Failed to trigger Make.com webhook',
          details: `HTTP ${response.status}: ${errorText.substring(0, 200)}`
        },
        { status: 500 }
      );
    }

    console.log(`[TRIGGER-BLOG-ARTICLE] ✓ Successfully triggered: ${city} - ${category}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully triggered blog article generation for ${city} - ${category}`,
      city,
      category,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[TRIGGER-BLOG-ARTICLE] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
