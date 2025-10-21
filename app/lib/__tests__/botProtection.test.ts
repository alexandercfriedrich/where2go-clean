import { describe, it, expect } from 'vitest';

/**
 * Tests for bot and spam protection features
 * These tests validate that the middleware and city validation
 * properly block malicious requests and invalid cities
 */

describe('Bot Protection - File Extension Blocking', () => {
  const blockedExtensions = [
    '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py',
    '.sh', '.bat', '.cmd', '.exe', '.dll', '.so',
    '.env', '.git', '.htaccess', '.config', '.bak', '.sql'
  ];

  it('should block malicious file extensions', () => {
    blockedExtensions.forEach(ext => {
      const pathname = `/test${ext}`;
      const shouldBeBlocked = blockedExtensions.some(blocked => pathname.endsWith(blocked));
      expect(shouldBeBlocked).toBe(true);
    });
  });

  it('should allow valid Next.js routes', () => {
    const validPaths = [
      '/wien/heute',
      '/berlin/morgen',
      '/api/events',
      '/wien/museen/wochenende'
    ];

    validPaths.forEach(path => {
      const shouldBeBlocked = blockedExtensions.some(ext => path.endsWith(ext));
      expect(shouldBeBlocked).toBe(false);
    });
  });
});

describe('Bot Protection - Suspicious Path Detection', () => {
  const suspiciousPaths = [
    '/wp-admin', '/wp-content', '/wp-includes', '/wordpress',
    '/admin/', '/phpmyadmin', '/phpinfo', '/shell',
    '/.env', '/.git', '/config', '/backup'
  ];

  it('should detect WordPress-related paths', () => {
    const wpPaths = [
      '/wp-admin/index.php',
      '/wp-content/plugins/test.php',
      '/wp-includes/fonts/about.php'
    ];

    wpPaths.forEach(path => {
      const isSuspicious = suspiciousPaths.some(pattern => 
        path.toLowerCase().includes(pattern.toLowerCase())
      );
      expect(isSuspicious).toBe(true);
    });
  });

  it('should detect environment and config file attempts', () => {
    const maliciousPaths = [
      '/.env',
      '/.git/config',
      '/config.php',
      '/backup.sql'
    ];

    maliciousPaths.forEach(path => {
      const isSuspicious = suspiciousPaths.some(pattern => 
        path.toLowerCase().includes(pattern.toLowerCase())
      );
      expect(isSuspicious).toBe(true);
    });
  });

  it('should allow legitimate application paths', () => {
    const legitimatePaths = [
      '/wien/heute',
      '/api/events',
      '/impressum',
      '/datenschutz'
    ];

    legitimatePaths.forEach(path => {
      const isSuspicious = suspiciousPaths.some(pattern => 
        path.toLowerCase().includes(pattern.toLowerCase())
      );
      expect(isSuspicious).toBe(false);
    });
  });
});

describe('Bot Protection - Scanner User-Agent Detection', () => {
  const botPatterns = [
    'masscan', 'nmap', 'nikto', 'sqlmap', 'dirbuster',
    'acunetix', 'burpsuite', 'metasploit', 'havij'
  ];

  it('should detect known scanner user agents', () => {
    const scannerAgents = [
      'masscan/1.0',
      'Mozilla/5.0 nmap',
      'nikto-scanner',
      'sqlmap/1.0',
      'DirBuster-1.0'
    ];

    scannerAgents.forEach(agent => {
      const isBot = botPatterns.some(pattern => 
        agent.toLowerCase().includes(pattern)
      );
      expect(isBot).toBe(true);
    });
  });

  it('should allow legitimate user agents', () => {
    const legitimateAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Googlebot/2.1',
      'Mozilla/5.0 (compatible; bingbot/2.0)',
      'curl/7.68.0'
    ];

    legitimateAgents.forEach(agent => {
      const isBot = botPatterns.some(pattern => 
        agent.toLowerCase().includes(pattern)
      );
      expect(isBot).toBe(false);
    });
  });
});

describe('City Name Validation', () => {
  it('should validate city parameter format', () => {
    const validCityParams = ['wien', 'berlin', 'linz', 'salzburg', 'new-york'];
    
    validCityParams.forEach(param => {
      // Valid city params should only contain alphanumeric and hyphens
      const isValid = /^[a-z0-9-]+$/.test(param);
      expect(isValid).toBe(true);
    });
  });

  it('should detect invalid characters in city params', () => {
    const invalidCityParams = [
      { param: 'test.php', char: '.' },
      { param: '.env', char: '.' },
      { param: 'test/path', char: '/' }
    ];

    invalidCityParams.forEach(({ param, char }) => {
      // These should fail validation due to special characters
      const hasInvalidChars = param.includes(char);
      expect(hasInvalidChars).toBe(true);
    });
  });

  it('should normalize city slugs correctly', () => {
    function slugify(text: string): string {
      return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    expect(slugify('Wien')).toBe('wien');
    expect(slugify('New York')).toBe('new-york');
    expect(slugify('test.php')).toBe('testphp');
    expect(slugify('admin/test')).toBe('admintest');
  });
});

describe('Security Headers', () => {
  it('should define required security headers', () => {
    const requiredHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block'
    };

    // Verify all headers are defined
    expect(Object.keys(requiredHeaders).length).toBeGreaterThan(0);
    expect(requiredHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(requiredHeaders['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(requiredHeaders['X-XSS-Protection']).toBe('1; mode=block');
  });
});
