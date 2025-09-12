import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobStore';

/**
 * Diagnostics endpoint for JobStore verification
 * Tests Redis connectivity and set/get/delete operations
 * 
 * In production: Requires x-internal-secret header matching INTERNAL_API_SECRET
 * In development: Open for convenience
 */
export async function GET(req: NextRequest) {
  // Security check for production
  if (process.env.NODE_ENV === 'production') {
    const internalSecret = process.env.INTERNAL_API_SECRET;
    const providedSecret = req.headers.get('x-internal-secret');
    
    if (!internalSecret || providedSecret !== internalSecret) {
      return NextResponse.json(
        { error: 'Unauthorized - x-internal-secret header required in production' },
        { status: 401 }
      );
    }
  }

  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    redisConfigured: false,
    usingRedis: false, // Keep old field name for compatibility
    connectivityOk: false,
    setGetOk: false, // Keep old field name for compatibility
    roundtripOk: false,
    error: null
  };

  try {
    // Check if Redis environment variables are configured
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    results.redisConfigured = !!(redisUrl && redisToken);
    results.usingRedis = results.redisConfigured; // Keep old field for compatibility
    
    if (!results.redisConfigured) {
      results.error = 'Redis environment variables not configured (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)';
      results.connectivityOk = false;
      results.roundtripOk = false;
      results.setGetOk = false;
      return NextResponse.json(results);
    }
    
    // Try to create JobStore instance to test connectivity
    try {
      const jobStore = getJobStore();
      results.connectivityOk = true;
      
      // Test set/get/delete operations with a diagnostic test job
      const testJobId = `diagnostic-test-${Date.now()}`;
      const testJob = {
        id: testJobId,
        status: 'pending' as const,
        createdAt: new Date()
      };

      // Test set operation
      await jobStore.setJob(testJobId, testJob);
      
      // Test get operation
      const retrievedJob = await jobStore.getJob(testJobId);
      const getWorked = retrievedJob?.id === testJobId && retrievedJob?.status === 'pending';
      
      // Test delete operation
      await jobStore.deleteJob(testJobId);
      
      // Verify deletion worked
      const deletedJob = await jobStore.getJob(testJobId);
      const deleteWorked = deletedJob === null;
      
      results.roundtripOk = getWorked && deleteWorked;
      results.setGetOk = results.roundtripOk; // Keep old field for compatibility
      
      if (!results.roundtripOk) {
        results.error = 'Redis roundtrip test failed - operations did not complete as expected';
      }
    } catch (jobStoreError: any) {
      results.connectivityOk = false;
      results.roundtripOk = false;
      results.setGetOk = false;
      results.error = `JobStore creation or operation failed: ${jobStoreError.message}`;
    }

  } catch (error: any) {
    results.error = error.message || 'Unknown error during diagnostics';
    results.connectivityOk = false;
    results.roundtripOk = false;
    results.setGetOk = false;
  }

  return NextResponse.json(results);
}