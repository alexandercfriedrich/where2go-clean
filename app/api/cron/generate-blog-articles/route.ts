/**
 * Cron Job: Daily Blog Article Generation Trigger
 * 
 * Scheduled to run daily at 6 AM UTC via Vercel Cron
 * Triggers Make.com webhook for each Vienna event category to generate blog articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/lib/cronAuth';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

interface TriggerResult {
  category: string;
  success: boolean;
  error?: string;
  webhookUrl?: string;
}

// Constants
const ERROR_TEXT_MAX_LENGTH = 100; // Maximum length for error messages in logs
const WEBHOOK_DELAY_MS = 100; // Delay between webhook requests to avoid rate limiting

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify this is a Vercel Cron request
    const authResult = validateCronAuth(request, '[CRON:BLOG-ARTICLES]');
    if (!authResult.authorized) {
      // errorResponse is guaranteed to be non-null when authorized is false
      return authResult.errorResponse as NextResponse;
    }

    console.log('[CRON:BLOG-ARTICLES] Starting daily blog article generation job at', new Date().toISOString());

    const webhookUrl = process.env.MAKE_COM_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('[CRON:BLOG-ARTICLES] MAKE_COM_WEBHOOK_URL not configured');
      return NextResponse.json(
        { 
          success: false, 
          error: 'MAKE_COM_WEBHOOK_URL environment variable not set',
          message: 'Please configure the Make.com webhook URL in your environment variables'
        },
        { status: 500 }
      );
    }

    // Get cities to process from environment or default to Wien
    const citiesToProcess = process.env.BLOG_GENERATION_CITIES 
      ? process.env.BLOG_GENERATION_CITIES.split(',').map(c => c.trim().toLowerCase())
      : ['wien'];
    
    const results: TriggerResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Trigger webhook for each city and category combination
    for (const city of citiesToProcess) {
      for (const category of EVENT_CATEGORIES) {
        try {
          console.log(`[CRON:BLOG-ARTICLES] Triggering Make.com for: ${city} - ${category}`);
          
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              city,
              category,
              timestamp: new Date().toISOString(),
              source: 'vercel-cron',
            }),
          });

          if (response.ok) {
            successCount++;
            results.push({
              category: `${city}:${category}`,
              success: true
            });
            console.log(`[CRON:BLOG-ARTICLES] ✓ Successfully triggered: ${city} - ${category}`);
          } else {
            const errorText = await response.text();
            failureCount++;
            results.push({
              category: `${city}:${category}`,
              success: false,
              error: `HTTP ${response.status}: ${errorText.substring(0, ERROR_TEXT_MAX_LENGTH)}`
            });
            console.error(`[CRON:BLOG-ARTICLES] ✗ Failed to trigger ${city} - ${category}:`, errorText);
          }

          // Small delay between requests to avoid overwhelming the webhook
          await new Promise(resolve => setTimeout(resolve, WEBHOOK_DELAY_MS));

        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          failureCount++;
          results.push({
            category: `${city}:${category}`,
            success: false,
            error: errorMessage
          });
          console.error(`[CRON:BLOG-ARTICLES] ✗ Error triggering ${city} - ${category}:`, errorMessage);
        }
      }
    }

    const summary = {
      success: failureCount === 0,
      cities: citiesToProcess,
      totalCategories: EVENT_CATEGORIES.length,
      totalTriggers: citiesToProcess.length * EVENT_CATEGORIES.length,
      successCount,
      failureCount,
      timestamp: new Date().toISOString(),
      results
    };

    console.log('[CRON:BLOG-ARTICLES] Job completed:', {
      successCount,
      failureCount,
      total: EVENT_CATEGORIES.length
    });

    return NextResponse.json(summary, {
      status: failureCount === 0 ? 200 : 207 // 207 Multi-Status if partial success
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CRON:BLOG-ARTICLES] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
