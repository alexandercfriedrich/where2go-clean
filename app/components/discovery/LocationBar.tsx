/**
 * Location Bar Component
 * Sticky bar with location selector and quick date filters
 */

'use client';

import React, { useState } from 'react';

interface LocationBarProps {
  initialCity?: string;
  onCityChange?: (city: string) => void;
  onDateFilterChange?: (filter: string) => void;
}

export function LocationBar({ 
  initialCity = 'Wien', 
  onCityChange,
  onDateFilterChange 
}: LocationBarProps) {
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedDateFilter, setSelectedDateFilter] = useState('today');

  const dateFilters = [
    { id: 'today', label: 'Today' },
    { id: 'this-week', label: 'This Week' },
    { id: 'weekend', label: 'Weekend' },
    { id: 'next-week', label: 'Next Week' },
  ];

  const handleCityClick = () => {
    // In a full implementation, this would open a city selector modal
    // For now, just cycle through some cities
    const cities = ['Wien', 'Berlin', 'Munich', 'Salzburg'];
    const currentIndex = cities.indexOf(selectedCity);
    const nextCity = cities[(currentIndex + 1) % cities.length];
    setSelectedCity(nextCity);
    onCityChange?.(nextCity);
  };

  const handleDateFilterClick = (filterId: string) => {
    setSelectedDateFilter(filterId);
    onDateFilterChange?.(filterId);
  };

  return (
    <div className="sticky top-16 md:top-18 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 space-x-4 overflow-x-auto">
          {/* Location Selector */}
          <button
            onClick={handleCityClick}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {selectedCity}
            </span>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Date Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto">
            {dateFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleDateFilterClick(filter.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedDateFilter === filter.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Filters Button */}
          <button className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">
              Filters
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
