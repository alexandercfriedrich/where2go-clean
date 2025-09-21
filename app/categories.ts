/**
 * @deprecated Phase 2 - categories.ts removed in favor of lib/eventCategories as SSOT.
 * All functionality has been consolidated into lib/eventCategories.
 * This file will be deleted after migration is complete.
 * 
 * MIGRATION GUIDE:
 * - Replace: import { ... } from '@/categories'
 * - With: import { ... } from '@/lib/eventCategories'
 * 
 * Available exports in eventCategories:
 * - EVENT_CATEGORIES (array of 20 main categories)
 * - EVENT_CATEGORY_SUBCATEGORIES (mapping object)
 * - normalizeCategory()
 * - mapToMainCategories()
 * - getSubcategories()
 * - validateAndNormalizeEvents()
 * - isValidCategory()
 */

// Temporary re-exports for backward compatibility during Phase 2 migration
export {
  EVENT_CATEGORIES,
  normalizeCategory as normalizeCategoryString,
  mapToMainCategories as getMainCategoriesForAICalls,
  getSubcategories as getSubcategoriesForMainCategory
} from './lib/eventCategories';

/**
 * @deprecated Use mapToMainCategories from lib/eventCategories
 */
export function flattenMainToSubcategories(mains: string[]): string[] {
  console.warn('flattenMainToSubcategories is deprecated. Use getSubcategories for individual categories.');
  const result: string[] = [];
  const { getSubcategories } = require('./lib/eventCategories');
  for (const main of mains || []) {
    result.push(...getSubcategories(main));
  }
  return Array.from(new Set(result));
}
