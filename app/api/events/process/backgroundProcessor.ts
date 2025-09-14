import { EventData } from '../../../../lib/new-backend/types/events';
import { EventSearchJob, JobStatus, JobProgress, ProgressState, CategoryState } from '../../../../lib/new-backend/types/jobs';
import { getEventCache } from '../../../../lib/new-backend/redis/eventCache';
import { getPerplexityClient } from '../../../../lib/new-backend/services/perplexityClient';
import { aggregateAndDeduplicateEvents, deduplicateEvents } from '../../../../lib/new-backend/utils/eventAggregator';
import { getJobStore } from '../../../../lib/new-backend/redis/jobStore';
import { MAIN_CATEGORIES } from '../../../../lib/new-backend/categories/categoryMap';
import { createComponentLogger } from '../../../../lib/new-backend/utils/log';

const logger = createComponentLogger('BackgroundProcessor');
const jobStore = getJobStore();

// Configuration constants
const DEFAULT_PER_CATEGORY_TIMEOUT_MS = 60000; // 60 seconds
const DEFAULT_INTER_CATEGORY_DELAY_MS = 500; // 500ms between categories

// Progressive background processor with incremental event updates
export async function processJobInBackground(
  jobId: string,
  city: string,
  date: string,
  categories: string[],
  options: any = {}
): Promise<void> {
  const startTime = Date.now();
  
  // Extract configuration options
  const perCategoryTimeoutMs = options.perCategoryTimeoutMs || DEFAULT_PER_CATEGORY_TIMEOUT_MS;
  const interCategoryDelayMs = options.interCategoryDelayMs || DEFAULT_INTER_CATEGORY_DELAY_MS;
  
  try {
    logger.info('Starting progressive background job processing', {
      jobId,
      city,
      date,
      categoryCount: categories.length,
      categories: categories.slice(0, 3), // Log first 3 categories
      perCategoryTimeoutMs,
      interCategoryDelayMs
    });

    // Initialize category states with proper typing
    const initialCategoryStates: Record<string, CategoryState> = {};
    categories.forEach(category => {
      initialCategoryStates[category] = {
        state: ProgressState.NOT_STARTED,
        retryCount: 0
      };
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
    let completedCategories = 0;
    let failedCategories = 0;
    
    // Process each category individually with progressive updates
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      
      try {
        logger.info(`Processing category ${i + 1}/${categories.length}: ${category}`, { jobId });
        
        // Update category to in_progress state
        const updatedCategoryStates = { ...initialCategoryStates };
        updatedCategoryStates[category] = {
          state: ProgressState.IN_PROGRESS,
          retryCount: 0,
          startedAt: new Date().toISOString()
        };
        
        await jobStore.updateJob(jobId, {
          progress: {
            completedCategories,
            totalCategories: categories.length,
            failedCategories,
            categoryStates: updatedCategoryStates
          }
        });

        // Process category with timeout
        const categoryEvents = await processCategoryWithTimeout(
          jobId,
          city,
          date,
          category,
          perCategoryTimeoutMs,
          eventCache
        );
        
        // Category completed successfully
        completedCategories++;
        allEvents.push(...categoryEvents);
        
        // Update category to completed state with event count
        updatedCategoryStates[category] = {
          state: ProgressState.COMPLETED,
          retryCount: 0,
          startedAt: updatedCategoryStates[category].startedAt,
          completedAt: new Date().toISOString(),
          eventCount: categoryEvents.length
        };

        // Deduplicate events progressively for immediate frontend display
        const deduplicatedEvents = deduplicateEvents(allEvents);
        
        // Progressive update with current events
        await jobStore.updateJob(jobId, {
          events: deduplicatedEvents,
          progress: {
            completedCategories,
            totalCategories: categories.length,
            failedCategories,
            categoryStates: updatedCategoryStates
          }
        });

        logger.info(`Successfully processed category: ${category}`, {
          jobId,
          category,
          eventCount: categoryEvents.length,
          totalEventsAfterDedup: deduplicatedEvents.length,
          progress: `${completedCategories}/${categories.length}`
        });
        
      } catch (categoryError) {
        // Category failed
        failedCategories++;
        const updatedCategoryStates = { ...initialCategoryStates };
        
        updatedCategoryStates[category] = {
          state: ProgressState.FAILED,
          retryCount: 0,
          startedAt: updatedCategoryStates[category]?.startedAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
          error: categoryError instanceof Error ? categoryError.message : String(categoryError)
        };

        // Update progress even for failed categories
        await jobStore.updateJob(jobId, {
          progress: {
            completedCategories,
            totalCategories: categories.length,
            failedCategories,
            categoryStates: updatedCategoryStates
          }
        });

        logger.error(`Failed to process category: ${category}`, {
          jobId,
          category,
          error: categoryError instanceof Error ? categoryError.message : String(categoryError),
          progress: `${completedCategories}/${categories.length} (${failedCategories} failed)`
        });
      }

      // Inter-category delay to avoid rate limits
      if (i < categories.length - 1) {
        await new Promise(resolve => setTimeout(resolve, interCategoryDelayMs));
      }
    }

    // Final deduplication and status determination
    const finalEvents = deduplicateEvents(allEvents);
    
    // Determine final status
    let finalStatus: JobStatus;
    if (failedCategories === 0) {
      finalStatus = JobStatus.SUCCESS;
    } else if (completedCategories > 0) {
      finalStatus = JobStatus.PARTIAL_SUCCESS;
    } else {
      finalStatus = JobStatus.FAILED;
    }
    
    logger.info('Progressive job processing completed', {
      jobId,
      totalEvents: finalEvents.length,
      completedCategories,
      failedCategories,
      finalStatus,
      processingTime: Date.now() - startTime
    });

    // Final job update
    const finalCategoryStates: Record<string, CategoryState> = {};
    categories.forEach(category => {
      const existingState = initialCategoryStates[category];
      finalCategoryStates[category] = {
        ...existingState,
        // Only mark as completed if not already failed
        state: existingState.state === ProgressState.FAILED ? ProgressState.FAILED : ProgressState.COMPLETED,
        completedAt: existingState.completedAt || new Date().toISOString()
      };
    });

    await jobStore.updateJob(jobId, {
      status: finalStatus,
      events: finalEvents,
      progress: {
        completedCategories,
        totalCategories: categories.length,
        failedCategories,
        categoryStates: finalCategoryStates
      },
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Progressive job processing failed with fatal error', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
      processingTime: Date.now() - startTime
    });

    await jobStore.updateJob(jobId, {
      status: JobStatus.FAILED,
      error: error instanceof Error ? error.message : 'Unknown fatal error during processing',
      completedAt: new Date().toISOString()
    });
  }
}

/**
 * Process a single category with timeout using AbortController.
 * Includes caching logic and AI event fetching.
 */
async function processCategoryWithTimeout(
  jobId: string,
  city: string,
  date: string,
  category: string,
  timeoutMs: number,
  eventCache: any
): Promise<EventData[]> {
  const abortController = new AbortController();
  
  // Set timeout
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, timeoutMs);

  try {
    // Check cache first
    const cacheResult = await eventCache.getEventsForCategories(city, date, [category]);
    
    if (cacheResult.cachedEvents[category] && cacheResult.cachedEvents[category].length > 0) {
      logger.info(`Found ${cacheResult.cachedEvents[category].length} cached events for category: ${category}`, { jobId });
      return cacheResult.cachedEvents[category];
    }

    // If aborted during cache check
    if (abortController.signal.aborted) {
      throw new Error(`Category processing timeout: ${category}`);
    }

    // Fetch events with abort signal
    const categoryEvents = await fetchEventsForCategoryWithAbort(
      city,
      date,
      category,
      abortController.signal
    );
    
    if (categoryEvents.length > 0) {
      logger.info(`Found ${categoryEvents.length} new events for category: ${category}`, { jobId });
      
      // Cache the events with TTL
      const ttl = computeTTLSecondsForEvents(categoryEvents);
      await eventCache.cacheEvents(city, date, category, categoryEvents, ttl);
    } else {
      logger.info(`No events found for category: ${category}`, { jobId });
    }

    return categoryEvents;

  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch events for a category with abort signal support.
 * This is a placeholder that can be replaced with real data retrieval logic.
 */
async function fetchEventsForCategoryWithAbort(
  city: string,
  date: string,
  category: string,
  signal: AbortSignal
): Promise<EventData[]> {
  // Check for abort before starting
  if (signal.aborted) {
    throw new Error(`Fetch aborted for category: ${category}`);
  }

  // Delegate to existing fetch logic
  return await fetchCategoryEvents(city, date, category, signal);
}

/**
 * Fetch events for a category - placeholder for integration with real data sources.
 * Replace this function with your existing Perplexity or scraping functions.
 */
async function fetchCategoryEvents(
  city: string,
  date: string,
  category: string,
  signal?: AbortSignal
): Promise<EventData[]> {
  // Check for abort signal periodically
  if (signal?.aborted) {
    throw new Error(`Fetch aborted for category: ${category}`);
  }

  try {
    // Use existing Perplexity client
    const perplexity = getPerplexityClient();
    const result = await perplexity.queryGeneral(city, date + ` kategorie: ${category}`);
    
    // Parse events from response
    const categoryEvents = parseEventsFromResponse(result.response, category, date);
    
    return categoryEvents;
    
  } catch (error) {
    if (signal?.aborted) {
      throw new Error(`Category fetch timeout: ${category}`);
    }
    throw error;
  }
}

/**
 * Compute TTL for events based on content and date.
 * Adjust TTL heuristics as needed.
 */
function computeTTLSecondsForEvents(events: EventData[]): number {
  // Default TTL: 24 hours
  const defaultTTL = 24 * 60 * 60;
  
  if (!events || events.length === 0) {
    return defaultTTL;
  }

  // For events happening today or soon, use shorter TTL
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const hasCurrentEvents = events.some(event => event.date === today);
  
  if (hasCurrentEvents) {
    // Events happening today: 4 hour TTL for freshness
    return 4 * 60 * 60;
  }
  
  // Future events: longer TTL
  return defaultTTL;
}

/**
 * Simple event parsing function for AI responses.
 * Parses events from Perplexity AI response text.
 */
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