/**
 * Tests for personalization engine
 */

import { describe, it, expect } from 'vitest';
import { calculateEventScore, getPersonalizedFeed } from '../personalization/recommendations';

describe('Personalization Engine', () => {
  describe('calculateEventScore', () => {
    it('should return a score between 0 and 100', () => {
      const mockEvent = {
        id: '1',
        title: 'Test Event',
        category: 'music',
        start_date_time: new Date(Date.now() + 86400000).toISOString(),
        latitude: 48.2082,
        longitude: 16.3738,
        is_featured: true,
        popularity_score: 50,
        view_count: 100,
      };

      const score = calculateEventScore(mockEvent);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should score events happening soon higher', () => {
      const todayEvent = {
        id: '1',
        title: 'Today Event',
        category: 'music',
        start_date_time: new Date(Date.now() + 3600000).toISOString(),
      };

      const nextWeekEvent = {
        id: '2',
        title: 'Next Week Event',
        category: 'music',
        start_date_time: new Date(Date.now() + 7 * 86400000).toISOString(),
      };

      const todayScore = calculateEventScore(todayEvent);
      const nextWeekScore = calculateEventScore(nextWeekEvent);

      expect(todayScore).toBeGreaterThan(nextWeekScore);
    });
  });

  describe('getPersonalizedFeed', () => {
    it('should sort events by score descending', () => {
      const events = [
        {
          id: '1',
          title: 'Event 1',
          category: 'music',
          start_date_time: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
        {
          id: '2',
          title: 'Event 2',
          category: 'music',
          start_date_time: new Date(Date.now() + 86400000).toISOString(),
          is_featured: true,
        },
      ];

      const feed = getPersonalizedFeed(events as any);

      expect(feed.length).toBe(2);
      expect(feed[0].score).toBeGreaterThanOrEqual(feed[1].score);
    });
  });
});
