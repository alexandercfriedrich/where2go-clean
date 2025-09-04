// Perplexity API integration with multi-query support and rate limiting

import { EventData, PerplexityResult, QueryOptions } from './types';
import { getCityWebsitesForCategories, getHotCity } from './hotCityStore';

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
   * Makes a single API call to Perplexity
   */
  private async callPerplexity(prompt: string, options?: QueryOptions, retries = 2, signal?: AbortSignal): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const requestBody = {
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
        };

        console.log(`🔄 Perplexity API call attempt ${attempt + 1}/${retries}:`);
        console.log(`   Model: ${requestBody.model}`);
        console.log(`   Max tokens: ${requestBody.max_tokens}`);
        console.log(`   Temperature: ${requestBody.temperature}`);
        console.log(`   Prompt length: ${prompt.length} chars`);

        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal // Use AbortSignal for timeout handling
        });

        console.log(`📡 Perplexity API response:`);
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   OK: ${response.ok}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Perplexity API error response:`, errorText);
          throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';
        
        console.log(`✅ Perplexity API success:`);
        console.log(`   Response length: ${content.length} chars`);
        console.log(`   Usage:`, data.usage || 'No usage info');
        
        return content;
      } catch (error: any) {
        lastError = error;
        console.error(`❌ Perplexity API call attempt ${attempt + 1} failed:`, {
          name: error.name,
          message: error.message,
          code: error.code,
          cause: error.cause
        });
        
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
 * Creates a Perplexity service instance with validation
 */
export function createPerplexityService(apiKey?: string): PerplexityService | null {
  if (!apiKey) {
    console.error('❌ Perplexity API key is missing');
    return null;
  }
  
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    console.error('❌ Perplexity API key is invalid (empty or not a string)');
    return null;
  }
  
  if (!apiKey.startsWith('pplx-')) {
    console.error('❌ Perplexity API key format is invalid (should start with pplx-)');
    return null;
  }
  
  try {
    return new PerplexityService(apiKey.trim());
  } catch (error) {
    console.error('❌ Failed to create Perplexity service:', error);
    return null;
  }
}
