'use client';

import Link from 'next/link';
import type { BlogArticle } from '@/lib/types';
import { sanitizeImageUrl } from '@/lib/utils/sanitize';

interface BlogPageClientProps {
  articles: BlogArticle[];
}

export default function BlogPageClient({ articles }: BlogPageClientProps) {
  // Limit to 100 items for Schema.org as per guidelines
  const schemaArticles = articles.slice(0, 100);
  
  return (
    <div className="blog-page">
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
      
      <div className="container">
        <header className="blog-header">
          <h1>Where2Go Blog</h1>
          <p>Entdecke die besten Events und Insider-Tipps für deine Stadt</p>
        </header>

        {articles.length === 0 ? (
          <div className="empty-state">
            <p>Noch keine Blog-Artikel verfügbar. Schau bald wieder vorbei!</p>
          </div>
        ) : (
          <div className="articles-grid">
            {articles.map((article) => {
              const safeImageUrl = article.featured_image ? sanitizeImageUrl(article.featured_image) : '';
              
              return (
                <Link 
                  key={article.id} 
                  href={`/blog/${article.slug}`}
                  className="article-card"
                >
                  {safeImageUrl && (
                    <div className="article-image">
                      <img src={safeImageUrl} alt={article.title} />
                    </div>
                  )}
                <div className="article-content">
                  <div className="article-meta">
                    <span className="article-city">{article.city}</span>
                    <span className="article-category">{article.category}</span>
                  </div>
                  <h2 className="article-title">{article.title}</h2>
                  {article.meta_description && (
                    <p className="article-excerpt">{article.meta_description}</p>
                  )}
                  <div className="article-date">
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

      <style jsx>{`
        .blog-page {
          min-height: 100vh;
          background: #f8f9fa;
          padding: 40px 0 80px 0;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .blog-header {
          text-align: center;
          margin-bottom: 60px;
        }

        .blog-header h1 {
          font-size: 3rem;
          font-weight: bold;
          color: #1a1a1a;
          margin: 0 0 16px 0;
        }

        .blog-header p {
          font-size: 1.25rem;
          color: #666;
          margin: 0;
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
          color: #666;
        }

        .articles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 32px;
        }

        .article-card {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
        }

        .article-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .article-image {
          width: 100%;
          height: 220px;
          overflow: hidden;
          background: #e9ecef;
        }

        .article-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .article-content {
          padding: 24px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .article-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .article-city,
        .article-category {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 4px;
          background: #e9ecef;
          color: #495057;
        }

        .article-category {
          background: #e7f3ff;
          color: #0066cc;
        }

        .article-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1a1a1a;
          margin: 0 0 12px 0;
          line-height: 1.3;
        }

        .article-excerpt {
          font-size: 0.95rem;
          color: #666;
          line-height: 1.6;
          margin: 0 0 16px 0;
          flex: 1;
        }

        .article-date {
          font-size: 0.875rem;
          color: #999;
          margin-top: auto;
        }

        @media (max-width: 768px) {
          .blog-header h1 {
            font-size: 2rem;
          }

          .blog-header p {
            font-size: 1rem;
          }

          .articles-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .article-image {
            height: 180px;
          }
        }
      `}</style>
    </div>
  );
}
