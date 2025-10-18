import { MetadataRoute } from 'next';
import { getActiveHotCities, slugify } from '@/lib/hotCityStore';
import { EVENT_CATEGORY_SUBCATEGORIES } from '@/lib/eventCategories';

// Time periods supported by the app
const TIME_PERIODS = ['heute', 'morgen', 'wochenende'];

// Function: Generate next 30 days
function getNext30Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD
  }
  
  return dates;
}

// Function: Slugify category names
function slugifyCategory(category: string): string {
  return category
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\//g, '-')  // Replace slashes with hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Main function: Generate sitemap
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.SITE_URL || 'https://www.where2go.at').replace(/\/$/, '');
  const urls: MetadataRoute.Sitemap = [];
  
  try {
    // Get active cities from the database
    const cities = await getActiveHotCities();
    const citySlugs = cities.map(c => slugify(c.name));
    
    // Get category slugs from existing categories
    const categoryNames = Object.keys(EVENT_CATEGORY_SUBCATEGORIES);
    const categorySlugs = categoryNames.map(slugifyCategory);
    
    // 1. Homepage
    urls.push({
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'always',
      priority: 1.0,
    });

    // 2. City Landing Pages (e.g., /wien)
    citySlugs.forEach(city => {
      urls.push({
        url: `${baseUrl}/${city}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });
      
      // 3. City + Time Period (e.g., /wien/heute)
      TIME_PERIODS.forEach(period => {
        urls.push({
          url: `${baseUrl}/${city}/${period}`,
          lastModified: new Date(),
          changeFrequency: 'hourly',
          priority: 0.8,
        });
      });
      
      // 4. City + Category (e.g., /wien/musik)
      categorySlugs.forEach(category => {
        urls.push({
          url: `${baseUrl}/${city}/${category}`,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.7,
        });
        
        // 5. City + Category + Time Period (e.g., /wien/musik/heute)
        TIME_PERIODS.forEach(period => {
          urls.push({
            url: `${baseUrl}/${city}/${category}/${period}`,
            lastModified: new Date(),
            changeFrequency: 'hourly',
            priority: 0.6,
          });
        });
      });
    });

    // 6. Hot Cities with specific dates (next 30 days)
    // Only for top cities to avoid sitemap size issues
    const hotCitySlugs = citySlugs.slice(0, 2); // Top 2 cities
    const next30Days = getNext30Days();
    
    hotCitySlugs.forEach(city => {
      next30Days.forEach(date => {
        urls.push({
          url: `${baseUrl}/${city}/${date}`,
          lastModified: new Date(),
          changeFrequency: 'daily',
          priority: 0.7,
        });
      });
    });

    // 7. Additional longtail URLs per city
    citySlugs.forEach(city => {
      urls.push({
        url: `${baseUrl}/${city}/kostenlose-events`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.6,
      });
      urls.push({
        url: `${baseUrl}/${city}/events-heute-abend`,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 0.6,
      });
      urls.push({
        url: `${baseUrl}/${city}/was-ist-los`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.6,
      });
    });

    // 8. Static pages
    const staticPages = [
      '/impressum',
      '/datenschutz',
      '/agb',
      '/kontakt',
      '/ueber-uns',
      '/premium',
    ];
    
    staticPages.forEach(page => {
      urls.push({
        url: `${baseUrl}${page}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    });

    return urls;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Return minimal sitemap on error
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'always',
        priority: 1.0,
      },
    ];
  }
}

// Revalidation: Every 6 hours (21600 seconds)
export const revalidate = 21600;
