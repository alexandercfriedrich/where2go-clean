import { describe, it, expect, vi } from 'vitest';
import { PerplexityService } from '../perplexity';

describe('Prompt Structure Validation', () => {
  // Mock API key for testing
  const service = new PerplexityService('test-key');
  
  describe('Category Prompt Structure', () => {
    it('should generate JSON-only prompts for category queries', () => {
      // Use reflection to access private method for testing
      const buildCategoryPrompt = (service as any).buildCategoryPrompt.bind(service);
      const prompt = buildCategoryPrompt('Berlin', '2025-01-20', 'DJ Sets/Electronic');
      
      // Verify prompt requests JSON only
      expect(prompt).toContain('Return ONLY a valid JSON array');
      expect(prompt).toContain('Do not include any explanatory text');
      expect(prompt).toContain('If no events are found, return: []');
      
      // Verify schema specification
      expect(prompt).toContain('"title": "string - event name"');
      expect(prompt).toContain('"address": "string - full address');
      expect(prompt).toContain('"bookingLink": "string - ticket booking URL');
      
      // Verify bilingual guardrails
      expect(prompt).toContain('Antworte NUR mit gültigem JSON Array');
      expect(prompt).toContain('Falls keine Events gefunden: []');
      
      // Verify category list is mentioned in the context of the provided category
      expect(prompt).toContain('DJ Sets/Electronic');
    });
  });

  describe('General Prompt Structure', () => {
    it('should generate JSON-only prompts for general queries', () => {
      const buildGeneralPrompt = (service as any).buildGeneralPrompt.bind(service);
      const prompt = buildGeneralPrompt('Berlin', '2025-01-20');
      
      // Verify prompt requests JSON only
      expect(prompt).toContain('Return ONLY a valid JSON array');
      expect(prompt).toContain('Do not include any explanatory text');
      expect(prompt).toContain('If no events are found, return: []');
      
      // Verify comprehensive category coverage - now using canonical 20 categories
      expect(prompt).toContain('DJ Sets/Electronic');
      expect(prompt).toContain('Live-Konzerte');
      expect(prompt).toContain('LGBTQ+');
      expect(prompt).toContain('Natur/Outdoor');
      
      // Verify we have all 20 canonical categories numbered 1-20
      expect(prompt).toContain('1. DJ Sets/Electronic');
      expect(prompt).toContain('20. Soziales/Community');
      
      // Verify bilingual guardrails
      expect(prompt).toContain('AUSSCHLIESSLICH mit gültigem JSON Array');
      expect(prompt).toContain('kein Fließtext, kein Markdown');
    });
  });

  describe('Timeout Configuration', () => {
    it('should enforce minimum timeout of 60 seconds', async () => {
      const mockOptions = { categoryTimeoutMs: 30000 }; // Too low
      const spy = vi.spyOn(console, 'log');
      
      try {
        // This would fail in real usage due to missing API key, but we can test the timeout logic
        await service.executeMultiQuery('Berlin', '2025-01-20', ['DJ Sets/Electronic'], mockOptions);
      } catch (error) {
        // Expected to fail due to no API key
      }
      
      // Verify timeout was adjusted and logged
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Using category timeout: 60000ms (requested: 30000ms)'));
      
      spy.mockRestore();
    });

    it('should respect valid timeout values', async () => {
      const mockOptions = { categoryTimeoutMs: 120000 }; // Valid
      const spy = vi.spyOn(console, 'log');
      
      try {
        await service.executeMultiQuery('Berlin', '2025-01-20', ['DJ Sets/Electronic'], mockOptions);
      } catch (error) {
        // Expected to fail due to no API key
      }
      
      // Verify timeout was preserved
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Using category timeout: 120000ms (requested: 120000ms)'));
      
      spy.mockRestore();
    });
  });
});