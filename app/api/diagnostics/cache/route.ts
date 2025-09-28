import { NextRequest, NextResponse } from 'next/server';
import { getCacheMetricsSummary, logCacheMetrics } from '@/lib/cache-metrics';
import { getEventsCache } from '@/lib/redis-cache';

export const runtime = 'nodejs';

/**
 * Cache Diagnostics API
 * 
 * Provides cache health monitoring and metrics
 * GET /api/diagnostics/cache
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication in production
    if (process.env.NODE_ENV === 'production') {
      const secret = request.headers.get('x-internal-secret');
      if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const cache = getEventsCache();
    const metrics = getCacheMetricsSummary();
    
    // Test cache connectivity
    let cacheHealthy = false;
    let cacheType = 'unknown';
    let testError: string | null = null;

    try {
      // Test basic cache operations
      const testKey = `diagnostics_test_${Date.now()}`;
      const testValue = { test: true, timestamp: new Date().toISOString() };
      
      await cache.set(testKey, testValue, 60); // 1 minute TTL
      const retrieved = await cache.get(testKey);
      await cache.delete(testKey);
      
      cacheHealthy = retrieved !== null && retrieved.test === true;
      
      // Determine cache type based on environment
      if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
        cacheType = 'redis';
      } else {
        cacheType = 'memory';
      }
    } catch (error) {
      testError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Environment info
    const environment = process.env.NODE_ENV || 'development';
    const redisConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

    const diagnosticsResult = {
      timestamp: new Date().toISOString(),
      environment,
      cache: {
        type: cacheType,
        healthy: cacheHealthy,
        redisConfigured,
        testError
      },
      metrics: {
        hitRate: metrics.hitRate,
        totalOperations: metrics.totalOperations,
        errorRate: metrics.errorRate,
        corruptionRate: metrics.corruptionRate,
        topPatterns: metrics.topPatterns.slice(0, 5) // Limit to top 5
      },
      keyNormalization: {
        examples: [
          {
            input: 'wien_2025-09-28_Comedy/Kabarett',
            normalized: 'wien_2025-09-28_comedy_kabarett'
          },
          {
            input: 'berlin_2025-01-01_DJ Sets/Electronic',
            normalized: 'berlin_2025-01-01_dj_sets_electronic'
          }
        ]
      }
    };

    // Log metrics if requested
    const shouldLog = request.nextUrl.searchParams.get('log') === '1';
    if (shouldLog) {
      logCacheMetrics();
    }

    return NextResponse.json(diagnosticsResult);

  } catch (error) {
    console.error('Cache diagnostics error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get cache diagnostics',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

/**
 * Cache Management Operations
 * POST /api/diagnostics/cache
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication in production
    if (process.env.NODE_ENV === 'production') {
      const secret = request.headers.get('x-internal-secret');
      if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();
    const { action } = body;

    const cache = getEventsCache();

    switch (action) {
      case 'cleanup':
        await cache.cleanup();
        return NextResponse.json({ 
          success: true, 
          message: 'Cache cleanup completed',
          timestamp: new Date().toISOString()
        });

      case 'test_serialization':
        // Test with problematic data that used to cause "[object Object]" issues
        const testData = [
          {
            title: 'Test Event',
            category: 'Comedy/Kabarett',
            date: '2025-09-28',
            createdAt: new Date(),
            nested: {
              venue: 'Test Venue',
              price: '€20'
            }
          }
        ];
        
        const testKey = `serialization_test_${Date.now()}`;
        await cache.set(testKey, testData, 60);
        const retrieved = await cache.get(testKey);
        await cache.delete(testKey);
        
        return NextResponse.json({
          success: true,
          roundTripSuccessful: retrieved !== null,
          originalLength: testData.length,
          retrievedLength: retrieved ? retrieved.length : 0,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: cleanup, test_serialization' }, 
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Cache management error:', error);
    return NextResponse.json(
      { 
        error: 'Cache management operation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}