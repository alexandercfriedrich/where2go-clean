import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_SUBCATEGORIES,
  mapToMainCategories,
} from '@/lib/eventCategories';

/**
 * Gibt die Hauptkategorien zurück, die für AI-Aufrufe genutzt werden sollen.
 * - Wenn keine Kategorien angegeben sind, werden alle Hauptkategorien verwendet.
 * - Subkategorien werden auf Hauptkategorien gemappt.
 * - Deduplizierung ist sichergestellt.
 */
export function getMainCategoriesForAICalls(
  categories: string[] | undefined | null
): string[] {
  if (!categories || categories.length === 0) return EVENT_CATEGORIES;
  const mapped = mapToMainCategories(categories);
  return Array.from(new Set(mapped.length > 0 ? mapped : EVENT_CATEGORIES));
}

/**
 * Liefert alle Subkategorien zu einer Hauptkategorie.
 */
export function getSubcategoriesForMainCategory(mainCategory: string): string[] {
  return EVENT_CATEGORY_SUBCATEGORIES[mainCategory] || [];
}

/**
 * Hilfsfunktion: mehrere Hauptkategorien -> alle zugehörigen Subkategorien.
 */
export function flattenMainToSubcategories(mains: string[]): string[] {
  return mains.flatMap((m) => EVENT_CATEGORY_SUBCATEGORIES[m] || []);
}
