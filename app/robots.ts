import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env.SITE_URL || 'https://www.where2go.at').replace(/\/$/, '');
  
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/en/', '/es/', '/it/', '/fr/', '/wien/', '/berlin/', '/ibiza/'],
      disallow: ['/api/', '/admin/', '/_next/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
