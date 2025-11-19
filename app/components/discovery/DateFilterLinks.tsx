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

export function DateFilterLinks({ city, selectedFilter, onFilterChange }: DateFilterLinksProps) {
  const filters = [
    { id: 'all', label: 'Alle Events', href: `/discover?city=${city}` },
    { id: 'today', label: 'Heute', href: `/discover?city=${city}&date=today` },
    { id: 'tomorrow', label: 'Morgen', href: `/discover?city=${city}&date=tomorrow` },
    { id: 'this-week', label: 'Diese Woche', href: `/discover?city=${city}&date=this-week` },
    { id: 'weekend', label: 'Wochenende', href: `/discover?city=${city}&date=weekend` },
    { id: 'next-week', label: 'Nächste Woche', href: `/discover?city=${city}&date=next-week` },
  ];

  return (
    <nav aria-label="Event date filters" className="mb-8">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Nach Datum filtern
      </h3>
      <div className="flex flex-wrap gap-3">
        {filters.map((filter) => {
          const isActive = selectedFilter === filter.id;
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
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }
              `}
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
