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
        article :global(h2) {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          color: inherit;
        }
        
        article :global(p) {
          margin-bottom: 1rem;
          line-height: 1.75;
          color: inherit;
        }
        
        article :global(strong) {
          font-weight: 600;
          color: inherit;
        }
        
        article :global(ul) {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        
        article :global(li) {
          margin-bottom: 0.5rem;
          line-height: 1.75;
        }
        
        @media (max-width: 768px) {
          article :global(h2) {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </section>
  );
}
