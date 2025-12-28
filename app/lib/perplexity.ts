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
  EVENT_CATEGORY_SUBCATEGORIES,
  buildExpandedCategoryContext,
  buildCategoryListForPrompt,
  allowedCategoriesForSchema,
  mapToMainCategories
} from './eventCategories';
import { PerplexityResult, EventData } from './types';
import { venueQueryService, VenueQuery } from './services/VenueQueryService';

// Declare process for Node.js environment variables (to avoid requiring @types/node)
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
  // NEW: Venue query options
  enableVenueQueries?: boolean;
  venueQueryLimit?: number;
  venueQueryConcurrency?: number;
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
        { role: 'system', content: buildOptimizedSystemPrompt(options) },
        { role: 'user', content: prompt }
      ],
      max_tokens: options.max_tokens || 40000, // Erhöht von 30000
      temperature: options.temperature ?? 0.2  // Reduziert für fokussiertere Ergebnisse
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
title, category, date, time, venue, price, website, endTime, address, ticketPrice, eventType, description, bookingLink, ageRestrictions, imageUrl

⭐ MANDATORY IMAGE REQUIREMENT:
- EVERY event MUST have a valid imageUrl (HTTP/HTTPS URL)
- If no image URL found for an event, DO NOT include that event
- Only return events with image URLs from official sources:
  * Official event websites (poster/banner images)
  * Ticketing platforms (event images)
  * Venue websites (event photos)
  * Social media posts (event pictures from official accounts)
- NEVER invent, fabricate, or use placeholder image URLs
- If imageUrl is missing, empty, or invalid, EXCLUDE that event from results

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

⭐ CRITICAL IMAGE REQUIREMENT:
- Include ONLY events that have valid imageUrl
- imageUrl must be an HTTP/HTTPS URL from legitimate event sources
- If event has no image, DO NOT include it in results
- Quality over quantity: fewer complete events are better than many incomplete ones

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

OUTPUT: Return comprehensive JSON array of REAL ${mainCategory} events WITH IMAGES.
Include booking/ticket links where available.

⭐ MANDATORY: Every returned event MUST have:
- Valid imageUrl (HTTP/HTTPS URL)
- URL must be from official sources (venue sites, ticketing platforms, official social media)
- If event has no image, DO NOT include it in this result
- Prioritize events with images over quantity

NO explanatory text outside the JSON structure.

Example format:
{"title":"Event Name","category":"${mainCategory}","date":"${date}","time":"19:30","venue":"Venue Name","price":"€15-25","website":"https://example.com","address":"Street Address","description":"Event description","imageUrl":"https://example.com/image.jpg"}`;
  }

  function getCategorySpecificStrategies(category: string, city: string): string {
    // Updated for new 12-category structure
    const strategies: { [key: string]: string } = {
      "Clubs & Nachtleben": `
ELECTRONIC MUSIC & NIGHTLIFE FOCUS:
- Check all nightclubs, clubs, and electronic music venues
- Look for DJ events, parties, and dance nights
- Search for underground and warehouse parties
- Check for techno/house/EDM/drum&bass events
- Look for bar events, lounge events, and rooftop parties
- Include after-hours events and rave announcements

⭐ IMAGE REQUIREMENT FOR NIGHTLIFE EVENTS:
- Club websites usually have event flyers/posters with images
- Check for DJ event announcements with photos on official club social media
- Look for parties on Instagram/Facebook with event images from organizers
- Only include events with discoverable event images/posters
- EXCLUDE events with no visual event materials found`,

      "Live-Konzerte": `
LIVE MUSIC & CONCERT FOCUS:
- Check all concert halls, music venues, clubs with live music
- Look for rock, pop, jazz, hip-hop, indie, world music concerts
- Search for acoustic sessions in cafes/bars
- Check local band social media for gig announcements
- Look for singer-songwriter nights and open mic events
- Include jam sessions and live band performances

⭐ IMAGE REQUIREMENT FOR LIVE MUSIC EVENTS:
- Prioritize events that have event images/posters/photos on:
  * Live music venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`,

      "Klassik & Oper": `
CLASSICAL MUSIC & OPERA FOCUS:
- Check all opera houses, concert halls, and classical venues
- Look for orchestral performances and symphony concerts
- Search for chamber music and string quartet events
- Check for piano recitals and violin concerts
- Look for opera performances and operette shows
- Include baroque music events and contemporary classical

⭐ IMAGE REQUIREMENT FOR CLASSICAL EVENTS:
- Prioritize events that have event images/posters/photos on:
  * Classical venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`,

      "Theater & Comedy": `
THEATER & COMEDY FOCUS:
- Check all theaters, cultural centers, performance spaces
- Look for musicals, drama productions, and stage shows
- Search for comedy shows, stand-up, and cabaret (Kabarett)
- Check for improv comedy and sketch comedy
- Look for ballet and contemporary dance performances
- Include experimental theater and physical theater

⭐ IMAGE REQUIREMENT FOR THEATER EVENTS:
- Prioritize events that have event images/posters/photos on:
  * Theater venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`,

      "Museen & Ausstellungen": `
MUSEUM & EXHIBITION FOCUS:
- Check all museums, galleries, cultural institutions
- Look for special exhibitions and opening nights
- Search for museum night events and late openings
- Check for guided tours and curator talks
- Look for interactive and family-friendly museum events
- Include private galleries, art spaces, and street art events

⭐ IMAGE REQUIREMENT FOR MUSEUM EVENTS:
- Prioritize events that have event images/posters/photos on:
  * Museum venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`,

      "Film & Kino": `
FILM & CINEMA FOCUS:
- Check all cinemas, arthouse theaters, and film venues
- Look for film premieres and special screenings
- Search for film festivals and documentary screenings
- Check for open air cinema and outdoor screenings
- Look for director Q&As and film discussions
- Include classic film nights and cult classics screenings

⭐ IMAGE REQUIREMENT FOR FILM EVENTS:
- Prioritize events that have event images/posters/photos on:
  * Cinema venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`,

      "Open Air & Festivals": `
OUTDOOR EVENTS & FESTIVALS FOCUS:
- Check for outdoor festivals and open air events
- Look for street festivals and city events
- Search for music festivals and summer festivals
- Check for beer garden events and garden parties
- Look for nature activities and park events
- Include sunset sessions and night market events

⭐ IMAGE REQUIREMENT FOR OUTDOOR EVENTS:
- Prioritize events that have event images/posters/photos on:
  * Festival venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`,

      "Kulinarik & Märkte": `
FOOD & MARKET FOCUS:
- Check restaurants for special dinners and tastings
- Look for food festivals, markets, and food truck events
- Search for wine tastings, beer tastings, and cocktail events
- Check for cooking classes and culinary workshops
- Look for flea markets, vintage markets, and Christmas markets
- Include farmers markets and artisan market events

⭐ IMAGE REQUIREMENT FOR FOOD EVENTS:
- Prioritize events that have event images/posters/photos on:
  * Culinary venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`,

      "Sport & Fitness": `
SPORT & FITNESS FOCUS:
- Check for sports events, competitions, and tournaments
- Look for running events, marathons, and cycling events
- Search for yoga classes, fitness events, and wellness events
- Check for team sports, water sports, and extreme sports
- Look for e-sports tournaments and gaming events
- Include outdoor yoga and meditation sessions

⭐ IMAGE REQUIREMENT FOR SPORTS EVENTS:
- Prioritize events that have event images/posters/photos on:
  * Sports venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`,

      "Bildung & Workshops": `
EDUCATION & WORKSHOP FOCUS:
- Check for workshops, seminars, and training events
- Look for tech talks, coding workshops, and hackathons
- Search for language classes and creative workshops
- Check for university lectures and public talks
- Look for cultural workshops and heritage tours
- Include business events, conferences, and networking meetups

⭐ IMAGE REQUIREMENT FOR EDUCATION EVENTS:
- Prioritize events that have event images/posters/photos on:
  * Educational venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`,

      "Familie & Kinder": `
FAMILY & KIDS FOCUS:
- Check for family-friendly events and kids activities
- Look for children's theater and puppet shows
- Search for educational activities and STEM events for kids
- Check for family festivals and outdoor play events
- Look for children's workshops and creative learning
- Include parent-child activities and nature discovery events

⭐ IMAGE REQUIREMENT FOR FAMILY EVENTS:
- Prioritize events that have event images/posters/photos on:
  * Family venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`,

      "LGBTQ+": `
LGBTQ+ & PRIDE FOCUS:
- Check for pride events and queer parties
- Look for LGBTQ+ community events and meetups
- Search for drag shows, drag brunches, and drag performances
- Check for queer theater and LGBTQ+ film screenings
- Look for rainbow markets and pride celebrations
- Include gay clubs, lesbian bars, and queer nightlife events

⭐ IMAGE REQUIREMENT FOR LGBTQ+ EVENTS:
- Prioritize events that have event images/posters/photos on:
  * LGBTQ+ venue websites
  * Social media posts by venue/organizer (official accounts only)
  * Ticketing platforms (Eventbrite, Ticketmaster, etc.)
- EXCLUDE any events without discoverable images
- Check multiple sources for event visuals before excluding`
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
      if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
        console.log(`[PPLX:QUERY][${category}] starting optimized search`);
      }
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
        
        const categoryResults = await executeWithFallback(cat);
        results.push(...categoryResults);
      }
    }

    await Promise.all(Array.from({ length: cc }).map(() => worker()));

    // NEW: VENUE QUERIES
    if (options.enableVenueQueries !== false) {
      const venueResults = await executeVenueQueries(city, date, options);
      results.push(...venueResults);
    }

    return results;
  }

  // NEW FUNCTION: executeVenueQueries with strategy-based optimization
  async function executeVenueQueries(
    city: string,
    date: string,
    options: PerplexityOptions
  ): Promise<PerplexityResult[]> {
    const results: PerplexityResult[] = [];
    
    try {
      const venueQueries = await venueQueryService.getActiveVenueQueries(city);
      
      if (venueQueries.length === 0) {
        if (options.debug) {
          console.log('[PPLX:VENUES] No venue queries found for city:', city);
        }
        return results;
      }

      if (options.debug) {
        console.log(`[PPLX:VENUES] Found ${venueQueries.length} venue queries for ${city}`);
      }

      // Apply venue limit if specified
      const limitedVenues = options.venueQueryLimit 
        ? venueQueries.slice(0, options.venueQueryLimit)
        : venueQueries;

      // Create optimized strategy: individual for high-priority, grouped for medium-priority
      const strategy = venueQueryService.createVenueStrategy(limitedVenues);
      
      if (options.debug) {
        console.log(`[PPLX:VENUES] Strategy: ${strategy.individualQueries.length} individual, ${strategy.groupedQueries.length} groups, ${strategy.skippedVenues.length} skipped`);
        console.log(`[PPLX:VENUES] Estimated API calls: ${strategy.estimatedApiCalls} (vs ${strategy.totalQueries} without grouping)`);
      }

      const concurrency = Math.max(1, options.venueQueryConcurrency ?? 3);
      
      // Execute individual high-priority venue queries
      if (strategy.individualQueries.length > 0) {
        for (let i = 0; i < strategy.individualQueries.length; i += concurrency) {
          const batch = strategy.individualQueries.slice(i, i + concurrency);
          
          const batchPromises = batch.map(async (venue) => {
            try {
              const prompt = venueQueryService.buildVenueSpecificPrompt(venue, city, date);
              
              if (options.debug) {
                console.log(`[PPLX:VENUE:INDIVIDUAL] Querying ${venue.venueName} (priority: ${venue.priority})`);
              }

              const response = await call(prompt, options);
              
              return {
                query: prompt,
                response,
                events: [],
                timestamp: Date.now(),
                venueId: venue.venueId,
                venueName: venue.venueName
              };
            } catch (error) {
              console.warn(`[PPLX:VENUE] Failed to query ${venue.venueName}:`, error);
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          const validResults = batchResults.filter(result => result !== null) as PerplexityResult[];
          results.push(...validResults);
        }
      }

      // Execute grouped medium-priority venue queries
      if (strategy.groupedQueries.length > 0) {
        for (let i = 0; i < strategy.groupedQueries.length; i += concurrency) {
          const batch = strategy.groupedQueries.slice(i, i + concurrency);
          
          const batchPromises = batch.map(async (group) => {
            try {
              const prompt = venueQueryService.buildGroupPrompt(group, city, date);
              
              if (options.debug) {
                console.log(`[PPLX:VENUE:GROUP] Querying ${group.category} (${group.venueCount} venues, total priority: ${group.totalPriority})`);
              }

              const response = await call(prompt, options);
              
              // Mark result with group info
              return {
                query: prompt,
                response,
                events: [],
                timestamp: Date.now(),
                venueId: group.venues.map(v => v.venueId).join(','),
                venueName: `${group.category} Group (${group.venueCount} venues)`
              };
            } catch (error) {
              console.warn(`[PPLX:VENUE:GROUP] Failed to query ${group.category}:`, error);
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          const validResults = batchResults.filter(result => result !== null) as PerplexityResult[];
          results.push(...validResults);
        }
      }

      if (options.debug) {
        console.log(`[PPLX:VENUES] Completed ${results.length} venue queries (${strategy.estimatedApiCalls} API calls)`);
      }

    } catch (error) {
      console.error('[PPLX:VENUES] Error executing venue queries:', error);
    }

    return results;
  }

  // NEW: Execute category-specific focused search
  async function executeCategoryQuery(
    city: string,
    date: string,
    category: string,
    options: PerplexityOptions = {}
  ): Promise<PerplexityResult> {
    const prompt = generateCategoryPrompt(city, date, category);
    
    if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
      console.log(`[PPLX:CATEGORY] Querying ${category} for ${city} on ${date}`);
    }
    
    const response = await call(prompt, options);
    
    return {
      query: prompt,
      response,
      events: [],
      timestamp: Date.now()
    };
  }

  // NEW: Execute targeted gap-filling query for missing categories
  async function executeGapFillingQuery(
    city: string,
    date: string,
    missingCategories: string[],
    existingEventCount: number,
    options: PerplexityOptions = {}
  ): Promise<PerplexityResult> {
    const categoriesStr = missingCategories.join(', ');
    
    const prompt = `TARGETED GAP-FILLING SEARCH for ${city} on ${date}

Current Status: Found ${existingEventCount} events, but missing coverage in these categories:
${missingCategories.map(cat => `- ${cat}`).join('\n')}

Mission: Find events SPECIFICALLY in these underrepresented categories.
Focus on these categories ONLY: ${categoriesStr}

Search Strategy:
1. Deep-dive into specialized ${categoriesStr.toLowerCase()} venues
2. Check niche ${categoriesStr.toLowerCase()} communities and groups
3. Look for underground and alternative ${categoriesStr.toLowerCase()} events
4. Search social media for ${categoriesStr.toLowerCase()} announcements
5. Find popup and temporary ${categoriesStr.toLowerCase()} activities

⭐ MANDATORY IMAGE REQUIREMENT:
- ONLY return events that have valid imageUrl (HTTP/HTTPS)
- Quality over quantity - exclude events without discoverable images
- Images must be from legitimate sources (venue sites, official social media, ticketing platforms)

Return comprehensive JSON array of events in ONLY these categories: ${categoriesStr}
NO explanatory text outside the JSON structure.`;

    if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
      console.log(`[PPLX:GAP-FILL] Filling gaps for ${missingCategories.length} categories`);
    }
    
    const response = await call(prompt, options);
    
    return {
      query: prompt,
      response,
      events: [],
      timestamp: Date.now()
    };
  }

  // NEW: Execute enrichment query to add more details to sparse events
  async function executeEnrichmentQuery(
    city: string,
    date: string,
    eventTitle: string,
    venue: string,
    options: PerplexityOptions = {}
  ): Promise<PerplexityResult> {
    const prompt = `EVENT ENRICHMENT for "${eventTitle}" at ${venue} in ${city} on ${date}

Find additional details for this specific event:
- Full description and what to expect
- Exact start and end times
- Detailed pricing information (early bird, regular, at door)
- Booking/ticket links
- Age restrictions or requirements
- Special features or highlights
- Address and location details
- Related events or series information
⭐ - Event image URL (poster, flyer, official event photo)

Return a single JSON object with enriched event data.
Include only factual, verified information.
⭐ IMPORTANT: Must include valid imageUrl from official sources.
If no image found, return null for imageUrl (not an empty string).
NO explanatory text outside the JSON structure.`;

    if (options.debug || process.env.LOG_PPLX_QUERIES === '1') {
      console.log(`[PPLX:ENRICH] Enriching event: ${eventTitle}`);
    }
    
    const response = await call(prompt, options);
    
    return {
      query: prompt,
      response,
      events: [],
      timestamp: Date.now()
    };
  }

  // NEW: Helper to generate category-focused prompts
  function generateCategoryPrompt(
    city: string,
    date: string,
    category: string,
    additionalContext?: string
  ): string {
    const categoryContext = buildExpandedCategoryContext(category);
    const strategies = getCategorySpecificStrategies(category, city);
    
    let prompt = `${categoryContext}

FOCUSED SEARCH for ${category} events in ${city} on ${date}

${strategies}`;

    if (additionalContext) {
      prompt += `\n\nAdditional Context:\n${additionalContext}`;
    }

    prompt += `\n\nReturn comprehensive JSON array of ${category} events.
NO explanatory text outside the JSON structure.`;

    return prompt;
  }

  // NEW: Helper to match and normalize categories
  function matchCategory(rawCategory: string): string | null {
    const normalized = rawCategory.toLowerCase().trim();
    
    // Direct match in EVENT_CATEGORIES
    for (const mainCat of EVENT_CATEGORIES) {
      if (mainCat.toLowerCase() === normalized) {
        return mainCat;
      }
    }
    
    // Check subcategories from EVENT_CATEGORY_SUBCATEGORIES
    for (const [mainCat, subcats] of Object.entries(EVENT_CATEGORY_SUBCATEGORIES)) {
      for (const subcat of subcats) {
        if (subcat.toLowerCase() === normalized) {
          return mainCat;
        }
      }
    }
    
    // Fuzzy keyword matching - Updated for new 12-category structure
    const keywords = {
      'music': 'Live-Konzerte',
      'concert': 'Live-Konzerte',
      'live': 'Live-Konzerte',
      'dj': 'Clubs & Nachtleben',
      'club': 'Clubs & Nachtleben',
      'party': 'Clubs & Nachtleben',
      'disco': 'Clubs & Nachtleben',
      'electronic': 'Clubs & Nachtleben',
      'classical': 'Klassik & Oper',
      'klassik': 'Klassik & Oper',
      'opera': 'Klassik & Oper',
      'oper': 'Klassik & Oper',
      'orchestra': 'Klassik & Oper',
      'theater': 'Theater & Comedy',
      'theatre': 'Theater & Comedy',
      'performance': 'Theater & Comedy',
      'comedy': 'Theater & Comedy',
      'kabarett': 'Theater & Comedy',
      'museum': 'Museen & Ausstellungen',
      'exhibition': 'Museen & Ausstellungen',
      'gallery': 'Museen & Ausstellungen',
      'film': 'Film & Kino',
      'movie': 'Film & Kino',
      'cinema': 'Film & Kino',
      'festival': 'Open Air & Festivals',
      'outdoor': 'Open Air & Festivals',
      'openair': 'Open Air & Festivals',
      'food': 'Kulinarik & Märkte',
      'restaurant': 'Kulinarik & Märkte',
      'culinary': 'Kulinarik & Märkte',
      'market': 'Kulinarik & Märkte',
      'shopping': 'Kulinarik & Märkte',
      'markt': 'Kulinarik & Märkte',
      'sport': 'Sport & Fitness',
      'fitness': 'Sport & Fitness',
      'wellness': 'Sport & Fitness',
      'culture': 'Bildung & Workshops',
      'education': 'Bildung & Workshops',
      'workshop': 'Bildung & Workshops',
      'seminar': 'Bildung & Workshops',
      'business': 'Bildung & Workshops',
      'networking': 'Bildung & Workshops',
      'family': 'Familie & Kinder',
      'kids': 'Familie & Kinder',
      'kinder': 'Familie & Kinder',
      'community': 'LGBTQ+',
      'pride': 'LGBTQ+',
      'queer': 'LGBTQ+',
      'lgbt': 'LGBTQ+',
      'lgbtq': 'LGBTQ+',
      'gay': 'LGBTQ+',
      'lesbian': 'LGBTQ+',
      'drag': 'LGBTQ+'
    };
    
    for (const [keyword, mainCat] of Object.entries(keywords)) {
      if (normalized.includes(keyword)) {
        return mainCat;
      }
    }
    
    return null;
  }

  // NEW: Helper to filter events by categories
  function filterEventsByCategories(events: EventData[], categories: string[]): EventData[] {
    if (categories.length === 0) {
      return events;
    }
    
    const normalizedCategories = categories.map(c => c.toLowerCase());
    
    return events.filter(event => {
      const eventCategory = (event.category || '').toLowerCase();
      return normalizedCategories.some(cat => 
        eventCategory.includes(cat) || cat.includes(eventCategory)
      );
    });
  }

  return {
    executeMultiQuery,
    executeCategoryQuery,
    executeGapFillingQuery,
    executeEnrichmentQuery,
    generateCategoryPrompt,
    matchCategory,
    filterEventsByCategories
  };
}

// Export type for testing
export type PerplexityService = ReturnType<typeof createPerplexityService>;
