/**
 * Category normalization utilities for the new backend system.
 * This module provides fuzzy matching and category standardization.
 * 
 * @fileoverview Category normalization with fuzzy matching using Levenshtein distance.
 */

import { CATEGORY_ALIASES, MAIN_CATEGORIES, FUZZY_MATCH_THRESHOLD, type MainCategory } from './categoryMap.js';

/**
 * Calculate Levenshtein distance between two strings.
 * Used for fuzzy matching of category names.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }
  
  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Find the best fuzzy match for a category name.
 * Returns the main category if a match is found within the threshold.
 */
function findFuzzyMatch(input: string): MainCategory | null {
  const normalizedInput = input.toLowerCase().trim();
  let bestMatch: MainCategory | null = null;
  let bestDistance = Infinity;
  
  // Check against all main categories
  for (const category of MAIN_CATEGORIES) {
    const distance = levenshteinDistance(normalizedInput, category.toLowerCase());
    if (distance <= FUZZY_MATCH_THRESHOLD && distance < bestDistance) {
      bestMatch = category;
      bestDistance = distance;
    }
  }
  
  // Check against all aliases
  for (const [alias, mainCategory] of Object.entries(CATEGORY_ALIASES)) {
    const distance = levenshteinDistance(normalizedInput, alias.toLowerCase());
    if (distance <= FUZZY_MATCH_THRESHOLD && distance < bestDistance) {
      bestMatch = mainCategory;
      bestDistance = distance;
    }
  }
  
  return bestMatch;
}

/**
 * Normalize a single category name to its canonical form.
 * 
 * Process:
 * 1. Trim and lowercase the input
 * 2. Check for exact match in aliases
 * 3. Check for exact match in main categories
 * 4. Perform fuzzy matching if no exact match
 * 5. Return original if no match found
 * 
 * @param category - The category name to normalize
 * @returns The normalized category name or original if no match
 */
export function normalizeCategory(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) {
    return category;
  }
  
  const lowercased = trimmed.toLowerCase();
  
  // Check for exact alias match first
  if (CATEGORY_ALIASES[lowercased]) {
    return CATEGORY_ALIASES[lowercased];
  }
  
  // Check for exact main category match (case-insensitive)
  const exactMainMatch = MAIN_CATEGORIES.find(
    cat => cat.toLowerCase() === lowercased
  );
  if (exactMainMatch) {
    return exactMainMatch;
  }
  
  // Try fuzzy matching
  const fuzzyMatch = findFuzzyMatch(trimmed);
  if (fuzzyMatch) {
    return fuzzyMatch;
  }
  
  // Return original if no match found (preserves user input)
  return trimmed;
}

/**
 * Normalize an array of category names.
 * Removes duplicates after normalization.
 * 
 * @param categories - Array of category names to normalize
 * @returns Array of normalized, deduplicated category names
 */
export function normalizeCategories(categories: string[]): string[] {
  if (!Array.isArray(categories)) {
    return [];
  }
  
  const normalized = categories
    .map(normalizeCategory)
    .filter(cat => cat.trim().length > 0);
  
  // Remove duplicates while preserving order
  return [...new Set(normalized)];
}

/**
 * Check if a category is recognized (maps to a main category).
 * 
 * @param category - The category name to check
 * @returns True if the category is recognized
 */
export function isRecognizedCategory(category: string): boolean {
  const normalized = normalizeCategory(category);
  return MAIN_CATEGORIES.includes(normalized as MainCategory);
}

/**
 * Get normalization statistics for a list of categories.
 * Useful for debugging and validation.
 * 
 * @param categories - Array of category names
 * @returns Statistics about the normalization process
 */
export interface NormalizationStats {
  /** Total number of input categories */
  total: number;
  
  /** Number of categories that were normalized to recognized categories */
  recognized: number;
  
  /** Number of categories that couldn't be normalized */
  unrecognized: number;
  
  /** Number of duplicates removed */
  duplicatesRemoved: number;
  
  /** Mapping from original to normalized categories */
  mappings: Record<string, string>;
}

export function getCategoryNormalizationStats(categories: string[]): NormalizationStats {
  const original = categories.filter(cat => cat.trim().length > 0);
  const mappings: Record<string, string> = {};
  
  for (const category of original) {
    mappings[category] = normalizeCategory(category);
  }
  
  const normalized = Object.values(mappings);
  const unique = [...new Set(normalized)];
  const recognized = unique.filter(isRecognizedCategory);
  
  return {
    total: original.length,
    recognized: recognized.length,
    unrecognized: unique.length - recognized.length,
    duplicatesRemoved: normalized.length - unique.length,
    mappings
  };
}