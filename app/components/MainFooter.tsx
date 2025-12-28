'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { slugify } from '@/lib/utils/slugify';

interface City {
  name: string;
  slug: string;
}

interface AccordionState {
  [key: string]: boolean;
}

export default function MainFooter() {
  const currentYear = new Date().getFullYear();
  const [cities, setCities] = useState<City[]>([]);
  const [accordionState, setAccordionState] = useState<AccordionState>({});
  
  useEffect(() => {
    const loadCities = async () => {
      try {
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        const citiesResponse = await fetch(`${baseUrl}/api/hot-cities`);
        if (citiesResponse.ok) {
          const citiesData = await citiesResponse.json();
          if (citiesData.cities && Array.isArray(citiesData.cities)) {
            const cityList = citiesData.cities.map((city: { name: string }) => ({
              name: city.name,
              slug: slugify(city.name)
            }));
            setCities(cityList);
            
            // Initialize accordion state - all closed on mobile
            const initialState: AccordionState = {};
            cityList.forEach((city: City) => {
              initialState[city.slug] = false;
            });
            setAccordionState(initialState);
          }
        }
      } catch (error) {
        console.error('Error loading cities:', error);
      }
    };

    loadCities();
  }, []);
  
  const toggleAccordion = (citySlug: string) => {
    setAccordionState(prev => ({
      ...prev,
      [citySlug]: !prev[citySlug]
    }));
  };
  
  return (
    <footer className="main-footer">
      <div className="container">
        {/* City Links Section with Accordion on Mobile */}
        {cities.length > 0 && (
          <div className="footer-city-links">
            <h3>Events in deiner Stadt</h3>
            <div className="city-links-grid">
              {cities.map((city) => (
                <div key={city.slug} className="city-group">
                  <button 
                    className="city-accordion-header"
                    onClick={() => toggleAccordion(city.slug)}
                    aria-expanded={accordionState[city.slug]}
                  >
                    <span className="city-name">{city.name}</span>
                    <span className="accordion-icon">{accordionState[city.slug] ? '−' : '+'}</span>
                  </button>
                  <div className={`city-links-content ${accordionState[city.slug] ? 'open' : ''}`}>
                    <Link href={`/${city.slug}?date=today`} className="city-link">
                      Events heute in {city.name}
                    </Link>
                    <Link href={`/${city.slug}?date=tomorrow`} className="city-link">
                      Events morgen in {city.name}
                    </Link>
                    <Link href={`/${city.slug}?date=weekend`} className="city-link">
                      Events am Wochenende in {city.name}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="footer-content">
          <div className="footer-links">
            <a href="/blog" className="footer-link">Blog</a>
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
        
        .city-accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          margin-bottom: 4px;
          transition: opacity 0.2s ease;
        }
        
        .city-accordion-header:hover {
          opacity: 0.8;
        }
        
        .city-name {
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
        }
        
        .accordion-icon {
          color: #5b8cff;
          font-size: 20px;
          font-weight: 600;
          display: none;
        }
        
        .city-links-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
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
            gap: 16px;
          }
          
          .accordion-icon {
            display: block;
          }
          
          .city-links-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease, opacity 0.3s ease;
            opacity: 0;
          }
          
          .city-links-content.open {
            max-height: 200px;
            opacity: 1;
            margin-top: 8px;
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
        
        @media (min-width: 769px) {
          .city-links-content {
            display: flex !important;
          }
        }
      `}</style>
    </footer>
  );
}
