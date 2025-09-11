import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('=== End-to-End Authentication Flow Test ===');
    
    // Test the complete flow from events endpoint to process endpoint
    const isVercel = process.env.VERCEL === '1';
    const testMode = req.nextUrl.searchParams.get('mode') || 'production';
    
    console.log(`Testing in ${testMode} mode, isVercel: ${isVercel}`);
    
    // Simulate the exact same logic as scheduleBackgroundProcessing
    let host: string;
    let protocol: string;
    let backgroundUrl: string;
    
    if (testMode === 'production' || isVercel) {
      // Mimic Vercel production/preview logic
      const deploymentUrl = req.headers.get('x-vercel-deployment-url');
      host = deploymentUrl || req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
      protocol = 'https';
      backgroundUrl = `${protocol}://${host}/api/test-auth`;
    } else {
      // Local development
      host = 'localhost:3000';
      protocol = 'http';
      backgroundUrl = `${protocol}://${host}/api/test-auth`;
    }
    
    console.log(`Target URL: ${backgroundUrl}`);
    
    // Set up headers exactly as done in scheduleBackgroundProcessing
    const protectionBypass = process.env.PROTECTION_BYPASS_TOKEN;
    const internalSecret = process.env.INTERNAL_API_SECRET;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-vercel-background': '1',
      'x-internal-call': '1',
      'User-Agent': 'where2go-internal'
    };
    
    if (protectionBypass) {
      headers['x-vercel-protection-bypass'] = protectionBypass;
    }
    if (internalSecret) {
      headers['x-internal-secret'] = internalSecret;
    }
    
    console.log('Request headers being sent:', {
      ...headers,
      'x-vercel-protection-bypass': headers['x-vercel-protection-bypass'] ? 'SET' : 'NOT_SET',
      'x-internal-secret': headers['x-internal-secret'] ? 'SET' : 'NOT_SET'
    });
    
    // Test 1: GET request to check authentication (should pass without internal validation)
    console.log('\n--- Test 1: GET request to auth test endpoint ---');
    const getResponse = await fetch(backgroundUrl, {
      method: 'GET',
      headers: headers
    });
    
    const getResult = await getResponse.json();
    console.log('GET response:', getResult);
    
    // Test 2: POST request to simulate actual background processing (should validate internal)
    console.log('\n--- Test 2: POST request to auth test endpoint ---');
    const postResponse = await fetch(backgroundUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        test: 'authentication_flow',
        jobId: 'test_job_123',
        timestamp: new Date().toISOString()
      })
    });
    
    const postResult = await postResponse.json();
    console.log('POST response:', postResult);
    
    // Test 3: Verify environment variables
    console.log('\n--- Test 3: Environment validation ---');
    const envCheck = {
      VERCEL: process.env.VERCEL,
      PROTECTION_BYPASS_TOKEN: process.env.PROTECTION_BYPASS_TOKEN ? 'SET' : 'NOT_SET',
      INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET ? 'SET' : 'NOT_SET',
      PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY ? 'SET' : 'NOT_SET'
    };
    console.log('Environment variables:', envCheck);
    
    // Compile results
    const testResults = {
      success: true,
      message: 'End-to-end authentication flow test completed',
      environment: {
        isVercel,
        testMode,
        targetUrl: backgroundUrl,
        envVars: envCheck
      },
      tests: {
        getRequest: {
          status: getResponse.status,
          success: getResponse.ok,
          result: getResult
        },
        postRequest: {
          status: postResponse.status,
          success: postResponse.ok,
          result: postResult
        }
      },
      summary: {
        allTestsPassed: getResponse.ok && postResponse.ok,
        authenticationWorking: postResult.success && postResult.isInternalRequest,
        issuesFound: [] as string[]
      },
      timestamp: new Date().toISOString()
    };
    
    // Analyze for issues
    if (!getResponse.ok) {
      testResults.summary.issuesFound.push('GET request failed');
    }
    if (!postResponse.ok) {
      testResults.summary.issuesFound.push('POST request failed - authentication not working');
    }
    if (!postResult.isInternalRequest) {
      testResults.summary.issuesFound.push('Internal request validation failed');
    }
    
    console.log('\n--- Test Summary ---');
    console.log(`All tests passed: ${testResults.summary.allTestsPassed}`);
    console.log(`Authentication working: ${testResults.summary.authenticationWorking}`);
    console.log(`Issues found: ${testResults.summary.issuesFound.length}`);
    if (testResults.summary.issuesFound.length > 0) {
      console.log('Issues:', testResults.summary.issuesFound);
    }
    
    return NextResponse.json(testResults);

  } catch (error: any) {
    console.error('E2E test endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'E2E test endpoint internal error',
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack?.slice(0, 500)
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}