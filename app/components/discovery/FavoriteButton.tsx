/**
 * Favorite Button Component
 * Optimistic UI updates with API call
 */

'use client';

import React, { useState, useEffect } from 'react';

interface FavoriteButtonProps {
  eventId: string;
  initialFavorited?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FavoriteButton({ 
  eventId, 
  initialFavorited = false,
  className = '',
  size = 'md'
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);

  // Load favorite status from localStorage on mount
  useEffect(() => {
    const favorites = getFavoritesFromStorage();
    setIsFavorited(favorites.includes(eventId));
  }, [eventId]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation if button is inside a link
    e.stopPropagation();

    const newFavoritedState = !isFavorited;
    
    // Optimistic update
    setIsFavorited(newFavoritedState);
    updateLocalStorage(eventId, newFavoritedState);
    setIsLoading(true);

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId,
          action: newFavoritedState ? 'add' : 'remove',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite');
      }

      const data = await response.json();
      console.log('Favorite updated:', data.message);
    } catch (error) {
      console.error('Error updating favorite:', error);
      
      // Revert optimistic update on error
      setIsFavorited(!newFavoritedState);
      updateLocalStorage(eventId, !newFavoritedState);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={isLoading}
      className={`${sizeClasses[size]} rounded-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 hover:scale-110 ${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {isFavorited ? (
        <svg 
          className={`${iconSizes[size]} text-red-500 fill-current`} 
          viewBox="0 0 24 24"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      ) : (
        <svg 
          className={`${iconSizes[size]} text-gray-700 dark:text-gray-300`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      )}
    </button>
  );
}

/**
 * Get favorites from localStorage
 */
function getFavoritesFromStorage(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('favoriteEvents');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Update localStorage with new favorite status
 */
function updateLocalStorage(eventId: string, isFavorited: boolean): void {
  if (typeof window === 'undefined') return;
  
  try {
    const favorites = getFavoritesFromStorage();
    
    if (isFavorited) {
      if (!favorites.includes(eventId)) {
        favorites.push(eventId);
      }
    } else {
      const index = favorites.indexOf(eventId);
      if (index > -1) {
        favorites.splice(index, 1);
      }
    }
    
    localStorage.setItem('favoriteEvents', JSON.stringify(favorites));
  } catch (error) {
    console.error('Error updating localStorage:', error);
  }
}
