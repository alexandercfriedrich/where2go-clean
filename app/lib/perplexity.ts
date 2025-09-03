// Perplexity API integration with multi-query support and rate limiting

import { EventData, PerplexityResult, QueryOptions } from './types';
import { getCityWebsitesForCategories, getHotCity } from './hotCityStore';

export class PerplexityService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.perplexity.ai/chat/completions';
  private readonly batchSize = 3;
  private readonly delayBetweenBatches = 1000; // 1 second
  private readonly maxRetries = 5; // Increased for better resilience
  private readonly baseRetryDelayMs = 500;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Calculates dynamic timeout based on category complexity
   */
  private calculateCategoryTimeout(category: string, baseTimeoutMs: number = 90000): number {
    // More complex categories that typically require longer processing
    const complexCategories = [
      'live-konzerte', 'museen', 'theater/performance', 'kunst/design'
    ];
    
    // Categories that are typically faster to process
    const simplCategories = [
      'clubs/discos', 'bars', 'dj sets/electronic'
    ];

    const normalizedCategory = category.toLowerCase();
    
    if (complexCategories.some(complex => normalizedCategory.includes(complex))) {
      return Math.min(baseTimeoutMs * 1.5, 180000); // Max 3 minutes
    } else if (simplCategories.some(simple => normalizedCategory.includes(simple))) {
      return Math.max(baseTimeoutMs * 0.8, 60000); // Min 1 minute
    }
    
    return baseTimeoutMs; // Default timeout
  }

  /**
   * Adds jitter to retry delays to prevent thundering herd
   */
  private addJitter(baseDelayMs: number): number {
    const jitter = Math.random() * 0.3; // Up to 30% jitter
    return Math.floor(baseDelayMs * (1 + jitter));
  }

  /**
   * Determines if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    const errorStr = String(error);
    
    // Network-related errors that should be retried
    const retryableErrors = [
      'fetch failed', 'network error', 'timeout', 'enotfound',
      'econnreset', 'econnrefused', 'socket hang up'
    ];
    
    // HTTP status codes that should be retried
    const retryableStatuses = [429, 500, 502, 503, 504];
    
    const isNetworkError = retryableErrors.some(err => 
      errorStr.toLowerCase().includes(err)
    );
    
    const isRetryableStatus = retryableStatuses.some(status => 
      errorStr.includes(`HTTP ${status}`)
    );
    
    return isNetworkError || isRetryableStatus;
  }

  /**
   * Builds a query prompt for a specific category with strict JSON schema
   */
  private async buildCategoryPrompt(city: string, date: string, category: string): Promise<string> {
    // Get hot city configuration and specific websites
    const hotCity = await getHotCity(city);
    const cityWebsites = await getCityWebsitesForCategories(city, [category]);
    
    let websiteSection = `
Search multiple sources including:
- Local event platforms for ${city}
- Official venue websites and social media  
- ${city} tourism and culture sites
- Ticketing platforms active in ${city}
- Entertainment and nightlife directories of ${city}
- Category-specific platforms for ${category}`;

    // Add specific websites if this is a hot city
    if (cityWebsites.length > 0) {
      websiteSection += `
- PRIORITY SOURCES for ${city}:`;
      cityWebsites.forEach(website => {
        websiteSection += `\n  * ${website.name} (${website.url})${website.description ? ' - ' + website.description : ''}`;
      });
    }

    // Add custom search query if available
    let customQuerySection = '';
    if (hotCity?.defaultSearchQuery) {
      customQuerySection = `\nCustom search context for ${city}: ${hotCity.defaultSearchQuery}`;
    }

    return `
    "IMPORTANT: Search for comprehensive ${category} events in ${city} on ${date} across multiple sources.
    WICHTIG: Suche nach allen ${category}-Veranstaltungen und Events in ${city} am ${date}. ${customQuerySection}

    MANDATORY JSON FORMAT: Return ONLY a valid JSON array with NO explanations, markdown, or code blocks. 
    Each event object must include these EXACT fields:

{
  \"title\": \"string - event name\",
  \"date\": \"string - YYYY-MM-DD format\", 
  \"time\": \"string - HH:MM format (optional)\",
  \"endTime\": \"string - HH:MM format (optional)\",
  \"venue\": \"string - venue name\",
  \"address\": \"string - complete address as 'Street Number, ZIP City, Country' (optional)\",
  \"category\": \"string - ${category}\",
  \"eventType\": \"string - specific subcategory (optional)\",
  \"price\": \"string - entry cost (optional)\",
  \"ticketPrice\": \"string - ticket cost (optional)\",
  \"ageRestrictions\": \"string - age requirements (optional)\",
  \"description\": \"string - brief description (optional)\",
  \"website\": \"string - event URL\",
  \"bookingLink\": \"string - ticket URL (optional)\"
}
${websiteSection}

Perform thorough multi-source search for maximum event discovery!!!
If no events found, return: []

`;
  }

  /**
   * Builds a general query prompt with strict JSON schema
   */
  private buildGeneralPrompt(city: string, date: string): string {
    return `
IMPORTANT: Search for comprehensive events in ${city} on ${date} across these categories:
WICHTIG: Suche nach allen Veranstaltungen und Events in ${city} am ${date} der folgenden Kategorien:

1. Konzerte & Musik (Klassik, Rock, Pop, Jazz, Elektronik)
2. Theater & Kabarett & Comedy & Musicals  
3. Museen & Ausstellungen & Galerien (auch Sonderausstellungen)
4. Clubs & DJ-Sets & Partys & Electronic Music Events
5. Bars & Rooftop Events & Afterwork Events
6. Open-Air Events & Festivals & Outdoor Events
7. LGBT+ Events & Queer Events & Pride Events
8. Kinder- & Familienveranstaltungen
9. Universitäts- & Studentenevents
10. Szene-Events & Underground Events & Alternative Events

REQUIRED: Return ONLY a valid JSON array of event objects. Do not include any explanatory text, markdown formatting, code fences, or additional content.

Each event object must have these exact field names:
{
  "title": "string - event name",
  "date": "string - YYYY-MM-DD format", 
  "time": "string - HH:MM format (optional)",
  "endTime": "string - HH:MM format (optional)",
  "venue": "string - venue name",
  "address": "string - full address like 'Straße Hausnr, PLZ Stadt, Land' (optional)",
  "category": "string - must be one of: DJ Sets/Electronic, Clubs/Discos, Live-Konzerte, Open Air, Museen, LGBTQ+, Comedy/Kabarett, Theater/Performance, Film, Food/Culinary, Sport, Familien/Kids, Kunst/Design, Wellness/Spirituell, Networking/Business, Natur/Outdoor",
  "eventType": "string - specific event type (optional)",
  "price": "string - entry price (optional)", 
  "ticketPrice": "string - ticket price (optional)",
  "ageRestrictions": "string - age requirements (optional)",
  "description": "string - short description (optional)",
  "website": "string - event website URL",
  "bookingLink": "string - ticket booking URL (optional)"
}

If no events are found, return: []

WICHTIG: Suche nach ALLEN Events in ${city} am ${date}. Antworte AUSSCHLIESSLICH mit gültigem JSON Array. Keine Erklärungen, kein Fließtext, kein Markdown, keine Code-Blöcke.

Falls keine Events gefunden: []
`;
  }

  /**
   * Creates query prompts based on categories or uses general prompt
   */
  private async createQueries(city: string, date: string, categories?: string[]): Promise<string[]> {
    if (!categories || categories.length === 0) {
      // Use the original general query
      return [this.buildGeneralPrompt(city, date)];
    }

    // Create specific queries for each category
    const categoryMap: { [key: string]: string } = {
      'musik': 'Konzerte & Musik (Klassik, Rock, Pop, Jazz, Elektronik)',
      'theater': 'Theater & Kabarett & Comedy & Musicals',
      'museen': 'Museen & Ausstellungen & Galerien (auch Sonderausstellungen)',
      'clubs': 'Clubs & DJ-Sets & Partys & Electronic Music Events',
      'bars': 'Bars & Rooftop Events & Afterwork Events',
      'outdoor': 'Open-Air Events & Festivals & Outdoor Events',
      'lgbt': 'LGBT+ Events & Queer Events & Pride Events',
      'familie': 'Kinder- & Familienveranstaltungen',
      'studenten': 'Universitäts- & Studentenevents',
      'alternative': 'Szene-Events & Underground Events & Alternative Events'
    };

    const queries: string[] = [];
    for (const category of categories) {
      const categoryName = categoryMap[category.toLowerCase()] || category;
      const prompt = await this.buildCategoryPrompt(city, date, categoryName);
      queries.push(prompt);
    }

    return queries;
  }

  /**
   * Makes a single API call to Perplexity with enhanced timeout handling
   */
  private async callPerplexity(prompt: string, options?: QueryOptions, retries = 2, signal?: AbortSignal): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      console.log(`🔧 Perplexity API call attempt ${attempt + 1}/${retries} starting...`);
      
      // Create a combined abort controller that responds to both external signal and internal timeout
      const combinedController = new AbortController();
      const internalTimeoutMs = 25000; // Reduced to 25 second internal timeout for HTTP requests
      
      console.log(`⏱️ Setting internal HTTP timeout to ${internalTimeoutMs}ms`);
      
      // Set up internal timeout
      const internalTimeout = setTimeout(() => {
        console.log(`⚠️ Internal HTTP timeout ${internalTimeoutMs}ms reached, aborting request`);
        combinedController.abort();
      }, internalTimeoutMs);
      
      // Additional absolute timeout as final safeguard
      const absoluteTimeout = setTimeout(() => {
        console.error(`🚨 ABSOLUTE HTTP TIMEOUT: Request has been running for 35 seconds, force aborting`);
        combinedController.abort();
      }, 35000);
      
      // Listen to external abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          console.log(`🛑 External abort signal received, aborting request`);
          combinedController.abort();
        });
      }

      try {
        console.log(`📡 Making HTTP request to Perplexity API...`);
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            max_tokens: options?.max_tokens || 20000,
            temperature: options?.temperature || 0.2,
            stream: false
          }),
          signal: combinedController.signal // Use combined signal
        });

        // Clear the internal timeout on successful response
        clearTimeout(internalTimeout);
        clearTimeout(absoluteTimeout);
        console.log(`📨 HTTP response received with status: ${response.status}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log(`🔍 Parsing JSON response...`);
        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        console.log(`✅ Perplexity API call successful, response length: ${content.length} characters`);
        return content;
      } catch (error: any) {
        // Clear timeout on any error
        clearTimeout(internalTimeout);
        clearTimeout(absoluteTimeout);
        
        lastError = error;
        console.error(`❌ Perplexity API call failed on attempt ${attempt + 1}:`, error.message);
        
        // Check if this was an abort
        if (combinedController.signal.aborted) {
          if (signal?.aborted) {
            console.log(`🛑 Request aborted by external signal`);
            throw new Error('Request aborted by external signal');
          } else {
            console.log(`⏰ Request timed out after ${internalTimeoutMs}ms`);
            throw new Error(`HTTP request timed out after ${internalTimeoutMs}ms`);
          }
        }
        
        if (attempt === 0 && String(error).includes('not valid JSON')) {
          // Wait before retry
          console.log(`🔄 JSON parse error, waiting 500ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Executes multiple queries with improved rate limiting and adaptive retry
   */
  async executeMultiQuery(
    city: string, 
    date: string, 
    categories?: string[], 
    options?: QueryOptions
  ): Promise<PerplexityResult[]> {
    console.log(`🚀 Starting executeMultiQuery for city: ${city}, date: ${date}, categories: ${categories?.join(', ') || 'none'}`);
    
    const queries = await this.createQueries(city, date, categories);
    const results: PerplexityResult[] = [];
    
    console.log(`📋 Created ${queries.length} queries to execute`);
    
    // Extract timeout from options, ensure minimum of 60s, default to 90s
    const rawTimeout = typeof options?.categoryTimeoutMs === 'number' ? 
      options.categoryTimeoutMs : 90000;
    const baseTimeoutMs = Math.max(rawTimeout, 60000); // Enforce minimum 60s

    console.log(`⏱️ Starting multi-query execution for ${queries.length} queries`);
    console.log(`⏱️ Base timeout: ${baseTimeoutMs}ms (requested: ${rawTimeout}ms)`);

    // Determine optimal concurrency limit based on query count and system load
    const optimalConcurrency = this.calculateOptimalConcurrency(queries.length);
    console.log(`🔧 Using adaptive concurrency limit: ${optimalConcurrency}`);

    // Process queries in batches with adaptive rate limiting
    for (let i = 0; i < queries.length; i += optimalConcurrency) {
      const batch = queries.slice(i, i + optimalConcurrency);
      
      console.log(`📦 Processing batch ${Math.floor(i / optimalConcurrency) + 1}/${Math.ceil(queries.length / optimalConcurrency)} with ${batch.length} queries`);
      
      // Execute batch in parallel with category-specific timeouts and improved retry
      const batchPromises = batch.map(async (query, batchIndex) => {
        const categoryHint = categories?.[i + batchIndex] || 'general';
        const dynamicTimeout = this.calculateCategoryTimeout(categoryHint, baseTimeoutMs);
        
        console.log(`🎯 Starting query execution for category: ${categoryHint} with timeout: ${dynamicTimeout}ms`);
        return await this.executeQueryWithRetry(query, options, this.maxRetries, dynamicTimeout);
      });

      console.log(`⏳ Waiting for batch promises to resolve...`);
      const batchResults = await Promise.allSettled(batchPromises);
      
      console.log(`📊 Batch completed. Results: ${batchResults.length}, fulfilled: ${batchResults.filter(r => r.status === 'fulfilled').length}, rejected: ${batchResults.filter(r => r.status === 'rejected').length}`);
      
      // Process results and handle any failures gracefully
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          console.log(`✅ Query fulfilled successfully`);
          results.push(result.value);
        } else {
          console.error(`❌ Batch query failed:`, result.reason);
          // Add error result to maintain result order
          results.push({
            query: 'Failed query',
            response: `Batch execution failed: ${result.reason}`,
            events: [],
            timestamp: Date.now()
          });
        }
      }

      // Adaptive delay between batches based on success rate
      if (i + optimalConcurrency < queries.length) {
        const successRate = batchResults.filter(r => r.status === 'fulfilled').length / batchResults.length;
        const adaptiveDelay = successRate < 0.5 ? this.delayBetweenBatches * 2 : this.delayBetweenBatches;
        console.log(`⏸️ Batch completed. Success rate: ${(successRate * 100).toFixed(1)}%. Waiting ${adaptiveDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
      }
    }

    console.log(`🏁 Multi-query execution completed. ${results.length} results processed.`);
    return results;
  }

  /**
   * Calculates optimal concurrency based on system load and query complexity
   */
  private calculateOptimalConcurrency(queryCount: number): number {
    // Base concurrency on query count and system constraints
    if (queryCount <= 2) return queryCount;
    if (queryCount <= 5) return Math.min(3, queryCount);
    if (queryCount <= 10) return Math.min(4, queryCount);
    return Math.min(5, queryCount); // Cap at 5 for very large query sets
  }

  /**
   * Executes a single query with enhanced exponential backoff retry and timeout support
   */
  private async executeQueryWithRetry(
    query: string,
    options?: QueryOptions,
    maxRetries = 5,
    timeoutMs = 90000
  ): Promise<PerplexityResult> {
    console.log(`🔄 Starting executeQueryWithRetry with ${maxRetries} max retries and ${timeoutMs}ms timeout`);
    let lastError: Error | null = null;
    
    // Create AbortController for timeout with enhanced cleanup
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Query timeout of ${timeoutMs}ms reached, aborting...`);
      controller.abort();
    }, timeoutMs);
    
    // Additional safeguard: absolute max time per query (2x the requested timeout)
    const absoluteMaxTime = timeoutMs * 2;
    const absoluteTimeoutId = setTimeout(() => {
      console.error(`🚨 ABSOLUTE TIMEOUT: Query has been running for ${absoluteMaxTime}ms, force aborting`);
      controller.abort();
    }, absoluteMaxTime);
    
    try {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        console.log(`🎯 Starting query attempt ${attempt + 1}/${maxRetries}`);
        
        try {
          // Check abort signal before each attempt
          if (controller.signal.aborted) {
            console.log(`🛑 Query aborted before attempt ${attempt + 1}`);
            throw new Error(`Query aborted before attempt ${attempt + 1}`);
          }
          
          const startTime = Date.now();
          console.log(`📞 Calling Perplexity API...`);
          const response = await this.callPerplexity(query, options, 2, controller.signal);
          const duration = Date.now() - startTime;
          
          clearTimeout(timeoutId);
          clearTimeout(absoluteTimeoutId);
          console.log(`✅ Query completed successfully in ${duration}ms on attempt ${attempt + 1}`);
          
          return {
            query,
            response,
            events: [], // Will be populated by aggregator
            timestamp: Date.now()
          };
        } catch (error: any) {
          lastError = error;
          console.error(`❌ Query attempt ${attempt + 1}/${maxRetries} failed:`, error.message);
          
          // If aborted due to timeout, don't retry
          if (controller.signal.aborted) {
            console.log(`⏰ Query timed out, not retrying`);
            throw new Error(`Query timed out after ${timeoutMs}ms`);
          }
          
          // Check if error is retryable
          if (!this.isRetryableError(error)) {
            console.error(`🚫 Non-retryable error encountered:`, error.message);
            break;
          }
          
          // Don't retry on last attempt
          if (attempt < maxRetries - 1) {
            // Enhanced exponential backoff with jitter: 500ms -> 1000ms -> 2000ms -> 4000ms -> 8000ms
            const baseDelay = this.baseRetryDelayMs * Math.pow(2, attempt);
            const delayWithJitter = this.addJitter(baseDelay);
            console.log(`⏱️ Retrying in ${delayWithJitter}ms... (attempt ${attempt + 2}/${maxRetries})`);
            
            // Check abort signal before waiting
            if (controller.signal.aborted) {
              console.log(`🛑 Query aborted during retry wait`);
              throw new Error('Query aborted during retry wait');
            }
            
            await new Promise(resolve => setTimeout(resolve, delayWithJitter));
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
      clearTimeout(absoluteTimeoutId);
      console.log(`🧹 Cleaned up timeouts for query`);
    }

    // If all retries failed, return detailed error result
    const errorMessage = `All ${maxRetries} attempts failed. Last error: ${lastError?.message || 'Unknown error'}`;
    console.error(`💥 Query failed permanently:`, errorMessage);
    
    return {
      query: query.substring(0, 200) + '...', // Truncate for logging
      response: errorMessage,
      events: [],
      timestamp: Date.now()
    };
  }

  /**
   * Executes a single query (for backward compatibility)
   */
  async executeSingleQuery(city: string, date: string, options?: QueryOptions): Promise<PerplexityResult> {
    const prompt = this.buildGeneralPrompt(city, date);
    const response = await this.callPerplexity(prompt, options);
    
    return {
      query: prompt,
      response,
      events: [], // Will be populated by aggregator
      timestamp: Date.now()
    };
  }
}

/**
 * Creates a Perplexity service instance
 */
export function createPerplexityService(apiKey?: string): PerplexityService | null {
  if (!apiKey) {
    return null;
  }
  return new PerplexityService(apiKey);
}
