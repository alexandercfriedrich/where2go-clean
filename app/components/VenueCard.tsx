import React from 'react';

interface VenueCardProps {
  name: string;
  description: string;
  address?: string;
  capacity?: number;
  style?: React.CSSProperties;
  priceRange?: string;
  specialFeature?: string;
  insiderTip?: string;
}

export function VenueCard({
  name,
  description,
  address,
  capacity,
  style,
  priceRange,
  specialFeature,
  insiderTip,
}: VenueCardProps) {
  // Generate Schema.org Place
  const placeSchema = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    'name': name,
    'description': description,
    ...(address && { 'address': address }),
    ...(capacity && { 'maximumAttendeeCapacity': capacity }),
  };

  return (
    <>
      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />
      
      {/* Visual Venue Card */}
      <div
        itemScope
        itemType="https://schema.org/Place"
        style={{
          background: 'linear-gradient(135deg, #2A2A2A 0%, #1F1F1F 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '20px',
          ...style,
        }}
      >
        <h3
          itemProp="name"
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '12px',
          }}
        >
          {name}
        </h3>
        
        <p
          itemProp="description"
          style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: 'rgba(255, 255, 255, 0.85)',
            marginBottom: '12px',
          }}
        >
          {description}
        </p>

        {address && (
          <div
            itemProp="address"
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>📍</span>
            {address}
          </div>
        )}

        {capacity && (
          <div
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>👥</span>
            Kapazität: ~{capacity} Personen
          </div>
        )}

        {priceRange && (
          <div
            style={{
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>💰</span>
            {priceRange}
          </div>
        )}

        {specialFeature && (
          <div
            style={{
              fontSize: '13px',
              color: '#FF6B35',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>✨</span>
            {specialFeature}
          </div>
        )}

        {insiderTip && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              background: 'rgba(255, 107, 53, 0.1)',
              borderLeft: '3px solid #FF6B35',
              borderRadius: '4px',
              fontSize: '13px',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            <strong style={{ color: '#FF6B35' }}>💡 Insider-Tipp:</strong> {insiderTip}
          </div>
        )}
      </div>
    </>
  );
}
