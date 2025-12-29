/**
 * Public Blog Articles API
 * Returns published blog articles for public consumption
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, validateSupabaseConfig } from '@/lib/supabase/client';
import { isValidCity } from '@/lib/cities';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';
import type { BlogArticle, BlogArticleListResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    validateSupabaseConfig();

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Validate filters
    if (city && !isValidCity(city)) {
      return NextResponse.json(
        { error: 'Invalid city parameter' },
        { status: 400 }
      );
    }

    if (category && !EVENT_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category parameter' },
        { status: 400 }
      );
    }

    // Build query - only return published articles
    let query = supabaseAdmin
      .from('blog_articles')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false }) as any;

    // Apply filters
    if (city) {
      query = query.eq('city', city.toLowerCase());
    }
    if (category) {
      query = query.eq('category', category);
    }

    // Apply pagination
    const limitValue = Math.min(limit, 100); // Max 100 per page
    const offsetValue = offset || 0;
    query = query.range(offsetValue, offsetValue + limitValue - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[Blog Articles API] Error fetching articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch blog articles' },
        { status: 500 }
      );
    }

    const response: BlogArticleListResponse = {
      articles: (data || []) as BlogArticle[],
      total: count || 0,
      hasMore: (count || 0) > offsetValue + limitValue,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Blog Articles API] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
