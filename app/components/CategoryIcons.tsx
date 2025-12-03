/**
 * CategoryIcons - SVG icon components for event categories
 * 
 * Provides visual icons for each of the 12 super-categories
 * Updated for new category structure
 */

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Icon for Clubs & Nachtleben (DJ/Electronic)
export const ClubIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Icon for Live-Konzerte (Guitar)
export const ConcertIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

// Icon for Klassik & Oper (Violin)
export const ClassicalIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="17" rx="4" ry="5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 17V7c0-2.2 1.8-4 4-4s4 1.8 4 4v10" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M10 10h4M10 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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

// Icon for Kulinarik & Märkte (Food & Markets combined)
export const CulinaryIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h14v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 1v3M10 1v3M14 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const SportsIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M12 2a10 10 0 0 0 0 20M2 12h20M12 2c-2.5 3-2.5 9 0 12M12 2c2.5 3 2.5 9 0 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

// Icon for Bildung & Workshops (Education)
export const EducationIcon = ({ className = '', size = 48 }: IconProps) => (
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

export const LGBTQIcon = ({ className = '', size = 48 }: IconProps) => (
  <svg className={className} width={size} height={size} viewBox="0 0 122.88 122.88" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#e40303"/>
        <stop offset="16.67%" stopColor="#ff8c00"/>
        <stop offset="33.33%" stopColor="#ffed00"/>
        <stop offset="50%" stopColor="#008018"/>
        <stop offset="66.67%" stopColor="#004cff"/>
        <stop offset="83.33%" stopColor="#732982"/>
        <stop offset="100%" stopColor="#e40303"/>
      </linearGradient>
    </defs>
    <path d="M61.44,0A61.44,61.44,0,1,1,0,61.44,61.44,61.44,0,0,1,61.44,0Z" stroke="url(#rainbowGradient)" strokeWidth="8" fill="none"/>
    <path d="M61.44,23.27A38.17,38.17,0,1,1,23.27,61.44,38.17,38.17,0,0,1,61.44,23.27Z" stroke="url(#rainbowGradient)" strokeWidth="6" fill="none"/>
    <path d="M40.5,50.3h41.88M61.44,29.36V91.18" stroke="url(#rainbowGradient)" strokeWidth="5" strokeLinecap="round"/>
  </svg>
);

// Legacy icons kept for backward compatibility
export const MusicIcon = ConcertIcon;
export const FoodIcon = CulinaryIcon;
export const MarketIcon = CulinaryIcon;
export const CultureIcon = EducationIcon;
export const BusinessIcon = EducationIcon;
export const WellnessIcon = SportsIcon;

/**
 * Maps category names to their icon components
 * Updated for new 12-category structure
 */
export const categoryIcons: Record<string, React.FC<IconProps>> = {
  // New 12-category structure
  'Clubs & Nachtleben': ClubIcon,
  'Live-Konzerte': ConcertIcon,
  'Klassik & Oper': ClassicalIcon,
  'Theater & Comedy': TheaterIcon,
  'Museen & Ausstellungen': MuseumIcon,
  'Film & Kino': FilmIcon,
  'Open Air & Festivals': OutdoorIcon,
  'Kulinarik & Märkte': CulinaryIcon,
  'Sport & Fitness': SportsIcon,
  'Bildung & Workshops': EducationIcon,
  'Familie & Kinder': FamilyIcon,
  'LGBTQ+': LGBTQIcon,
  
  // Legacy category mappings for backward compatibility
  'Musik & Nachtleben': ClubIcon,
  'Theater/Performance': TheaterIcon,
  'Food & Culinary': CulinaryIcon,
  'Märkte & Shopping': CulinaryIcon,
  'Kultur & Bildung': EducationIcon,
  'Business & Networking': EducationIcon,
  'Community & Wellness': SportsIcon,
};

/**
 * Gets the appropriate icon for a category
 */
export const getCategoryIcon = (category: string): React.FC<IconProps> => {
  return categoryIcons[category] || OutdoorIcon; // Default to OutdoorIcon (most general)
};
