'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllGuides } from '@/data/guideContent';

interface City {
  name: string;
  slug: string;
}

export default function SEOFooter() {
  const [content, setContent] = useState<string>('');
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSEOFooter = async () => {
      try {
        // Use absolute URL in case of SSR
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : 'http://localhost:3000';
        
        // Load SEO footer content
        const response = await fetch(`${baseUrl}/api/static-pages/seo-footer`);
        if (response.ok) {
          const data = await response.json();
          if (data.page && data.page.content) {
            setContent(data.page.content);
          }
        }
        
        // Load cities from hot-cities API
        const citiesResponse = await fetch(`${baseUrl}/api/hot-cities`);
        if (citiesResponse.ok) {
          const citiesData = await citiesResponse.json();
          if (citiesData.cities && Array.isArray(citiesData.cities)) {
            const cityList = citiesData.cities.map((city: any) => ({
              name: city.name,
              slug: slugify(city.name)
            }));
            setCities(cityList);
          }
        }
      } catch (error) {
        console.error('Error loading SEO footer:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSEOFooter();
  }, []);
  
  // Helper function to create URL-friendly slugs
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  if (loading) {
    return null;
  }

  return (
    <section className="seo-footer">
      <div className="container">
        {content && (
          <div 
            className="seo-footer-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
        
        {/* City Links Section */}
        {cities.length > 0 && (
          <div className="city-links-section">
            <h3>Events in deiner Stadt entdecken</h3>
            <div className="city-links-grid">
              {cities.map((city) => (
                <div key={city.slug} className="city-links-group">
                  <h4>{city.name}</h4>
                  <ul>
                    <li>
                      <Link href={`/${city.slug}/heute`}>
                        Events heute in {city.name}
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${city.slug}/morgen`}>
                        Events morgen in {city.name}
                      </Link>
                    </li>
                    <li>
                      <Link href={`/${city.slug}/wochenende`}>
                        Events am Wochenende in {city.name}
                      </Link>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event-Guides Section */}
        <div className="city-links-section">
          <h3>Event-Guides</h3>
          <div className="city-links-grid">
            {getAllGuides().slice(0, 6).map((guide) => {
              const citySlug = guide.city.toLowerCase()
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-');
              
              return (
                <div key={guide.slug} className="city-links-group">
                  <Link 
                    href={`/${citySlug}/guides/${guide.categorySlug}`}
                    className="guide-link"
                  >
                    <span className="guide-arrow">→</span>
                    {guide.title}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .seo-footer {
          background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
          padding: 80px 0 60px;
          margin-top: 80px;
          border-top: 1px solid #e0e0e0;
        }

        .seo-footer :global(h2) {
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 24px;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .seo-footer :global(h3) {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-top: 40px;
          margin-bottom: 16px;
          letter-spacing: -0.01em;
        }

        .seo-footer :global(p) {
          font-size: 16px;
          line-height: 1.7;
          color: #4a5568;
          margin-bottom: 16px;
        }

        .seo-footer :global(ul),
        .seo-footer :global(ol) {
          margin-bottom: 16px;
          padding-left: 24px;
        }

        .seo-footer :global(li) {
          font-size: 16px;
          line-height: 1.7;
          color: #4a5568;
          margin-bottom: 8px;
        }

        .seo-footer :global(a) {
          color: #5b8cff;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .seo-footer :global(a:hover) {
          color: #4a7de8;
          text-decoration: underline;
        }

        .seo-footer :global(strong) {
          font-weight: 600;
          color: #2d3748;
        }
        
        .city-links-section {
          margin-top: 60px;
          padding-top: 40px;
          border-top: 1px solid #e5e7eb;
        }
        
        .city-links-section h3 {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-bottom: 32px;
          letter-spacing: -0.01em;
        }
        
        .city-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 32px;
        }
        
        .city-links-group h4 {
          font-size: 18px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 12px;
        }
        
        .city-links-group ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .city-links-group li {
          margin-bottom: 8px;
        }
        
        .city-links-group a {
          color: #5b8cff;
          text-decoration: none;
          font-size: 15px;
          line-height: 1.6;
          transition: color 0.2s ease;
        }
        
        .city-links-group a:hover {
          color: #4a7de8;
          text-decoration: underline;
        }
        
        .guide-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #5b8cff;
          text-decoration: none;
          font-size: 15px;
          line-height: 1.6;
          transition: color 0.2s ease;
        }
        
        .guide-link:hover {
          color: #4a7de8;
          text-decoration: underline;
        }
        
        .guide-arrow {
          font-size: 12px;
          color: #9ca3af;
          transition: color 0.2s ease;
        }
        
        .guide-link:hover .guide-arrow {
          color: #FF6B35;
        }

        @media (max-width: 768px) {
          .seo-footer {
            padding: 60px 0 40px;
            margin-top: 60px;
          }

          .seo-footer :global(h2) {
            font-size: 28px;
            margin-bottom: 20px;
          }

          .seo-footer :global(h3) {
            font-size: 20px;
            margin-top: 32px;
            margin-bottom: 12px;
          }

          .seo-footer :global(p),
          .seo-footer :global(li) {
            font-size: 15px;
          }
          
          .city-links-section {
            margin-top: 40px;
            padding-top: 32px;
          }
          
          .city-links-section h3 {
            font-size: 20px;
            margin-bottom: 24px;
          }
          
          .city-links-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          
          .city-links-group h4 {
            font-size: 16px;
          }
          
          .city-links-group a {
            font-size: 14px;
          }
        }
      `}</style>
    </section>
  );
}
