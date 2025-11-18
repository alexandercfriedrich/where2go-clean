/**
 * Skeleton Card Component for Loading States
 */

'use client';

import React from 'react';

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md animate-pulse">
      {/* Image Skeleton with shimmer */}
      <div className="h-48 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%] animate-shimmer" />
      
      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        {/* Category badge */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        
        {/* Title */}
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
        </div>
        
        {/* Venue */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        
        {/* Date/Time */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
