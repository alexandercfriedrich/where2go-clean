'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { slugify } from '@/lib/utils/slugify';
import { getAllCategories } from '../../lib/events/category-utils';

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
  
  const categories = getAllCategories();
  const timeFilters = [
    { label: 'heute', slug: 'heute' },
    { label: 'morgen', slug: 'morgen' },
    { label: 'am Wochenende', slug: 'wochenende' }
  ];

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
            
            // Initialize accordion state - Clubs & Nachtleben open, others closed
            const initialState: AccordionState = {};
            categories.forEach((category) => {
              initialState[category.id] = category.name === 'Clubs & Nachtleben';
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
  
  const toggleAccordion = (categoryId: string) => {
    setAccordionState(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  // Get the primary city (first city or Wien as default)
  const primaryCity = cities.length > 0 ? cities[0] : { name: 'Wien', slug: 'wien' };
  
  return (
    <footer className="main-footer">
      <div className="container">
        {/* Category Accordion Section */}
        <div className="footer-category-accordion">
          <h3>Events nach Kategorie</h3>
          <div className="category-grid">
            {categories.map((category) => {
              const isOpen = accordionState[category.id];
              const categorySlug = slugify(category.name);
              
              return (
                <div key={category.id} className={`category-card ${isOpen ? 'open' : ''}`}>
                  <button 
                    className="category-header"
                    onClick={() => toggleAccordion(category.id)}
                    aria-expanded={isOpen}
                    aria-label={`Toggle events for ${category.name}`}
                  >
                    <div className="category-info">
                      <span className="category-icon">{category.icon}</span>
                      <span className="category-name">{category.name}</span>
                    </div>
                    <svg 
                      className="chevron"
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  <div className="category-content">
                    <div className="category-links">
                      {timeFilters.map((filter, idx) => (
                        <Link
                          key={filter.slug}
                          href={`/${primaryCity.slug}/${categorySlug}/${filter.slug}`}
                          className="category-link"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <span className="sr-only">{category.name} Events </span>
                          {filter.label} in {primaryCity.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Standard Footer Links */}
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
          background: #1a2332;
          color: #ffffff;
          padding: 48px 0 32px;
          margin-top: 80px;
        }
        
        .footer-category-accordion {
          padding: 0 0 48px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 32px;
        }
        
        .footer-category-accordion h3 {
          color: #ffffff;
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 32px;
          text-align: center;
        }
        
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        
        .category-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border-left: 4px solid #14b8a6;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .category-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-left-color: #0d9488;
        }
        
        .category-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #ffffff;
          transition: all 0.2s ease;
        }
        
        .category-header:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        
        .category-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .category-icon {
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
        }
        
        .category-name {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
        }
        
        .chevron {
          transition: transform 0.3s ease;
          color: #14b8a6;
          flex-shrink: 0;
        }
        
        .category-card.open .chevron {
          transform: rotate(180deg);
        }
        
        .category-content {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }
        
        .category-card.open .category-content {
          max-height: 500px;
        }
        
        .category-links {
          padding: 0 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .category-link {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.2s ease;
          opacity: 0;
          transform: translateX(-10px);
          animation: slideIn 0.3s ease forwards;
        }
        
        @keyframes slideIn {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .category-card:not(.open) .category-link {
          animation: none;
        }
        
        .category-link:hover {
          background: rgba(20, 184, 166, 0.1);
          color: #14b8a6;
          transform: translateX(4px);
        }
        
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          padding-top: 24px;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 24px;
          justify-content: center;
          align-items: center;
        }

        .footer-link {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          font-weight: 400;
          transition: color 0.2s ease;
          padding: 4px 0;
        }

        .footer-link:hover {
          color: #14b8a6;
        }

        .footer-copyright {
          text-align: center;
        }

        .footer-copyright p {
          color: #64748b;
          font-size: 13px;
          margin: 0;
        }

        @media (max-width: 767px) {
          .main-footer {
            padding: 32px 0 24px;
            margin-top: 60px;
          }
          
          .footer-category-accordion {
            padding: 0 0 32px;
            margin-bottom: 24px;
          }
          
          .footer-category-accordion h3 {
            font-size: 20px;
            margin-bottom: 24px;
          }
          
          .category-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          
          .category-card {
            border-left-width: 3px;
          }
          
          .category-header {
            padding: 14px 16px;
          }
          
          .category-icon {
            font-size: 20px;
            width: 28px;
            height: 28px;
          }
          
          .category-name {
            font-size: 15px;
          }
          
          .category-links {
            padding: 0 16px 14px;
          }
          
          .category-link {
            font-size: 13px;
            padding: 6px 10px;
          }

          .footer-links {
            flex-direction: column;
            gap: 12px;
          }

          .footer-link {
            font-size: 13px;
          }
        }
        
        @media (min-width: 768px) {
          .category-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (min-width: 1024px) {
          .category-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </footer>
  );
}
