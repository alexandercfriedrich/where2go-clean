import { describe, it, expect } from 'vitest';

/**
 * Tests for client-side city input validation
 * These tests verify that malicious input is blocked in the search form
 */

// Copy of the validation function from page.tsx for testing
const BLOCKED_EXTENSIONS = [
  '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py',
  '.sh', '.bat', '.cmd', '.exe', '.dll', '.so',
  '.env', '.git', '.htaccess', '.config', '.bak', '.sql'
];

const SUSPICIOUS_KEYWORDS = ['admin', 'config', 'backup', 'test', 'debug', 'phpinfo', 'shell', 'root'];

function validateCityName(cityInput: string): { valid: boolean; error?: string } {
  if (!cityInput || !cityInput.trim()) {
    return { valid: false, error: 'Bitte gib eine Stadt ein.' };
  }

  const city = cityInput.trim().toLowerCase();
  
  // Block if contains file extensions
  if (BLOCKED_EXTENSIONS.some(ext => city.includes(ext))) {
    return { valid: false, error: 'Ungültige Eingabe erkannt. Bitte gib einen gültigen Städtenamen ein.' };
  }
  
  // Block if looks like a path traversal
  if (city.includes('../') || city.includes('..\\') || city.includes('/') || city.includes('\\')) {
    return { valid: false, error: 'Ungültige Zeichen in der Stadt-Eingabe.' };
  }
  
  // Block if starts with a dot (hidden files)
  if (city.startsWith('.')) {
    return { valid: false, error: 'Ungültige Eingabe. Stadt darf nicht mit einem Punkt beginnen.' };
  }
  
  // Block suspicious keywords used alone
  if (SUSPICIOUS_KEYWORDS.some(keyword => city === keyword)) {
    return { valid: false, error: 'Ungültige Stadt-Eingabe erkannt.' };
  }
  
  // Block if contains HTML/script tags
  if (/<script|<\/script|javascript:|onerror=/i.test(city)) {
    return { valid: false, error: 'Ungültige Eingabe erkannt.' };
  }
  
  return { valid: true };
}

describe('Client-Side City Input Validation', () => {
  describe('Valid city names should be allowed', () => {
    it('should allow legitimate city names', () => {
      const validCities = [
        'Wien',
        'Berlin',
        'New York',
        'Ibiza',
        'Barcelona',
        'São Paulo',
        'München',
        'Zürich',
        'new-york',
        'san-francisco'
      ];

      validCities.forEach(city => {
        const result = validateCityName(city);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should allow city names with numbers', () => {
      const citiesWithNumbers = [
        '1060 Wien',
        'Wien 1060',
        'Mariahilf'
      ];

      citiesWithNumbers.forEach(city => {
        const result = validateCityName(city);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Malicious inputs should be blocked', () => {
    it('should block file extensions', () => {
      const maliciousInputs = [
        'test.php',
        'admin.asp',
        'shell.sh',
        '.env',
        'config.config',
        'backup.bak'
      ];

      maliciousInputs.forEach(input => {
        const result = validateCityName(input);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should block path traversal attempts', () => {
      const traversalInputs = [
        '../etc/passwd',
        '..\\windows\\system32',
        'city/../../etc',
        'test\\..\\admin'
      ];

      traversalInputs.forEach(input => {
        const result = validateCityName(input);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should block paths with slashes', () => {
      const pathInputs = [
        'city/path',
        'test\\path',
        '/etc/passwd',
        'c:\\windows'
      ];

      pathInputs.forEach(input => {
        const result = validateCityName(input);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Ungültige Zeichen');
      });
    });

    it('should block hidden files starting with dot', () => {
      const dotFiles = [
        '.htaccess',
        '.env',
        '.git',
        '.config'
      ];

      dotFiles.forEach(input => {
        const result = validateCityName(input);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should block suspicious keywords used alone', () => {
      const keywords = [
        'admin',
        'config',
        'backup',
        'test',
        'debug',
        'phpinfo',
        'shell',
        'root'
      ];

      keywords.forEach(keyword => {
        const result = validateCityName(keyword);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should block XSS attempts', () => {
      const xssInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '<img onerror=alert(1)>',
        '</script><script>alert(1)</script>'
      ];

      xssInputs.forEach(input => {
        const result = validateCityName(input);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should reject empty input', () => {
      const emptyInputs = ['', '   ', '\t\n'];

      emptyInputs.forEach(input => {
        const result = validateCityName(input);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Bitte gib eine Stadt ein');
      });
    });
  });

  describe('Edge cases', () => {
    it('should trim whitespace before validation', () => {
      const result = validateCityName('  Wien  ');
      expect(result.valid).toBe(true);
    });

    it('should be case-insensitive for validation', () => {
      const result1 = validateCityName('ADMIN');
      const result2 = validateCityName('admin');
      const result3 = validateCityName('Admin');
      
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
      expect(result3.valid).toBe(false);
    });

    it('should allow city names that contain suspicious keywords as substrings', () => {
      // "test" as keyword is blocked, but "Manchester" should be allowed
      const result = validateCityName('Manchester');
      expect(result.valid).toBe(true);
    });
  });
});
