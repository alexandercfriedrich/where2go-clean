'use client';

import { ThemeProvider, useTheme } from '../../components/ui/ThemeProvider';
import Link from 'next/link';
import PageSearch from '../../components/PageSearch';
import type { BlogArticle } from '@/lib/types';
import { sanitizeHtml, sanitizeImageUrl } from '@/lib/utils/sanitize';

interface BlogArticleVenueStyleProps {
  article: BlogArticle;
}

function ArticleContent({ article }: BlogArticleVenueStyleProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Sanitize content for defense-in-depth XSS protection
  const sanitizedContent = sanitizeHtml(article.content);
  
  // Validate featured image URL
  const safeImageUrl = article.featured_image ? sanitizeImageUrl(article.featured_image) : '';
  
  return (
    <div style={{
      backgroundColor: isDark ? '#091717' : '#FCFAF6',
      minHeight: '100vh'
    }}>
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

      {/* Navigation Bar */}
      <div style={{
        backgroundColor: '#091717',
        borderBottom: '1px solid rgba(252, 250, 246, 0.1)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/blog"
              className="text-sm transition-colors"
              style={{ color: '#FCFAF6' }}
            >
              ← Zurück zum Blog
            </Link>
            <PageSearch className="ml-4 flex-1 max-w-md" />
          </div>
        </div>
      </div>

      {/* Hero Gradient */}
      <div style={{
        background: 'linear-gradient(to bottom, #13343B 0%, #091717 100%)',
        padding: '60px 0 40px'
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 mb-4">
            <span className="text-xs font-semibold px-3 py-1 rounded" style={{
              backgroundColor: 'rgba(32, 184, 205, 0.2)',
              color: '#20B8CD'
            }}>
              {article.city}
            </span>
            <span className="text-xs font-semibold px-3 py-1 rounded" style={{
              backgroundColor: 'rgba(186, 223, 222, 0.2)',
              color: '#BADFDE'
            }}>
              {article.category}
            </span>
          </div>
          
          <h1
            className="text-3xl md:text-5xl font-bold mb-4"
            style={{
              color: '#FCFAF6',
              fontFamily: 'var(--font-space-grotesk)',
              lineHeight: '1.2'
            }}
          >
            {article.title}
          </h1>
          
          <div className="text-sm" style={{ color: '#BADFDE' }}>
            Veröffentlicht am {new Date(article.published_at || article.generated_at).toLocaleDateString('de-AT', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
        </div>
      </div>

      {/* Article Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {safeImageUrl && (
          <div className="mb-12 rounded-xl overflow-hidden">
            <img
              src={safeImageUrl}
              alt={article.title}
              className="w-full h-auto"
            />
          </div>
        )}

        <article
          className="prose prose-lg max-w-none"
          style={{
            backgroundColor: isDark ? '#13343B' : '#FFFFFF',
            border: `1px solid ${isDark ? '#2E565D' : '#E5E3D4'}`,
            borderRadius: '12px',
            padding: '40px',
            color: isDark ? '#FCFAF6' : '#091717'
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
            style={{
              lineHeight: '1.8',
              fontSize: '1.125rem'
            }}
            className="article-content"
          />
        </article>
      </div>

      <style jsx>{`
        .article-content :global(h2) {
          font-size: 1.875rem;
          font-weight: 700;
          margin: 2rem 0 1rem 0;
          color: ${isDark ? '#FCFAF6' : '#091717'};
          font-family: var(--font-space-grotesk);
        }

        .article-content :global(h3) {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 1.75rem 0 0.875rem 0;
          color: ${isDark ? '#FCFAF6' : '#091717'};
          font-family: var(--font-space-grotesk);
        }

        .article-content :global(p) {
          margin: 0 0 1rem 0;
          color: ${isDark ? '#FCFAF6' : '#091717'};
        }

        .article-content :global(ul),
        .article-content :global(ol) {
          margin: 1rem 0;
          padding-left: 2rem;
          color: ${isDark ? '#FCFAF6' : '#091717'};
        }

        .article-content :global(li) {
          margin: 0.5rem 0;
        }

        .article-content :global(a) {
          color: #20B8CD;
          text-decoration: none;
          transition: color 0.2s;
        }

        .article-content :global(a:hover) {
          color: #218090;
          text-decoration: underline;
        }

        .article-content :global(img) {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1.5rem 0;
        }

        .article-content :global(blockquote) {
          border-left: 4px solid #20B8CD;
          padding-left: 1.25rem;
          margin: 1.5rem 0;
          font-style: italic;
          color: ${isDark ? '#BADFDE' : '#2E565D'};
        }

        .article-content :global(code) {
          background: ${isDark ? 'rgba(252, 250, 246, 0.1)' : 'rgba(9, 23, 23, 0.05)'};
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-size: 0.9em;
        }

        .article-content :global(pre) {
          background: ${isDark ? 'rgba(252, 250, 246, 0.05)' : 'rgba(9, 23, 23, 0.03)'};
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.5rem 0;
        }

        .article-content :global(pre code) {
          background: none;
          padding: 0;
        }
      `}</style>
    </div>
  );
}

export default function BlogArticleVenueStyle({ article }: BlogArticleVenueStyleProps) {
  return (
    <ThemeProvider>
      <ArticleContent article={article} />
    </ThemeProvider>
  );
}
