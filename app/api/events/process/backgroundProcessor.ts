import { EventData } from '../../../../lib/new-backend/types/events';
import { EventSearchJob, JobStatus, JobProgress } from '../../../../lib/new-backend/types/jobs';
import { getEventCache } from '../../../../lib/new-backend/redis/eventCache';
import { getPerplexityClient } from '../../../../lib/new-backend/services/perplexityClient';
import { aggregateAndDeduplicateEvents, deduplicateEvents } from '../../../../lib/new-backend/utils/eventAggregator';
import { computeTTLSecondsForEvents } from '../../../../lib/new-backend/utils/cacheUtils';
import { getJobStore } from '../../../../lib/new-backend/redis/jobStore';
import { MAIN_CATEGORIES } from '../../../../lib/new-backend/categories/categoryMap';
import { createComponentLogger } from '../../../../lib/new-backend/utils/log';

const logger = createComponentLogger('BackgroundProcessor');
const jobStore = getJobStore();

// Simplified background processor without complex category mapping
export async function processJobInBackground(
  jobId: string,
  city: string,
  date: string,
  categories: string[],
  options: any = {}
): Promise<void> {
  const startTime = Date.now();
  
  try {
    logger.info('Starting background job processing', {
      jobId,
      city,
      date,
      categoryCount: categories.length,
      categories: categories.slice(0, 3) // Log first 3 categories
    });

    // Initialize category states
    const initialCategoryStates: Record<string, any> = {};
    categories.forEach(category => {
      initialCategoryStates[category] = { state: 'not_started' };
    });

    // Update job status to running
    await jobStore.updateJob(jobId, {
      status: JobStatus.RUNNING,
      progress: {
        completedCategories: 0,
        totalCategories: categories.length,
        failedCategories: 0,
        categoryStates: initialCategoryStates
      }
    });

    const allEvents: EventData[] = [];
    const eventCache = getEventCache();
    
    // Process each category individually (as requested by user)
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      
      try {
        logger.info(`Processing category ${i + 1}/${categories.length}: ${category}`, { jobId });
        
        // Update progress
        const categoryStates = { ...initialCategoryStates };
        categoryStates[category] = { state: 'in_progress' };
        
        await jobStore.updateJob(jobId, {
          progress: {
            completedCategories: i,
            totalCategories: categories.length,
            failedCategories: 0,
            categoryStates
          }
        });

        // Check cache first
        const cacheResult = await eventCache.getEventsForCategories(city, date, [category]);
        
        if (cacheResult.cachedEvents[category] && cacheResult.cachedEvents[category].length > 0) {
          logger.info(`Found ${cacheResult.cachedEvents[category].length} cached events for category: ${category}`, { jobId });
          allEvents.push(...cacheResult.cachedEvents[category]);
          continue;
        }

        // Make AI request for this category
        const perplexity = getPerplexityClient();
        const result = await perplexity.queryGeneral(city, date + ` kategorie: ${category}`);
        
        // Simple event parsing
        const categoryEvents = parseEventsFromResponse(result.response, category, date);
        
        if (categoryEvents.length > 0) {
          logger.info(`Found ${categoryEvents.length} new events for category: ${category}`, { jobId });
          
          // Cache the events
          const ttl = computeTTLSecondsForEvents(categoryEvents);
          await eventCache.cacheEvents(city, date, category, categoryEvents, ttl);
          
          allEvents.push(...categoryEvents);
        } else {
          logger.info(`No events found for category: ${category}`, { jobId });
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (categoryError) {
        logger.error(`Error processing category ${category}`, {
          jobId,
          category,
          error: categoryError instanceof Error ? categoryError.message : String(categoryError)
        });
        // Continue with other categories
      }
    }

    // Deduplicate all events
    const finalEvents = deduplicateEvents(allEvents);
    
    logger.info('Job processing completed', {
      jobId,
      totalEvents: finalEvents.length,
      processingTime: Date.now() - startTime
    });

    // Update job with final results
    const finalCategoryStates: Record<string, any> = {};
    categories.forEach(category => {
      finalCategoryStates[category] = { state: 'completed' };
    });

    await jobStore.updateJob(jobId, {
      status: finalEvents.length > 0 ? JobStatus.SUCCESS : JobStatus.PARTIAL_SUCCESS,
      events: finalEvents,
      progress: {
        completedCategories: categories.length,
        totalCategories: categories.length,
        failedCategories: 0,
        categoryStates: finalCategoryStates
      },
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Background job processing failed', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
      processingTime: Date.now() - startTime
    });

    await jobStore.updateJob(jobId, {
      status: JobStatus.FAILED,
      error: error instanceof Error ? error.message : 'Unknown error during processing',
      completedAt: new Date().toISOString()
    });
  }
}

// Simple event parsing function
function parseEventsFromResponse(responseText: string, category: string, date: string): EventData[] {
  const events: EventData[] = [];
  
  try {
    // Try to parse as JSON first
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map(event => ({
          title: event.title || 'Untitled Event',
          venue: event.venue || 'Unknown Venue',
          time: event.time || '00:00',
          price: event.price || 'Free',
          date: event.date || date,
          category: event.category || category,
          website: event.website || '',
          ...event
        }));
      }
    }
  } catch (parseError) {
    logger.warn('Failed to parse JSON response, trying fallback parsing', {
      category,
      error: parseError instanceof Error ? parseError.message : String(parseError)
    });
  }

  // Fallback: look for event-like patterns in text
  const lines = responseText.split('\n');
  let currentEvent: Partial<EventData> = {};
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    
    // Simple pattern matching for common event formats
    if (cleanLine.includes('Titel:') || cleanLine.includes('Title:')) {
      if (currentEvent.title) {
        events.push(finalizeEvent(currentEvent, category, date));
        currentEvent = {};
      }
      currentEvent.title = cleanLine.replace(/^(Titel:|Title:)/, '').trim();
    } else if (cleanLine.includes('Venue:') || cleanLine.includes('Ort:')) {
      currentEvent.venue = cleanLine.replace(/^(Venue:|Ort:)/, '').trim();
    } else if (cleanLine.includes('Zeit:') || cleanLine.includes('Time:')) {
      currentEvent.time = cleanLine.replace(/^(Zeit:|Time:)/, '').trim();
    } else if (cleanLine.includes('Preis:') || cleanLine.includes('Price:')) {
      currentEvent.price = cleanLine.replace(/^(Preis:|Price:)/, '').trim();
    }
  }
  
  if (currentEvent.title) {
    events.push(finalizeEvent(currentEvent, category, date));
  }
  
  return events;
}

function finalizeEvent(event: Partial<EventData>, category: string, date: string): EventData {
  return {
    title: event.title || 'Untitled Event',
    venue: event.venue || 'Unknown Venue',
    time: event.time || '00:00',
    price: event.price || 'Free',
    date: event.date || date,
    category: event.category || category,
    website: event.website || '',
    ...event
  } as EventData;
}