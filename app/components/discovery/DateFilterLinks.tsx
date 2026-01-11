/**
 * Date Filter Links Component
 * SEO-readable links for filtering events by date
 */

import React from 'react';
import Link from 'next/link';

interface DateFilterLinksProps {
  city: string;
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

// Normalize filter values for comparison
// Provides backwards compatibility: English values ('today') map to German canonical values ('heute')
// This ensures proper filter highlighting when navigating from legacy routes or English filter params
const filterMapping: Record<string, string> = {
  'heute': 'heute',
  'morgen': 'morgen',
  'wochenende': 'wochenende',
  'today': 'heute',       // Backwards compatibility
  'tomorrow': 'morgen',   // Backwards compatibility
  'weekend': 'wochenende', // Backwards compatibility
  'this-week': 'this-week',
  'next-week': 'next-week',
  'all': 'all',
};

export function DateFilterLinks({ city, selectedFilter, onFilterChange }: DateFilterLinksProps) {
  const filters = [
    { id: 'all', label: 'Alle Events', href: `/discover?city=${city}` },
    { id: 'heute', label: 'Heute', href: `/discover?city=${city}&date=heute` },
    { id: 'morgen', label: 'Morgen', href: `/discover?city=${city}&date=morgen` },
    { id: 'this-week', label: 'Diese Woche', href: `/discover?city=${city}&date=this-week` },
    { id: 'wochenende', label: 'Wochenende', href: `/discover?city=${city}&date=wochenende` },
    { id: 'next-week', label: 'Nächste Woche', href: `/discover?city=${city}&date=next-week` },
  ];

  // Normalize the selected filter for comparison
  const normalizedSelected = filterMapping[selectedFilter] || selectedFilter;

  return (
    <nav aria-label="Event date filters" className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Nach Datum filtern
      </h3>
      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => {
          const normalizedFilterId = filterMapping[filter.id] || filter.id;
          const isActive = normalizedSelected === normalizedFilterId;
          return (
            <Link
              key={filter.id}
              href={filter.href}
              onClick={(e) => {
                e.preventDefault();
                onFilterChange(filter.id);
              }}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
              style={isActive ? { backgroundColor: '#20B8CD' } : undefined}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Zeige Events für ${filter.label}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
