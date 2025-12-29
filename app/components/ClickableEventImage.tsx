'use client';

import Image from 'next/image';

interface ClickableEventImageProps {
  imageUrl: string;
  title: string;
}

export default function ClickableEventImage({ imageUrl, title }: ClickableEventImageProps) {
  const handleClick = () => {
    // Open lightbox - simple implementation
    const lightbox = document.createElement('div');
    lightbox.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      cursor: zoom-out;
    `;
    
    const img = document.createElement('img');
    img.src = imageUrl || '';
    img.style.cssText = `
      max-width: 95%;
      max-height: 95%;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    `;
    
    lightbox.appendChild(img);
    lightbox.onclick = () => document.body.removeChild(lightbox);
    document.body.appendChild(lightbox);
  };

  return (
    <div 
      className="event-detail-image-container"
      style={{ 
        flex: 1,
        position: 'relative',
        minHeight: '600px',
        cursor: 'pointer'
      }}
      onClick={handleClick}
    >
      <Image 
        src={imageUrl}
        alt={title}
        fill
        style={{ objectFit: 'cover' }}
        priority
        unoptimized
      />
      <meta itemProp="image" content={imageUrl} />
      {/* Zoom indicator */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        pointerEvents: 'none'
      }}>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </svg>
        Click to enlarge
      </div>
    </div>
  );
}
