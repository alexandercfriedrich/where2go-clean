# Bot & Spam Protection Implementation

## Overview
This document describes the bot and spam protection features implemented to prevent malicious requests and resource waste in the Where2Go event platform.

## Problem Statement
The application was receiving numerous malicious requests that were consuming server resources:

1. **PHP File Scanner Requests**: Bots scanning for vulnerable PHP files (e.g., `/test.php`, `/admin.php`, `/shell.php`)
2. **Environment File Probes**: Attempts to access `.env`, `.git`, and configuration files
3. **WordPress Scanner Attacks**: Requests to `/wp-admin`, `/wp-content`, and other WordPress paths
4. **Invalid City Names**: Spam requests to non-existent cities like `/ibiza/museen/wochenende` generating pages unnecessarily
5. **Resource Waste**: Each malicious request triggered full page rendering in Next.js

## Implementation

### 1. Middleware-Based Bot Detection

**File**: `middleware.ts`

The middleware now includes early detection and blocking of suspicious requests:

#### Blocked File Extensions
```typescript
const BLOCKED_EXTENSIONS = [
  '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py',
  '.sh', '.bat', '.cmd', '.exe', '.dll', '.so',
  '.env', '.git', '.htaccess', '.config', '.bak', '.sql'
];
```

#### Suspicious Path Patterns
```typescript
const SUSPICIOUS_PATHS = [
  '/wp-admin', '/wp-content', '/wp-includes', '/wordpress',
  '/admin/', '/phpmyadmin', '/phpinfo', '/shell',
  '/.env', '/.git', '/config', '/backup'
];
```

#### Bot User-Agent Patterns
```typescript
const BOT_PATTERNS = [
  'masscan', 'nmap', 'nikto', 'sqlmap', 'dirbuster',
  'acunetix', 'burpsuite', 'metasploit', 'havij'
];
```

#### Request Validation
The `isSuspiciousRequest()` function checks:
- Request pathname for blocked file extensions
- Request pathname for suspicious path patterns
- User-Agent header for known scanner patterns

Suspicious requests receive a `404 Not Found` response immediately, preventing any page rendering.

### 2. Security Headers

All legitimate requests receive additional security headers:

```typescript
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'SAMEORIGIN'
'X-XSS-Protection': '1; mode=block'
'X-RateLimit-Limit': '100'
'X-RateLimit-Remaining': '99'
```

These headers help protect against:
- MIME type sniffing attacks
- Clickjacking via iframes
- Cross-site scripting (XSS) attacks
- Provide rate limiting hints to clients

### 3. City Name Validation (Smart Filtering)

**Files**: `middleware.ts`, `app/page.tsx`, `app/lib/city.ts`, `app/[city]/page.tsx`, `app/[city]/[...params]/page.tsx`

#### Smart City Name Filtering

**Server-Side (Middleware)**:
The middleware includes intelligent city name validation that blocks malicious patterns while allowing any legitimate city:

**Blocked Patterns**:
- File extensions in city names (`.php`, `.env`, `.git`, etc.)
- Path traversal attempts (`../`, `..\\`)
- Hidden files (starting with `.`)
- Suspicious keywords used alone (`admin`, `config`, `backup`, `test`, `debug`, `phpinfo`)

**Allowed**:
- Any legitimate city name (`ibiza`, `barcelona`, `new-york`, `wien`, etc.)
- International characters and hyphens
- Cities not in the Hot Cities list

**Client-Side (Search Input Field)**:
The same validation is applied to the city input field in the search form (`app/page.tsx`) to prevent malicious input from being submitted:

- Validates input in real-time as users type
- Displays immediate error messages for invalid input
- Blocks search submission if validation fails
- Uses the same validation rules as middleware for consistency

```typescript
function validateCityName(cityInput: string): { valid: boolean; error?: string } {
  // Validates against file extensions, path traversal, suspicious keywords, XSS attempts
  // Returns validation result with error message if invalid
}
```

This dual-layer approach provides security at both the client and server level while maintaining the system's key feature of supporting searches for any city worldwide.

#### Optional Strict Mode
For maximum control, strict mode can be enabled via environment variable:

```bash
# Enable strict mode (only allow Hot Cities)
CITY_STRICT_MODE=true

# Disable strict mode (allow any city name - default)
CITY_STRICT_MODE=false
```

**Default**: Strict mode is **disabled** by default to allow searches for any city. The middleware's and client-side smart filtering provide security without requiring strict mode.

### 4. Middleware Matcher Configuration

Updated to exclude static assets while processing application routes:

```typescript
export const config = {
  matcher: [
    '/((?!sitemap.xml|robots.txt|_next/static|_next/image|favicon.ico|favicon.png|designs/).*)',
  ],
};
```

This ensures:
- Static assets bypass middleware checks
- API routes and pages are protected
- Performance is maintained for legitimate requests

## Testing

### Test Suites

**File**: `app/lib/__tests__/botProtection.test.ts` (Middleware validation)
**File**: `app/lib/__tests__/cityInputValidation.test.ts` (Client-side validation)

Comprehensive test coverage includes:

1. **File Extension Blocking**: Validates that malicious extensions are blocked (middleware)
2. **Suspicious Path Detection**: Ensures WordPress and other attack paths are detected (middleware)
3. **Scanner User-Agent Detection**: Verifies known scanner patterns are identified (middleware)
4. **City Name Validation (Server)**: Tests middleware validation of city parameters
5. **City Input Validation (Client)**: Validates input field blocks malicious input
6. **Security Headers**: Confirms required security headers are defined

### Running Tests
```bash
npm test -- app/lib/__tests__/botProtection.test.ts
npm test -- app/lib/__tests__/cityInputValidation.test.ts
```

**Total Tests**: 24 tests (12 middleware + 12 client-side)

## Logging and Monitoring

### Middleware Logging
Blocked requests are logged with:
```typescript
console.warn(`[MIDDLEWARE] Blocked suspicious request: ${pathname}`);
```

Monitor these logs to:
- Track attack patterns
- Identify new threats
- Adjust blocking rules if needed

## Performance Impact

### Benefits
1. **Reduced Server Load**: Malicious requests are blocked at middleware level before page rendering
2. **Lower Resource Usage**: No database queries, no Redis lookups for spam requests
3. **Faster Legitimate Requests**: Static assets bypass all checks
4. **Better Cache Efficiency**: Only valid city requests hit the cache

### Overhead
- Minimal: String matching and regex operations in middleware
- Typical overhead: < 1ms per request
- No impact on static asset delivery

## Best Practices

### Regular Updates
1. Monitor logs for new attack patterns
2. Update `BLOCKED_EXTENSIONS` if new threats emerge
3. Add new `SUSPICIOUS_PATHS` based on actual attacks
4. Keep `BOT_PATTERNS` current with known scanners

### Rate Limiting
Consider implementing actual rate limiting:
- Use Vercel Edge Config or Upstash for distributed rate limiting
- Set reasonable limits per IP address
- Add exponential backoff for repeat offenders

### robots.txt
Maintain a proper `robots.txt` file:
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /_next/

Sitemap: https://www.where2go.at/sitemap.xml
```

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CITY_STRICT_MODE` | `true` | Enable strict city name validation |

### Customization

To customize bot protection, edit `middleware.ts`:

1. **Add custom file extensions**:
```typescript
const BLOCKED_EXTENSIONS = [
  // ... existing extensions
  '.custom', '.special'
];
```

2. **Add custom suspicious paths**:
```typescript
const SUSPICIOUS_PATHS = [
  // ... existing paths
  '/your-admin', '/custom-path'
];
```

3. **Add custom bot patterns**:
```typescript
const BOT_PATTERNS = [
  // ... existing patterns
  'custom-scanner', 'my-bot'
];
```

## Future Enhancements

Potential improvements to consider:

1. **IP-Based Rate Limiting**: Track and limit requests per IP address
2. **Geo-Blocking**: Block traffic from specific countries/regions
3. **CAPTCHA Integration**: Add CAPTCHA for suspicious but not clearly malicious requests
4. **Machine Learning**: Use ML models to detect sophisticated attack patterns
5. **Real-Time Blocking**: Integrate with threat intelligence feeds
6. **Advanced Analytics**: Detailed dashboards for attack monitoring

## Troubleshooting

### Common Issues

#### Legitimate Requests Blocked
If legitimate requests are being blocked:

1. Check the logs for the specific path being blocked
2. Review `BLOCKED_EXTENSIONS` and `SUSPICIOUS_PATHS`
3. Adjust patterns to be more specific
4. Consider disabling strict mode if needed: `CITY_STRICT_MODE=false`

#### City Pages Not Generating
If legitimate city pages return 404:

1. Verify the city exists in Hot Cities list
2. Check if strict mode is enabled
3. Ensure city slug matches expected format
4. Review logs for any city name validation errors

#### Performance Degradation
If middleware is causing slowness:

1. Profile middleware execution time
2. Optimize regex patterns
3. Consider moving some checks to CDN level
4. Cache bot detection results if possible

## Security Considerations

### Important Notes

1. **Defense in Depth**: This is one layer of security, not the only protection
2. **False Positives**: Balance between security and usability
3. **Evolution**: Attackers adapt, so must your defenses
4. **Monitoring**: Continuous monitoring is essential for effectiveness

### Sensitive Information

Never log or expose:
- User credentials
- API keys or tokens
- Personal identifiable information (PII)
- Full request headers (may contain sensitive data)

## References

- [Next.js Middleware Documentation](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [Bot Protection Strategies](https://www.cloudflare.com/learning/bots/what-is-bot-management/)

## Changelog

### 2025-10-21: Initial Implementation
- Added middleware-based bot detection
- Implemented file extension blocking
- Added suspicious path detection
- Added bot user-agent pattern matching
- Implemented city name validation with strict mode
- Added security headers
- Created comprehensive test suite
- Added documentation
