'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

interface ClickableEventImageProps {
  imageUrl: string;
  title: string;
}

export default function ClickableEventImage({ imageUrl, title }: ClickableEventImageProps) {
  const lightboxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (lightboxRef.current && document.body.contains(lightboxRef.current)) {
        document.body.removeChild(lightboxRef.current);
        document.body.style.overflow = '';
      }
    };
  }, []);

  const handleClick = () => {
    // Open lightbox with proper security, accessibility, and cleanup
    const lightbox = document.createElement('div');
    lightboxRef.current = lightbox;
    
    // Set individual style properties for security (avoid cssText injection)
    lightbox.style.position = 'fixed';
    lightbox.style.top = '0';
    lightbox.style.left = '0';
    lightbox.style.right = '0';
    lightbox.style.bottom = '0';
    lightbox.style.background = 'rgba(0, 0, 0, 0.95)';
    lightbox.style.zIndex = '9999';
    lightbox.style.display = 'flex';
    lightbox.style.alignItems = 'center';
    lightbox.style.justifyContent = 'center';
    lightbox.style.padding = '20px';
    lightbox.style.cursor = 'zoom-out';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Image lightbox');
    
    const img = document.createElement('img');
    img.src = imageUrl || '';
    img.alt = title;
    img.style.maxWidth = '95%';
    img.style.maxHeight = '95%';
    img.style.objectFit = 'contain';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.5)';
    
    // Close button for accessibility
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'Close lightbox');
    closeButton.style.position = 'absolute';
    closeButton.style.top = '20px';
    closeButton.style.right = '20px';
    closeButton.style.background = 'rgba(0, 0, 0, 0.8)';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '50%';
    closeButton.style.width = '40px';
    closeButton.style.height = '40px';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    
    const closeLightbox = () => {
      if (lightboxRef.current && document.body.contains(lightboxRef.current)) {
        document.body.removeChild(lightboxRef.current);
        document.body.style.overflow = ''; // Restore scroll
        lightboxRef.current = null;
      }
    };
    
    // Only close when clicking the lightbox background, not the image
    lightbox.onclick = (event: MouseEvent) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    };
    
    closeButton.onclick = closeLightbox;
    
    // Keyboard accessibility - close on Escape
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeLightbox();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    lightbox.appendChild(img);
    lightbox.appendChild(closeButton);
    
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
    document.body.appendChild(lightbox);
  };

  return (
    <div 
      className="event-detail-image-container"
      style={{ 
        flex: 1,
        position: 'relative',
        cursor: 'pointer'
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label="Click to view image in full size"
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
