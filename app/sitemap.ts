import { MetadataRoute } from 'next';
import { getActiveHotCities, slugify } from '@/lib/hotCityStore';
import { CATEGORY_SLUGS } from '@/lib/categoryMappings';

/**
 * SEO Sitemap Generator for Where2Go
 * 
 * Generates optimized sitemap with:
 * - City landing pages
 * - City + Date routes (heute, morgen, wochenende)
 * - City + Category routes (12 categories)
 * - City + Category + Date combinations
 * - Static pages
 * 
 * Total: ~104 semantic URLs optimized for Google & AI crawlers
 */

// Time periods supported by the app
const TIME_PERIODS = ['heute', 'morgen', 'wochenende'];

/**
 * Main sitemap function
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.SITE_URL || 'https://www.where2go.at').replace(/\/$/, '');
  const urls: MetadataRoute.Sitemap = [];

  try {
    // Get active cities from the database
    const cities = await getActiveHotCities();
    const citySlugs = cities.map(c => slugify(c.name));

    // 1. Homepage - Highest Priority
    urls.push({
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    });

    // 2. City Landing Pages (e.g., /wien, /ibiza)
    citySlugs.forEach(city => {
      urls.push({
        url: `${baseUrl}/${city}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.95,
      });
    });

    // 3. City + Date Routes (e.g., /wien/heute, /wien/morgen, /wien/wochenende)
    citySlugs.forEach(city => {
      TIME_PERIODS.forEach(period => {
        urls.push({
          url: `${baseUrl}/${city}/${period}`,
          lastModified: new Date(),
          changeFrequency: 'hourly',
          priority: 0.85,
        });
      });
    });

    // 4. City + Category Routes (e.g., /wien/clubs-nachtleben)
    citySlugs.forEach(city => {
      CATEGORY_SLUGS.forEach(category => {
        urls.push({
          url: `${baseUrl}/${city}/${category}`,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.80,
        });
      });
    });

    // 5. City + Category + Date Routes (e.g., /wien/clubs-nachtleben/heute)
    citySlugs.forEach(city => {
      CATEGORY_SLUGS.forEach(category => {
        TIME_PERIODS.forEach(period => {
          urls.push({
            url: `${baseUrl}/${city}/${category}/${period}`,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 0.70,
          });
        });
      });
    });

    // 6. Static Pages
    const staticPages = [
      { path: '/impressum', priority: 0.5, changeFrequency: 'monthly' as const },
      { path: '/datenschutz', priority: 0.5, changeFrequency: 'monthly' as const },
      { path: '/agb', priority: 0.5, changeFrequency: 'monthly' as const },
      { path: '/kontakt', priority: 0.6, changeFrequency: 'yearly' as const },
      { path: '/ueber-uns', priority: 0.6, changeFrequency: 'yearly' as const },
    ];

    staticPages.forEach(page => {
      urls.push({
        url: `${baseUrl}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      });
    });

    console.log(`[Sitemap] Generated ${urls.length} URLs`);

    return urls;
  } catch (error) {
    console.error('[Sitemap Error]', error);

    // Return minimal sitemap on error
    return [
      {
        url: `${(process.env.SITE_URL || 'https://www.where2go.at').replace(/\/$/, '')}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
    ];
  }
}

// Revalidate every 24 hours
export const revalidate = 86400;
