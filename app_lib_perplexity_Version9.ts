import { EventData, PerplexityResult, QueryOptions } from './types';
import { getCityWebsitesForCategories, getHotCity } from './hotCityStore';
import {
  EVENT_CATEGORIES,
  buildCategoryListForPrompt,
  allowedCategoriesForSchema
} from './eventCategories';

export class PerplexityService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.perplexity.ai/chat/completions';
  private readonly batchSize = 3;
  private readonly delayBetweenBatches = 1000;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async buildCategoryPrompt(city: string, date: string, category: string): Promise<string> {
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

    if (cityWebsites.length > 0) {
      websiteSection += `
- PRIORITY SOURCES for ${city}:`;
      cityWebsites.forEach(website => {
        websiteSection += `\n  * ${website.name} (${website.url})${website.description ? ' - ' + website.description : ''}`;
      });
    }

    let customQuerySection = '';
    if (hotCity?.defaultSearchQuery) {
      customQuerySection = `\nCustom search context for ${city}: ${hotCity.defaultSearchQuery}`;
    }

    const allowed = allowedCategoriesForSchema();

    return `
IMPORTANT: Search for comprehensive ${category} events in ${city} on ${date} across multiple sources.
WICHTIG: Suche nach allen ${category}-Veranstaltungen und Events in ${city} am ${date}.${customQuerySection}
Use ONLY the exact main category string for 'category'. Subtypes go into 'eventType'.

MANDATORY JSON FORMAT: Return ONLY a valid JSON array with NO explanations, markdown, or code blocks. 
Each event object must include these EXACT fields:

{
  "title": "string - event name",
  "date": "string - YYYY-MM-DD format", 
  "time": "string - HH:MM format (optional)",
  "endTime": "string - HH:MM format (optional)",
  "venue": "string - venue name",
  "address": "string - complete address as 'Street Number, ZIP City, Country' (optional)",
  "category": "string - ${category}",
  "eventType": "string - specific subcategory (optional)",
  "price": "string - entry cost (optional)",
  "ticketPrice": "string - ticket cost (optional)",
  "ageRestrictions": "string - age requirements (optional)",
  "description": "string - brief description (optional)",
  "website": "string - event URL",
  "bookingLink": "string - ticket URL (optional)"
}

Valid categories (only output EXACT one of these in 'category'): ${allowed}
${websiteSection}

Return ONLY a valid JSON array with NO explanations, markdown, or code blocks. 
If no events found, return: []
`;
  }

  private buildGeneralPrompt(city: string, date: string): string {
    const list = buildCategoryListForPrompt();
    const allowed = allowedCategoriesForSchema();

    return `
IMPORTANT: Search for comprehensive events in ${city} on ${date} across ALL these categories:

${list}

Category guidance: Each main category implicitly includes its typical subtypes (e.g. DJ Sets/Electronic → Techno, House, Trance; Live-Konzerte → Rock, Pop, Jazz; Open Air → Festivals, Street Festivals). Always output ONLY the exact main category name in the 'category' field. Put finer subtype detail into 'eventType'.

REQUIRED: Return ONLY a valid JSON array of event objects. Do not include any explanatory text, markdown formatting, code fences, or additional content.

Each event object must have these exact field names:
{
  "title": "string - event name",
  "date": "string - YYYY-MM-DD format", 
  "time": "string - HH:MM format (optional)",
  "endTime": "string - HH:MM format (optional)",
  "venue": "string - venue name",
  "address": "string - full address like 'Straße Hausnr, PLZ Stadt, Land' (optional)",
  "category": "string - must be one of: ${allowed}",
  "eventType": "string - specific event type (optional)",
  "price": "string - entry price (optional)", 
  "ticketPrice": "string - ticket price (optional)",
  "ageRestrictions": "string - age requirements (optional)",
  "description": "string - short description (optional)",
  "website": "string - event website URL",
  "bookingLink": "string - ticket booking URL (optional)"
}
Return ONLY a valid JSON array with NO explanations, markdown, or code blocks. 
if no events found: []
`;
  }

  private async createQueries(city: string, date: string, categories?: string[]): Promise<string[]> {
    if (!categories || categories.length === 0) {
      return [this.buildGeneralPrompt(city, date)];
    }

    const queries: string[] = [];
    for (const category of categories) {
      const mainCategory = EVENT_CATEGORIES.find(c => c.toLowerCase() === category.toLowerCase()) || category;
      const prompt = await this.buildCategoryPrompt(city, date, mainCategory);
      queries.push(prompt);
    }

    return queries;
  }

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
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options?.max_tokens || 20000,
            temperature: options?.temperature || 0.2,
            stream: false
          }),
          signal
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
      } catch (error: any) {
        lastError = error;
        if (attempt === 0 && String(error).includes('not valid JSON')) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        throw error;
      }
    }

    throw lastError || new Error('Unknown error');
  }

  async executeMultiQuery(
    city: string, 
    date: string, 
    categories?: string[], 
    options?: QueryOptions
  ): Promise<PerplexityResult[]> {
    const queries = await this.createQueries(city, date, categories);
    const results: PerplexityResult[] = [];
    
    const rawTimeout = typeof options?.categoryTimeoutMs === 'number' ? options.categoryTimeoutMs : 90000;
    const timeoutMs = Math.max(rawTimeout, 60000);

    console.log(`Using category timeout: ${timeoutMs}ms (requested: ${rawTimeout}ms)`);

    for (let i = 0; i < queries.length; i += this.batchSize) {
      const batch = queries.slice(i, i + this.batchSize);
      const batchPromises = batch.map(async (query) => this.executeQueryWithRetry(query, options, 3, timeoutMs));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      if (i + this.batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenBatches));
      }
    }

    return results;
  }

  private async executeQueryWithRetry(
    query: string,
    options?: QueryOptions,
    maxRetries = 3,
    timeoutMs = 90000
  ): Promise<PerplexityResult> {
    let lastError: Error | null = null;
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
            events: [],
            timestamp: Date.now()
          };
        } catch (error: any) {
          lastError = error;
          if (controller.signal.aborted) {
            throw new Error(`Query timed out after ${timeoutMs}ms`);
          }
          console.error(`Query attempt ${attempt + 1}/${maxRetries} failed:`, error.message);
          if (attempt < maxRetries - 1) {
            const delay = 500 * Math.pow(2, attempt);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }

    console.error(`All ${maxRetries} attempts failed for query.`);
    return {
      query,
      response: `Error after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      events: [],
      timestamp: Date.now()
    };
  }

  async executeSingleQuery(city: string, date: string, options?: QueryOptions): Promise<PerplexityResult> {
    const prompt = this.buildGeneralPrompt(city, date);
    const response = await this.callPerplexity(prompt, options);
    return {
      query: prompt,
      response,
      events: [],
      timestamp: Date.now()
    };
  }
}

export function createPerplexityService(apiKey?: string): PerplexityService | null {
  if (!apiKey) return null;
  return new PerplexityService(apiKey);
}