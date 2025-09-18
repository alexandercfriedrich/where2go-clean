/**
 * Liefert die Hauptkategorien für AI-Calls.
 * Aktuell: dedupliziert einfach die übergebenen Kategorien.
 * Hinweis: Kann später erweitert werden (Sub->Hauptkategorie-Mapping).
 */
export function getMainCategoriesForAICalls(
  categories: string[] | undefined | null
): string[] {
  if (!categories || categories.length === 0) return [];
  return Array.from(new Set(categories));
}

/**
 * Platzhalter für mögliche zukünftige Nutzung.
 * Gibt Subkategorien einer Hauptkategorie zurück (derzeit leer).
 */
export function getSubcategoriesForMainCategory(mainCategory: string): string[] {
  return [];
}

/**
 * Platzhalter: Hauptkategorien -> Subkategorien (derzeit leer).
 */
export function flattenMainToSubcategories(mains: string[]): string[] {
  return [];
}
