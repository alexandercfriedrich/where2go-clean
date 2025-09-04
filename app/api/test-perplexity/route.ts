import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    console.log('=== Perplexity API Debug Test ===');
    console.log('API Key present:', !!PERPLEXITY_API_KEY);
    console.log('API Key starts with pplx-:', PERPLEXITY_API_KEY?.startsWith('pplx-'));
    console.log('API Key length:', PERPLEXITY_API_KEY?.length);
    console.log('API Key first 8 chars:', PERPLEXITY_API_KEY?.slice(0, 8));

    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json({
        error: 'PERPLEXITY_API_KEY environment variable is not set',
        success: false,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    if (!PERPLEXITY_API_KEY.startsWith('pplx-')) {
      return NextResponse.json({
        error: 'Invalid API key format - should start with pplx-',
        success: false,
        keyFormat: {
          startsWithPplx: PERPLEXITY_API_KEY.startsWith('pplx-'),
          length: PERPLEXITY_API_KEY.length,
          first8: PERPLEXITY_API_KEY.slice(0, 8)
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    console.log('Testing Perplexity API with sonar-pro model...');

    // Test with sonar-pro model
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Test request timed out after 15 seconds');
      controller.abort();
    }, 15000);

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [{ 
            role: 'user', 
            content: 'Test connectivity. Respond with: "API test successful"' 
          }],
          max_tokens: 10,
          temperature: 0
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      // Log headers safely
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('Response headers:', headers);

      const responseText = await response.text();
      console.log('Raw response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        return NextResponse.json({
          success: false,
          error: 'Invalid JSON response from Perplexity API',
          details: {
            status: response.status,
            statusText: response.statusText,
            rawResponse: responseText.slice(0, 500) // Limit response size
          },
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

      if (!response.ok) {
        console.error('API request failed:', data);
        return NextResponse.json({
          success: false,
          error: `Perplexity API error: ${response.status} ${response.statusText}`,
          details: {
            status: response.status,
            statusText: response.statusText,
            errorData: data
          },
          timestamp: new Date().toISOString()
        }, { status: response.status });
      }

      console.log('API test successful:', data);

      return NextResponse.json({
        success: true,
        message: 'Perplexity API test successful',
        details: {
          status: response.status,
          statusText: response.statusText,
          model: 'sonar-pro',
          responseContent: data.choices?.[0]?.message?.content || 'No content',
          usage: data.usage || 'No usage info'
        },
        timestamp: new Date().toISOString()
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      console.error('Fetch error:', fetchError);
      
      let errorDetails = {
        name: fetchError.name,
        message: fetchError.message,
        code: fetchError.code,
        cause: fetchError.cause
      };

      if (fetchError.name === 'AbortError') {
        errorDetails.message = 'Request timeout after 15 seconds';
      }

      return NextResponse.json({
        success: false,
        error: 'Network error while calling Perplexity API',
        details: errorDetails,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Test endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test endpoint internal error',
      details: {
        name: error.name,
        message: error.message,
        stack: error.stack?.slice(0, 500) // Limit stack trace
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}