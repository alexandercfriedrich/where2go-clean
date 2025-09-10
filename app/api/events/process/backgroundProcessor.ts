import { EventData } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { getJobStore } from '@/lib/jobStore';

const jobStore = getJobStore();

// Extracted background processing function for direct use
export async function processJobInBackground(
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
    
    // Get current job
    const job = await jobStore.getJob(jobId);
    if (!job) {
      console.error(`❌ Job ${jobId} not found`);
      return;
    }

    // Initialize Perplexity service
    const perplexityService = createPerplexityService(PERPLEXITY_API_KEY);
    if (!perplexityService) {
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to create Perplexity service'
      });
      return;
    }

    let allEvents: EventData[] = job.events || [];
    let completedCategories = job.progress?.completedCategories || 0;

    // Process each category sequentially
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
          // Continue with other categories instead of failing completely
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