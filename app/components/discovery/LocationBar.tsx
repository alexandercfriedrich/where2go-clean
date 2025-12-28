/**
 * Location Bar Component
 * Sticky bar with city dropdown for switching between cities
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils/slugify';

interface LocationBarProps {
  initialCity?: string;
}

interface City {
  name: string;
  slug: string;
}

export function LocationBar({ 
  initialCity = 'Wien', 
}: LocationBarProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  
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
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  const handleCityChange = (citySlug: string) => {
    setIsOpen(false);
    router.push(`/${citySlug}`);
  };
  
  return (
    <div className="sticky top-16 md:top-18 z-10 border-b shadow-sm" style={{ backgroundColor: '#091717', borderColor: '#2E565D' }}> {/* Offblack with Teal Medium border */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-12">
          {/* City Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-2 px-4 py-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Select city"
              aria-expanded={isOpen}
              style={{ color: '#FCFAF6' }} /* Paper White */
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#BADFDE' }}> {/* Sky color for icon */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">
                {initialCity}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#BADFDE' }}> {/* Sky color for icon */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {isOpen && cities.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-lg shadow-lg border py-1 z-20" style={{ backgroundColor: '#13343B', borderColor: '#2E565D' }}> {/* Teal Dark */}
                {cities.map((city) => (
                  <button
                    key={city.slug}
                    onClick={() => handleCityChange(city.slug)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                      city.name === initialCity 
                        ? 'font-medium' 
                        : ''
                    }`}
                    style={{ 
                      color: city.name === initialCity ? '#20B8CD' : '#FCFAF6',
                      backgroundColor: city.name === initialCity ? 'rgba(32, 184, 205, 0.1)' : undefined
                    }}
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
