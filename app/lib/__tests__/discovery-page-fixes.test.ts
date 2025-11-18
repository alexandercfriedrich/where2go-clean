/**
 * Tests for Discovery Page Fixes
 * - Event card time display
 * - Date filter logic
 */

import { describe, it, expect } from 'vitest';

describe('Discovery Page - Time Display', () => {
  // Simulating the getEventTime function logic
  function getEventTime(event: any): string | null {
    if (event.time) {
      // Check if time should be treated as all-day
      if (event.time === '00:00' || event.time === '01:00' || event.time === 'ganztags') {
        return null; // Will display as "ganztags"
      }
      return event.time;
    }
    if (event.start_date_time) {
      try {
        const date = new Date(event.start_date_time);
        const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        // Treat midnight and 1 AM as all-day events
        if (timeStr === '00:00' || timeStr === '01:00') {
          return null; // Will display as "ganztags"
        }
        return timeStr;
      } catch {
        return null;
      }
    }
    return null;
  }

  it('should return null for 00:00 time', () => {
    const event = { time: '00:00' };
    expect(getEventTime(event)).toBeNull();
  });

  it('should return null for 01:00 time (Wien.info issue)', () => {
    const event = { time: '01:00' };
    expect(getEventTime(event)).toBeNull();
  });

  it('should return null for "ganztags" time', () => {
    const event = { time: 'ganztags' };
    expect(getEventTime(event)).toBeNull();
  });

  it('should return valid time for normal hours', () => {
    const event = { time: '19:30' };
    expect(getEventTime(event)).toBe('19:30');
  });

  it('should parse time from start_date_time', () => {
    const event = { start_date_time: '2025-11-18T19:30:00Z' };
    const time = getEventTime(event);
    expect(time).toBeTruthy();
    expect(time).not.toBe('00:00');
    expect(time).not.toBe('01:00');
  });

  it('should return null for start_date_time with 00:00', () => {
    const event = { start_date_time: '2025-11-18T00:00:00Z' };
    const time = getEventTime(event);
    expect(time).toBeNull();
  });

  it('should return null for start_date_time with 01:00', () => {
    const event = { start_date_time: '2025-11-18T01:00:00Z' };
    const time = getEventTime(event);
    expect(time).toBeNull();
  });

  it('should prefer time field over start_date_time', () => {
    const event = { 
      time: '18:30',
      start_date_time: '2025-11-18T19:30:00Z' 
    };
    expect(getEventTime(event)).toBe('18:30');
  });
});

describe('Discovery Page - Date Filter Logic', () => {
  // Simulating the filterEventsByDate function logic
  function filterEventsByDate(events: any[], filter: string, referenceDate?: Date) {
    if (filter === 'all') return events;
    
    const now = referenceDate || new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return events.filter((event: any) => {
      const eventDate = event.start_date_time 
        ? new Date(event.start_date_time)
        : event.date 
          ? new Date(event.date)
          : null;
      
      if (!eventDate) return false;
      
      // Normalize event date to midnight for comparison
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      switch (filter) {
        case 'today':
          return eventDateOnly.getTime() === today.getTime();
          
        case 'this-week':
          const weekEnd = new Date(today);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return eventDateOnly >= today && eventDateOnly < weekEnd;
          
        case 'weekend':
          // Calculate next weekend (Saturday and Sunday)
          const dayOfWeek = today.getDay();
          let daysUntilSaturday: number;
          
          if (dayOfWeek === 6) {
            // Today is Saturday - include today and tomorrow
            daysUntilSaturday = 0;
          } else if (dayOfWeek === 0) {
            // Today is Sunday - include today only, next Saturday is 6 days away
            daysUntilSaturday = 6;
          } else {
            // Monday to Friday - calculate days until Saturday
            daysUntilSaturday = 6 - dayOfWeek;
          }
          
          const nextSaturday = new Date(today);
          nextSaturday.setDate(today.getDate() + daysUntilSaturday);
          
          const nextMonday = new Date(nextSaturday);
          nextMonday.setDate(nextSaturday.getDate() + 2); // Saturday + 2 = Monday
          
          return eventDateOnly >= nextSaturday && eventDateOnly < nextMonday;
          
        case 'next-week':
          const nextWeekStart = new Date(today);
          nextWeekStart.setDate(nextWeekStart.getDate() + 7);
          const nextWeekEnd = new Date(nextWeekStart);
          nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
          return eventDateOnly >= nextWeekStart && eventDateOnly < nextWeekEnd;
          
        default:
          return true;
      }
    });
  }

  describe('Weekend Filter', () => {
    it('should include Saturday and Sunday when called from Tuesday', () => {
      const tuesday = new Date('2025-11-18T10:00:00'); // Tuesday
      const events = [
        { date: '2025-11-18', title: 'Tuesday' },
        { date: '2025-11-21', title: 'Friday' },
        { date: '2025-11-22', title: 'Saturday' },
        { date: '2025-11-23', title: 'Sunday' },
        { date: '2025-11-24', title: 'Monday' },
      ];

      const filtered = filterEventsByDate(events, 'weekend', tuesday);
      expect(filtered.length).toBe(2);
      expect(filtered.map(e => e.title)).toEqual(['Saturday', 'Sunday']);
    });

    it('should include Saturday and Sunday when called from Saturday', () => {
      const saturday = new Date('2025-11-22T10:00:00'); // Saturday
      const events = [
        { date: '2025-11-21', title: 'Friday' },
        { date: '2025-11-22', title: 'Saturday' },
        { date: '2025-11-23', title: 'Sunday' },
        { date: '2025-11-24', title: 'Monday' },
      ];

      const filtered = filterEventsByDate(events, 'weekend', saturday);
      expect(filtered.length).toBe(2);
      expect(filtered.map(e => e.title)).toEqual(['Saturday', 'Sunday']);
    });

    it('should include Sunday when called from Sunday', () => {
      const sunday = new Date('2025-11-23T10:00:00'); // Sunday
      const events = [
        { date: '2025-11-22', title: 'Saturday' },
        { date: '2025-11-23', title: 'Sunday' },
        { date: '2025-11-24', title: 'Monday' },
        { date: '2025-11-29', title: 'Next Saturday' },
        { date: '2025-11-30', title: 'Next Sunday' },
      ];

      const filtered = filterEventsByDate(events, 'weekend', sunday);
      // When called on Sunday, it should include next weekend (Sat+Sun)
      expect(filtered.length).toBe(2);
      expect(filtered.map(e => e.title)).toEqual(['Next Saturday', 'Next Sunday']);
    });

    it('should not include Friday in weekend filter', () => {
      const tuesday = new Date('2025-11-18T10:00:00');
      const events = [
        { date: '2025-11-21', title: 'Friday' },
        { date: '2025-11-22', title: 'Saturday' },
      ];

      const filtered = filterEventsByDate(events, 'weekend', tuesday);
      expect(filtered.map(e => e.title)).not.toContain('Friday');
    });

    it('should not include Monday in weekend filter', () => {
      const tuesday = new Date('2025-11-18T10:00:00');
      const events = [
        { date: '2025-11-23', title: 'Sunday' },
        { date: '2025-11-24', title: 'Monday' },
      ];

      const filtered = filterEventsByDate(events, 'weekend', tuesday);
      expect(filtered.map(e => e.title)).not.toContain('Monday');
    });
  });

  describe('Today Filter', () => {
    it('should only return events happening today', () => {
      const now = new Date('2025-11-18T10:00:00');
      const events = [
        { date: '2025-11-17', title: 'Yesterday' },
        { date: '2025-11-18', title: 'Today' },
        { date: '2025-11-19', title: 'Tomorrow' },
      ];

      const filtered = filterEventsByDate(events, 'today', now);
      expect(filtered.length).toBe(1);
      expect(filtered[0].title).toBe('Today');
    });
  });

  describe('This Week Filter', () => {
    it('should return events in the next 7 days', () => {
      const now = new Date('2025-11-18T10:00:00'); // Tuesday
      const events = [
        { date: '2025-11-17', title: 'Yesterday' },
        { date: '2025-11-18', title: 'Today' },
        { date: '2025-11-22', title: 'Saturday' },
        { date: '2025-11-24', title: 'Next Monday' },
        { date: '2025-11-25', title: '7 days from today' },
      ];

      const filtered = filterEventsByDate(events, 'this-week', now);
      expect(filtered.length).toBe(3);
      expect(filtered.map(e => e.title)).toEqual(['Today', 'Saturday', 'Next Monday']);
    });
  });

  describe('Next Week Filter', () => {
    it('should return events 7-14 days from now', () => {
      const now = new Date('2025-11-18T10:00:00'); // Tuesday
      const events = [
        { date: '2025-11-24', title: 'Next Monday' },
        { date: '2025-11-25', title: 'Next Tuesday (7 days)' },
        { date: '2025-11-28', title: 'Next Friday' },
        { date: '2025-12-01', title: '13 days from today' },
        { date: '2025-12-02', title: '14 days from today (excluded)' },
        { date: '2025-12-03', title: '15 days from today' },
      ];

      const filtered = filterEventsByDate(events, 'next-week', now);
      // Next week is days 7-13 (not including day 14)
      expect(filtered.length).toBe(3);
      expect(filtered.map(e => e.title)).toEqual([
        'Next Tuesday (7 days)',
        'Next Friday',
        '13 days from today'
      ]);
    });
  });

  describe('Event Date Parsing', () => {
    it('should handle events with date field', () => {
      const now = new Date('2025-11-18T10:00:00');
      const events = [
        { date: '2025-11-18' },
      ];

      const filtered = filterEventsByDate(events, 'today', now);
      expect(filtered.length).toBe(1);
    });

    it('should handle events with start_date_time field', () => {
      const now = new Date('2025-11-18T10:00:00');
      const events = [
        { start_date_time: '2025-11-18T19:30:00Z' },
      ];

      const filtered = filterEventsByDate(events, 'today', now);
      expect(filtered.length).toBe(1);
    });

    it('should exclude events with no date information', () => {
      const now = new Date('2025-11-18T10:00:00');
      const events = [
        { title: 'No date' },
        { date: '2025-11-18', title: 'Has date' },
      ];

      const filtered = filterEventsByDate(events, 'today', now);
      expect(filtered.length).toBe(1);
      expect(filtered[0].title).toBe('Has date');
    });
  });
});
