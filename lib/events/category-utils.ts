/**
 * Utility function to get category color
 */

export function getCategoryColor(category: string): string {
  const categoryColors: Record<string, string> = {
    music: '#f59e0b',
    musik: '#f59e0b',
    theater: '#ec4899',
    art: '#8b5cf6',
    kunst: '#8b5cf6',
    food: '#10b981',
    essen: '#10b981',
    sports: '#3b82f6',
    sport: '#3b82f6',
    nightlife: '#ef4444',
    nachtleben: '#ef4444',
    culture: '#06b6d4',
    kultur: '#06b6d4',
    family: '#84cc16',
    familie: '#84cc16',
    comedy: '#f97316',
    'clubs/discos': '#ef4444',
    'dj-sets/electronic': '#f59e0b',
    konzerte: '#f59e0b',
    kino: '#8b5cf6',
    ausstellungen: '#8b5cf6',
    default: '#6b7280',
  };

  const normalized = category.toLowerCase().trim();
  return categoryColors[normalized] || categoryColors.default;
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    'clubs/discos': 'Clubs & Discos',
    'dj-sets/electronic': 'DJ Sets & Electronic',
    musik: 'Music',
    music: 'Music',
    theater: 'Theater',
    kunst: 'Art',
    art: 'Art',
    kultur: 'Culture',
    culture: 'Culture',
    sport: 'Sports',
    sports: 'Sports',
    nachtleben: 'Nightlife',
    nightlife: 'Nightlife',
    essen: 'Food & Drink',
    food: 'Food & Drink',
    familie: 'Family',
    family: 'Family',
    comedy: 'Comedy',
    konzerte: 'Concerts',
    kino: 'Cinema',
    ausstellungen: 'Exhibitions',
  };

  const normalized = category.toLowerCase().trim();
  return displayNames[normalized] || category;
}
