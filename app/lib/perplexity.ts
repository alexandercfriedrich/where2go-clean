// Perplexity API integration with multi-query support and rate limiting

import { EventData, PerplexityResult, QueryOptions } from './types';
import { getCityWebsitesForCategories, getHotCity } from './hotCityStore';
import { EVENT_CATEGORIES, buildCategoryListForPrompt, allowedCategoriesForSchema } from './eventCategories';

export class PerplexityService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.perplexity.ai/chat/completions';
  private readonly batchSize = 3;
  private readonly delayBetweenBatches = 1000; // 1 second

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Builds a query prompt for a specific category with strict JSON schema
   * Made public for testing purposes
   */
  public buildCategoryPrompt(city: string, date: string, category: string): string {
    // Get hot city configuration and specific websites (simplified for testing)
    let websiteSection = `
Search multiple sources including:
- Local event platforms for ${city}
- Official venue websites and social media  
- ${city} tourism and culture sites
- Ticketing platforms active in ${city}
- Entertainment and nightlife directories of ${city}
- Category-specific platforms for ${category}`;

    return `
IMPORTANT: Search for comprehensive ${category} events in ${city} on ${date} across multiple sources.
WICHTIG: Suche nach allen ${category}-Veranstaltungen und Events in ${city} am ${date}.

MANDATORY JSON FORMAT: Return ONLY a valid JSON array with NO explanations, markdown, or code blocks. 
Do not include any explanatory text, markdown formatting, code fences, or additional content.
Antworte NUR mit gültigem JSON Array, kein Fließtext, kein Markdown.

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
  \"bookingLink\": \"string - ticket booking URL (optional)\"
}
${websiteSection}

Return ONLY a valid JSON array with NO explanations, markdown, or code blocks. 
If no events are found, return: []
Falls keine Events gefunden: []

`;
  }

  /**
   * Builds a query prompt for a specific category with full async hot city support
   * This is the version used in production
   */
  private async buildCategoryPromptAsync(city: string, date: string, category: string): Promise<string> {
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

Return ONLY a valid JSON array with NO explanations, markdown, or code blocks. 
If no events found, return: []

`;
  }

  /**
   * Builds a general query prompt with strict JSON schema using all 20 canonical categories
   */
  private buildGeneralPrompt(city: string, date: string): string {
    const categoryList = buildCategoryListForPrompt();
    const allowedCategories = allowedCategoriesForSchema();
    
    return `
IMPORTANT: Search for comprehensive events in ${city} on ${date} across ALL these categories:
WICHTIG: Suche nach allen Events in ${city} am ${date} in ALLEN folgenden Kategorien:

${categoryList}

MANDATORY JSON FORMAT: Return ONLY a valid JSON array with NO explanations, markdown, or code blocks.
OBLIGATORISCHES JSON FORMAT: Antworte AUSSCHLIESSLICH mit gültigem JSON Array, kein Fließtext, kein Markdown.

Do not include any explanatory text, markdown formatting, code fences, or additional content.

Each event object must include these EXACT fields:
Jedes Event-Objekt muss diese EXAKTEN Felder enthalten:

{
  "title": "string - event name",
  "date": "string - YYYY-MM-DD format", 
  "time": "string - HH:MM format (optional)",
  "endTime": "string - HH:MM format (optional)",
  "venue": "string - venue name",
  "address": "string - complete address as 'Street Number, ZIP City, Country' (optional)",
  "category": "string - must be one of: ${allowedCategories}",
  "eventType": "string - specific subcategory (optional)",
  "price": "string - entry cost (optional)",
  "ticketPrice": "string - ticket cost (optional)",
  "ageRestrictions": "string - age requirements (optional)",
  "description": "string - brief description (optional)",
  "website": "string - event URL",
  "bookingLink": "string - ticket URL (optional)"
}

Return ONLY a valid JSON array with NO explanations, markdown, or code blocks. 
If no events are found, return: []
Falls keine Events gefunden: []
`;
  }

  /**
   * Creates query prompts based on categories or uses general prompt
   */
  private async createQueries(city: string, date: string, categories?: string[]): Promise<string[]> {
    if (!categories || categories.length === 0) {
      // Use the general query with all 20 canonical categories
      return [this.buildGeneralPrompt(city, date)];
    }

    // Create specific queries for each provided category (already expected to be canonical main categories)
    const queries: string[] = [];
    for (const category of categories) {
      // Use the canonical category name directly - no mapping needed
      // Categories passed here should already be the canonical main category names
      const prompt = await this.buildCategoryPromptAsync(city, date, category);
      queries.push(prompt);
    }

    return queries;
  }

  /**
   * Makes a single API call to Perplexity
   */
  private async callPerplexity(prompt: string, options?: QueryOptions, retries = 2, signal?: AbortSignal): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
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
          signal // Use AbortSignal for timeout handling
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
      } catch (error: any) {
        lastError = error;
        if (attempt === 0 && String(error).includes('not valid JSON')) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Executes multiple queries with rate limiting and category-level retry
   */
  async executeMultiQuery(
    city: string, 
    date: string, 
    categories?: string[], 
    options?: QueryOptions
  ): Promise<PerplexityResult[]> {
    const queries = await this.createQueries(city, date, categories);
    const results: PerplexityResult[] = [];
    
    // Extract timeout from options, ensure minimum of 60s, default to 90s
    const rawTimeout = typeof options?.categoryTimeoutMs === 'number' ? 
      options.categoryTimeoutMs : 90000;
    const timeoutMs = Math.max(rawTimeout, 60000); // Enforce minimum 60s

    console.log(`Using category timeout: ${timeoutMs}ms (requested: ${rawTimeout}ms)`);

    // Process queries in batches with rate limiting
    for (let i = 0; i < queries.length; i += this.batchSize) {
      const batch = queries.slice(i, i + this.batchSize);
      
      // Execute batch in parallel with category-level retry and timeout
      const batchPromises = batch.map(async (query) => {
        return await this.executeQueryWithRetry(query, options, 3, timeoutMs);
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Delay between batches (except for the last batch)
      if (i + this.batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }

    return results;
  }

  /**
   * Executes a single query with exponential backoff retry and timeout support
   */
  private async executeQueryWithRetry(
    query: string,
    options?: QueryOptions,
    maxRetries = 3,
    timeoutMs = 90000
  ): Promise<PerplexityResult> {
    let lastError: Error | null = null;
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await this.callPerplexity(query, options, 2, controller.signal);
          clearTimeout(timeoutId);
          return {
            query,
            response,
            events: [], // Will be populated by aggregator
            timestamp: Date.now()
          };
        } catch (error: any) {
          lastError = error;
          
          // If aborted due to timeout, don't retry
          if (controller.signal.aborted) {
            throw new Error(`Query timed out after ${timeoutMs}ms`);
          }
          
          console.error(`Query attempt ${attempt + 1}/${maxRetries} failed for query:`, query.substring(0, 100) + '...', error.message);
          
          // Don't retry on last attempt
          if (attempt < maxRetries - 1) {
            // Exponential backoff: 500ms -> 1000ms -> 2000ms
            const delay = 500 * Math.pow(2, attempt);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // If all retries failed, return error result
    console.error(`All ${maxRetries} attempts failed for query:`, query.substring(0, 100) + '...');
    return {
      query,
      response: `Error after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
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
