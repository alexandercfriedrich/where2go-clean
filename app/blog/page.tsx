/**
 * Blog Overview Page
 * Displays all published blog articles
 */

import { Metadata } from 'next';
import BlogPageVenueStyle from './BlogPageVenueStyle';
import { supabaseAdmin } from '@/lib/supabase/client';
import type { BlogArticle } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Blog - Where2Go',
  description: 'Entdecke die neuesten Event-Tipps, City Guides und Insider-Informationen für Wien, Berlin, Linz und Ibiza.',
  alternates: {
    canonical: 'https://www.where2go.at/blog',
  },
};

export const dynamic = 'force-dynamic';

async function getBlogArticles(): Promise<BlogArticle[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('blog_articles')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('[Blog Page] Error fetching articles:', error);
      return [];
    }

    return (data || []) as BlogArticle[];
  } catch (error) {
    console.error('[Blog Page] Error:', error);
    return [];
  }
}

export default async function BlogPage() {
  const articles = await getBlogArticles();

  return <BlogPageVenueStyle articles={articles} />;
}
