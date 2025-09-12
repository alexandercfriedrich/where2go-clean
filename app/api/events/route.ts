import { NextRequest, NextResponse } from 'next/server';
import { RequestBody, JobStatus } from '@/lib/types';
import { eventsCache } from '@/lib/cache';
import { getJobStore } from '@/lib/jobStore';
import { getMainCategoriesForAICalls } from '@/categories';

// Serverless configuration  
export const runtime = 'nodejs';
export const maxDuration = 60; // Reduced to 1 minute

// Default categories - the 20 main categories
const DEFAULT_CATEGORIES = [
  'DJ Sets/Electronic',
  'Clubs/Discos', 
  'Live-Konzerte',
  'Open Air',
  'Museen',
  'LGBTQ+',
  'Comedy/Kabarett',
  'Theater/Performance',
  'Film',
  'Food/Culinary',
  'Sport',
  'Familien/Kids',
  'Kunst/Design',
  'Wellness/Spirituell',
  'Networking/Business',
  'Natur/Outdoor',
  'Kultur/Traditionen',
  'Märkte/Shopping',
  'Bildung/Lernen',
  'Soziales/Community'
];

const jobStore = getJobStore();

// Default Perplexity options
const DEFAULT_PPLX_OPTIONS = {
  temperature: 0.2,
  max_tokens: 10000
};

// Schedule background processing using Vercel Background Functions or local fallback
async function scheduleBackgroundProcessing(
  request: NextRequest,
  jobId: string,
  city: string,
  date: string,
  categories: string[],
  options: any
) {
  const debugMode = options?.debug || false;
  
  if (debugMode) {
    console.log('🔍 DEBUG: === SCHEDULING BACKGROUND PROCESSING ===');
    console.log('🔍 DEBUG: Input parameters:', { jobId, city, date, categoriesCount: categories.length, options });
  }

  // Determine if we're running on Vercel
  const isVercel = process.env.VERCEL === '1';
  
  if (debugMode) {
    console.log('🔍 DEBUG: Environment detection:', { 
      isVercel, 
      vercelEnv: process.env.VERCEL,
      nodeEnv: process.env.NODE_ENV,
      vercelUrl: process.env.VERCEL_URL 
    });
  }
  
  if (isVercel) {
    try {
      // Enhanced host detection with multiple fallbacks
      const deploymentUrl = request.headers.get('x-vercel-deployment-url');
      const forwardedHost = request.headers.get('x-forwarded-host');
      const regularHost = request.headers.get('host');
      const vercelUrl = process.env.VERCEL_URL;
      
      const host = deploymentUrl || forwardedHost || regularHost || vercelUrl;
      const protocol = 'https'; // Vercel preview/prod are https
      
      if (debugMode) {
        console.log('🔍 DEBUG: Host detection details:', {
          deploymentUrl,
          forwardedHost,
          regularHost,
          vercelUrl,
          selectedHost: host,
          protocol
        });
      }
      
      if (!host) {
        const errorMessage = 'Unable to determine host for background processing - all host detection methods failed';
        console.error('❌ CRITICAL:', errorMessage);
        if (debugMode) {
          console.log('🔍 DEBUG: Host detection failed - all methods returned null/undefined');
        }
        throw new Error(errorMessage);
      }
      
      const backgroundUrl = `${protocol}://${host}/api/events/process`;
      
      if (debugMode) {
        console.log('🔍 DEBUG: Background processing URL constructed:', backgroundUrl);
      } else {
        console.log('Scheduling background processing via Vercel Background Functions:', backgroundUrl);
      }

      // Enhanced authentication configuration
      const protectionBypass = process.env.PROTECTION_BYPASS_TOKEN;
      const internalSecret = process.env.INTERNAL_API_SECRET;

      if (debugMode) {
        console.log('🔍 DEBUG: Authentication tokens availability:', {
          protectionBypass: protectionBypass ? 'AVAILABLE' : 'NOT_SET',
          internalSecret: internalSecret ? 'AVAILABLE' : 'NOT_SET'
        });
      }

      // Build comprehensive authentication headers to ensure internal request validation passes
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-vercel-background': '1',
        'x-internal-call': '1', 
        'User-Agent': 'where2go-internal'
      };
      
      // Add optional authentication tokens if available
      if (protectionBypass) {
        headers['x-vercel-protection-bypass'] = protectionBypass;
      }
      if (internalSecret) {
        headers['x-internal-secret'] = internalSecret;
      }
      
      // Log authentication headers being sent
      const headersSummary = {
        'x-vercel-background': headers['x-vercel-background'],
        'x-internal-call': headers['x-internal-call'],
        'User-Agent': headers['User-Agent'],
        'x-vercel-protection-bypass': headers['x-vercel-protection-bypass'] ? 'SET' : 'NOT_SET',
        'x-internal-secret': headers['x-internal-secret'] ? 'SET' : 'NOT_SET'
      };
      
      if (debugMode) {
        console.log('🔍 DEBUG: Authentication headers being sent:', headersSummary);
      } else {
        console.log('Authentication headers being sent:', headersSummary);
      }
      
      // Prepare request body
      const requestBody = {
        jobId,
        city,
        date,
        categories,
        options
      };
      
      if (debugMode) {
        console.log('🔍 DEBUG: Full request details:', {
          method: 'POST',
          url: backgroundUrl,
          headers: headersSummary,
          bodyPreview: { jobId, city, date, categoriesCount: categories.length, debugMode: options?.debug }
        });
      } else {
        console.log('Full request details:', {
          method: 'POST',
          url: backgroundUrl,
          headers: headersSummary,
          bodyPreview: { jobId, city, date, categoriesCount: categories.length }
        });
      }
      
      // Make internal HTTP request to background processor with enhanced error handling
      if (debugMode) {
        console.log('🔍 DEBUG: Making fetch request to background processor...');
      } else {
        console.log(`Making request to background processor: ${backgroundUrl}`);
      }
      
      let response: Response;
      try {
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        if (debugMode) {
          console.log('🔍 DEBUG: About to make fetch request...');
          console.log('🔍 DEBUG: URL:', backgroundUrl);
          console.log('🔍 DEBUG: Method: POST');
          console.log('🔍 DEBUG: Headers:', headers);
          console.log('🔍 DEBUG: Body preview:', JSON.stringify(requestBody).substring(0, 200) + '...');
        }
        
        response = await fetch(backgroundUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (debugMode) {
          console.log('🔍 DEBUG: Fetch completed successfully, got response object');
        }
      } catch (fetchError: any) {
        if (debugMode) {
          console.log('🔍 DEBUG: ❌ Fetch request failed with error:', fetchError);
          console.log('🔍 DEBUG: ❌ Error name:', fetchError.name);
          console.log('🔍 DEBUG: ❌ Error message:', fetchError.message);
          console.log('🔍 DEBUG: ❌ Error stack:', fetchError.stack);
        }
        
        if (fetchError.name === 'AbortError') {
          const errorMessage = 'Background processing request timed out after 30 seconds';
          console.error('❌ TIMEOUT ERROR:', errorMessage);
          if (debugMode) {
            console.log('🔍 DEBUG: ❌ Background processing request timed out');
          }
          throw new Error(errorMessage);
        }
        
        const errorMessage = `Network error while calling background processor: ${fetchError.message}`;
        console.error('❌ FETCH ERROR:', errorMessage);
        if (debugMode) {
          console.log('🔍 DEBUG: ❌ Fetch request failed:', fetchError);
        }
        throw new Error(errorMessage);
      }
      
      const responseDetails = {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
        url: response.url
      };
      
      if (debugMode) {
        console.log('🔍 DEBUG: Background processing response received:', responseDetails);
      } else {
        console.log('Background processing response:', responseDetails);
      }
      
      if (!response.ok) {
        let responseText = '';
        try {
          responseText = await response.text();
        } catch (textError) {
          responseText = `[Could not read response text: ${textError}]`;
        }
        
        const errorMessage = `Background scheduling failed: HTTP ${response.status} ${response.statusText}`;
        console.error('❌ BACKGROUND SCHEDULING FAILED:', errorMessage);
        console.error('❌ Response body:', responseText);
        
        if (debugMode) {
          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });
          
          console.log('🔍 DEBUG: ❌ Background processing request failed:', {
            status: response.status,
            statusText: response.statusText,
            responseText,
            headers: responseHeaders
          });
        }
        
        throw new Error(`${errorMessage}: ${responseText}`);
      }
      
      // Try to parse response JSON
      let responseData = null;
      try {
        responseData = await response.json();
      } catch (jsonError) {
        if (debugMode) {
          console.log('🔍 DEBUG: ⚠️ Response is not JSON, but request was successful');
        } else {
          console.log('Response is not JSON, but request was successful');
        }
      }
      
      if (debugMode) {
        console.log('🔍 DEBUG: ✅ Background processing success response:', responseData);
        console.log('🔍 DEBUG: === BACKGROUND PROCESSING SCHEDULED SUCCESSFULLY ===');
      } else {
        console.log('Background processing success response:', responseData);
        console.log('✅ Background processing scheduled successfully');
      }
      
    } catch (vercelError: any) {
      console.error('❌ VERCEL BACKGROUND PROCESSING ERROR:', vercelError.message);
      if (debugMode) {
        console.log('🔍 DEBUG: ❌ Vercel background processing failed:', vercelError);
      }
      throw vercelError; // Re-throw to be handled by calling function
    }
    
  } else {
    // Local development fallback - enhanced with better error handling
    const localPort = process.env.PORT || '3000';
    const localUrl = `http://localhost:${localPort}/api/events/process`;
    
    if (debugMode) {
      console.log('🔍 DEBUG: Running in local development mode');
      console.log('🔍 DEBUG: Local background processor URL:', localUrl);
    } else {
      console.log(`Running in local development, making async request to background processor: ${localUrl}`);
    }
    
    // Build comprehensive authentication headers for local development
    const localHeaders = {
      'Content-Type': 'application/json',
      'x-vercel-background': '1',
      'x-internal-call': '1',
      'User-Agent': 'where2go-internal'
    };
    
    if (debugMode) {
      console.log('🔍 DEBUG: Local development authentication headers:', localHeaders);
    } else {
      console.log('Local development authentication headers:', localHeaders);
    }
    
    const requestBody = {
      jobId,
      city,
      date,
      categories,
      options
    };
    
    // Fire and forget request for local development with enhanced error logging
    fetch(localUrl, {
      method: 'POST',
      headers: localHeaders,
      body: JSON.stringify(requestBody)
    }).then(response => {
      if (!response.ok) {
        console.error(`❌ Local background processing failed: ${response.status} ${response.statusText}`);
        if (debugMode) {
          console.log('🔍 DEBUG: ❌ Local background processing request failed');
        }
      } else {
        if (debugMode) {
          console.log('🔍 DEBUG: ✅ Local background processing scheduled successfully');
        } else {
          console.log('✅ Local background processing scheduled successfully');
        }
      }
    }).catch(error => {
      console.error('❌ Local development background request failed:', error);
      if (debugMode) {
        console.log('🔍 DEBUG: ❌ Local development background request failed:', error);
      }
    });
  }
}



export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { city, date, categories, options } = body;

    // Check for debug mode from options
    const debugMode = options?.debug || false;
    
    if (debugMode) {
      console.log('\n=== EVENTS API DEBUG MODE ENABLED ===');
      console.log('🔍 DEBUG: Request received:', { city, date, categories, options });
    }

    if (!city || !date) {
      return NextResponse.json(
        { error: 'Stadt und Datum sind erforderlich' },
        { status: 400 }
      );
    }

    // Use provided categories or defaults
    const effectiveCategories = categories && categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    
    // Merge options with defaults, preserving the original options
    const mergedOptions = { 
      ...DEFAULT_PPLX_OPTIONS,
      ...(options || {})
    };
    
    if (debugMode) {
      console.log('🔍 DEBUG: Effective categories:', effectiveCategories);
      console.log('🔍 DEBUG: Merged options:', mergedOptions);
    }

    // Check cache for all categories
    const cacheResult = eventsCache.getEventsByCategories(city, date, effectiveCategories);
    const allCachedEvents = Object.values(cacheResult.cachedEvents).flat();
    const missingCategories = cacheResult.missingCategories;

    if (debugMode) {
      console.log('🔍 DEBUG: Cache analysis results:', {
        totalCategories: effectiveCategories.length,
        cachedCategories: Object.keys(cacheResult.cachedEvents).length,
        cachedEvents: allCachedEvents.length,
        missingCategories: missingCategories.length
      });
      console.log('🔍 DEBUG: Cached categories:', Object.keys(cacheResult.cachedEvents));
      console.log('🔍 DEBUG: Missing categories:', missingCategories);
    } else {
      console.log(`Cache analysis: ${Object.keys(cacheResult.cachedEvents).length}/${effectiveCategories.length} categories cached, ${allCachedEvents.length} events from cache`);
      console.log('Cached categories:', Object.keys(cacheResult.cachedEvents));
      console.log('Missing categories:', missingCategories);
    }

    // If all categories are cached, return immediately
    if (missingCategories.length === 0) {
      if (debugMode) {
        console.log('🔍 DEBUG: ✅ All categories cached - returning directly without background processing');
        console.log('🔍 DEBUG: Total cached events:', allCachedEvents.length);
      } else {
        console.log('✅ All categories cached - returning directly');
      }
      return NextResponse.json({
        events: allCachedEvents,
        status: 'completed',
        cached: true,
        message: allCachedEvents.length > 0 
          ? `${allCachedEvents.length} Events aus dem Cache geladen`
          : 'Keine Events gefunden'
      });
    }

    // Create simple job for missing categories
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (debugMode) {
      console.log('🔍 DEBUG: Creating job for missing categories:', {
        jobId,
        missingCategoriesCount: missingCategories.length,
        existingCachedEvents: allCachedEvents.length
      });
    }
    
    const job: JobStatus = {
      id: jobId,
      status: 'pending',
      events: allCachedEvents,
      createdAt: new Date(),
      progress: {
        completedCategories: effectiveCategories.length - missingCategories.length,
        totalCategories: effectiveCategories.length
      }
    };

    try {
      await jobStore.setJob(jobId, job);
      if (debugMode) {
        console.log(`🔍 DEBUG: ✅ Job created successfully:`, {
          jobId,
          status: job.status,
          events: job.events?.length || 0,
          initialProgress: job.progress
        });
      } else {
        console.log(`Job created successfully with ID: ${jobId}, status: ${job.status}, events: ${job.events?.length || 0}`);
      }
    } catch (jobStoreError) {
      console.error('Failed to create job in JobStore:', jobStoreError);
      if (debugMode) {
        console.log('🔍 DEBUG: ❌ Failed to create job in JobStore:', jobStoreError);
      }
      return NextResponse.json(
        { error: 'Service nicht verfügbar - Redis Konfiguration erforderlich' },
        { status: 500 }
      );
    }

    // Map subcategories to main categories for AI calls
    const mainCategoriesForAI = getMainCategoriesForAICalls(missingCategories);
    
    if (debugMode) {
      console.log('🔍 DEBUG: Category mapping for AI calls:', {
        originalMissingCategories: missingCategories,
        mappedMainCategories: mainCategoriesForAI
      });
    } else {
      console.log(`Original missing categories (subcategories): ${missingCategories.length} - [${missingCategories.join(', ')}]`);
      console.log(`Mapped to main categories for AI calls: ${mainCategoriesForAI.length} - [${mainCategoriesForAI.join(', ')}]`);
    }

    // Schedule background processing (await to catch immediate errors)
    try {
      if (debugMode) {
        console.log('🔍 DEBUG: Attempting to schedule background processing with debug mode enabled');
        console.log('🔍 DEBUG: Request headers available for scheduling:', {
          host: request.headers.get('host'),
          'x-vercel-deployment-url': request.headers.get('x-vercel-deployment-url'),
          'x-forwarded-host': request.headers.get('x-forwarded-host'),
          'user-agent': request.headers.get('user-agent')
        });
      }
      
      await scheduleBackgroundProcessing(request, jobId, city, date, mainCategoriesForAI, mergedOptions);
      
      if (debugMode) {
        console.log('🔍 DEBUG: ✅ Background processing scheduled successfully');
      } else {
        console.log('✅ Background processing scheduled successfully');
      }
    } catch (scheduleError: any) {
      const errorMessage = `Failed to schedule background processing: ${scheduleError.message}`;
      console.error('❌ SCHEDULE ERROR:', errorMessage);
      console.error('❌ Full schedule error:', scheduleError);
      
      if (debugMode) {
        console.log('🔍 DEBUG: ❌ SCHEDULING FAILED:', {
          error: scheduleError.message,
          stack: scheduleError.stack,
          jobId,
          city,
          date,
          mainCategoriesForAI,
          mergedOptions
        });
      }
      
      // Update job to error state with detailed error information
      try {
        await jobStore.updateJob(jobId, {
          status: 'error',
          error: `Background processing scheduling failed: ${scheduleError.message}`,
          lastUpdateAt: new Date().toISOString()
        });
        
        if (debugMode) {
          console.log('🔍 DEBUG: ✅ Job updated with error status after scheduling failure');
        } else {
          console.log('Job updated with error status after scheduling failure');
        }
      } catch (updateError) {
        console.error('❌ CRITICAL: Failed to update job status after scheduling error:', updateError);
        if (debugMode) {
          console.log('🔍 DEBUG: ❌ CRITICAL: Could not update job status after scheduling failure');
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to schedule background processing',
          details: debugMode ? scheduleError.message : undefined,
          jobId: debugMode ? jobId : undefined
        },
        { status: 500 }
      );
    }

    // Return job for polling
    if (debugMode) {
      console.log('🔍 DEBUG: ✅ Returning job for polling:', {
        jobId,
        status: 'partial',
        cachedEvents: allCachedEvents.length,
        missingCategories: missingCategories.length,
        progress: {
          completedCategories: effectiveCategories.length - missingCategories.length,
          totalCategories: effectiveCategories.length
        }
      });
      console.log('🔍 DEBUG: === EVENTS API DEBUG COMPLETE ===\n');
    }
    
    return NextResponse.json({
      jobId,
      status: 'partial',
      events: allCachedEvents,
      cached: allCachedEvents.length > 0,
      processing: true,
      progress: {
        completedCategories: effectiveCategories.length - missingCategories.length,
        totalCategories: effectiveCategories.length
      },
      message: allCachedEvents.length > 0 
        ? `${allCachedEvents.length} Events aus dem Cache geladen, ${missingCategories.length} Kategorien werden verarbeitet...`
        : `${missingCategories.length} Kategorien werden verarbeitet...`
    });

  } catch (error) {
    console.error('❌ Events API Error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}
