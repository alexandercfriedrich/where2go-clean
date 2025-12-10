/**
 * Cron Job: Daily Blog Article Generation Trigger
 * 
 * Scheduled to run daily at 6 AM UTC via Vercel Cron
 * Triggers Make.com webhook for each Vienna event category to generate blog articles
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/lib/cronAuth';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface TriggerResult {
  category: string;
  success: boolean;
  error?: string;
  webhookUrl?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify this is a Vercel Cron request
    const authResult = validateCronAuth(request, '[CRON:BLOG-ARTICLES]');
    if (!authResult.authorized) {
      return authResult.errorResponse!;
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

    const city = 'wien';
    const results: TriggerResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Trigger webhook for each category
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
            category,
            success: true,
            webhookUrl: webhookUrl.substring(0, 30) + '...' // Log partial URL for security
          });
          console.log(`[CRON:BLOG-ARTICLES] ✓ Successfully triggered: ${category}`);
        } else {
          const errorText = await response.text();
          failureCount++;
          results.push({
            category,
            success: false,
            error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`
          });
          console.error(`[CRON:BLOG-ARTICLES] ✗ Failed to trigger ${category}:`, errorText);
        }

        // Small delay between requests to avoid overwhelming the webhook
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        failureCount++;
        results.push({
          category,
          success: false,
          error: error.message
        });
        console.error(`[CRON:BLOG-ARTICLES] ✗ Error triggering ${category}:`, error.message);
      }
    }

    const summary = {
      success: failureCount === 0,
      city,
      totalCategories: EVENT_CATEGORIES.length,
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

  } catch (error: any) {
    console.error('[CRON:BLOG-ARTICLES] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
