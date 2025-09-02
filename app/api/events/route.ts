import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, EventData, JobStatus, DebugInfo, DebugStep } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import InMemoryCache from '@/lib/cache';
import { createPerplexityService } from '@/lib/perplexity';
import { eventAggregator } from '@/lib/aggregator';
import { computeTTLSecondsForEvents } from '@/lib/cacheTtl';
import { getJobStore } from '@/lib/jobStore';
import { getHotCity, getCityWebsitesForCategories } from '@/lib/hotCityStore';
import { getMainCategoriesForAICalls } from '@/categories';

// Serverless configuration  
export const runtime = 'nodejs';
export const maxDuration = 300;

// Default categories used when request.categories is empty/missing
const DEFAULT_CATEGORIES = [
'DJ Sets/Electronic: DJ Sets/Electronic, Techno/House/EDM, Drum & Bass, Trance/Progressive, Ambient/Downtempo, Experimental Electronic, Disco/Nu-Disco, Minimal/Deep House, Hardstyle/Hardcore, Breakbeat/Breaks, Dubstep/Bass Music, Industrial/EBM, Synthwave/Retro, Acid/Acid House, Psytrance/Goa, Future Bass, Garage/UK Garage',

'Clubs/Discos: Clubs/Discos, Nightclubs, Dance Clubs, Underground Venues, Rooftop Parties, Beach Clubs, After-Hours, Club Nights, Party Events, Rave Culture, Social Dancing, Singles Events, VIP Events, Themed Parties, Cocktail Lounges',

'Live-Konzerte: Live-Konzerte, Klassische Musik/Classical, Rock/Pop/Alternative, Jazz/Blues, Folk/Singer-Songwriter, Hip-Hop/Rap, Metal/Hardcore, Indie/Alternative, World Music, Country/Americana, R&B/Soul, Experimental/Avant-garde, Chamber Music, Orchestra/Symphony, Band Performances, Solo Artists, Album Release Shows, Tribute Bands, Open Mic Nights, Acoustic Sessions, Choral Music, New Age/Ambient',

'Open Air: Open Air, Music Festivals, Outdoor Concerts, Beach Events, Park Gatherings, Rooftop Events, Garden Parties, Street Festivals, Market Events, Outdoor Cinema, Picnic Events, Nature Events, Camping/Glamping Events, Adventure Tours, Food Truck Festivals, Craft Fairs (Outdoor), Sports Festivals',

'Museen: Museen, Kunstgalerien/Art Galleries, Ausstellungen/Exhibitions, Kulturelle Institutionen, Historische Stätten, Architektur Tours, Science Museums, Interactive Exhibitions, Private Collections, Art Fairs, Museum Nights, Educational Tours, Virtual Reality Experiences, Photography Exhibitions, Natural History, Technology Museums, Local History',

'LGBTQ+: LGBTQ+, Pride Events, Queer Parties, Drag Shows, LGBTQ+ Clubs, Community Events, Support Groups, Diversity Celebrations, Inclusive Events, Rainbow Events, Trans Events, Lesbian Events, Gay Events, Bisexual Events, Non-binary Events, Coming Out Support, LGBTQ+ Film Screenings',

'Comedy/Kabarett: Comedy/Kabarett, Stand-up Comedy, Improvisational Theater, Satirical Shows, Variety Shows, Comedy Clubs, Humor Events, Roast Shows, Open Mic Comedy, Political Satire, Musical Comedy, Sketch Shows, Comedy Festivals, Story Slam, Comedy Workshops',

'Theater/Performance: Theater/Performance, Drama/Schauspiel, Musicals, Opera/Operette, Ballet/Dance, Contemporary Dance, Performance Art, Experimental Theater, Children Theater, Street Performance, Mime/Physical Theater, Puppet Theater, Immersive Theater, Site-specific Performance, Cabaret Shows, Burlesque, Circus Arts, Storytelling, Poetry Slams, Spoken Word',

'Film: Film, Cinema/Movie Screenings, Film Festivals, Documentary Screenings, Independent Films, Foreign Films, Classic Cinema, Outdoor Cinema, Silent Films, Animation/Animated Films, Short Films, Film Premieres, Director Q&As, Film Discussions, Video Art, Experimental Film, Horror Film Nights, Cult Cinema',

'Food/Culinary: Food/Culinary, Wine Tasting, Beer Events/Beer Festivals, Cooking Classes, Food Markets, Restaurant Events, Culinary Festivals, Food Tours, Pop-up Restaurants, Cocktail Events, Coffee Culture, Whiskey/Spirits Tastings, Vegan/Vegetarian Events, International Cuisine, Local Specialties, Food & Music Pairings, Farmers Markets, Gourmet Events, Street Food, Chef Demonstrations',

'Sport: Sport, Football/Soccer, Basketball, Tennis, Fitness Events, Running/Marathon, Cycling Events, Swimming, Martial Arts, Yoga/Pilates, Extreme Sports, Winter Sports, Team Building Sports, Amateur Leagues, Sports Viewing Parties, Health & Wellness, Outdoor Sports, Indoor Sports, E-Sports, Adventure Racing',

'Familien/Kids: Familien/Kids, Children Events, Family Festivals, Kids Workshops, Educational Activities, Interactive Shows, Children Theater, Puppet Shows, Magic Shows, Storytelling for Kids, Arts & Crafts, Science for Kids, Music for Families, Outdoor Adventures, Birthday Parties, Holiday Events, Baby/Toddler Events, Teen Programs',

'Kunst/Design: Kunst/Design, Art Exhibitions, Design Markets, Craft Fairs, Artist Studios, Creative Workshops, Fashion Shows, Photography, Sculpture, Painting, Digital Art, Street Art, Installation Art, Textile Arts, Ceramics/Pottery, Jewelry Making, Architecture Events, Interior Design, Graphic Design, Art Auctions',

'Wellness/Spirituell: Wellness/Spirituell, Meditation Events, Yoga Classes, Spa Events, Mindfulness Workshops, Spiritual Retreats, Healing Sessions, Wellness Festivals, Breathwork, Sound Healing, Crystal Healing, Reiki Sessions, Holistic Health, Mental Health Support, Self-Care Events, Nature Therapy, Life Coaching, Nutrition Workshops',

'Networking/Business: Networking/Business, Business Meetups, Professional Development, Industry Conferences, Startup Events, Entrepreneurship, Career Fairs, Leadership Events, Trade Shows, B2B Events, Corporate Events, Innovation Hubs, Tech Meetups, Skills Workshops, Mentorship Programs, Investment Events, Coworking Events, Industry Mixers',

'Natur/Outdoor: Natur/Outdoor, Hiking/Walking Tours, Nature Tours, Wildlife Watching, Botanical Gardens, Park Events, Outdoor Adventures, Camping Events, Environmental Education, Eco-Tours, Outdoor Yoga, Nature Photography, Geocaching, Bird Watching, Gardening Workshops, Sustainability Events, Green Living, Conservation Events, Outdoor Fitness, Stargazing',

'Kultur/Traditionen: Lokale Traditionen, Kulturelle Feste, Historische Reenactments, Volksfeste, Religiöse Feiern, Seasonal Celebrations, Cultural Heritage, Traditional Crafts, Folk Music/Dance, Local Legends Tours',

'Märkte/Shopping: Flohmarkt/Flea Markets, Vintage Markets, Handmade Markets, Antique Fairs, Shopping Events, Pop-up Shops, Designer Markets, Book Markets, Record Fairs, Seasonal Markets',

'Bildung/Lernen: Workshops, Kurse/Classes, Seminare/Seminars, Lectures/Vorträge, Language Exchange, Book Clubs, Study Groups, Academic Conferences, Skill Sharing, DIY Workshops',

'Soziales/Community: Community Events, Volunteer Activities, Charity Events, Social Causes, Neighborhood Meetings, Cultural Exchange, Senior Events, Singles Meetups, Expat Events, Local Initiatives'
];

// Default Perplexity options
const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 10000
};

// Get JobStore instance for persisting job state
const jobStore = getJobStore();

// Helper function to add timeout to any promise
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Schedule background processing using Vercel Background Functions or local fallback
async function scheduleBackgroundProcessing(
  request: NextRequest,
  jobId: string,
  city: string,
  date: string,
  categories: string[],
  options: any
) {
  // Determine if we're running on Vercel
  const isVercel = process.env.VERCEL === '1';
  
  if (isVercel) {
    // Prefer exact deployment URL to ensure we hit the same deployment in preview
    const deploymentUrl = request.headers.get('x-vercel-deployment-url');
    const host = deploymentUrl || request.headers.get('x-forwarded-host') || request.headers.get('host');
    const protocol = 'https'; // Vercel preview/prod are https
    
    if (!host) {
      throw new Error('Unable to determine host for background processing');
    }
    
    const backgroundUrl = `${protocol}://${host}/api/events/process`;
    
    console.log('Scheduling background processing via Vercel Background Functions:', backgroundUrl);

    // Optional protection bypass for Preview Deployments Protection
    // Set PROTECTION_BYPASS_TOKEN in Vercel Project Settings > Environment Variables
    const protectionBypass = process.env.PROTECTION_BYPASS_TOKEN;

    // Optional internal secret if your worker route expects it
    const internalSecret = process.env.INTERNAL_API_SECRET;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-vercel-background': '1',
    };
    if (protectionBypass) {
      headers['x-vercel-protection-bypass'] = protectionBypass;
    }
    if (internalSecret) {
      headers['x-internal-secret'] = internalSecret;
    }
    
    // Make internal HTTP request to background processor with special header
    console.log(`Scheduling background processing: ${backgroundUrl}`);
    const response = await fetch(backgroundUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jobId,
        city,
        date,
        categories,
        options
      })
    });
    
    if (!response.ok) {
      throw new Error(`Background scheduling failed: ${response.status} ${response.statusText}`);
    }
    
    console.log('Background processing scheduled successfully');
    
  } else {
    // Local development fallback - make local HTTP request without awaiting
    const localUrl = 'http://localhost:3000/api/events/process';
    console.log(`Running in local development, making async request to background processor: ${localUrl}`);
    
    // Fire and forget request for local development
    fetch(localUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-background': '1', // Add auth header for local dev
      },
      body: JSON.stringify({
        jobId,
        city,
        date,
        categories,
        options
      })
    }).then(response => {
      if (!response.ok) {
        console.error(`Local background processing failed: ${response.status} ${response.statusText}`);
      } else {
        console.log('Local background processing scheduled successfully');
      }
    }).catch(error => {
      console.error('Local development background request failed:', error);
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { city, date, categories, options } = body;

    if (!city || !date) {
      return NextResponse.json(
        { error: 'Stadt und Datum sind erforderlich' },
        { status: 400 }
      );
    }

    // Compute effective categories and merge options with defaults
    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    // Check for Hot City and resolve additional sources
    let hotCityData: any = null;
    let additionalSources: any[] = [];
    try {
      hotCityData = await getHotCity(city);
      if (hotCityData) {
        console.log(`Found Hot City data for: ${city}`);
        // Get websites for the requested categories
        additionalSources = await getCityWebsitesForCategories(city, effectiveCategories);
        console.log(`Found ${additionalSources.length} additional sources for ${city}`);
      }
    } catch (error) {
      console.error('Error fetching Hot City data:', error);
      // Continue without Hot City data - don't fail the entire request
    }

    // Merge options with Hot City data and defaults
    const mergedOptions = { 
      ...DEFAULT_PPLX_OPTIONS, 
      ...options,
      hotCity: hotCityData,
      additionalSources
    };

    // Determine if cache should be bypassed
    const disableCache = mergedOptions?.disableCache === true || mergedOptions?.debug === true;

    // Check cache per-category for intelligent cache usage - unless cache is disabled
    let allCachedEvents: EventData[] = [];
    let missingCategories: string[] = [];
    let cacheInfo: { [category: string]: { fromCache: boolean; eventCount: number } } = {};

    if (!disableCache) {
      const cacheResult = eventsCache.getEventsByCategories(city, date, effectiveCategories);
      
      // Combine all cached events and deduplicate immediately
      const cachedEventsList: EventData[] = [];
      for (const category in cacheResult.cachedEvents) {
        cachedEventsList.push(...cacheResult.cachedEvents[category]);
      }
      allCachedEvents = eventAggregator.deduplicateEvents(cachedEventsList);
      
      missingCategories = cacheResult.missingCategories;
      cacheInfo = cacheResult.cacheInfo;
      
      console.log(`Cache analysis: ${Object.keys(cacheResult.cachedEvents).length}/${effectiveCategories.length} categories cached, ${allCachedEvents.length} events from cache`);
      console.log('Cached categories:', Object.keys(cacheResult.cachedEvents));
      console.log('Missing categories:', missingCategories);
    } else {
      console.log('Cache bypass enabled (debug mode or disableCache flag)');
      missingCategories = effectiveCategories;
      // Initialize cacheInfo for all categories as not from cache
      effectiveCategories.forEach(category => {
        cacheInfo[category] = { fromCache: false, eventCount: 0 };
      });
    }

    // If all categories are cached, return events directly without job polling
    if (missingCategories.length === 0) {
      console.log('All categories cached - returning events directly');
      return NextResponse.json({
        events: allCachedEvents,
        status: 'completed',
        cached: true,
        cacheInfo: {
          fromCache: true,
          totalEvents: allCachedEvents.length,
          cachedEvents: allCachedEvents.length,
          cacheBreakdown: cacheInfo
        },
        message: allCachedEvents.length > 0 
          ? `${allCachedEvents.length} Events aus dem Cache geladen`
          : 'Keine Events gefunden'
      });
    }

    // For mixed scenarios (some cached, some not), return cached events immediately
    // and start background processing for missing categories
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create job entry with cached events
    const job: JobStatus = {
      id: jobId,
      status: 'pending',
      events: allCachedEvents,
      createdAt: new Date(),
      cacheInfo: {
        fromCache: allCachedEvents.length > 0,
        totalEvents: allCachedEvents.length,
        cachedEvents: allCachedEvents.length,
        cacheBreakdown: cacheInfo
      },
      progress: {
        completedCategories: effectiveCategories.length - missingCategories.length,
        totalCategories: effectiveCategories.length
      }
    };

    await jobStore.setJob(jobId, job);
    console.log(`Job created successfully with ID: ${jobId}, status: ${job.status}, events: ${job.events?.length || 0}`);

    // Initialize debug info if debug mode is enabled
    if (options?.debug) {
      const debugInfo: DebugInfo = {
        createdAt: new Date(),
        city,
        date,
        categories: effectiveCategories,
        options: mergedOptions,
        steps: []
      };
      await jobStore.setDebugInfo(jobId, debugInfo);
    }

    // Schedule background processing for missing categories only
    // IMPORTANT: Map subcategories to main categories for AI calls
    // The cache logic checks subcategories, but AI calls should only be made for main categories
    const mainCategoriesForAI = getMainCategoriesForAICalls(missingCategories);
    
    try {
      console.log(`Original missing categories (subcategories): ${missingCategories.length} - [${missingCategories.join(', ')}]`);
      console.log(`Mapped to main categories for AI calls: ${mainCategoriesForAI.length} - [${mainCategoriesForAI.join(', ')}]`);
      
      await scheduleBackgroundProcessing(request, jobId, city, date, mainCategoriesForAI, mergedOptions);
    } catch (scheduleError) {
      console.error('Failed to schedule background processing:', scheduleError);
      // Update job to error state
      await jobStore.updateJob(jobId, {
        status: 'error',
        error: 'Failed to schedule background processing'
      });
      return NextResponse.json(
        { error: 'Failed to schedule background processing' },
        { status: 500 }
      );
    }

    // Return immediate results with job ID for polling remaining categories
    return NextResponse.json({
      jobId,
      status: 'partial',
      events: allCachedEvents,
      cached: allCachedEvents.length > 0,
      processing: missingCategories.length > 0,
      cacheInfo: {
        fromCache: allCachedEvents.length > 0,
        totalEvents: allCachedEvents.length,
        cachedEvents: allCachedEvents.length,
        cacheBreakdown: cacheInfo
      },
      progress: {
        completedCategories: effectiveCategories.length - missingCategories.length,
        totalCategories: effectiveCategories.length,
        missingCategories: missingCategories
      },
      message: allCachedEvents.length > 0 
        ? `${allCachedEvents.length} Events aus dem Cache geladen, ${missingCategories.length} Kategorien werden verarbeitet...`
        : `${missingCategories.length} Kategorien werden verarbeitet...`
    });

  } catch (error) {
    console.error('Events API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}
