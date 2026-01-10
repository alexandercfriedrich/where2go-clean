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
                      <div className="category-title">
                        <span className="category-name">{category.name}</span>
                      </div>
                      <p className="category-description">Schnellauswahl</p>
                    </div>
                    <div className="arrow">↓</div>
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
                          <div className="query-dot"></div>
                          <span>Welche {category.name} Events finden {filter.label} in {primaryCity.name} statt?</span>
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
          background: linear-gradient(135deg, #0a0e27 0%, #13182f 50%, #0a0e27 100%);
          color: #F5F5F5;
          padding: 48px 0 32px;
          margin-top: 80px;
        }
        
        .footer-category-accordion {
          padding: 0 0 48px;
          border-bottom: 1px solid rgba(32, 225, 211, 0.1);
          margin-bottom: 32px;
        }
        
        .footer-category-accordion h3 {
          font-family: 'FK Grotesk Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 18pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 1.5rem;
          color: rgb(32, 184, 205);
          line-height: 21pt;
          text-align: center;
        }
        
        .category-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
          animation: fadeIn 0.8s ease-out 0.2s both;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .category-card {
          position: relative;
          cursor: pointer;
          overflow: hidden;
          border-radius: 1.5rem;
          border: 1px solid rgba(32, 225, 211, 0.1);
          background: rgba(13, 14, 39, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 1.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: slideUpFade 0.6s ease-out both;
        }
        
        .category-card:nth-child(1) { animation-delay: 0.05s; }
        .category-card:nth-child(2) { animation-delay: 0.1s; }
        .category-card:nth-child(3) { animation-delay: 0.15s; }
        .category-card:nth-child(4) { animation-delay: 0.2s; }
        .category-card:nth-child(5) { animation-delay: 0.25s; }
        .category-card:nth-child(6) { animation-delay: 0.3s; }
        .category-card:nth-child(7) { animation-delay: 0.35s; }
        .category-card:nth-child(8) { animation-delay: 0.4s; }
        .category-card:nth-child(9) { animation-delay: 0.45s; }
        .category-card:nth-child(10) { animation-delay: 0.5s; }
        .category-card:nth-child(11) { animation-delay: 0.55s; }
        .category-card:nth-child(12) { animation-delay: 0.6s; }
        
        .category-card:hover {
          border-color: rgba(32, 225, 211, 0.2);
          background: rgba(32, 225, 211, 0.08);
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(32, 225, 211, 0.15);
        }
        
        .category-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, currentColor 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s ease-out;
          pointer-events: none;
          filter: blur(40px);
        }
        
        .category-card:hover::before {
          opacity: 0.3;
        }
        
        .category-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 0;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #F5F5F5;
          transition: all 0.2s ease;
        }
        
        .category-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }
        
        .category-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .category-name {
          font-family: 'FK Grotesk Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 18pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: rgb(32, 184, 205);
          line-height: 21pt;
        }
        
        .category-description {
          font-family: 'FK Grotesk Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14pt;
          font-weight: 100;
          color: #e5e7eb;
          line-height: 18pt;
          letter-spacing: 0.02em;
          margin: 0;
          transition: color 0.3s ease-out;
        }
        
        .category-card:hover .category-description {
          color: #e5e7eb;
        }
        
        .arrow {
          display: inline-block;
          transition: transform 0.3s ease-out;
          color: rgb(32, 184, 205);
          font-size: 1.25rem;
          line-height: 1;
          opacity: 0.6;
          margin-left: 1rem;
        }
        
        .category-card:hover .arrow {
          opacity: 1;
        }
        
        .category-card.open .arrow {
          transform: rotate(180deg);
        }
        
        .category-content {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 0;
        }
        
        .category-card.open .category-content {
          max-height: 500px;
          opacity: 1;
          margin-top: 1rem;
        }
        
        .category-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .category-link {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 0.5rem;
          background: rgba(32, 225, 211, 0.05);
          border: 1px solid rgba(32, 225, 211, 0.15);
          font-family: 'FK Grotesk Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14pt;
          font-weight: 100;
          color: #e5e7eb;
          line-height: 18pt;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease-out;
          animation: slideInLeft 0.3s ease-out backwards;
          letter-spacing: 0.02em;
        }
        
        .category-card.open .category-link:nth-child(1) { animation-delay: 0.1s; }
        .category-card.open .category-link:nth-child(2) { animation-delay: 0.15s; }
        .category-card.open .category-link:nth-child(3) { animation-delay: 0.2s; }
        
        .category-link:hover {
          background: rgba(32, 225, 211, 0.12);
          border-color: rgba(32, 225, 211, 0.3);
          color: #e5e7eb;
        }
        
        .query-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 0.4rem;
          transition: all 0.2s ease-out;
          background: rgb(32, 184, 205);
          opacity: 0.3;
        }
        
        .category-link:hover .query-dot {
          transform: scale(1.3);
          opacity: 0.7;
        }
        
        /* Color assignments for each category */
        .category-card:nth-child(1) { color: #ec4899; } /* Clubs & Nachtleben - Pink */
        .category-card:nth-child(2) { color: #fb5607; } /* Live-Konzerte - Orange */
        .category-card:nth-child(3) { color: #ffbe0b; } /* Klassik & Oper - Yellow */
        .category-card:nth-child(4) { color: #8338ec; } /* Theater & Comedy - Purple */
        .category-card:nth-child(5) { color: #3a86ff; } /* Museen & Ausstellungen - Blue */
        .category-card:nth-child(6) { color: #06ffa5; } /* Film & Kino - Teal */
        .category-card:nth-child(7) { color: #ffb703; } /* Open Air & Festivals - Amber */
        .category-card:nth-child(8) { color: #d62828; } /* Kulinarik & Märkte - Red */
        .category-card:nth-child(9) { color: #06d6a0; } /* Sport & Fitness - Emerald */
        .category-card:nth-child(10) { color: #118ab2; } /* Bildung & Workshops - Sky */
        .category-card:nth-child(11) { color: #ef476f; } /* Familie & Kinder - Rose */
        .category-card:nth-child(12) { color: #0891b2; } /* LGBTQ+ - Cyan */

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
          font-family: 'FK Grotesk Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #e5e7eb;
          text-decoration: none;
          font-size: 14px;
          font-weight: 100;
          transition: color 0.2s ease;
          padding: 4px 0;
          opacity: 0.7;
        }

        .footer-link:hover {
          opacity: 1;
          color: rgb(32, 184, 205);
        }

        .footer-copyright {
          text-align: center;
        }

        .footer-copyright p {
          font-family: 'FK Grotesk Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #e5e7eb;
          font-size: 13px;
          font-weight: 100;
          margin: 0;
          opacity: 0.7;
        }
        
        /* Accessibility: Prefers reduced motion */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
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
            gap: 1rem;
          }
          
          .category-card {
            border-radius: 1rem;
            padding: 1.25rem;
          }
          
          .category-icon {
            font-size: 20px;
            width: 40px;
            height: 40px;
          }
          
          .category-name {
            font-size: 15px;
          }
          
          .category-link {
            font-size: 13px;
            padding: 0.5rem;
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
