'use client';

import Link from 'next/link';
import type { BlogArticle } from '@/lib/types';
import { sanitizeHtml, sanitizeImageUrl } from '@/lib/utils/sanitize';

interface BlogArticleClientProps {
  article: BlogArticle;
}

export default function BlogArticleClient({ article }: BlogArticleClientProps) {
  // Sanitize content for defense-in-depth XSS protection
  const sanitizedContent = sanitizeHtml(article.content);
  
  // Validate featured image URL
  const safeImageUrl = article.featured_image ? sanitizeImageUrl(article.featured_image) : '';
  
  return (
    <div className="article-page">
      <article className="article-container">
        {/* Schema.org JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BlogPosting',
              headline: article.title,
              datePublished: article.published_at || article.generated_at,
              dateModified: article.updated_at,
              author: {
                '@type': 'Organization',
                name: 'Where2Go',
                url: 'https://www.where2go.at'
              },
              publisher: {
                '@type': 'Organization',
                name: 'Where2Go',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://www.where2go.at/logo.png'
                }
              },
              image: safeImageUrl || 'https://www.where2go.at/og-image.png',
              description: article.meta_description || article.title,
              keywords: article.seo_keywords || '',
              articleBody: article.content.replace(/<[^>]*>/g, '').substring(0, 500),
              mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `https://www.where2go.at/blog/${article.slug}`
              }
            })
          }}
        />
        
        <header className="article-header">
          <div className="article-meta">
            <span className="article-city">{article.city}</span>
            <span className="article-category">{article.category}</span>
          </div>
          
          <h1 className="article-title">{article.title}</h1>
          
          <div className="article-date">
            Veröffentlicht am {new Date(article.published_at || article.generated_at).toLocaleDateString('de-AT', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>

          {safeImageUrl && (
            <div className="article-featured-image">
              <img src={safeImageUrl} alt={article.title} />
            </div>
          )}
        </header>

        <div 
          className="article-body"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        <footer className="article-footer">
          <Link href="/blog" className="back-link">
            ← Zurück zum Blog
          </Link>
        </footer>
      </article>

      <style jsx>{`
        .article-page {
          min-height: 100vh;
          background: #f8f9fa;
          padding: 40px 0 80px 0;
        }

        .article-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .article-header {
          padding: 40px 40px 32px 40px;
          border-bottom: 1px solid #e9ecef;
        }

        .article-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        .article-city,
        .article-category {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 6px 14px;
          border-radius: 6px;
          background: #e9ecef;
          color: #495057;
        }

        .article-category {
          background: #e7f3ff;
          color: #0066cc;
        }

        .article-title {
          font-size: 2.5rem;
          font-weight: bold;
          color: #1a1a1a;
          margin: 0 0 20px 0;
          line-height: 1.2;
        }

        .article-date {
          font-size: 0.95rem;
          color: #666;
          margin-bottom: 32px;
        }

        .article-featured-image {
          width: 100%;
          margin: 32px 0 0 0;
          border-radius: 8px;
          overflow: hidden;
        }

        .article-featured-image img {
          width: 100%;
          height: auto;
          display: block;
        }

        .article-body {
          padding: 40px;
          line-height: 1.8;
          color: #333;
        }

        .article-body :global(h2) {
          font-size: 1.75rem;
          font-weight: bold;
          margin: 32px 0 16px 0;
          color: #1a1a1a;
        }

        .article-body :global(h3) {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 28px 0 14px 0;
          color: #1a1a1a;
        }

        .article-body :global(p) {
          margin: 0 0 16px 0;
        }

        .article-body :global(ul),
        .article-body :global(ol) {
          margin: 16px 0;
          padding-left: 32px;
        }

        .article-body :global(li) {
          margin: 8px 0;
        }

        .article-body :global(a) {
          color: #0066cc;
          text-decoration: none;
        }

        .article-body :global(a:hover) {
          text-decoration: underline;
        }

        .article-body :global(img) {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 24px 0;
        }

        .article-body :global(blockquote) {
          border-left: 4px solid #0066cc;
          padding-left: 20px;
          margin: 24px 0;
          font-style: italic;
          color: #555;
        }

        .article-footer {
          padding: 32px 40px;
          border-top: 1px solid #e9ecef;
        }

        .back-link {
          color: #0066cc;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: #0052a3;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .article-container {
            border-radius: 0;
          }

          .article-header {
            padding: 24px 20px 20px 20px;
          }

          .article-title {
            font-size: 1.75rem;
          }

          .article-body {
            padding: 24px 20px;
          }

          .article-body :global(h2) {
            font-size: 1.5rem;
          }

          .article-body :global(h3) {
            font-size: 1.25rem;
          }

          .article-footer {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}
