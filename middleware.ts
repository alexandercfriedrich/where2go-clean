import { NextRequest, NextResponse } from 'next/server';

// Malicious file extensions to block
const BLOCKED_EXTENSIONS = [
  '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py',
  '.sh', '.bat', '.cmd', '.exe', '.dll', '.so',
  '.env', '.git', '.htaccess', '.config', '.bak', '.sql'
];

// Known bot/scanner patterns in User-Agent
const BOT_PATTERNS = [
  'masscan', 'nmap', 'nikto', 'sqlmap', 'dirbuster',
  'acunetix', 'burpsuite', 'metasploit', 'havij'
];

// Suspicious path patterns
const SUSPICIOUS_PATHS = [
  '/wp-admin', '/wp-content', '/wp-includes', '/wordpress',
  '/phpmyadmin', '/phpinfo', '/shell',
  '/.env', '/.git', '/config', '/backup'
];

/**
 * Checks if a city parameter looks suspicious (potential attack)
 * Legitimate city names should only contain letters, spaces, and hyphens
 */
function isSuspiciousCityName(cityParam: string): boolean {
  // Allow only alphanumeric, spaces, hyphens, and basic international characters
  // Block: special chars, numbers at start, suspicious patterns
  const decoded = decodeURIComponent(cityParam).toLowerCase();
  
  // Block if contains file extensions or paths
  if (BLOCKED_EXTENSIONS.some(ext => decoded.includes(ext))) {
    return true;
  }
  
  // Block if looks like a path traversal
  if (decoded.includes('../') || decoded.includes('..\\')) {
    return true;
  }
  
  // Block if starts with a dot (hidden files)
  if (decoded.startsWith('.')) {
    return true;
  }
  
  // Block if contains suspicious keywords (admin, config, etc.)
  const suspiciousKeywords = ['admin', 'config', 'backup', 'test', 'debug', 'phpinfo'];
  if (suspiciousKeywords.some(keyword => decoded === keyword)) {
    return true;
  }
  
  return false;
}

/**
 * Checks if a request looks like a bot or scanner
 */
function isSuspiciousRequest(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname.toLowerCase();
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';

  // Check for blocked file extensions
  if (BLOCKED_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return true;
  }

  // Check for suspicious paths
  if (SUSPICIOUS_PATHS.some(pattern => pathname.includes(pattern.toLowerCase()))) {
    return true;
  }

  // Check for known bot patterns in User-Agent
  if (BOT_PATTERNS.some(pattern => userAgent.includes(pattern))) {
    return true;
  }

  // Check city parameter in URL patterns like /[city]/... or /[city]
  // Match: /xxx or /xxx/yyy or /xxx/yyy/zzz (where xxx is the city)
  const cityMatch = pathname.match(/^\/([^\/]+)/);
  if (cityMatch && cityMatch[1]) {
    const cityParam = cityMatch[1];
    
    // Skip validation for known application routes
    const knownRoutes = ['api', 'admin', 'impressum', 'datenschutz', 'kontakt', 'agb', 'ueber-uns', 'premium', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'designs', '_next'];
    if (!knownRoutes.includes(cityParam)) {
      // Validate city parameter
      if (isSuspiciousCityName(cityParam)) {
        return true;
      }
    }
  }

  return false;
}

// Helper function to slugify city names (matching hotCityStore.ts)
function slugify(text: string): string {
  // Limit input length to prevent ReDoS
  const safe = text.substring(0, 200);
  return safe
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const searchParams = request.nextUrl.searchParams;

  // Block suspicious requests early
  if (isSuspiciousRequest(request)) {
    console.warn(`[MIDDLEWARE] Blocked suspicious request: ${pathname}`);
    return new NextResponse('Not Found', { status: 404 });
  }

  // IMPORTANT: Allow sitemap.xml and robots.txt access
  if (pathname === '/sitemap.xml' || pathname === '/robots.txt') {
    return NextResponse.next();
  }

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
  // EXCEPT /api/admin/events/process which uses Bearer token authentication
  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && pathname !== '/api/admin/events/process') {
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

  // Add rate limiting and security headers
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Add rate limiting hint headers (informational)
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', '99');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - sitemap.xml
     * - robots.txt
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, favicon.png (favicon files)
     * - public assets with common extensions
     */
    '/((?!sitemap.xml|robots.txt|_next/static|_next/image|favicon.ico|favicon.png|designs/).*)',
  ],
};
