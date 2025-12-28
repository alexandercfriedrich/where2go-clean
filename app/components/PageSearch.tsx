'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface PageSearchProps {
  className?: string;
}

export default function PageSearch({ className = '' }: PageSearchProps) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.push(`/search/results?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleIconClick = () => {
    if (query.trim().length >= 2) {
      router.push(`/search/results?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Events, Venues suchen..."
        className="w-full px-4 py-2 pr-10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#20B8CD]"
        style={{
          backgroundColor: '#091717', // Offblack
          border: '1px solid #FCFAF6', // Paper White
          color: '#FCFAF6', // Paper White
        }}
      />
      <button
        type="button"
        onClick={handleIconClick}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: '#FCFAF6' }}
        aria-label="Suchen"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="hover:opacity-80"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>
    </form>
  );
}
