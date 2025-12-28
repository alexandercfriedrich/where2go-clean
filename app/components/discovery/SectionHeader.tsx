/**
 * Section Header Component for Discovery Homepage
 */

import React from 'react';
import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
}

export function SectionHeader({ 
  title, 
  subtitle, 
  action,
  className = '' 
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          className="text-sm font-medium transition-colors"
          style={{ color: '#20B8CD' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#218090'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#20B8CD'}
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
