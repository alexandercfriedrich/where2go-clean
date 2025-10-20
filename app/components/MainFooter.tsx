'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface City {
  name: string;
  slug: string;
}

export default function MainFooter() {
  const currentYear = new Date().getFullYear();
  const [cities, setCities] = useState<City[]>([]);
  
  useEffect(() => {
    const loadCities = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : 'http://localhost:3000';
        
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
        console.error('Error loading cities:', error);
      }
    };

    loadCities();
  }, []);
  
  const slugify = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
  
  return (
    <footer className="main-footer">
      <div className="container">
        {/* City Links Section */}
        {cities.length > 0 && (
          <div className="footer-city-links">
            <h3>Events in deiner Stadt</h3>
            <div className="city-links-grid">
              {cities.map((city) => (
                <div key={city.slug} className="city-group">
                  <span className="city-name">{city.name}</span>
                  <Link href={`/${city.slug}/heute`} className="city-link">
                    Events heute in {city.name}
                  </Link>
                  <Link href={`/${city.slug}/morgen`} className="city-link">
                    Events morgen in {city.name}
                  </Link>
                  <Link href={`/${city.slug}/wochenende`} className="city-link">
                    Events am Wochenende in {city.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="footer-content">
          <div className="footer-links">
            <a href="/impressum" className="footer-link">Impressum</a>
            <a href="/agb" className="footer-link">AGB</a>
            <a href="/kontakt" className="footer-link">Kontakt</a>
            <a href="/ueber-uns" className="footer-link">Über uns</a>
            <a href="/premium" className="footer-link">Premium</a>
            <a href="/datenschutz" className="footer-link">Datenschutz</a>
          </div>
          <div className="footer-copyright">
            <p>© {currentYear} Where2Go - Entdecke deine Stadt neu</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .main-footer {
          background: #1a1a1a;
          color: #ffffff;
          padding: 32px 0;
          margin-top: 80px;
          border-top: 1px solid #333;
        }
        
        .footer-city-links {
          padding: 40px 0;
          border-bottom: 1px solid #333;
          margin-bottom: 32px;
        }
        
        .footer-city-links h3 {
          color: #ffffff;
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 32px;
          text-align: center;
        }
        
        .city-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 32px 24px;
        }
        
        .city-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .city-name {
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .city-link {
          color: #5b8cff;
          text-decoration: none;
          font-size: 14px;
          line-height: 1.6;
          transition: color 0.2s ease;
        }
        
        .city-link:hover {
          color: #4a7de8;
          text-decoration: underline;
        }

        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 24px;
          justify-content: center;
          align-items: center;
        }

        .footer-link {
          color: #e0e0e0;
          text-decoration: none;
          font-size: 14px;
          font-weight: 400;
          transition: color 0.2s ease;
          padding: 4px 0;
        }

        .footer-link:hover {
          color: #ffffff;
          text-decoration: underline;
        }

        .footer-copyright {
          text-align: center;
        }

        .footer-copyright p {
          color: #9ca3af;
          font-size: 13px;
          margin: 0;
        }

        @media (max-width: 768px) {
          .main-footer {
            padding: 24px 0;
            margin-top: 60px;
          }
          
          .footer-city-links {
            padding: 32px 0;
            margin-bottom: 24px;
          }
          
          .footer-city-links h3 {
            font-size: 18px;
            margin-bottom: 24px;
          }
          
          .city-links-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          
          .city-name {
            font-size: 15px;
          }
          
          .city-link {
            font-size: 13px;
          }

          .footer-links {
            flex-direction: column;
            gap: 12px;
          }

          .footer-link {
            font-size: 13px;
          }
        }
      `}</style>
    </footer>
  );
}
