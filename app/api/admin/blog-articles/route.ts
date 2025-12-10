import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, validateSupabaseConfig } from '@/lib/supabase/client';
import { EVENT_CATEGORIES } from '@/lib/eventCategories';
import { slugify } from '@/lib/utils/slugify';
import type { 
  BlogArticle, 
  BlogArticleCreatePayload, 
  BlogArticleUpdatePayload,
  BlogArticleListRequest,
  BlogArticleListResponse 
} from '@/lib/types';

// Valid cities for the platform
const VALID_CITIES = ['wien', 'berlin', 'linz', 'ibiza'];

/**
 * Generate slug for blog article
 * Format: {city}-{category}-{normalized-title}
 */
function generateBlogSlug(city: string, category: string, title: string): string {
  const citySlug = slugify(city);
  const categorySlug = slugify(category);
  const titleSlug = slugify(title).substring(0, 100); // Limit title length
  
  return `${citySlug}-${categorySlug}-${titleSlug}`;
}

/**
 * Validate city parameter
 */
function isValidCity(city: string): boolean {
  return VALID_CITIES.includes(city.toLowerCase());
}

/**
 * Validate category parameter
 */
function isValidCategory(category: string): boolean {
  return EVENT_CATEGORIES.includes(category);
}

/**
 * Check authentication - supports both Basic Auth and INTERNAL_API_SECRET
 */
function checkAuthentication(request: NextRequest): { authenticated: boolean; error?: string } {
  // Check for INTERNAL_API_SECRET (for Make.com automation)
  const apiSecret = request.headers.get('x-api-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
  if (apiSecret && apiSecret === process.env.INTERNAL_API_SECRET) {
    return { authenticated: true };
  }

  // Check for Basic Auth (already handled by middleware for admin routes)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    // Basic auth is validated by middleware, so if we got here, it's valid
    return { authenticated: true };
  }

  return { 
    authenticated: false, 
    error: 'Authentication required. Use Basic Auth or X-API-Secret header.' 
  };
}

/**
 * GET /api/admin/blog-articles
 * List blog articles with optional filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    validateSupabaseConfig();

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters: BlogArticleListRequest = {
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      status: (searchParams.get('status') as 'draft' | 'published') || undefined,
      limit: parseInt(searchParams.get('limit') || '20', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10),
    };

    // Validate filters
    if (filters.city && !isValidCity(filters.city)) {
      return NextResponse.json(
        { error: `Invalid city. Must be one of: ${VALID_CITIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (filters.category && !isValidCategory(filters.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${EVENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (filters.status && !['draft', 'published'].includes(filters.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "draft" or "published"' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabaseAdmin
      .from('blog_articles')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false });

    // Apply filters
    if (filters.city) {
      query = query.eq('city', filters.city.toLowerCase());
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    // Apply pagination
    const limit = Math.min(filters.limit || 20, 100); // Max 100 per page
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching blog articles:', error);
      return NextResponse.json(
        { error: 'Failed to fetch blog articles', details: error.message },
        { status: 500 }
      );
    }

    const response: BlogArticleListResponse = {
      articles: (data || []) as BlogArticle[],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error in GET /api/admin/blog-articles:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/blog-articles
 * Create or upsert a blog article
 */
export async function POST(request: NextRequest) {
  try {
    validateSupabaseConfig();

    // Check authentication
    const auth = checkAuthentication(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const payload = (await request.json()) as BlogArticleCreatePayload;

    // Validate required fields
    if (!payload.city || !payload.category || !payload.title || !payload.content) {
      return NextResponse.json(
        { error: 'Missing required fields: city, category, title, content' },
        { status: 400 }
      );
    }

    // Validate city
    if (!isValidCity(payload.city)) {
      return NextResponse.json(
        { error: `Invalid city. Must be one of: ${VALID_CITIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate category
    if (!isValidCategory(payload.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${EVENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = generateBlogSlug(payload.city, payload.category, payload.title);

    // Prepare article data
    const articleData = {
      city: payload.city.toLowerCase(),
      category: payload.category,
      slug,
      title: payload.title,
      content: payload.content,
      seo_keywords: payload.seo_keywords || null,
      meta_description: payload.meta_description || null,
      featured_image: payload.featured_image || null,
      status: 'draft' as const,
      generated_by: 'manual', // Default for manual creation, can be overridden
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Upsert article (insert or update if exists)
    const { data, error } = await supabaseAdmin
      .from('blog_articles')
      .upsert(articleData, {
        onConflict: 'city,category,slug',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating/updating blog article:', error);
      return NextResponse.json(
        { error: 'Failed to create/update blog article', details: error.message },
        { status: 500 }
      );
    }

    console.log('Successfully created/updated blog article:', data.id);
    return NextResponse.json({ success: true, article: data as BlogArticle });
  } catch (error: any) {
    console.error('Error in POST /api/admin/blog-articles:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/blog-articles/:id
 * Update an existing blog article
 */
export async function PUT(request: NextRequest) {
  try {
    validateSupabaseConfig();

    // Check authentication (admin only for updates)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('id');

    if (!articleId) {
      return NextResponse.json(
        { error: 'Missing article ID in query parameters' },
        { status: 400 }
      );
    }

    const payload = (await request.json()) as BlogArticleUpdatePayload;

    // Validate category if provided
    if (payload.category && !isValidCategory(payload.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${EVENT_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (payload.status && !['draft', 'published'].includes(payload.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "draft" or "published"' },
        { status: 400 }
      );
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.content !== undefined) updateData.content = payload.content;
    if (payload.seo_keywords !== undefined) updateData.seo_keywords = payload.seo_keywords;
    if (payload.meta_description !== undefined) updateData.meta_description = payload.meta_description;
    if (payload.featured_image !== undefined) updateData.featured_image = payload.featured_image;
    if (payload.status !== undefined) updateData.status = payload.status;

    // Update article
    const { data, error } = await supabaseAdmin
      .from('blog_articles')
      .update(updateData)
      .eq('id', articleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating blog article:', error);
      return NextResponse.json(
        { error: 'Failed to update blog article', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    console.log('Successfully updated blog article:', data.id);
    return NextResponse.json({ success: true, article: data as BlogArticle });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/blog-articles:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/blog-articles/:id
 * Delete a blog article
 */
export async function DELETE(request: NextRequest) {
  try {
    validateSupabaseConfig();

    // Check authentication (admin only for deletion)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('id');

    if (!articleId) {
      return NextResponse.json(
        { error: 'Missing article ID in query parameters' },
        { status: 400 }
      );
    }

    // Delete article
    const { error } = await supabaseAdmin
      .from('blog_articles')
      .delete()
      .eq('id', articleId);

    if (error) {
      console.error('Error deleting blog article:', error);
      return NextResponse.json(
        { error: 'Failed to delete blog article', details: error.message },
        { status: 500 }
      );
    }

    console.log('Successfully deleted blog article:', articleId);
    return NextResponse.json({ success: true, message: 'Article deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/blog-articles:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
