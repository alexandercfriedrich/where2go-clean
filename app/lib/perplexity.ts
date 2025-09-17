// Perplexity AI service abstraction (Phase 2B enhanced)
// Adds: expanded subcategory prompts, per-category query logging, optional all-categories expansion.

import { EVENT_CATEGORIES, buildExpandedCategoryContext, buildCategoryListForPrompt, allowedCategoriesForSchema, mapToMainCategories } from './eventCategories';
import { PerplexityResult } from './types';

interface PerplexityOptions {
  temperature?: number;
  max_tokens?: number;
  debug?: boolean;
  disableCache?: boolean;
  expandedSubcategories?: boolean;  // NEW
  forceAllCategories?: boolean;     // NEW
  minEventsPerCategory?: number;    // NEW (guideline only)
  hotCity?: any;
  additionalSources?: any[];
}

interface PplxApiRequest {
  model: string;
  messages: { role: 'system' | 'user'; content: string }[];
  max_tokens?: number;
  temperature?: number;
}

export function createPerplexityService(apiKey: string) {
  const baseUrl = 'https://api.perplexity.ai/chat/completions';
  const model = 'sonar'; // adjust if needed

  async function call(prompt: string, options: PerplexityOptions): Promise<string> {
    const body: PplxApiRequest = {
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(options) },
        { role: 'user', content: prompt }
      ],
      max_tokens: options.max_tokens || 4000,
      temperature: options.temperature ?? 0.2
    };

    if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
      console.log('[PPLX:REQUEST]', JSON.stringify({ promptSnippet: prompt.slice(0, 400), len: prompt.length }, null, 2));
    }

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Perplexity API error ${res.status}: ${txt}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content returned from Perplexity');
    return content;
  }

  function buildSystemPrompt(options: PerplexityOptions): string {
    const base = `You are an Event Discovery Intelligence Agent.
You MUST output ONLY a JSON array of event objects when requested.
Allowed main categories:
${buildCategoryListForPrompt()}

Schema fields (flexible):
title, category, date, time, venue, price, website, endTime, address, ticketPrice, eventType, description, bookingLink, ageRestrictions

Rules:
- category MUST be EXACT one of: ${allowedCategoriesForSchema()}
- Do NOT hallucinate prices; if unknown leave price empty.
- Provide diversity (genres, price ranges, venues).
- Avoid duplicates.

Return ONLY the JSON array; no explanation.`;
    return base;
  }

  function buildGeneralPrompt(city: string, date: string, options: PerplexityOptions): string {
    return `Find diverse events for ${city} on ${date}.
Return ONLY JSON array.
Include multiple categories.`;
  }

  function buildCategoryPrompt(city: string, date: string, mainCategory: string, options: PerplexityOptions): string {
    const expanded = options.expandedSubcategories !== false; // default true
    const minEvents = options.minEventsPerCategory ?? 12;

    const contextBlock = expanded
      ? buildExpandedCategoryContext(mainCategory)
      : `Main Category: ${mainCategory}
(Short mode: subcategory expansion disabled)`;

    const hotCityPart = options.hotCity
      ? `City Profile Context (hot city):
Name: ${options.hotCity.name}
Known For: ${options.hotCity.keywords?.join(', ') || 'n/a'}
`
      : '';

    const additionalSources = (options.additionalSources || [])
      .map((s: any) => `- ${s.name || s.url || JSON.stringify(s).slice(0,60)}`)
      .join('\n');

    const sourcesBlock = additionalSources
      ? `Candidate local sources (may scrape mentally / recall):
${additionalSources}\n`
      : '';

    return `${hotCityPart}${sourcesBlock}${contextBlock}

City: ${city}
Target Date: ${date}

Task:
1. Collect at least ${minEvents} high-quality events for the main category (mix from subcategories).
2. Ensure date relevance (exact date or clearly active that day).
3. If insufficient real events → include plausible but mark with "description": "Plausible/Unverified".
4. Include ticket/booking links where obvious.

Output:
Return ONLY a JSON array of event objects.

Example minimal object:
{"title":"Example","category":"${mainCategory}","date":"${date}","venue":"Example Venue","price":"","website":""}`;
  }

  async function executeMultiQuery(
    city: string,
    date: string,
    categories: string[],
    options: PerplexityOptions = {}
  ): Promise<PerplexityResult[]> {
    let effectiveCategories = categories;

    if (options.forceAllCategories) {
      effectiveCategories = EVENT_CATEGORIES;
    } else {
      effectiveCategories = mapToMainCategories(categories);
    }

    if (effectiveCategories.length === 0) {
      // fallback: if user gave only subcategories that collapsed → at least do general search
      effectiveCategories = [];
    }

    const results: PerplexityResult[] = [];

    if (effectiveCategories.length === 0) {
      const prompt = buildGeneralPrompt(city, date, options);
      const response = await call(prompt, options);
      results.push({ query: prompt, response });
      return results;
    }

    // Parallel with simple concurrency control (optional later)
    for (const cat of effectiveCategories) {
      const prompt = buildCategoryPrompt(city, date, cat, options);
      if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
        console.log(`[PPLX:QUERY][${cat}] length=${prompt.length}`);
      }
      const response = await call(prompt, options);
      results.push({ query: prompt, response });
    }

    return results;
  }

  return {
    executeMultiQuery
  };
}
