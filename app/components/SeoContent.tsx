'use client';

import { getSeoText } from '@/lib/seoTexts';

interface SeoContentProps {
  category: string;
  date: 'heute' | 'morgen' | 'wochenende';
}

/**
 * SEO Content Component
 * Renders SEO-optimized content below the DiscoveryClient
 * Includes semantic HTML, dark mode support, and prose styling
 */
export function SeoContent({ category, date }: SeoContentProps) {
  const text = getSeoText(category, date);
  
  if (!text) return null;

  return (
    <section 
      className="w-full max-w-6xl mx-auto px-4 py-12 mt-8"
      aria-label="Event-Kategorie Informationen"
    >
      <article 
        className="prose prose-lg dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: text }}
      />
      
      <style jsx>{`
        article :global(h1) {
          font-family: 'FK Grotesk Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 18pt;
          font-weight: 700;
          font-variant: small-caps;
          line-height: 21pt;
          margin-bottom: 2rem;
          margin-top: 0;
          color: #20E1D3;
        }
        
        article :global(h2) {
          font-family: 'FK Grotesk Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 18pt;
          font-weight: 700;
          font-variant: small-caps;
          line-height: 21pt;
          margin-top: 2.5rem;
          margin-bottom: 1.25rem;
          color: #20E1D3;
        }
        
        article :global(p) {
          font-family: 'FK Grotesk Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14pt;
          font-weight: 100;
          line-height: 18pt;
          margin-bottom: 1rem;
          color: #F5F5F5;
        }
        
        article :global(strong) {
          font-weight: 600;
          color: inherit;
        }
        
        article :global(ul) {
          font-family: 'FK Grotesk Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14pt;
          font-weight: 100;
          line-height: 18pt;
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
          color: #F5F5F5;
        }
        
        article :global(li) {
          margin-bottom: 0.5rem;
          line-height: 18pt;
        }
        
        @media (max-width: 768px) {
          article :global(h1) {
            font-size: 16pt;
            line-height: 19pt;
          }
          
          article :global(h2) {
            font-size: 16pt;
            line-height: 19pt;
          }
        }
      `}</style>
    </section>
  );
}
