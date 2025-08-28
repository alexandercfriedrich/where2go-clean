import { NextRequest, NextResponse } from 'next/server';
import { createJobStore } from '@/lib/jobStore';

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
    usingRedis: false,
    setGetOk: false,
    error: null
  };

  try {
    // Check if Redis environment variables are configured
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    results.usingRedis = !!(redisUrl && redisToken);
    
    // Create JobStore instance to test connectivity
    const jobStore = createJobStore();
    
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
    
    results.setGetOk = getWorked && deleteWorked;
    
    if (!results.setGetOk) {
      results.error = 'Set/get/delete roundtrip test failed';
    }

  } catch (error: any) {
    results.error = error.message || 'Unknown error during diagnostics';
    results.setGetOk = false;
  }

  return NextResponse.json(results);
}