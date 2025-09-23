/**
 * Categories helper module - provides robust category mapping functionality.
 * This prevents build/runtime errors where '@/categories' was referenced.
 * 
 * Re-exports functionality from lib/eventCategories for consistency.
 */

import { 
  EVENT_CATEGORIES, 
  mapToMainCategories, 
  getSubcategories,
  normalizeCategory 
} from './lib/eventCategories';

// Re-export main categories constant
export { EVENT_CATEGORIES };

/**
 * Maps any incoming categories to main categories using the robust mapping logic.
 * This prevents build/runtime errors and provides consistent categorization.
 */
export function getMainCategoriesForAICalls(
  categories: string[] | undefined | null
): string[] {
  if (!categories || categories.length === 0) return [];
  return mapToMainCategories(categories);
}

/**
 * Gets subcategories for a main category using the existing robust logic.
 */
export function getSubcategoriesForMainCategory(mainCategory: string): string[] {
  return getSubcategories(mainCategory);
}

/**
 * Flattens main categories to their subcategories.
 */
export function flattenMainToSubcategories(mains: string[]): string[] {
  const result: string[] = [];
  for (const main of mains || []) {
    result.push(...getSubcategories(main));
  }
  return Array.from(new Set(result)); // Deduplicate
}

/**
 * Normalize a category string to a main category.
 */
export function normalizeCategoryString(category: string): string {
  return normalizeCategory(category);
}
