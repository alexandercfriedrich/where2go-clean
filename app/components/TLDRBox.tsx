import React from 'react';

interface TLDRBoxProps {
  title?: string;
  items: string[];
  style?: React.CSSProperties;
}

export function TLDRBox({ title = 'TL;DR', items, style }: TLDRBoxProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #2A2A2A 0%, #1F1F1F 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        ...style,
      }}
    >
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#FFFFFF',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '20px' }}>⚡</span>
        {title}
      </h3>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {items.map((item, index) => (
          <li
            key={index}
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.9)',
              paddingLeft: '24px',
              position: 'relative',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '0',
                color: '#FF6B35',
                fontWeight: 'bold',
              }}
            >
              •
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
