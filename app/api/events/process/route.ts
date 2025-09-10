import { NextRequest, NextResponse } from 'next/server';
import { EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { getJobStore } from '@/lib/jobStore';

// Serverless configuration for background processing
export const runtime = 'nodejs';
export const maxDuration = 300;

// Get JobStore instance
const jobStore = getJobStore();

interface ProcessingRequest {
  jobId: string;
  city: string;
  date: string;
  categories?: string[];
}

export async function POST(req: NextRequest) {
  const isBackground = req.headers.get('x-vercel-background') === '1';
  const hasInternalSecret = req.headers.get('x-internal-secret') === process.env.INTERNAL_API_SECRET;
  const hasBypass = !!req.headers.get('x-vercel-protection-bypass');

  console.log('Background processing endpoint called');

  if (!isBackground && !hasInternalSecret && !hasBypass) {
    console.error('❌ Unauthorized background processing request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ProcessingRequest = await req.json();
    const { jobId, city, date, categories } = body;

    if (!jobId || !city || !date) {
      console.error('❌ Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters: jobId, city, date' },
        { status: 400 }
      );
    }

    console.log(`✅ Processing job: ${jobId} for ${city} on ${date}`);

    // Start background processing asynchronously
    processJobInBackground(jobId, city, date, categories)
      .then(() => {
        console.log(`✅ Background processing completed successfully for job: ${jobId}`);
      })
      .catch(error => {
        console.error(`❌ Background processing failed for job ${jobId}:`, error);
        // Update job to error state
        jobStore.updateJob(jobId, {
          status: 'error',
          error: 'Background processing failed: ' + (error instanceof Error ? error.message : String(error))
        }).catch(updateError => {
          console.error('❌ Failed to update job status after background error:', updateError);
        });
      });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Background processing route error:', error);
    return NextResponse.json(
      { error: 'Background processing failed' },
      { status: 500 }
    );
  }
}

// Simplified background function to fetch from Perplexity
async function processJobInBackground(
  jobId: string, 
  city: string, 
  date: string, 
  categories?: string[]
) {
  try {
    // Environment validation
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    if (!PERPLEXITY_API_KEY) {
      console.error('❌ PERPLEXITY_API_KEY not set');
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Perplexity API Key ist nicht konfiguriert'
      });
      return;
    }

    if (!PERPLEXITY_API_KEY.startsWith('pplx-')) {
      console.error('❌ Invalid PERPLEXITY_API_KEY format');
      await jobStore.updateJob(jobId, {
        status: 'error', 
        error: 'Perplexity API Key hat ungültiges Format'
      });
      return;
    }

    console.log(`🚀 Starting background processing for job ${jobId}`);
    
    // Update job status to show processing started
    await jobStore.updateJob(jobId, {
      status: 'pending',
      progress: { 
        completedCategories: 0, 
        totalCategories: categories?.length || 0 
      }
    });

    const perplexityService = createPerplexityService(PERPLEXITY_API_KEY);
    if (!perplexityService) {
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to create Perplexity service'
      });
      return;
    }

    const job = await jobStore.getJob(jobId);
    if (!job) {
      console.error(`❌ Job ${jobId} not found`);
      return;
    }

    let allEvents: EventData[] = job.events || [];
    let completedCategories = job.progress?.completedCategories || 0;

    // Process each category
    if (categories && categories.length > 0) {
      for (const category of categories) {
        try {
          console.log(`🔍 Processing category: ${category}`);
          
          // Call Perplexity API for this category
          const results = await perplexityService.executeMultiQuery(city, date, [category], {});
          
          if (results && results.length > 0) {
            for (const result of results) {
              // Parse events from response
              const newEvents = eventAggregator.parseEventsFromResponse(result.response);
              console.log(`📝 Parsed ${newEvents.length} events from ${category}`);
              
              // Merge with existing events
              allEvents = eventAggregator.deduplicateEvents([...allEvents, ...newEvents]);
              
              // Cache the events for this category
              eventsCache.setEventsByCategory(city, date, category, newEvents);
            }
          }

          completedCategories++;
          
          // Update job progress
          await jobStore.updateJob(jobId, {
            events: allEvents,
            progress: {
              completedCategories,
              totalCategories: categories.length
            }
          });

          console.log(`✅ Completed ${category}: ${completedCategories}/${categories.length}`);

        } catch (categoryError) {
          console.error(`❌ Error processing category ${category}:`, categoryError);
          // Continue with other categories
        }
      }
    }

    // Mark job as completed
    await jobStore.updateJob(jobId, {
      status: 'done',
      events: allEvents,
      progress: {
        completedCategories,
        totalCategories: categories?.length || 0
      }
    });

    console.log(`✅ Job ${jobId} completed with ${allEvents.length} total events`);

  } catch (error) {
    console.error(`❌ Background processing failed for job ${jobId}:`, error);
    await jobStore.updateJob(jobId, {
      status: 'error',
      error: 'Processing failed: ' + (error instanceof Error ? error.message : String(error))
    });
  }
}