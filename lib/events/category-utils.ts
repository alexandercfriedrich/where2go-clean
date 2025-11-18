/**
 * Category Utilities for Discovery UI
 * Uses existing eventCategories.ts for mapping
 */

import { EVENT_CATEGORIES, EVENT_CATEGORY_SUBCATEGORIES, normalizeCategory } from '../../app/lib/eventCategories';

// Category display configuration with icons and colors
export interface CategoryConfig {
  name: string;
  icon: string;
  color: string;
}

// Map main categories to display config
export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  'Musik & Nachtleben': {
    name: 'Musik & Nachtleben',
    icon: '🎵',
    color: '#f59e0b'
  },
  'Theater/Performance': {
    name: 'Theater/Performance',
    icon: '🎭',
    color: '#ec4899'
  },
  'Museen & Ausstellungen': {
    name: 'Museen & Ausstellungen',
    icon: '🏛️',
    color: '#8b5cf6'
  },
  'Film & Kino': {
    name: 'Film & Kino',
    icon: '🎬',
    color: '#6366f1'
  },
  'Open Air & Festivals': {
    name: 'Open Air & Festivals',
    icon: '🎪',
    color: '#14b8a6'
  },
  'Food & Culinary': {
    name: 'Food & Culinary',
    icon: '☕',
    color: '#10b981'
  },
  'Märkte & Shopping': {
    name: 'Märkte & Shopping',
    icon: '🛍️',
    color: '#f97316'
  },
  'Sport & Fitness': {
    name: 'Sport & Fitness',
    icon: '⚽',
    color: '#3b82f6'
  },
  'Kultur & Bildung': {
    name: 'Kultur & Bildung',
    icon: '📚',
    color: '#06b6d4'
  },
  'Familie & Kinder': {
    name: 'Familie & Kinder',
    icon: '👨‍👩‍👧‍👦',
    color: '#84cc16'
  },
  'Business & Networking': {
    name: 'Business & Networking',
    icon: '💼',
    color: '#64748b'
  },
  'LGBTQ+': {
    name: 'LGBTQ+',
    icon: '🏳️‍🌈',
    color: '#a855f7'
  }
};

/**
 * Get all main categories for display
 */
export function getAllCategories() {
  return EVENT_CATEGORIES.map(cat => ({
    id: cat,
    ...CATEGORY_CONFIGS[cat]
  }));
}

/**
 * Get category color
 */
export function getCategoryColor(category: string): string {
  // Try exact match first
  if (CATEGORY_CONFIGS[category]) {
    return CATEGORY_CONFIGS[category].color;
  }
  
  // Try normalized category
  const normalized = normalizeCategory(category);
  if (CATEGORY_CONFIGS[normalized]) {
    return CATEGORY_CONFIGS[normalized].color;
  }
  
  return '#6b7280'; // default gray
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  // Try exact match first
  if (CATEGORY_CONFIGS[category]) {
    return CATEGORY_CONFIGS[category].name;
  }
  
  // Try normalized category
  const normalized = normalizeCategory(category);
  if (CATEGORY_CONFIGS[normalized]) {
    return CATEGORY_CONFIGS[normalized].name;
  }
  
  return category;
}

/**
 * Check if an event matches a category
 * Uses the existing subcategory matching logic
 */
export function matchesCategory(eventCategory: string, filterCategory: string): boolean {
  if (!eventCategory || !filterCategory) return false;
  
  // Normalize event category to main category
  const normalizedEvent = normalizeCategory(eventCategory);
  
  // Direct match
  if (normalizedEvent === filterCategory) return true;
  
  // Check if event category is in the subcategories of filter category
  const subcategories = EVENT_CATEGORY_SUBCATEGORIES[filterCategory] || [];
  return subcategories.some(sub => 
    sub.toLowerCase() === eventCategory.toLowerCase() ||
    normalizeCategory(sub) === normalizedEvent
  );
}
