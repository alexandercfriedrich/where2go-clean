'use client';

import { ThemeProvider, useTheme } from '../components/ui/ThemeProvider';
import Link from 'next/link';
import PageSearch from '../components/PageSearch';
import type { BlogArticle } from '@/lib/types';
import { sanitizeImageUrl } from '@/lib/utils/sanitize';

interface BlogPageVenueStyleProps {
  articles: BlogArticle[];
}

function BlogContent({ articles }: BlogPageVenueStyleProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  // Limit to 100 items for Schema.org as per guidelines
  const schemaArticles = articles.slice(0, 100);
  
  return (
    <div style={{ 
      backgroundColor: isDark ? '#091717' : '#FCFAF6',
      minHeight: '100vh'
    }}>
      {/* Schema.org JSON-LD structured data for blog listing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Where2Go Blog Articles',
            description: 'Entdecke die besten Events und Insider-Tipps für Wien, Berlin, Linz und Ibiza',
            url: 'https://www.where2go.at/blog',
            numberOfItems: schemaArticles.length,
            itemListElement: schemaArticles.map((article, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: {
                '@type': 'BlogPosting',
                '@id': `https://www.where2go.at/blog/${article.slug}`,
                url: `https://www.where2go.at/blog/${article.slug}`,
                headline: article.title,
                description: article.meta_description || article.title,
                datePublished: article.published_at || article.generated_at,
                author: {
                  '@type': 'Organization',
                  name: 'Where2Go'
                },
                image: article.featured_image || 'https://www.where2go.at/og-image.png'
              }
            }))
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
              href="/"
              className="text-sm transition-colors"
              style={{ color: '#FCFAF6' }}
            >
              ← Zurück zur Übersicht
            </Link>
            <PageSearch className="ml-4 flex-1 max-w-md" />
          </div>
        </div>
      </div>

      {/* Hero Gradient */}
      <div style={{
        background: 'linear-gradient(to bottom, #13343B 0%, #091717 100%)',
        padding: '60px 0'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-4" style={{ color: '#FCFAF6', fontFamily: 'var(--font-space-grotesk)' }}>
            Where2Go Blog
          </h1>
          <p className="text-lg text-center" style={{ color: '#BADFDE' }}>
            Entdecke die besten Events und Insider-Tipps für deine Stadt
          </p>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {articles.length === 0 ? (
          <div className="text-center py-20">
            <p style={{ color: isDark ? '#BADFDE' : '#2E565D' }}>
              Noch keine Blog-Artikel verfügbar. Schau bald wieder vorbei!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {articles.map((article) => {
              const safeImageUrl = article.featured_image ? sanitizeImageUrl(article.featured_image) : '';
              
              return (
                <Link
                  key={article.id}
                  href={`/blog/${article.slug}`}
                  className="group rounded-xl overflow-hidden transition-all duration-300 hover:scale-105"
                  style={{
                    backgroundColor: isDark ? '#13343B' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#2E565D' : '#E5E3D4'}`,
                    boxShadow: isDark
                      ? '0 2px 8px rgba(0, 0, 0, 0.3)'
                      : '0 2px 8px rgba(9, 23, 23, 0.08)'
                  }}
                >
                  {safeImageUrl && (
                    <div className="w-full h-48 overflow-hidden bg-gray-800">
                      <img
                        src={safeImageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex gap-2 mb-3">
                      <span className="text-xs font-semibold px-3 py-1 rounded" style={{
                        backgroundColor: 'rgba(32, 184, 205, 0.2)',
                        color: '#20B8CD'
                      }}>
                        {article.city}
                      </span>
                      <span className="text-xs font-semibold px-3 py-1 rounded" style={{
                        backgroundColor: isDark ? 'rgba(186, 223, 222, 0.2)' : 'rgba(46, 86, 93, 0.1)',
                        color: isDark ? '#BADFDE' : '#2E565D'
                      }}>
                        {article.category}
                      </span>
                    </div>
                    <h2
                      className="text-xl font-bold mb-2 line-clamp-2"
                      style={{
                        color: isDark ? '#FCFAF6' : '#091717',
                        fontFamily: 'var(--font-space-grotesk)'
                      }}
                    >
                      {article.title}
                    </h2>
                    {article.meta_description && (
                      <p
                        className="text-sm mb-3 line-clamp-3"
                        style={{ color: isDark ? '#BADFDE' : '#2E565D' }}
                      >
                        {article.meta_description}
                      </p>
                    )}
                    <div
                      className="text-xs"
                      style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                    >
                      {new Date(article.published_at || article.generated_at).toLocaleDateString('de-AT', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BlogPageVenueStyle({ articles }: BlogPageVenueStyleProps) {
  return (
    <ThemeProvider>
      <BlogContent articles={articles} />
    </ThemeProvider>
  );
}
