import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('=== Authentication Flow Test ===');
    
    // Test the same validation logic as the /api/events/process endpoint
    const isInternalRequest = 
      req.headers.get('x-vercel-background') === '1' ||
      req.headers.get('x-internal-call') === '1' ||
      req.headers.get('user-agent')?.includes('where2go-internal') ||
      req.headers.get('user-agent')?.includes('node');
    
    console.log('Authentication headers analysis:', {
      'x-vercel-background': req.headers.get('x-vercel-background'),
      'x-internal-call': req.headers.get('x-internal-call'),
      'x-internal-secret': req.headers.get('x-internal-secret') ? 'SET' : 'NOT_SET',
      'x-vercel-protection-bypass': req.headers.get('x-vercel-protection-bypass') ? 'SET' : 'NOT_SET',
      'user-agent': req.headers.get('user-agent'),
      'isInternalRequest': isInternalRequest
    });

    return NextResponse.json({
      success: true,
      message: 'Authentication test endpoint',
      isInternalRequest,
      headers: {
        'x-vercel-background': req.headers.get('x-vercel-background'),
        'x-internal-call': req.headers.get('x-internal-call'),
        'x-internal-secret': req.headers.get('x-internal-secret') ? 'SET' : 'NOT_SET',
        'x-vercel-protection-bypass': req.headers.get('x-vercel-protection-bypass') ? 'SET' : 'NOT_SET',
        'user-agent': req.headers.get('user-agent'),
        'host': req.headers.get('host')
      },
      validation: {
        hasVercelBackground: req.headers.get('x-vercel-background') === '1',
        hasInternalCall: req.headers.get('x-internal-call') === '1', 
        hasInternalUserAgent: req.headers.get('user-agent')?.includes('where2go-internal') || false,
        hasNodeUserAgent: req.headers.get('user-agent')?.includes('node') || false
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Auth test endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Auth test endpoint internal error',
      details: {
        name: error.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('=== Authentication Flow Test (POST) ===');
    
    // Test the same validation logic as the /api/events/process endpoint
    const isInternalRequest = 
      req.headers.get('x-vercel-background') === '1' ||
      req.headers.get('x-internal-call') === '1' ||
      req.headers.get('user-agent')?.includes('where2go-internal') ||
      req.headers.get('user-agent')?.includes('node');
    
    if (!isInternalRequest) {
      console.log('⚠️ External request detected, blocking access');
      return NextResponse.json({ error: 'Internal endpoint only' }, { status: 403 });
    }

    console.log('✅ Authentication test: Valid internal request received');

    const body = await req.json().catch(() => ({}));

    return NextResponse.json({
      success: true,
      message: 'Authentication test successful - internal request validated',
      isInternalRequest,
      requestBody: body,
      headers: {
        'x-vercel-background': req.headers.get('x-vercel-background'),
        'x-internal-call': req.headers.get('x-internal-call'),
        'x-internal-secret': req.headers.get('x-internal-secret') ? 'SET' : 'NOT_SET',
        'x-vercel-protection-bypass': req.headers.get('x-vercel-protection-bypass') ? 'SET' : 'NOT_SET',
        'user-agent': req.headers.get('user-agent'),
        'host': req.headers.get('host')
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Auth test endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Auth test endpoint internal error',
      details: {
        name: error.name,
        message: error.message
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}