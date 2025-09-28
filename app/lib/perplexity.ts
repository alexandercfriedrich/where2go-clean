// Optimierte Perplexity AI service abstraction für maximale Event-Erfassung
//
// Hauptverbesserungen:
// - Erweiterte Suchstrategien mit mehreren Varianten
// - Bessere Quellenspezifikation
// - Erhöhte Token-Limits
// - Fallback-Mechanismen
// - Verbesserte Diversitätsanweisungen

import {
  EVENT_CATEGORIES,
  buildExpandedCategoryContext,
  buildCategoryListForPrompt,
  allowedCategoriesForSchema,
  mapToMainCategories
} from '@/lib/eventCategories';
import { PerplexityResult } from '@/lib/types';

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
        { role: 'system', content: buildOptimizedSystemPrompt(options) },
        { role: 'user', content: prompt }
      ],
      max_tokens: options.max_tokens || 40000, // Erhöht von 30000
      temperature: options.temperature ?? 0.1  // Reduziert für fokussiertere Ergebnisse
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

  function buildOptimizedSystemPrompt(options: PerplexityOptions): string {
    return `You are an expert event discovery specialist with access to real-time web data and local knowledge.

MISSION: Find the MAXIMUM number of real, current events. Leave no stone unturned.

SEARCH STRATEGY - Check ALL these source types:
✓ Official venue websites (theaters, concert halls, clubs, museums, galleries)
✓ Ticketing platforms (Eventbrite, Facebook Events, local ticket sites)
✓ Social media announcements (Instagram, Facebook, Twitter event posts)
✓ University and college calendars 
✓ Cultural institution websites and newsletters
✓ Local newspaper event sections and blogs
✓ Tourism board and city official websites
✓ Community Facebook groups and local forums
✓ Meetup groups and professional associations
✓ Restaurant/bar/cafe special events and live music
✓ Alternative and underground venue listings
✓ Festival and seasonal event calendars
✓ Corporate and business networking events
✓ Sports clubs and fitness center events
✓ Religious and community center activities

SEARCH VARIATIONS to maximize coverage:
- Use local language terms (German: "Veranstaltungen", "Events", "Was läuft")
- Check both formal event names and casual descriptions
- Look for recurring events (weekly, monthly series)
✓ Search neighborhood-specific venues
- Include events starting after the search date but announced for it
- Check last-minute event announcements
- Look for popup and temporary events

DIVERSITY REQUIREMENTS:
- Mix of free and paid events across all price ranges
- Include both mainstream and niche/alternative events  
- Cover different times of day (morning, afternoon, evening, late night)
- Range from intimate venues (50 people) to large venues (1000+ people)
- Include both single events and ongoing exhibitions/shows
- Mix established venues with popup/temporary locations

ALLOWED CATEGORIES (use EXACTLY):
${buildCategoryListForPrompt()}

REQUIRED FIELDS for each event:
title, category, date, time, venue, price, website, endTime, address, ticketPrice, eventType, description, bookingLink, ageRestrictions

RULES:
- "category" must be EXACTLY one of: ${allowedCategoriesForSchema()}
- If information unknown, use empty string - never skip events for missing details
- Include events even with partial information (better incomplete than missing)
- Prioritize quantity while maintaining accuracy
- Return comprehensive JSON array with ALL discovered events
- NO explanatory text outside the JSON structure

QUALITY CHECK: Verify each event is real, current, and actually happening on the specified date.`;
  }

  function buildOptimizedGeneralPrompt(city: string, date: string): string {
    const searchVariations = [
      `events ${city} ${date}`,
      `what's happening ${city} ${date}`,
      `things to do ${city} ${date}`,
      `veranstaltungen ${city} ${date}`,
      `was läuft ${city} ${date}`,
      `${city} events tonight today weekend`,
      `${city} calendar ${date}`,
      `activities ${city} ${date}`
    ];

    return `COMPREHENSIVE EVENT SEARCH for ${city} on ${date}

Search using ALL these variations and source types:
${searchVariations.map(v => `- "${v}"`).join('\n')}

Focus areas:
- Check major venues in ${city} for their daily schedules
- Look for city-specific event aggregators and calendars  
- Search local Facebook groups and community pages
- Check university/college event calendars if applicable
- Look for seasonal or recurring events on this date
- Find popup events and last-minute announcements
- Include events in surrounding neighborhoods/districts

Return comprehensive JSON array covering ALL main categories.
Include both well-known and hidden gem events.
NO explanatory text outside the JSON structure.`;
  }

  function buildOptimizedCategoryPrompt(
    city: string,
    date: string,
    mainCategory: string,
    options: PerplexityOptions
  ): string {
    const expanded = options.expandedSubcategories !== false;
    const categoryContext = expanded
      ? buildExpandedCategoryContext(mainCategory)
      : `Main Category: ${mainCategory}\n(Subcategory expansion disabled)`;

    // Kategorie-spezifische Suchstrategien
    const categorySearchStrategies = getCategorySpecificStrategies(mainCategory, city);

    return `${categoryContext}

FOCUSED SEARCH for ${mainCategory} events in ${city} on ${date}

${categorySearchStrategies}

SEARCH CHECKLIST for ${mainCategory}:
1. Official ${mainCategory.toLowerCase()} venues in ${city}
2. Ticketing platforms filtered for ${mainCategory}
3. Social media hashtags related to ${mainCategory} + ${city}
4. Local ${mainCategory.toLowerCase()} communities and groups
5. Alternative and underground ${mainCategory.toLowerCase()} scenes
6. Recurring ${mainCategory.toLowerCase()} events that happen on this date
7. Last-minute ${mainCategory.toLowerCase()} announcements
8. Pop-up and temporary ${mainCategory.toLowerCase()} events

DIVERSITY WITHIN CATEGORY:
- Mix of venue types (large/small, mainstream/alternative)
- Different sub-genres and styles within ${mainCategory}
- Range of price points (free to premium)
- Various time slots throughout the day
- Both one-time and ongoing events

OUTPUT: Return comprehensive JSON array of real ${mainCategory} events.
Include booking/ticket links where available.
NO explanatory text outside the JSON structure.

Example format:
{"title":"Event Name","category":"${mainCategory}","date":"${date}","time":"19:30","venue":"Venue Name","price":"€15-25","website":"https://example.com","address":"Street Address","description":"Event description"}`;
  }

  function getCategorySpecificStrategies(category: string, city: string): string {
    const strategies: { [key: string]: string } = {
      "Live-Konzerte": `
MUSIC VENUE FOCUS:
- Check all concert halls, music venues, clubs with live music
- Look for acoustic sessions in cafes/bars
- Search for street performances and busking events
- Check local band social media for gig announcements
- Look for music festivals or festival fringe events
- Include jam sessions and open mic nights`,

      "DJ Sets/Electronic": `
ELECTRONIC MUSIC FOCUS:
- Check all nightclubs and electronic music venues
- Look for underground and warehouse parties
- Search for DJ set announcements on SoundCloud/Facebook
- Check electronic music community groups
- Look for techno/house/trance event series
- Include rooftop and outdoor electronic events`,

      "Theater/Performance": `
THEATER FOCUS:
- Check all theaters, cultural centers, performance spaces
- Look for experimental and fringe theater
- Search for street theater and outdoor performances
- Check university drama departments
- Look for comedy shows and cabaret
- Include interactive and immersive theater`,

      "Museen": `
MUSEUM FOCUS:
- Check all museums, galleries, cultural institutions
- Look for special exhibitions and opening nights
- Search for museum night events and late openings
- Check for guided tours and lectures
- Look for interactive and family-friendly museum events
- Include private galleries and art spaces`,

      "Food/Culinary": `
FOOD EVENT FOCUS:
- Check restaurants for special dinners and tastings
- Look for food festivals and markets
- Search for cooking classes and wine tastings  
- Check brewery/winery events and tours
- Look for pop-up restaurants and food trucks
- Include culinary workshops and demonstrations`
    };

    return strategies[category] || `
GENERAL CATEGORY FOCUS:
- Check venues specific to ${category.toLowerCase()} activities
- Look for community groups and organizations related to ${category}
- Search for both commercial and grassroots ${category.toLowerCase()} events
- Check for recurring ${category.toLowerCase()} activities on this date`;
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
      const prompt = buildOptimizedGeneralPrompt(city, date);
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

    // Fallback-Mechanismus: Wenn eine Kategorie wenige Ergebnisse liefert
    async function executeWithFallback(category: string): Promise<PerplexityResult[]> {
      const categoryResults: PerplexityResult[] = [];
      
      // Erste Abfrage mit Standard-Prompt
      const primaryPrompt = buildOptimizedCategoryPrompt(city, date, category, options);
      const primaryResponse = await call(primaryPrompt, options);
      
      categoryResults.push({
        query: primaryPrompt,
        response: primaryResponse,
        events: [],
        timestamp: Date.now()
      });

      // Prüfe auf wenige Ergebnisse und führe Fallback durch
      const eventCount = (primaryResponse.match(/\{[^}]*"title"/g) || []).length;
      if (eventCount < 3) {
        // Fallback mit breiterer Suche
        const fallbackPrompt = `Find ANY events in ${city} on ${date} that could be related to ${category}. 
        Be more inclusive and check alternative venues, popup events, and less obvious ${category.toLowerCase()} activities.
        Return JSON array with ALL found events.`;
        
        try {
          const fallbackResponse = await call(fallbackPrompt, options);
          categoryResults.push({
            query: fallbackPrompt,
            response: fallbackResponse,
            events: [],
            timestamp: Date.now()
          });
        } catch (error) {
          console.warn(`Fallback search failed for ${category}:`, error);
        }
      }

      return categoryResults;
    }

    // Parallel processing mit verbessertem Fallback
    if (cc === 1) {
      // Sequential path
      for (const cat of effectiveCategories) {
        const categoryResults = await executeWithFallback(cat);
        results.push(...categoryResults);
      }
      return results;
    }

    // Parallel worker pool
    let idx = 0;
    async function worker() {
      while (idx < effectiveCategories.length) {
        const my = idx++;
        const cat = effectiveCategories[my];
        if (!cat) break;
        
        if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
          console.log(`[PPLX:QUERY][${cat}] starting optimized search`);
        }
        
        const categoryResults = await executeWithFallback(cat);
        results.push(...categoryResults);
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
