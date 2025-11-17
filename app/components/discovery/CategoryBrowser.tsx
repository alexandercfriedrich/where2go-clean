/**
 * Category Browser Component
 * Visual category selection with icons and colors
 */

'use client';

import React from 'react';
import { getCategoryColor, getCategoryDisplayName } from '../../../lib/events/category-utils';

interface Category {
  id: string;
  name: string;
  icon: string;
  count?: number;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'theater', name: 'Theater', icon: '🎭' },
  { id: 'art', name: 'Art', icon: '🎨' },
  { id: 'food', name: 'Food', icon: '🍽️' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'nightlife', name: 'Nightlife', icon: '🌃' },
  { id: 'culture', name: 'Culture', icon: '🏛️' },
  { id: 'family', name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 'comedy', name: 'Comedy', icon: '😂' },
  { id: 'concerts', name: 'Concerts', icon: '🎤' },
  { id: 'cinema', name: 'Cinema', icon: '🎬' },
  { id: 'exhibitions', name: 'Exhibitions', icon: '🖼️' },
];

interface CategoryBrowserProps {
  categories?: Category[];
  onCategoryClick?: (categoryId: string) => void;
  selectedCategory?: string;
}

export function CategoryBrowser({ 
  categories = DEFAULT_CATEGORIES, 
  onCategoryClick,
  selectedCategory 
}: CategoryBrowserProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
        {categories.map((category) => {
          const color = getCategoryColor(category.id);
          const isSelected = selectedCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryClick?.(category.id)}
              className={`relative p-6 rounded-2xl transition-all duration-200 hover:scale-105 ${
                isSelected 
                  ? 'ring-2 ring-offset-2 ring-indigo-600 dark:ring-indigo-400 shadow-lg' 
                  : 'shadow-md hover:shadow-xl'
              }`}
              style={{
                backgroundColor: isSelected ? color + '30' : color + '15',
                borderColor: color,
              }}
            >
              {/* Icon */}
              <div className="text-4xl mb-3 text-center">
                {category.icon}
              </div>

              {/* Name */}
              <div className="text-sm font-semibold text-center text-gray-900 dark:text-gray-100">
                {getCategoryDisplayName(category.id)}
              </div>

              {/* Count Badge */}
              {category.count !== undefined && (
                <div 
                  className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: color }}
                >
                  {category.count}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Category Pill Component (Compact Version)
 */
interface CategoryPillProps {
  category: Category;
  onClick?: () => void;
  selected?: boolean;
}

export function CategoryPill({ category, onClick, selected }: CategoryPillProps) {
  const color = getCategoryColor(category.id);

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all duration-200 hover:scale-105 ${
        selected ? 'shadow-md' : 'shadow-sm'
      }`}
      style={{
        backgroundColor: selected ? color + '30' : color + '15',
        color: color,
      }}
    >
      <span className="text-lg">{category.icon}</span>
      <span className="text-sm">{getCategoryDisplayName(category.id)}</span>
      {category.count !== undefined && (
        <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-white/50 dark:bg-black/20">
          {category.count}
        </span>
      )}
    </button>
  );
}
