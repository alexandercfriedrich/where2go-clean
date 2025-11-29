/**
 * Location Bar Component
 * Simplified sticky bar (date filters and city dropdown removed as per requirements)
 */

'use client';

import React from 'react';

interface LocationBarProps {
  initialCity?: string;
  onCityChange?: (city: string) => void;
  onDateFilterChange?: (filter: string) => void;
}

export function LocationBar({ 
  initialCity = 'Wien', 
}: LocationBarProps) {
  // Component simplified - date filters removed since DateFilterLinks exists in main content
  // City dropdown removed as per issue requirement #12
  // Filter button removed as per issue requirement #12
  
  return (
    <div className="sticky top-16 md:top-18 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-12">
          {/* Location indicator (display only, not a dropdown) */}
          <div className="flex items-center space-x-2 px-4 py-2">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {initialCity}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
