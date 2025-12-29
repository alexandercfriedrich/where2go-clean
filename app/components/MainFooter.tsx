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
  
  const categories = getAllCategories();
  const timeFilters = [
    { label: 'heute', slug: 'heute' },
    { label: 'morgen', slug: 'morgen' },
    { label: 'am Wochenende', slug: 'wochenende' }
  ];

  // Initialize accordion state independently - Clubs & Nachtleben open by default
  const [accordionState, setAccordionState] = useState<AccordionState>(() => {
    const initialState: AccordionState = {};
    categories.forEach((category) => {
      initialState[category.id] = category.name === 'Clubs & Nachtleben';
    });
    return initialState;
  });

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
                          data-animation-delay={idx}
                          onClick={() => {
                            // Scroll to top when category link is clicked
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
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
            <Link href="/blog" className="footer-link">Blog</Link>
            <Link href="/impressum" className="footer-link">Impressum</Link>
            <Link href="/agb" className="footer-link">AGB</Link>
            <Link href="/kontakt" className="footer-link">Kontakt</Link>
            <Link href="/ueber-uns" className="footer-link">Über uns</Link>
            <Link href="/premium" className="footer-link">Premium</Link>
            <Link href="/datenschutz" className="footer-link">Datenschutz</Link>
          </div>
          <div className="footer-copyright">
            <p>© {currentYear} Where2Go - Entdecke deine Stadt neu</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .main-footer {
          background: #091717; /* Offblack */
          color: #FCFAF6; /* Paper White */
          padding: 48px 0 32px;
          margin-top: 80px;
        }
        
        .footer-category-accordion {
          padding: 0 0 48px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 32px;
        }
        
        .footer-category-accordion h3 {
          color: #FCFAF6; /* Paper White */
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
          border-left: 4px solid #20B8CD;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        
        .category-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-left-color: #218090;
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
          color: #FCFAF6; /* Paper White */
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
          color: #FCFAF6; /* Paper White */
        }
        
        .chevron {
          transition: transform 0.3s ease;
          color: #20B8CD;
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
        }
        
        .category-card.open .category-link {
          animation: slideIn 0.3s ease forwards;
        }
        
        .category-card.open .category-link[data-animation-delay="0"] {
          animation-delay: 0ms;
        }
        
        .category-card.open .category-link[data-animation-delay="1"] {
          animation-delay: 50ms;
        }
        
        .category-card.open .category-link[data-animation-delay="2"] {
          animation-delay: 100ms;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .category-card:not(.open) .category-link {
          opacity: 0;
        }
        
        .category-link:hover {
          background: rgba(32, 184, 205, 0.1);
          color: #20B8CD;
          transform: translateX(4px);
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
          color: #20B8CD;
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
