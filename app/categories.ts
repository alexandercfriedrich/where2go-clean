// Phase 2A Wrapper: Delegiert komplett auf app/lib/eventCategories.ts
// Ziel: Diese Datei später entfernen, nachdem alle Importe direkt auf eventCategories.ts zeigen.
// Bis dahin bleiben API-Funktionsnamen stabil für bestehende Tests.

import {
  EVENT_CATEGORIES,
  EVENT_CATEGORY_SUBCATEGORIES,
  normalizeCategory as coreNormalizeCategory,
  validateAndNormalizeEvents
} from './lib/eventCategories';

// Alte API: getMainCategories()
export function getMainCategories(): string[] {
  return EVENT_CATEGORIES;
}

// Alte API: mappt Sub- oder Hauptkategorie → Hauptkategorie oder null
export function getMainCategoryForSubcategory(sub: string): string | null {
  if (!sub || typeof sub !== 'string') return null;
  const trimmed = sub.trim();
  if (!trimmed) return null;

  if (EVENT_CATEGORY_SUBCATEGORIES[trimmed]) return trimmed;

  const lower = trimmed.toLowerCase();
  for (const [main, subs] of Object.entries(EVENT_CATEGORY_SUBCATEGORIES)) {
    if (subs.some(s => s.toLowerCase() === lower)) {
      return main;
    }
  }
  return null;
}

// Alte API: Für AI Calls nur Hauptkategorien (Unique)
export function getMainCategoriesForAICalls(categories: string[]): string[] {
  const set = new Set<string>();
  for (const c of categories || []) {
    const main = getMainCategoryForSubcategory(c);
    if (main) set.add(main);
  }
  return Array.from(set);
}

// Alte API: Subkategorien zu Hauptkategorie
export function getSubcategoriesForMainCategory(main: string): string[] {
  return EVENT_CATEGORY_SUBCATEGORIES[main] || [];
}

// Alias wie zuvor in Tests genutzt
export const CATEGORY_MAP = EVENT_CATEGORY_SUBCATEGORIES;

// Optionale Re-Exports für schrittweise Migration
export const normalizeCategory = coreNormalizeCategory;
export { validateAndNormalizeEvents };
