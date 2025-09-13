import { describe, it, expect, vi } from 'vitest';
import { getPerplexityClient } from '../../../lib/new-backend/services/perplexityClient';
import { createCategoryPrompt, createGeneralPrompt } from '../../../lib/new-backend/prompts/eventPrompt';

describe('Prompt Structure Validation', () => {
  // Mock API key for testing
  const client = getPerplexityClient({ apiKey: 'test-key' });
  
  describe('Category Prompt Structure', () => {
    it('should generate JSON-only prompts for category queries', () => {
      // Test the prompt generation directly
      const prompt = createCategoryPrompt('Berlin', '2025-01-20', 'DJ Sets/Electronic');
      
      // Verify prompt requests JSON only
      expect(prompt).toContain('Return ONLY a valid JSON array');
      expect(prompt).toContain('Do not include any explanatory text');
      expect(prompt).toContain('If no events are found, return: []');
      
      // Verify schema specification
      expect(prompt).toContain('"title": "string (required)"');
      expect(prompt).toContain('"address": "string (optional)"');
      expect(prompt).toContain('"bookingLink": "string (optional');
      
      // Verify category targeting
      expect(prompt).toContain('DJ Sets/Electronic');
    });
  });

  describe('General Prompt Structure', () => {
    it('should generate JSON-only prompts for general queries', () => {
      const prompt = createGeneralPrompt('Berlin', '2025-01-20');
      
      // Verify prompt requests JSON only
      expect(prompt).toContain('Return ONLY a valid JSON array');
      expect(prompt).toContain('Do not include any explanatory text');
      expect(prompt).toContain('If no events are found, return: []');
      
      // Verify comprehensive category coverage
      expect(prompt).toContain('DJ Sets/Electronic Music');
      expect(prompt).toContain('Theater/Performance');
      expect(prompt).toContain('LGBTQ+ Events');
      expect(prompt).toContain('Business Events');
    });
  });

  describe('Client Configuration', () => {
    it('should be properly configured with API key', () => {
      expect(client.isConfigured()).toBe(true);
      
      const config = client.getConfig();
      expect(config.hasApiKey).toBe(true);
      expect(config.model).toBeDefined();
      expect(config.timeoutMs).toBeGreaterThan(0);
    });

    it('should have proper default configuration', () => {
      const config = client.getConfig();
      expect(config.batchSize).toBe(3);
      expect(config.delayBetweenBatches).toBe(1000);
      expect(config.maxRetries).toBeGreaterThanOrEqual(2);
      expect(config.timeoutMs).toBeGreaterThanOrEqual(25000);
    });
  });
});