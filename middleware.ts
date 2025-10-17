import { NextRequest, NextResponse } from 'next/server';

// Helper function to slugify city names (matching hotCityStore.ts)
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const searchParams = request.nextUrl.searchParams;

  // Legacy: /?city=...&date=...
  if (pathname === '/' && searchParams.has('city')) {
    const cityParam = searchParams.get('city') || '';
    const dateParam = (searchParams.get('date') || 'heute').toLowerCase();
    const citySlug = slugify(cityParam);

    const newUrl = new URL(`/${citySlug}/${dateParam}`, request.url);

    ['filter', 'sort'].forEach((k) => {
      const v = searchParams.get(k);
      if (v) newUrl.searchParams.set(k, v);
    });

    return NextResponse.redirect(newUrl, 301);
  }

  // Kleinbuchstaben-Normalisierung (SEO) - only for city routes
  if (pathname.match(/^\/[^\/]+/) && pathname !== pathname.toLowerCase()) {
    return NextResponse.redirect(new URL(pathname.toLowerCase() + request.nextUrl.search, request.url), 301);
  }

  // Protect /admin and /api/admin paths with Basic Auth
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const authHeader = request.headers.get('authorization');
    
    // Check for Basic Auth
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
        },
      });
    }

    // Decode Basic Auth credentials 
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');

    // Get credentials from environment variables
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    // Check if environment variables are set
    if (!adminUser || !adminPass) {
      return new NextResponse('Admin credentials not configured', {
        status: 500,
      });
    }

    // Verify credentials
    if (username !== adminUser || password !== adminPass) {
      return new NextResponse('Invalid credentials', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
        },
      });
    }

    // Authentication successful, continue to the requested resource
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/:city*', '/admin/:path*', '/api/admin/:path*'],
};
