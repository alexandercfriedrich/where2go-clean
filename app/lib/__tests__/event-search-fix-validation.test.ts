// Validation test for the event search fix
// This test demonstrates that the "keine Ausgabe von Events" issue is resolved

import { describe, it, expect, vi } from 'vitest';
import { eventAggregator } from '../aggregator';
import { PerplexityService } from '../perplexity';

describe('Event Search Fix Validation', () => {
  describe('Event Parsing Improvements', () => {
    it('should parse valid JSON responses correctly', () => {
      const jsonResponse = JSON.stringify([
        {
          title: "Test Concert",
          date: "2025-01-20",
          time: "20:00",
          venue: "Test Venue",
          category: "Live-Konzerte",
          price: "25 €",
          website: "https://example.com"
        }
      ]);

      const events = eventAggregator.parseEventsFromResponse(jsonResponse, 'Live-Konzerte', '2025-01-20');
      
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Test Concert");
      expect(events[0].category).toBe("Live-Konzerte");
    });

    it('should handle markdown-wrapped JSON responses', () => {
      const markdownResponse = '```json\n' + JSON.stringify([
        {
          title: "Jazz Night",
          date: "2025-01-20", 
          venue: "Blue Note",
          category: "Live-Konzerte"
        }
      ]) + '\n```';

      const events = eventAggregator.parseEventsFromResponse(markdownResponse, 'Live-Konzerte', '2025-01-20');
      
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Jazz Night");
    });

    it('should handle empty responses gracefully', () => {
      const emptyResponses = [
        '[]',
        '',
        'Keine Events gefunden',
        'keine passenden events gefunden'
      ];

      emptyResponses.forEach(response => {
        const events = eventAggregator.parseEventsFromResponse(response, 'Live-Konzerte', '2025-01-20');
        expect(events).toHaveLength(0);
      });
    });

    it('should provide fallback parsing for malformed responses', () => {
      const malformedJson = '{"title": "Broken Event"'; // Missing closing brace
      
      const events = eventAggregator.parseEventsFromResponse(malformedJson, 'Live-Konzerte', '2025-01-20');
      
      // Should fallback to text parsing and still extract some information
      expect(events).toHaveLength(1);
      expect(events[0].title).toContain('Broken Event');
    });
  });

  describe('Prompt Generation Improvements', () => {
    const service = new PerplexityService('test-key');

    it('should generate strict JSON prompts for categories', async () => {
      const buildCategoryPrompt = (service as any).buildCategoryPrompt.bind(service);
      const prompt = await buildCategoryPrompt('Berlin', '2025-01-20', 'Live-Konzerte');

      // Verify strict JSON requirements
      expect(prompt).toContain('Return ONLY a valid JSON array');
      expect(prompt).toContain('Do not include any explanatory text');
      expect(prompt).toContain('CRITICAL: Respond ONLY with valid JSON array');
      
      // Verify bilingual instructions
      expect(prompt).toContain('Antworte NUR mit gültigem JSON Array');
      expect(prompt).toContain('Falls keine Events gefunden: []');
      
      // Verify category specification
      expect(prompt).toContain('Live-Konzerte');
      expect(prompt).toContain('LGBTQ+');
    });

    it('should include comprehensive event schema', async () => {
      const buildCategoryPrompt = (service as any).buildCategoryPrompt.bind(service);
      const prompt = await buildCategoryPrompt('Berlin', '2025-01-20', 'DJ Sets/Electronic');

      // Verify all required fields are documented
      expect(prompt).toContain('"title": "string - event name"');
      expect(prompt).toContain('"venue": "string - venue name"');
      expect(prompt).toContain('"website": "string - event URL"');
      expect(prompt).toContain('"bookingLink": "string - ticket URL');
    });
  });

  describe('Error Handling Improvements', () => {
    it('should handle aggregation errors gracefully', () => {
      const results = [
        {
          query: 'test query',
          response: 'invalid response that will cause parsing to fail',
          events: [],
          timestamp: Date.now()
        }
      ];

      // Should not throw error, even with invalid response
      expect(() => {
        const events = eventAggregator.aggregateResults(results);
        expect(Array.isArray(events)).toBe(true);
      }).not.toThrow();
    });

    it('should deduplicate events properly', () => {
      const events = [
        {
          title: "Same Concert",
          date: "2025-01-20", 
          venue: "Same Venue",
          category: "Live-Konzerte",
          time: "",
          price: "",
          website: ""
        },
        {
          title: "Same Concert", // Duplicate
          date: "2025-01-20",
          venue: "Same Venue", 
          category: "Live-Konzerte",
          time: "",
          price: "",
          website: ""
        },
        {
          title: "Different Concert",
          date: "2025-01-20",
          venue: "Different Venue",
          category: "Live-Konzerte", 
          time: "",
          price: "",
          website: ""
        }
      ];

      const deduplicated = eventAggregator.deduplicateEvents(events);
      
      expect(deduplicated).toHaveLength(2); // Should remove one duplicate
    });
  });

  describe('Main Category Preservation', () => {
    it('should maintain category mapping integrity', () => {
      const testEvent = {
        title: "Test Event",
        date: "2025-01-20",
        venue: "Test Venue", 
        category: "DJ Sets/Electronic",
        time: "",
        price: "",
        website: ""
      };

      const categorized = eventAggregator.categorizeEvents([testEvent]);
      
      expect(categorized).toHaveLength(1);
      expect(categorized[0].category).toBe("DJ Sets/Electronic"); // Should preserve original category
    });
  });

  describe('Solution Validation', () => {
    it('should demonstrate the complete fix for "keine Ausgabe von Events"', () => {
      // Simulate the complete flow that was previously failing
      
      // 1. Perplexity API returns JSON response
      const apiResponse = JSON.stringify([
        {
          title: "Electronic Festival",
          date: "2025-01-20",
          time: "22:00",
          venue: "Berghain", 
          category: "DJ Sets/Electronic",
          price: "35 €",
          website: "https://berghain.berlin"
        }
      ]);

      // 2. Parse the response
      const parsedEvents = eventAggregator.parseEventsFromResponse(
        apiResponse, 
        'DJ Sets/Electronic', 
        '2025-01-20'
      );

      // 3. Aggregate and deduplicate
      const results = [{
        query: 'test query',
        response: apiResponse,
        events: parsedEvents,
        timestamp: Date.now()
      }];
      
      const aggregatedEvents = eventAggregator.aggregateResults(results);
      
      // 4. Categorize events
      const finalEvents = eventAggregator.categorizeEvents(aggregatedEvents);

      // ✅ VALIDATION: Events should now be properly output
      expect(finalEvents).toHaveLength(1);
      expect(finalEvents[0].title).toBe("Electronic Festival");
      expect(finalEvents[0].venue).toBe("Berghain");
      expect(finalEvents[0].category).toBe("DJ Sets/Electronic");
      
      console.log('✅ SUCCESS: Event search fix validated!');
      console.log(`   Event: ${finalEvents[0].title} at ${finalEvents[0].venue}`);
      console.log(`   Category: ${finalEvents[0].category}`);
      console.log('   The "keine Ausgabe von Events" issue has been resolved!');
    });
  });
});