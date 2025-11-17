/**
 * Loading state for Discovery Homepage
 */

import { SkeletonGrid } from '@/components/discovery/SkeletonCard';

export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Nav Skeleton */}
      <div className="h-16 md:h-18 bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 animate-pulse" />
      
      {/* Location Bar Skeleton */}
      <div className="h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 animate-pulse" />
      
      {/* Hero Skeleton */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 opacity-80 animate-pulse">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="h-10 md:h-12 bg-white/20 rounded-lg w-80 md:w-96 mb-4" />
          <div className="h-5 md:h-6 bg-white/20 rounded-lg w-48 md:w-64 mb-8" />
          <div className="h-12 md:h-14 bg-white/20 rounded-lg max-w-2xl" />
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Category Browser Skeleton */}
        <div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div 
                key={i} 
                className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        </div>
        
        {/* Event Sections Skeleton */}
        {[1, 2, 3].map((section) => (
          <div key={section}>
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64 animate-pulse" />
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
            </div>
            <SkeletonGrid count={8} />
          </div>
        ))}
      </div>
    </div>
  );
}
