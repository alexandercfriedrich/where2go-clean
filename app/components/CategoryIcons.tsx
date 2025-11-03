/**
 * CategoryIcons - SVG icon components for event categories
 * 
 * Provides visual icons for each super-category to enhance UI experience
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export const MusicIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const TheaterIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 3H6a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const MuseumIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 21h18M4 18h16M6 18V9M10 18V9M14 18V9M18 18V9M12 2L4 9h16L12 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const FilmIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 3v18M17 3v18M2 9h5M17 9h5M2 15h5M17 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const OutdoorIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const FoodIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h14v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 1v3M10 1v3M14 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const MarketIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6zM3 6h18M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const SportsIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 2a10 10 0 0 0 0 20M2 12h20M12 2c-2.5 3-2.5 9 0 12M12 2c2.5 3 2.5 9 0 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const CultureIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 7h8M8 11h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const FamilyIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="17" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 21v-4a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v4M13 21v-3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const BusinessIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M12 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const WellnessIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/**
 * Maps category names to their icon components
 */
export const categoryIcons: Record<string, React.FC<IconProps>> = {
  'Musik & Nachtleben': MusicIcon,
  'Theater/Performance': TheaterIcon,
  'Museen & Ausstellungen': MuseumIcon,
  'Film & Kino': FilmIcon,
  'Open Air & Festivals': OutdoorIcon,
  'Food & Culinary': FoodIcon,
  'Märkte & Shopping': MarketIcon,
  'Sport & Fitness': SportsIcon,
  'Kultur & Bildung': CultureIcon,
  'Familie & Kinder': FamilyIcon,
  'Business & Networking': BusinessIcon,
  'Community & Wellness': WellnessIcon,
};

/**
 * Gets the appropriate icon for a category
 */
export const getCategoryIcon = (category: string): React.FC<IconProps> => {
  return categoryIcons[category] || MusicIcon; // Default fallback
};
