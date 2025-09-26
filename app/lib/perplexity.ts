// Perplexity AI service abstraction (enhanced version with debug + optional concurrency)
//
// Features:
// - Per-category prompting (general fallback if no categories)
// - Expanded subcategory context
// - Optional parallel querying via categoryConcurrency
// - Structured debug + verbose logging controlled by:
//     options.debug / ?debug=1  or env LOG_PPLX_QUERIES=1  (short logs)
//     options.debugVerbose      or env LOG_PPLX_VERBOSE=1  (full payload logs)
// - Minimal patch applied: removed duplicate post-loop call in worker
//
// Notes:
// - Parallel execution order in results array is NOT guaranteed when categoryConcurrency > 1
//   (kept intentionally simple per "minimal patch" request).
// - If deterministic ordering is later needed, capture index and sort before return.

import {
  EVENT_CATEGORIES,
  buildExpandedCategoryContext,
  buildCategoryListForPrompt,
  allowedCategoriesForSchema,
  mapToMainCategories
} from './eventCategories';
import { PerplexityResult } from './types';

// Declare process for Node.js environment variables
declare const process: {
  env: {
    LOG_PPLX_QUERIES?: string;
    LOG_PPLX_VERBOSE?: string;
    [key: string]: string | undefined;
  };
};

interface PerplexityOptions {
  temperature?: number;
  max_tokens?: number;
  debug?: boolean;
  disableCache?: boolean;
  expandedSubcategories?: boolean;
  forceAllCategories?: boolean;
  hotCity?: any;
  additionalSources?: any[];
  debugVerbose?: boolean;
  categoryConcurrency?: number;
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
      max_tokens: options.max_tokens || 30000,
      temperature: options.temperature ?? 0.2
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
    return `You are an event search specialist. Respond exclusively in JSON format and ensure all available information is returned in a structured manner.
Return as many as possible different real events, spanning as many unique categories and price levels as possible.
Allowed main categories:
${buildCategoryListForPrompt()}

Fields:
title, category, date, time, venue, price, website,
endTime, address, ticketPrice, eventType, description,
bookingLink, ageRestrictions

Rules:
- "category" must be EXACTLY one of: ${allowedCategoriesForSchema()}
- If price unknown: use empty string
- Provide diversity (venues, price levels, sub-genres)
- Avoid duplicates
- Return ONLY the JSON array (No explanatory text outside the JSON structure).`;
  }

  function buildGeneralPrompt(city: string, date: string): string {
    return `Search for ALL available events in ${city} on ${date}.
Return ONLY the JSON array (No explanatory text outside the JSON structure).
Include multiple main categories if possible.`;
  }

  function buildCategoryPrompt(
    city: string,
    date: string,
    mainCategory: string,
    options: PerplexityOptions
  ): string {
    const expanded = options.expandedSubcategories !== false;

    const categoryContext = expanded
      ? buildExpandedCategoryContext(mainCategory)
      : `Main Category: ${mainCategory}\n(Subcategory expansion disabled)`;

    const hotCityPart = options.hotCity
      ? `City Profile:
Name: ${options.hotCity.name}
\n`

    return `${categoryContext}

Task:
1. return a comprehensive list of all real events happening in ${city} on ${date} for category: ${mainCategory}
2. Use subcategory diversity within the main category: 
3. Include booking/ticket links where available

Output:
Return ONLY the valid JSON array of real events (No explanatory text outside the JSON structure!).

Example minimal object:
{"title":"Example","category":"${mainCategory}","date":"${date}","venue":"Example Venue","price":"","website":""}`;
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
    const cc = Math.max(1, options.categoryConcurrency ?? 1);

    // Sequential path
    if (cc === 1) {
      for (const cat of effectiveCategories) {
        const prompt = buildCategoryPrompt(city, date, cat, options);
        if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
          console.log(`[PPLX:QUERY][${cat}] len=${prompt.length}`);
        }
        const response = await call(prompt, options);
        results.push({
          query: prompt,
          response,
          events: [],
          timestamp: Date.now()
        });
      }
      return results;
    }

    // Parallel worker pool (order not guaranteed)
    let idx = 0;
    async function worker() {
      while (idx < effectiveCategories.length) {
        const my = idx++;
        const cat = effectiveCategories[my];
        if (!cat) break;
        const prompt = buildCategoryPrompt(city, date, cat, options);
        if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
          console.log(`[PPLX:QUERY][${cat}] len=${prompt.length}`);
        }
        const response = await call(prompt, options);
        results.push({
          query: prompt,
          response,
          events: [],
          timestamp: Date.now()
        });
      }
    }

    await Promise.all(Array.from({ length: cc }).map(() => worker()));
    return results;
  }

  return {
    executeMultiQuery
  };
}

// Export type for testing
export type PerplexityService = ReturnType<typeof createPerplexityService>;
