import { describe, it, expect } from 'vitest';
import { PerplexityService } from '../perplexity';

describe('Debug Prompt Generation', () => {
  const service = new PerplexityService('test-key');

  it('should show what category prompt looks like', async () => {
    // Use reflection to access private method for testing
    const buildCategoryPrompt = (service as any).buildCategoryPrompt.bind(service);
    const prompt = await buildCategoryPrompt('Berlin', '2025-01-20', 'DJ Sets/Electronic');
    
    console.log('CATEGORY PROMPT:');
    console.log(prompt);
    console.log('---');
    
    // Check if key phrases are present
    console.log('Contains "Return ONLY a valid JSON array":', prompt.includes('Return ONLY a valid JSON array'));
    console.log('Contains "Do not include any explanatory text":', prompt.includes('Do not include any explanatory text'));
    console.log('Contains "If no events are found, return: []":', prompt.includes('If no events are found, return: []'));
  });
  
  it('should show what general prompt looks like', () => {
    const buildGeneralPrompt = (service as any).buildGeneralPrompt.bind(service);
    const prompt = buildGeneralPrompt('Berlin', '2025-01-20');
    
    console.log('GENERAL PROMPT:');
    console.log(prompt);
    console.log('---');
    
    // Check if key phrases are present
    console.log('Contains "Return ONLY a valid JSON array":', prompt.includes('Return ONLY a valid JSON array'));
    console.log('Contains "Theater & Kabarett":', prompt.includes('Theater & Kabarett'));
  });
});