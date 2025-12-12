/**
 * Individual Blog Article Page
 * Displays a single blog article by slug
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/client';
import type { BlogArticle } from '@/lib/types';
import BlogArticleClient from './BlogArticleClient';

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

async function getBlogArticle(slug: string): Promise<BlogArticle | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('blog_articles')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) {
      console.error('[Blog Article Page] Error fetching article:', error);
      return null;
    }

    return data as BlogArticle;
  } catch (error) {
    console.error('[Blog Article Page] Error:', error);
    return null;
  }
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getBlogArticle(slug);

  if (!article) {
    return {
      title: 'Blog Article Not Found - Where2Go',
    };
  }

  return {
    title: `${article.title} - Where2Go Blog`,
    description: article.meta_description || article.title,
    keywords: article.seo_keywords,
    alternates: {
      canonical: `https://www.where2go.at/blog/${article.slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.meta_description || article.title,
      type: 'article',
      url: `https://www.where2go.at/blog/${article.slug}`,
      images: article.featured_image ? [article.featured_image] : [],
      publishedTime: article.published_at || article.generated_at,
    },
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params;
  const article = await getBlogArticle(slug);

  if (!article) {
    notFound();
  }

  return <BlogArticleClient article={article} />;
}
