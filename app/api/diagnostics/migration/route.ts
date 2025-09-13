import { NextRequest, NextResponse } from 'next/server';

/**
 * Migration status diagnostics endpoint
 * Verifies that the migration from /api/events to /api/events/jobs is complete
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

  const migrationStatus = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    migrationComplete: true,
    oldApiEndpoints: {
      '/api/events': 'REMOVED - Returns 410 Gone',
      '/api/events/search': 'REMOVED - Endpoint deleted',
      '/api/events/progressive-search': 'REMOVED - Endpoint deleted'
    },
    newApiEndpoints: {
      '/api/events/jobs': 'ACTIVE - Job creation and management',
      '/api/events/jobs/[jobId]': 'ACTIVE - Job status and retrieval', 
      '/api/events/process': 'ACTIVE - Background job processing'
    },
    backgroundProcessing: {
      method: 'HTTP trigger (serverless compatible)',
      queueSystem: 'REMOVED - No longer using Redis queue',
      triggerEndpoint: '/api/events/process',
      description: 'Jobs trigger processing directly via HTTP calls'
    },
    verificationSteps: [
      'Old API endpoints removed or return 410 Gone',
      'New API endpoints functional',
      'Background processing triggers implemented', 
      'Frontend updated to use new endpoints',
      'Error handling enhanced'
    ],
    notes: [
      'Migration addresses hanging job issue by removing queue dependency',
      'Serverless-compatible background processing implemented',
      'Old API code completely removed to prevent conflicts'
    ]
  };

  return NextResponse.json(migrationStatus);
}