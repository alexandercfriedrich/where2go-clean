// Perplexity AI service abstraction (Phase 2B enhanced)
// Adds: expanded subcategory prompts, per-category query logging, optional all-categories expansion,
// API key validation and safer options handling. (Build fix: ensure PerplexityResult includes events & timestamp)

import {
  EVENT_CATEGORIES,
  buildExpandedCategoryContext,
  buildCategoryListForPrompt,
  allowedCategoriesForSchema,
  mapToMainCategories
} from './eventCategories';
import { PerplexityResult } from './types';

interface PerplexityOptions {
  temperature?: number;
  max_tokens?: number;
  debug?: boolean;
  disableCache?: boolean;
  expandedSubcategories?: boolean;
  forceAllCategories?: boolean;
  minEventsPerCategory?: number;
  hotCity?: any;
  additionalSources?: any[];

  // NEU: ausführliches Logging + parallele Verarbeitung
  debugVerbose?: boolean;
  categoryConcurrency?: number; // Anzahl Kategorien parallel (1 = sequenziell)
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
  const model = 'sonar';

  async function call(prompt: string, options: PerplexityOptions): Promise<string> {
    const body: PplxApiRequest = {
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(options) },
        { role: 'user', content: prompt }
      ],
      max_tokens: options.max_tokens || 5000,
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
      // Vollständiger Request inkl. System-/User-Messages
      console.log('[PPLX:REQUEST:FULL]', {
        model,
        body
      });
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
      console.error('[PPLX:ERROR]', { status: res.status, dtMs: dt, textFirst400: txt.slice(0, 400) });
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
      // Vorsicht: groß – Vercel Log-Limits beachten
      console.log('[PPLX:RESPONSE:FULL]', {
        dtMs: dt,
        raw: data
      });
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content returned from Perplexity');
    return content;
  }

  function buildSystemPrompt(options: PerplexityOptions): string {
    return `You are an event search specialist. Respond exclusively in JSON format and ensure all available information is returned in a structured manner.

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
    const minEvents = options.minEventsPerCategory ?? 12;

    const categoryContext = expanded
      ? buildExpandedCategoryContext(mainCategory)
      : `Main Category: ${mainCategory}\n(Subcategory expansion disabled)`;

    const hotCityPart = options.hotCity
      ? `City Profile:
Name: ${options.hotCity.name}
Known For: ${options.hotCity.keywords?.join(', ') || 'n/a'}\n`
      : '';

    const additionalSources = (options.additionalSources || [])
      .map((s: any) => `- ${s.name || s.url || JSON.stringify(s).slice(0, 60)}`)
      .join('\n');

    const sourcesBlock = additionalSources
      ? `Candidate local sources:\n${additionalSources}\n`
      : '';

    return `${hotCityPart}${sourcesBlock}${categoryContext}

City: ${city}
Target Date: ${date}

Task:
1. Produce at least ${minEvents} well-sourced events (use subcategory diversity).
2. If insufficient confirmed events: include plausible ones with description "Plausible/Unverified".
3. Include booking/ticket links where obvious.

Output:
ONLY a JSON array of event objects.

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

    // Fallback to general prompt if nothing remains
    if (effectiveCategories.length === 0) {
      const prompt = buildGeneralPrompt(city, date);
      if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
        console.log('[PPLX:GENERAL]', { city, date, promptLen: prompt.length });
      }
      const response = await call(prompt, options);
      return [{
        query: prompt,
        response,
        events: [],           // build-fix: satisfy PerplexityResult
        timestamp: Date.now() // build-fix
      }];
    }

    const results: PerplexityResult[] = [];

    // Parallele Verarbeitung nach categoryConcurrency
    const cc = Math.max(1, options.categoryConcurrency ?? 1);
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
          events: [],            // aggregator will parse from response
          timestamp: Date.now()
        });
      }
      return results;
    }

    // einfacher Worker-Pool
    let idx = 0;
    async function worker() {
      while (idx < effectiveCategories.length) {
        const my = idx++;
        const cat = effectiveCategories[my];
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