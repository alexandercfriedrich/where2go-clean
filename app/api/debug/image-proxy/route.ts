import { NextRequest, NextResponse } from 'next/server';
import { getImageUrl, diagnoseImageProxy } from '@/lib/utils/imageProxy';

/**
 * Debug API endpoint to test image proxy functionality
 * 
 * Usage:
 * GET /api/debug/image-proxy?url=https://example.com/image.jpg
 * GET /api/debug/image-proxy?test=sample
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const testUrl = searchParams.get('url');
  const runTest = searchParams.get('test');

  // Test with sample URLs
  if (runTest === 'sample') {
    const sampleUrls = [
      'https://www.ticketmaster.com/image.jpg',
      'https://example.com/event-poster.png',
      'https://my-project.supabase.co/storage/image.jpg',
      '/local/image.jpg',
      null,
      'invalid-url',
      ''
    ];

    const results = sampleUrls.map(url => ({
      input: url,
      output: getImageUrl(url),
      isProxied: getImageUrl(url).includes('weserv.nl'),
      isPlaceholder: getImageUrl(url).includes('unsplash.com')
    }));

    return NextResponse.json({
      message: 'Image proxy diagnostics',
      results,
      summary: {
        total: results.length,
        proxied: results.filter(r => r.isProxied).length,
        placeholders: results.filter(r => r.isPlaceholder).length,
        passthrough: results.filter(r => !r.isProxied && !r.isPlaceholder).length
      }
    });
  }

  // Test with specific URL
  if (testUrl) {
    const result = getImageUrl(testUrl);
    
    return NextResponse.json({
      input: testUrl,
      output: result,
      isProxied: result.includes('weserv.nl'),
      isPlaceholder: result.includes('unsplash.com'),
      analysis: {
        inputLength: testUrl.length,
        startsWithHttp: testUrl.startsWith('http'),
        includesSupabase: testUrl.includes('supabase'),
        isLocal: testUrl.startsWith('/')
      }
    });
  }

  return NextResponse.json({
    message: 'Image Proxy Debug Endpoint',
    usage: {
      testSample: '/api/debug/image-proxy?test=sample',
      testUrl: '/api/debug/image-proxy?url=https://example.com/image.jpg'
    }
  });
}
