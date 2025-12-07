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
                  ? 'ring-2 ring-offset-2 ring-gray-800 dark:ring-gray-400 shadow-lg' 
                  : 'shadow-md hover:shadow-xl'
              }`}
              style={{
                backgroundColor: isSelected ? '#d1d5db' : '#f3f4f6', // Light gray background (B&W)
                border: '1px solid #9ca3af', // Gray border
              }}
            >
              {/* Icon - grayscale filter */}
              <div className="text-4xl mb-3 text-center grayscale">
                {category.icon}
              </div>

              {/* Name */}
              <div className="text-sm font-semibold text-center text-gray-900">
                {category.name}
              </div>
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
