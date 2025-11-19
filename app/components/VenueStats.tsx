'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { VenueStats as VenueStatsType } from '@/lib/types';

interface VenueStatsProps {
  city?: string;
  limit?: number;
  layout?: 'list' | 'grid';
}

export function VenueStats({
  city = 'Wien',
  limit = 15,
  layout = 'grid',
}: VenueStatsProps) {
  const [venues, setVenues] = useState<VenueStatsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVenues() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/venues/stats?city=${encodeURIComponent(city)}&limit=${limit}`
        );
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch venues');
        }

        setVenues(result.data || []);
      } catch (err: any) {
        console.error('Error fetching venues:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchVenues();
  }, [city, limit]);

  if (loading) {
    return <VenueStatsSkeleton layout={layout} />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Fehler beim Laden der Venues: {error}</p>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">Keine Venues gefunden.</p>
      </div>
    );
  }

  return (
    <div className="venue-stats">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Top Venues in {city}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Die beliebtesten Veranstaltungsorte mit den meisten Events
          </p>
        </div>
      </div>

      {layout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue, index) => (
            <VenueCard key={venue.venue_id} venue={venue} rank={index + 1} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {venues.map((venue, index) => (
            <VenueListItem key={venue.venue_id} venue={venue} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function VenueCard({ venue, rank }: { venue: VenueStatsType; rank: number }) {
  return (
    <Link href={`/venues/${venue.venue_slug}`}>
      <div
        className="venue-card group cursor-pointer"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          transition: 'all 0.3s ease',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header with rank and link icon */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="rank-badge"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 107, 53, 0.2)',
              color: '#FF6B35',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
            }}
          >
            #{rank}
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.5)',
              transition: 'color 0.3s ease',
            }}
            className="group-hover:text-white"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </div>
        </div>

        {/* Venue name */}
        <h3
          className="venue-name text-white group-hover:text-orange-400"
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '12px',
            transition: 'color 0.3s ease',
          }}
        >
          {venue.name}
        </h3>

        {/* Event count */}
        <div className="text-center my-6 flex-grow flex flex-col items-center justify-center">
          <div
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: '#FF6B35',
              lineHeight: 1,
            }}
          >
            {venue.upcoming_events}
          </div>
          <div
            style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginTop: '8px',
            }}
          >
            kommende Events
          </div>
        </div>

        {/* Categories */}
        {venue.categories && venue.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {venue.categories.slice(0, 3).map((cat, idx) => (
              <span
                key={idx}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Multi-source indicator */}
        {venue.sources && venue.sources.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            <span>⭐</span>
            <span>{venue.sources.length} Quellen</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function VenueListItem({ venue, rank }: { venue: VenueStatsType; rank: number }) {
  return (
    <Link href={`/venues/${venue.venue_slug}`}>
      <div
        className="venue-list-item group cursor-pointer"
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '16px',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        {/* Rank */}
        <div
          className="rank-badge"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 107, 53, 0.2)',
            color: '#FF6B35',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          #{rank}
        </div>

        {/* Content */}
        <div className="flex-grow">
          <h3
            className="venue-name text-white group-hover:text-orange-400"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '4px',
              transition: 'color 0.3s ease',
            }}
          >
            {venue.name}
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            <span>📍</span>
            <span>{venue.full_address}</span>
          </div>
          {venue.categories && venue.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {venue.categories.slice(0, 3).map((cat, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: '2px 8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.7)',
                  }}
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Event count */}
        <div
          style={{
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#FF6B35',
            }}
          >
            {venue.upcoming_events}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
            }}
          >
            Events
          </div>
        </div>
      </div>
    </Link>
  );
}

function VenueStatsSkeleton({ layout = 'grid' }: { layout?: 'list' | 'grid' }) {
  const skeletonCount = layout === 'grid' ? 6 : 5;

  return (
    <div className="venue-stats">
      <div className="mb-6">
        <div
          className="h-8 w-64 rounded animate-pulse"
          style={{ background: 'rgba(255, 255, 255, 0.1)' }}
        />
        <div
          className="h-4 w-96 rounded mt-2 animate-pulse"
          style={{ background: 'rgba(255, 255, 255, 0.1)' }}
        />
      </div>

      {layout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(skeletonCount)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl animate-pulse"
              style={{
                height: '280px',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {[...Array(skeletonCount)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg animate-pulse"
              style={{
                height: '100px',
                background: 'rgba(255, 255, 255, 0.05)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
