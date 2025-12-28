'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import PageSearch from './PageSearch';
import DOMPurify from 'isomorphic-dompurify';

interface ThemeAwareStaticPageProps {
  pageId: string;
  fallbackTitle?: string;
  fallbackContent?: React.ReactNode;
}

export default function ThemeAwareStaticPage({ 
  pageId, 
  fallbackTitle = 'Loading...', 
  fallbackContent 
}: ThemeAwareStaticPageProps) {
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState<string>(fallbackTitle);
  const [loading, setLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const { theme } = useTheme();

  // Theme colors
  const bgColor = theme === 'dark' ? '#091717' : '#FCFAF6';
  const cardBg = theme === 'dark' ? '#13343B' : '#FFFFFF';
  const textPrimary = theme === 'dark' ? '#FCFAF6' : '#091717';
  const textSecondary = theme === 'dark' ? '#BADFDE' : '#2E565D';
  const borderColor = theme === 'dark' ? '#2E565D' : '#E5E3D4';

  useEffect(() => {
    async function loadContent() {
      try {
        setLoading(true);
        const res = await fetch(`/api/static-pages/${pageId}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            setContent(null);
            setUseFallback(true);
          } else {
            console.error(`Failed to load page (${res.status}): ${res.statusText}`);
            setUseFallback(true);
          }
        } else {
          const data = await res.json();
          if (data.page) {
            setTitle(data.page.title);
            setContent(data.page.content);
            setUseFallback(false);
          }
        }
      } catch (err) {
        console.error('Error loading static page:', err);
        setUseFallback(true);
      } finally {
        setLoading(false);
      }
    }

    loadContent();
  }, [pageId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="w-12 h-12 border-4 rounded-full animate-spin" style={{
          borderColor: 'rgba(32, 184, 205, 0.2)',
          borderTopColor: '#20B8CD'
        }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgColor }}>
      {/* Navigation with Search */}
      <div className="border-b" style={{ borderColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 transition-colors hover:opacity-80"
              style={{ color: textSecondary }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span style={{ color: textPrimary }}>Zurück zur Übersicht</span>
            </Link>
            <div className="flex-1 max-w-md ml-auto">
              <PageSearch />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section with Gradient */}
      <div style={{ background: theme === 'dark' ? 'linear-gradient(to bottom, #13343B, #091717)' : 'linear-gradient(to bottom, #FCFAF6, #FFFFFF)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: textPrimary }}>
            {title}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl">
          <article
            className="rounded-lg p-8"
            style={{ 
              backgroundColor: cardBg,
              border: `1px solid ${borderColor}`
            }}
          >
            {useFallback ? (
              <div style={{ color: textPrimary }}>
                {fallbackContent}
              </div>
            ) : (
              <div
                style={{ color: textPrimary }}
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(content || '', {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre', 'div', 'span'],
                    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style']
                  })
                }} 
              />
            )}
            
            <div className="mt-8 pt-8" style={{ borderTop: `1px solid ${borderColor}` }}>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: '#20B8CD',
                  color: '#FCFAF6'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9,22 9,12 15,12 15,22"/>
                </svg>
                Zurück zur Startseite
              </Link>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
