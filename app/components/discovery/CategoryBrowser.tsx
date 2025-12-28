/**
 * Category Browser Component
 * Visual category selection with icons (dark gray background with light gray border)
 */

'use client';

import React from 'react';
import { getAllCategories } from '../../../lib/events/category-utils';

interface CategoryBrowserProps {
  onCategoryClick?: (categoryName: string) => void;
  selectedCategory?: string | null;
}

export function CategoryBrowser({ 
  onCategoryClick,
  selectedCategory 
}: CategoryBrowserProps) {
  const categories = getAllCategories();
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryClick?.(category.id)}
              className={`relative p-6 rounded-2xl transition-all duration-200 hover:scale-105 ${
                isSelected 
                  ? 'ring-2 ring-offset-2 ring-brand-turquoise shadow-lg' 
                  : 'shadow-md hover:shadow-xl'
              }`}
              style={{
                backgroundColor: isSelected ? '#20B8CD' : undefined,
              }}
              // Dark mode: Teal Dark background, Paper White text
              // Light mode: Paper White background, Offblack text
              data-theme-bg={isSelected ? 'selected' : 'default'}
            >
              {/* Icon */}
              <div 
                className="text-4xl mb-3 text-center"
                style={{
                  color: isSelected ? '#FCFAF6' : undefined,
                }}
              >
                {category.icon}
              </div>

              {/* Name */}
              <div 
                className="text-sm font-semibold text-center"
                style={{
                  color: isSelected ? '#FCFAF6' : undefined,
                }}
              >
                {category.name}
              </div>

              {/* Inline styles for theme-aware backgrounds */}
              <style jsx>{`
                button[data-theme-bg="default"] {
                  background-color: #FCFAF6; /* Paper White in light mode */
                  color: #091717; /* Offblack text in light mode */
                }
                
                :global(.dark) button[data-theme-bg="default"] {
                  background-color: #13343B; /* Teal Dark in dark mode */
                  color: #FCFAF6; /* Paper White text in dark mode */
                }
                
                button[data-theme-bg="default"]:hover {
                  background-color: #E5E3D4; /* Ecru on hover light mode */
                }
                
                :global(.dark) button[data-theme-bg="default"]:hover {
                  background-color: #2E565D; /* Teal Medium on hover dark mode */
                }
              `}</style>
            </button>
          );
        })}
      </div>
      
      {/* Clear Filter Button */}
      {selectedCategory && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => onCategoryClick?.('')}
            className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Alle Kategorien anzeigen
          </button>
        </div>
      )}
    </div>
  );
}
