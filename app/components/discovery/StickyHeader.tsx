/**
 * Enhanced Sticky Header with Search Bar Integration
 * Provides smooth scroll-based repositioning of navigation and search
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/ui/ThemeProvider';
import { SearchBar } from './SearchBar';

interface StickyHeaderProps {
  city?: string;
}

export function StickyHeader({ city = 'Wien' }: StickyHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY;
          
          // Show compact mode after scrolling 150px
          setIsScrolled(scrollPosition > 50);
          setIsCompact(scrollPosition > 150);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Check initial scroll position
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSignInClick = () => {
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 3000);
  };

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled ? 'shadow-lg' : ''
      }`}
      style={{
        backgroundColor: isScrolled ? 'rgba(9, 23, 23, 0.98)' : 'rgba(9, 23, 23, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        willChange: 'transform',
      }}
    >
      {/* Main Navigation Bar */}
      <div
        className={`border-b border-gray-800 transition-all duration-300 ${
          isCompact ? 'py-2' : 'py-3'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Left Section: Logo + Links (when compact) */}
            <div className="flex items-center space-x-6 md:space-x-8">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2 flex-shrink-0">
                <span
                  className={`font-bold font-heading text-brand-turquoise transition-all duration-300 ${
                    isCompact ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'
                  }`}
                  style={{ color: '#20B8CD' }}
                >
                  Where2Go
                </span>
              </Link>

              {/* Navigation Links - Show on desktop */}
              <div className="hidden md:flex items-center space-x-6">
                <Link
                  href="/"
                  className="hover:text-brand-turquoise font-medium transition-colors text-sm"
                  style={{
                    fontFamily: 'FK Grotesk Neue, -apple-system, sans-serif',
                    color: '#FCFAF6',
                  }}
                >
                  Entdecken
                </Link>
                <Link
                  href="/blog"
                  className="hover:text-brand-turquoise font-medium transition-colors text-sm"
                  style={{
                    fontFamily: 'FK Grotesk Neue, -apple-system, sans-serif',
                    color: '#FCFAF6',
                  }}
                >
                  Blog
                </Link>
              </div>
            </div>

            {/* Center Section: Search Bar (when compact) */}
            {isCompact && (
              <div
                className="hidden lg:block flex-1 max-w-md mx-4 animate-slide-in"
                style={{
                  animation: 'slideIn 0.3s ease-out',
                }}
              >
                <SearchBar placeholder="Events suchen..." />
              </div>
            )}

            {/* Right Section: Theme Toggle + Sign In */}
            <div className="flex items-center space-x-3 md:space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg hover:bg-gray-800 transition-all duration-200 ${
                  isCompact ? 'scale-90' : ''
                }`}
                style={{ color: '#FCFAF6' }}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>

              {/* Sign In Button */}
              <div className="relative">
                <button
                  onClick={handleSignInClick}
                  className={`px-3 md:px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 font-heading ${
                    isCompact ? 'text-sm' : ''
                  }`}
                  style={{
                    backgroundColor: '#20B8CD',
                    color: '#FCFAF6',
                    fontFamily: 'FK Grotesk Neue, -apple-system, sans-serif',
                  }}
                >
                  Anmelden
                </button>
                {showComingSoon && (
                  <div className="absolute top-full right-0 mt-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap animate-fade-in z-50">
                    Demnächst verfügbar...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }

        /* Smooth transitions for all child elements */
        header * {
          transition-property: transform, opacity, font-size;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          header,
          header * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </header>
  );
}
