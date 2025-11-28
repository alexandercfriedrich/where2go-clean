/**
 * Social Share Buttons Component
 */

'use client';

import React, { useState } from 'react';

interface ShareButtonsProps {
  event: {
    title: string;
    id?: string;
    custom_venue_name?: string;
    venue?: string;
  };
  url?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ShareButtons({ event, url, className = '', size = 'md' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [tiktokCopied, setTiktokCopied] = useState(false);

  // Build a more meaningful fallback URL based on event properties
  const eventUrl = url || (typeof window !== 'undefined' 
    ? event.id 
      ? `${window.location.origin}/event/${event.id}` 
      : `${window.location.origin}/discover`
    : '');
  
  const shareText = `${event.title} at ${event.custom_venue_name || event.venue || 'TBA'}`;

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${eventUrl}`)}`;
    window.open(shareUrl, '_blank');
  };

  const handleTikTokShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // TikTok doesn't have a direct share URL, so we copy to clipboard with TikTok-friendly text
    const tiktokText = `🎉 ${shareText}\n\n📍 Check it out: ${eventUrl}\n\n#events #wien #where2go`;
    navigator.clipboard.writeText(tiktokText).then(() => {
      // Show inline toast instead of blocking alert
      setTiktokCopied(true);
      setTimeout(() => setTiktokCopied(false), 3000);
    }).catch(() => {
      // Fallback: open TikTok
      window.open('https://www.tiktok.com/', '_blank');
    });
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`inline-flex gap-2 items-center ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* TikTok Toast Notification */}
      {tiktokCopied && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-fade-in">
          ✓ Text für TikTok kopiert!
        </div>
      )}
      {/* WhatsApp */}
      <button
        onClick={handleWhatsAppShare}
        className={`${sizeClasses[size]} rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-500 transition-colors`}
        aria-label="Share on WhatsApp"
        title="Share on WhatsApp"
      >
        <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </button>

      {/* TikTok */}
      <button
        onClick={handleTikTokShare}
        className={`${sizeClasses[size]} rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-500 transition-colors`}
        aria-label="Share on TikTok"
        title="Share on TikTok"
      >
        <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
        </svg>
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className={`${sizeClasses[size]} rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative`}
        aria-label="Copy link"
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? (
          <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
