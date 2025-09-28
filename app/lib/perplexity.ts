import { EVENT_CATEGORIES, normalizeCategory, mapToMainCategories, buildExpandedCategoryContext, buildCategoryListForPrompt, allowedCategoriesForSchema } from '@/lib/eventCategories';

export interface PerplexityResult {
  query: string;
  response: string;
  events: any[];
  timestamp: number;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      LOG_PPLX_QUERIES?: string;
      LOG_PPLX_VERBOSE?: string;
      [key: string]: string | undefined;
    }
  }
}

interface PerplexityOptions {
  temperature?: number;
  max_tokens?: number;
  debug?: boolean;
  disableCache?: boolean;
  expandedSubcategories?: boolean;
  forceAllCategories?: boolean;
  hotCity?:  any;
  additionalSources?: any[];
  debugVerbose?: boolean;
  categoryConcurrency?: number;
  enhancedSearch?: boolean;
  fallbackEnabled?: boolean;
  diversityBoost?: boolean;
}

interface PplxApiRequest {
  model: string;
  messages: { role: 'system' | 'user'; content: string }[];
  max_tokens?: number;
  temperature?: number;
}

export function createPerplexityService(apiKey: string) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new Error('Perplexity API key is required and must be a non-empty string.');
  }

  const baseUrl = 'https://api.perplexity.ai/chat/completions';
  const model = 'sonar-pro';

  async function call(prompt: string, options: PerplexityOptions): Promise<string> {
    const body: PplxApiRequest = {
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(options) },
        { role: 'user', content: prompt }
      ],
      max_tokens: options.max_tokens || 40000, // Erhöht von 30000
      temperature: options.temperature ?? 0.1  // Reduziert von 0.2
    };

    const t0 = Date.now();

    if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
      console.log('[PPLX:REQUEST:SHORT]', {
        model,
        promptLen: prompt.length,
        max_tokens: body.max_tokens,
        temperature: body.temperature
      });
    }
    if (options.debugVerbose || process.env.LOG_PPLX_VERBOSE === '1') {
      console.log('[PPLX:REQUEST:FULL]', { model, body });
    }

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const dt = Date.now() - t0;

    if (!res.ok) {
      const txt = await res.text();
      console.error('[PPLX:ERROR]', {
        status: res.status,
        dtMs: dt,
        textFirst400: txt.slice(0, 400)
      });
      throw new Error(`Perplexity API error ${res.status}: ${txt}`);
    }

    const data = await res.json();

    if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
      console.log('[PPLX:RESPONSE:SHORT]', {
        dtMs: dt,
        hasChoices: !!data?.choices?.length,
        contentLen: data?.choices?.[0]?.message?.content?.length ?? 0
      });
    }
    if (options.debugVerbose || process.env.LOG_PPLX_VERBOSE === '1') {
      console.log('[PPLX:RESPONSE:FULL]', { dtMs: dt, raw: data });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content returned from Perplexity');
    return content;
  }

  function buildSystemPrompt(options: PerplexityOptions): string {
    const enhancedInstructions = options.enhancedSearch ? `
ENHANCED SEARCH INSTRUCTIONS:
- Search multiple sources: official websites, ticketing platforms, social media, venue calendars
- Include both mainstream and alternative/underground events
- Look for community events, pop-ups, and temporary venues
- Check university calendars, cultural centers, and local communities
- Consider events in surrounding areas/districts of the city
- Include events from different price ranges (free, budget, premium)
- Diversify venue types: clubs, theaters, galleries, outdoor spaces, private venues
- Search in multiple languages if applicable
` : '';

    return `You are an advanced event search specialist with access to real-time web data. 
${enhancedInstructions}

Your task is to find ALL available events, prioritizing completeness and diversity.

SEARCH STRATEGY:
1. Official city/tourism websites and event calendars
2. Major ticketing platforms (Eventbrite, local ticket vendors)
3. Venue websites and social media pages
4. Community groups and local Facebook pages
5. Cultural institutions and universities
6. Alternative and underground event sources

CONTENT REQUIREMENTS:
Return as many different real events as possible, spanning multiple:
- Venues (mix of well-known and lesser-known locations)
- Price levels (free events to premium experiences)  
- Event types within each category
- Neighborhoods/districts within the city

Allowed main categories:
${buildCategoryListForPrompt()}

REQUIRED FIELDS:
title, category, date, time, venue, price, website, endTime, address, ticketPrice, eventType, description, bookingLink, ageRestrictions

STRICT RULES:
- "category" must be EXACTLY one of: ${allowedCategoriesForSchema()}
- Provide real, verifiable events only
- Include specific venue names and addresses when possible
- Add booking/ticket links when available
- If price unknown: use empty string, not "varies" or "TBD"
- Ensure geographical accuracy - events must be in or near the specified city
- Diversify subcategories within main categories
- Return ONLY the JSON array (No explanatory text outside the JSON structure)

QUALITY STANDARDS:
- Minimum 5-15 events per category when available
- Balance between popular and niche events
- Include both recurring and one-time events
- Verify event dates match the requested date`;
  }

  function buildGeneralPrompt(city: string, date: string): string {
    return `Search for ALL available events happening in and around ${city} on ${date}.

COMPREHENSIVE SEARCH TARGETS:
- Official city event calendars and tourism sites
- Major venues: theaters, concert halls, clubs, galleries, sports venues
- Ticketing platforms and event aggregators
- Cultural institutions: museums, universities, community centers
- Social media events and community groups
- Pop-up events and alternative venues
- Surrounding districts and nearby areas

Include events from ALL categories and price ranges.
Prioritize event diversity and completeness.

Return ONLY the JSON array (No explanatory text outside the JSON structure).
Include as many different real events as possible.`;
  }

  function buildCategoryPrompt(
    city: string,
    date: string,
    mainCategory: string,
    options: PerplexityOptions
  ): string {
    const expanded = options.expandedSubcategories !== false;
    const enhancedSearch = options.enhancedSearch === true;
    const diversityBoost = options.diversityBoost === true;

    const categoryContext = expanded
      ? buildExpandedCategoryContext(mainCategory)
      : `Main Category: ${mainCategory}\n(Subcategory expansion disabled)`;

    const enhancedInstructions = enhancedSearch ? `
ENHANCED SEARCH STRATEGY for ${mainCategory}:
- Search venue-specific websites and social media
- Check local Facebook groups and community pages  
- Look for both established and pop-up venues
- Include events in surrounding neighborhoods
- Search in local language + English
- Check university and cultural center calendars
- Look for both ticketed and free events
- Include recurring weekly/monthly events on this date
` : '';

    const diversityInstructions = diversityBoost ? `
DIVERSITY REQUIREMENTS:
- Find events across different price ranges (€0 to €100+)
- Include various venue sizes (intimate to large-scale)
- Mix of well-known and hidden gem locations
- Different subcategories within ${mainCategory}
- Events for different age groups and audiences
- Both early and late events if applicable
` : '';

    const fallbackStrategy = options.fallbackEnabled ? `
FALLBACK STRATEGY:
If few events found for exact date, also search:
- Events starting/ending on adjacent dates in ${city}
- Regular weekly events that occur on this day
- Multi-day events that include ${date}
- Similar events in nearby cities/districts
` : '';

    return `${categoryContext}
${enhancedInstructions}
${diversityInstructions}
${fallbackStrategy}

SPECIFIC SEARCH TASK:
Find a comprehensive list of ALL real events in and around ${city} on ${date} for category: ${mainCategory}

SEARCH TARGETS:
1. Official venue websites and calendars for ${mainCategory}
2. Local ticketing platforms and event listings
3. Social media event pages and community groups
4. Cultural institutions and specialized venues
5. Alternative and underground event sources
6. Local newspapers and event magazines

QUALITY TARGETS:
- Minimum 8-20 events if available in this category
- Include both popular and niche events
- Provide complete venue addresses when possible
- Add direct booking/ticket links
- Ensure price accuracy (use empty string if unknown)

OUTPUT FORMAT:
Return ONLY a valid JSON array of events (No explanatory text outside the JSON structure).
Each event must have category exactly as: "${mainCategory}"

Example structure:
{"title":"Event Name","category":"${mainCategory}","date":"${date}","time":"20:00","venue":"Venue Name","address":"Full Address","price":"15 EUR","website":"https://...","bookingLink":"https://...","description":"Event details"}`;
  }

  async function executeMultiQuery(
    city: string,
    date: string,
    categories: string[],
    options: PerplexityOptions = {}
  ): Promise<PerplexityResult[]> {
    let effectiveCategories: string[];

    if (options.forceAllCategories) {
      effectiveCategories = EVENT_CATEGORIES;
    } else {
      effectiveCategories = mapToMainCategories(categories);
    }

    if (effectiveCategories.length === 0) {
      const prompt = buildGeneralPrompt(city, date);
      if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
        console.log('[PPLX:GENERAL]', { city, date, promptLen: prompt.length });
      }
      const response = await call(prompt, options);
      return [{
        query: prompt,
        response,
        events: [],
        timestamp: Date.now()
      }];
    }

    const results: PerplexityResult[] = [];
    const cc = Math.max(1, options.categoryConcurrency ?? 5); // Erhöht von 3 auf 5

    console.log(`[ENHANCED-PPLX] Starting search with concurrency ${cc} for ${effectiveCategories.length} categories`);

    // Sequential path
    if (cc === 1) {
      for (const cat of effectiveCategories) {
        const prompt = buildCategoryPrompt(city, date, cat, options);
        if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
          console.log(`[PPLX:QUERY][${cat}] len=${prompt.length}`);
        }
        
        let response: string;
        let attempts = 0;
        const maxAttempts = options.fallbackEnabled ? 2 : 1;
        
        while (attempts < maxAttempts) {
          try {
            response = await call(prompt, { ...options, temperature: options.temperature ?? (0.1 + attempts * 0.1) });
            break;
          } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) throw error;
            console.log(`[PPLX:RETRY][${cat}] Attempt ${attempts + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // Exponential backoff
          }
        }
        
        results.push({
          query: prompt,
          response: response!,
          events: [],
          timestamp: Date.now()
        });
      }
      return results;
    }

    // Parallel worker pool with enhanced error handling
    let idx = 0;
    const errors: any[] = [];
    
    async function worker() {
      while (idx < effectiveCategories.length) {
        const my = idx++;
        const cat = effectiveCategories[my];
        if (!cat) break;
        
        try {
          const prompt = buildCategoryPrompt(city, date, cat, options);
          if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
            console.log(`[PPLX:QUERY][${cat}] len=${prompt.length}`);
          }
          
          let response: string;
          let attempts = 0;
          const maxAttempts = options.fallbackEnabled ? 2 : 1;
          
          while (attempts < maxAttempts) {
            try {
              response = await call(prompt, { ...options, temperature: options.temperature ?? (0.1 + attempts * 0.1) });
              break;
            } catch (error) {
              attempts++;
              if (attempts >= maxAttempts) throw error;
              console.log(`[PPLX:RETRY][${cat}] Attempt ${attempts + 1}/${maxAttempts}`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
          
          results.push({
            query: prompt,
            response: response!,
            events: [],
            timestamp: Date.now()
          });
          
          console.log(`[PPLX:SUCCESS][${cat}] Completed successfully`);
          
        } catch (error) {
          console.error(`[PPLX:ERROR][${cat}]`, error);
          errors.push({ category: cat, error });
          
          // Continue with other categories even if one fails
          if (options.fallbackEnabled) {
            results.push({
              query: `Fallback search for ${cat} in ${city} on ${date}`,
              response: '[]', // Empty result for failed category
              events: [],
              timestamp: Date.now()
            });
          }
        }
      }
    }

    await Promise.all(Array.from({ length: cc }).map(() => worker()));
    
    if (errors.length > 0 && options.debug) {
      console.log(`[PPLX:ERRORS] ${errors.length} categories failed:`, errors);
    }
    
    console.log(`[ENHANCED-PPLX] Completed ${results.length} queries with ${errors.length} errors`);
    return results;
  }

  return {
    executeMultiQuery
  };
}

// Export type for testing  
export type PerplexityService = ReturnType<typeof createPerplexityService>;
