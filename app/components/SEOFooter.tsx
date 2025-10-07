'use client';

import { useEffect, useState } from 'react';

export default function SEOFooter() {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSEOFooter = async () => {
      try {
        const response = await fetch('/api/admin/static-pages');
        if (!response.ok) {
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        const seoFooterPage = data.pages?.find((p: any) => p.id === 'seo-footer');
        
        if (seoFooterPage && seoFooterPage.content) {
          setContent(seoFooterPage.content);
        }
      } catch (error) {
        console.error('Error loading SEO footer:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSEOFooter();
  }, []);

  if (loading || !content) {
    return null;
  }

  return (
    <section className="seo-footer">
      <div className="container">
        <div 
          className="seo-footer-content"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>

      <style jsx>{`
        .seo-footer {
          background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
          padding: 80px 0 60px;
          margin-top: 80px;
          border-top: 1px solid #e0e0e0;
        }

        .seo-footer :global(h2) {
          font-size: 32px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 24px;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        .seo-footer :global(h3) {
          font-size: 24px;
          font-weight: 600;
          color: #333;
          margin-top: 40px;
          margin-bottom: 16px;
          letter-spacing: -0.01em;
        }

        .seo-footer :global(p) {
          font-size: 16px;
          line-height: 1.7;
          color: #4a5568;
          margin-bottom: 16px;
        }

        .seo-footer :global(ul),
        .seo-footer :global(ol) {
          margin-bottom: 16px;
          padding-left: 24px;
        }

        .seo-footer :global(li) {
          font-size: 16px;
          line-height: 1.7;
          color: #4a5568;
          margin-bottom: 8px;
        }

        .seo-footer :global(a) {
          color: #5b8cff;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .seo-footer :global(a:hover) {
          color: #4a7de8;
          text-decoration: underline;
        }

        .seo-footer :global(strong) {
          font-weight: 600;
          color: #2d3748;
        }

        @media (max-width: 768px) {
          .seo-footer {
            padding: 60px 0 40px;
            margin-top: 60px;
          }

          .seo-footer :global(h2) {
            font-size: 28px;
            margin-bottom: 20px;
          }

          .seo-footer :global(h3) {
            font-size: 20px;
            margin-top: 32px;
            margin-bottom: 12px;
          }

          .seo-footer :global(p),
          .seo-footer :global(li) {
            font-size: 15px;
          }
        }
      `}</style>
    </section>
  );
}
