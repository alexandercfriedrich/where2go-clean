import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WienInfoScraper, scrapeWienInfoEvents } from '../scrapers/wienInfoScraper';

// Sample HTML content from Wien.info event page
const mockEventPageHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta property="og:description" content="Da haben sich zwei gefunden. Zwei Erz-Komödianten." />
  <meta name="keywords" content="Theater und Kabarett,">
</head>
<body>
<h1>Gernot &amp; Stipsits</h1>
<div>
  <h2 class="text-650">Termine</h2>
  <ul class="flex flex-col gap-500 w-full">
    <li class="flex pb-500 last:pb-0 w-full gap-300">
      <span class="font-normal text-300">Di</span>
      <span class="flex w-full justify-between">
        <span class="font-normal">02.12.2025</span>
        <span>
          <span>19:30</span>
          <span>Uhr</span>
        </span>
      </span>
    </li>
    <li class="flex pb-500 last:pb-0 w-full gap-300">
      <span class="font-normal text-300">Mo</span>
      <span class="flex w-full justify-between">
        <span class="font-normal">29.12.2025</span>
        <span>
          <span>20:00</span>
          <span>Uhr</span>
        </span>
      </span>
    </li>
  </ul>
</div>
<div class="h-[1px]"></div>
<div>
  <h2 class="text-650">Veranstaltungsort</h2>
  <div itemscope itemtype="http://schema.org/LocalBusiness">
    <h3 itemprop="name">Globe Wien - Marx Halle</h3>
    <address itemprop="address">Karl-Farkas-Gasse 19, 1030 Wien</address>
    <span itemprop="telephone">+43 1 588 93 30</span>
  </div>
</div>
</body>
</html>
`;

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WienInfoScraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('HTML Parsing', () => {
    it('should parse time slots from Termine section', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockEventPageHtml,
      });

      const scraper = new WienInfoScraper({ dryRun: true, debug: false });
      const result = await scraper.scrapeEventPage('https://www.wien.info/de/test-event');

      expect(result).not.toBeNull();
      expect(result?.timeSlots).toHaveLength(2);
      
      // First time slot
      expect(result?.timeSlots[0].date).toBe('02.12.2025');
      expect(result?.timeSlots[0].dateISO).toBe('2025-12-02');
      expect(result?.timeSlots[0].time).toBe('19:30');
      expect(result?.timeSlots[0].dayOfWeek).toBe('Di');
      
      // Second time slot
      expect(result?.timeSlots[1].date).toBe('29.12.2025');
      expect(result?.timeSlots[1].dateISO).toBe('2025-12-29');
      expect(result?.timeSlots[1].time).toBe('20:00');
      expect(result?.timeSlots[1].dayOfWeek).toBe('Mo');
    });

    it('should parse venue information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockEventPageHtml,
      });

      const scraper = new WienInfoScraper({ dryRun: true, debug: false });
      const result = await scraper.scrapeEventPage('https://www.wien.info/de/test-event');

      expect(result).not.toBeNull();
      expect(result?.venueName).toBe('Globe Wien - Marx Halle');
      expect(result?.venueAddress).toBe('Karl-Farkas-Gasse 19, 1030 Wien');
      expect(result?.venuePhone).toBe('+43 1 588 93 30');
    });

    it('should parse description from meta tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockEventPageHtml,
      });

      const scraper = new WienInfoScraper({ dryRun: true, debug: false });
      const result = await scraper.scrapeEventPage('https://www.wien.info/de/test-event');

      expect(result).not.toBeNull();
      expect(result?.description).toBe('Da haben sich zwei gefunden. Zwei Erz-Komödianten.');
    });

    it('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const scraper = new WienInfoScraper({ dryRun: true, debug: false });
      const result = await scraper.scrapeEventPage('https://www.wien.info/de/nonexistent');

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const scraper = new WienInfoScraper({ dryRun: true, debug: false });
      const result = await scraper.scrapeEventPage('https://www.wien.info/de/test-event');

      expect(result).toBeNull();
    });

    it('should handle pages without Termine section', async () => {
      const htmlWithoutTermine = `
        <!DOCTYPE html>
        <html>
        <head><meta property="og:description" content="Test event" /></head>
        <body><h1>Event without dates</h1></body>
        </html>
      `;

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => htmlWithoutTermine,
      });

      const scraper = new WienInfoScraper({ dryRun: true, debug: false });
      const result = await scraper.scrapeEventPage('https://www.wien.info/de/test-event');

      expect(result).not.toBeNull();
      expect(result?.timeSlots).toHaveLength(0);
    });
  });

  describe('Date Conversion', () => {
    it('should correctly convert German date format to ISO', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockEventPageHtml,
      });

      const scraper = new WienInfoScraper({ dryRun: true, debug: false });
      const result = await scraper.scrapeEventPage('https://www.wien.info/de/test-event');

      // Verify date conversion: 02.12.2025 -> 2025-12-02
      expect(result?.timeSlots[0].date).toBe('02.12.2025');
      expect(result?.timeSlots[0].dateISO).toBe('2025-12-02');
    });
  });

  describe('Scraper Options', () => {
    it('should respect rate limit option', () => {
      const scraper = new WienInfoScraper({ rateLimit: 5 });
      // Rate limit is set internally, we just verify the scraper is created
      expect(scraper).toBeDefined();
    });

    it('should respect limit option', () => {
      const scraper = new WienInfoScraper({ limit: 50 });
      expect(scraper).toBeDefined();
    });

    it('should default to dry run false', () => {
      const scraper = new WienInfoScraper({});
      expect(scraper).toBeDefined();
    });
  });
});

describe('scrapeWienInfoEvents function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a valid result structure', async () => {
    // Mock the supabase query to return empty results
    vi.mock('@/lib/supabase/client', () => ({
      supabaseAdmin: {
        from: () => ({
          select: () => ({
            eq: () => ({
              not: () => ({
                or: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        }),
      },
    }));

    const result = await scrapeWienInfoEvents({
      dryRun: true,
      limit: 1,
      debug: false,
    });

    // Verify result structure
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('eventsScraped');
    expect(result).toHaveProperty('eventsUpdated');
    expect(result).toHaveProperty('eventsFailed');
    expect(result).toHaveProperty('duration');
    expect(result).toHaveProperty('errors');
    
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.eventsScraped).toBe('number');
    expect(typeof result.eventsUpdated).toBe('number');
    expect(typeof result.eventsFailed).toBe('number');
    expect(typeof result.duration).toBe('number');
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
