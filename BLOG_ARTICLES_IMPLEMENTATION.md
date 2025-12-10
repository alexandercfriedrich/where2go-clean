# Blog Articles Management System - Implementation Documentation

## Overview

The Blog Articles Management System provides a complete solution for creating, managing, and publishing AI-generated blog articles about events in various cities and categories. This system is designed to support both manual admin management and automated content generation via Make.com workflows.

## Architecture

### Database Schema

**Table**: `blog_articles`

```sql
CREATE TABLE blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  slug VARCHAR(500) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  seo_keywords TEXT,
  meta_description VARCHAR(500),
  featured_image TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  generated_by VARCHAR(100) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_ids UUID[],
  CONSTRAINT unique_city_category_slug UNIQUE (city, category, slug)
);
```

**Indexes**:
- `idx_blog_articles_city` on `city`
- `idx_blog_articles_category` on `category`
- `idx_blog_articles_status` on `status`
- `idx_blog_articles_published_at` on `published_at DESC` (WHERE published_at IS NOT NULL)
- `idx_blog_articles_updated_at` on `updated_at DESC`
- `idx_blog_articles_slug` on `slug`
- `idx_blog_articles_city_category_status` composite index

**Triggers**:
- `trigger_update_blog_articles_updated_at`: Auto-updates `updated_at` timestamp
- `trigger_set_blog_articles_published_at`: Auto-sets `published_at` when status changes to 'published'

### TypeScript Types

**Location**: `app/lib/types.ts`

```typescript
export interface BlogArticle {
  id: string;
  city: string;
  category: string;
  slug: string;
  title: string;
  content: string; // HTML from React-Quill
  seo_keywords?: string;
  meta_description?: string;
  featured_image?: string;
  status: 'draft' | 'published';
  generated_by: string;
  generated_at: string; // ISO timestamp
  published_at?: string; // ISO timestamp
  updated_at: string; // ISO timestamp
  event_ids?: string[]; // Reference to events mentioned in article
}
```

## API Endpoints

**Base URL**: `/api/admin/blog-articles`

### Authentication

Two authentication methods are supported:

1. **Basic Auth**: For admin users accessing via browser
   - Validated by middleware using `ADMIN_USER` and `ADMIN_PASS` environment variables
   - Required for: GET, PUT, DELETE operations

2. **INTERNAL_API_SECRET**: For automated Make.com workflows
   - Sent via `X-API-Secret` header or as Bearer token
   - Required for: POST operations (creation/upsert)
   - Environment variable: `INTERNAL_API_SECRET`

### GET - List Articles

**Endpoint**: `GET /api/admin/blog-articles`

**Query Parameters**:
- `city` (optional): Filter by city (wien, berlin, linz, ibiza)
- `category` (optional): Filter by event category
- `status` (optional): Filter by status (draft, published)
- `limit` (optional): Number of results per page (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "articles": [/* array of BlogArticle objects */],
  "total": 123,
  "hasMore": true
}
```

### POST - Create/Upsert Article

**Endpoint**: `POST /api/admin/blog-articles`

**Authentication**: Basic Auth OR INTERNAL_API_SECRET

**Body**:
```json
{
  "city": "wien",
  "category": "Live-Konzerte",
  "title": "Die besten Konzerte in Wien im Dezember",
  "content": "<p>HTML content from React-Quill...</p>",
  "seo_keywords": "wien, konzerte, musik, events",
  "meta_description": "Entdecke die besten Live-Konzerte in Wien...",
  "featured_image": "https://example.com/image.jpg"
}
```

**Response**:
```json
{
  "success": true,
  "article": {/* BlogArticle object */}
}
```

**Behavior**:
- Generates slug automatically: `{city}-{category}-{normalized-title}`
- Upserts based on `UNIQUE(city, category, slug)` constraint
- Sets status to 'draft' by default
- Sets `generated_by` to 'manual' (can be overridden by Make.com)
- Sets `generated_at` and `updated_at` timestamps

### PUT - Update Article

**Endpoint**: `PUT /api/admin/blog-articles?id={articleId}`

**Authentication**: Basic Auth only (admin access required)

**Body** (partial update):
```json
{
  "title": "Updated title",
  "content": "<p>Updated content...</p>",
  "status": "published",
  "meta_description": "Updated description"
}
```

**Response**:
```json
{
  "success": true,
  "article": {/* Updated BlogArticle object */}
}
```

### DELETE - Remove Article

**Endpoint**: `DELETE /api/admin/blog-articles?id={articleId}`

**Authentication**: Basic Auth only (admin access required)

**Response**:
```json
{
  "success": true,
  "message": "Article deleted successfully"
}
```

## Admin UI

**Location**: `app/admin/blog-articles/page.tsx`

### Features

1. **Article List Table**:
   - Displays title, city, category, status, generated_by, and last updated date
   - Status badges with color coding (draft: yellow, published: green)
   - Compact meta description preview

2. **Filtering & Search**:
   - City dropdown (Wien, Berlin, Linz, Ibiza)
   - Category dropdown (all event categories)
   - Status dropdown (draft, published, all)
   - Search input (searches title, city, category)
   - "Clear Filters" button to reset all filters

3. **Actions**:
   - Edit: Opens modal with full article editor
   - Publish/Unpublish: Toggle article status
   - Delete: Remove article (with confirmation)

4. **Article Editor Modal**:
   - Title input
   - City selector (read-only after creation)
   - Category selector (read-only after creation)
   - Status selector (draft/published)
   - React-Quill rich text editor for content
   - Meta description textarea (with character counter, max 160 chars recommended)
   - SEO keywords input (comma-separated)
   - Featured image URL input
   - Save/Cancel buttons

5. **Empty State**:
   - Displays when no articles found
   - Helpful message with call-to-action

### UI Patterns

Follows the same design patterns as `/admin/static-pages`:
- Dynamic import of React-Quill to avoid SSR issues
- Styled JSX for component-scoped CSS
- Modal overlay for editing
- Consistent button styling (primary, secondary, success, danger)
- Responsive design with mobile-first approach
- Loading states and error handling

## Slug Generation

**Function**: `generateBlogSlug(city, category, title)`

**Format**: `{city}-{category}-{normalized-title}`

**Example**: `wien-live-konzerte-die-besten-konzerte-im-dezember`

**Rules**:
- City and category are slugified (lowercase, hyphens)
- Title is slugified and limited to 100 characters
- Uses `slugify()` from `app/lib/utils/slugify.ts`
- Removes diacritics (ä → a, ö → o, etc.)
- Replaces spaces with hyphens
- Removes special characters

## Validation

### City Validation
Valid cities: `wien`, `berlin`, `linz`, `ibiza` (lowercase)

### Category Validation
Must match one of the 12 event categories from `app/lib/eventCategories.ts`:
- Clubs & Nachtleben
- Live-Konzerte
- Klassik & Oper
- Theater & Comedy
- Museen & Ausstellungen
- Film & Kino
- Open Air & Festivals
- Kulinarik & Märkte
- Sport & Fitness
- Bildung & Workshops
- Familie & Kinder
- LGBTQ+

### Status Validation
Must be either `draft` or `published`

## Integration with Make.com

### Workflow Setup

1. **Authentication**:
   - Set `X-API-Secret` header to `INTERNAL_API_SECRET` value
   - Or use Authorization header: `Bearer {INTERNAL_API_SECRET}`

2. **Create Article Scenario**:
   ```
   Trigger → AI Content Generation → HTTP POST to /api/admin/blog-articles
   ```

3. **Example Payload**:
   ```json
   {
     "city": "wien",
     "category": "Live-Konzerte",
     "title": "{{ai_generated_title}}",
     "content": "{{ai_generated_html_content}}",
     "seo_keywords": "{{ai_generated_keywords}}",
     "meta_description": "{{ai_generated_description}}",
     "featured_image": "{{selected_image_url}}"
   }
   ```

4. **Response Handling**:
   - Success: `{ "success": true, "article": {...} }`
   - Error: `{ "error": "Error message", "details": "..." }`

### Best Practices

- Set `generated_by` field to AI model name (e.g., "claude-3-5-sonnet")
- Include relevant `event_ids` if article references specific events
- Keep `meta_description` under 160 characters for SEO
- Generate unique titles to avoid slug conflicts
- Start with 'draft' status and review before publishing

## Security

### Authentication & Authorization
- Admin routes protected by middleware with Basic Auth
- API secret validation for automated workflows
- No public endpoints - all require authentication

### Input Validation
- City and category validated against allowed lists
- SQL injection prevention via parameterized queries
- XSS prevention via HTML sanitization in React-Quill

### Rate Limiting
- Middleware adds rate limiting headers (informational)
- Consider implementing rate limiting for API endpoints in production

## Performance Considerations

### Database
- Indexes on frequently queried columns (city, category, status)
- Composite index for common filter combinations
- Pagination with LIMIT/OFFSET to prevent large result sets
- Maximum 100 articles per page

### Frontend
- Debounced search for better UX
- React-Quill lazy loaded to reduce initial bundle size
- Filters cached in component state
- Empty state optimization

### Caching
- Consider adding Redis caching for published articles
- Cache invalidation on article updates
- CDN caching for public-facing article pages (future feature)

## Future Enhancements

1. **Public Article Pages**:
   - Create `/blog/[city]/[category]/[slug]` routes
   - Server-side rendering for SEO
   - Schema.org markup for rich snippets

2. **Advanced Features**:
   - Bulk operations (publish multiple drafts)
   - Article versioning/history
   - Preview mode before publishing
   - Scheduled publishing
   - Article templates

3. **Analytics**:
   - View count tracking
   - Popular articles widget
   - Traffic source analysis

4. **SEO Enhancements**:
   - Automatic meta tag generation
   - OpenGraph image generation
   - Sitemap integration
   - Related articles suggestions

5. **Content Management**:
   - Rich media library
   - Image upload and management
   - Tag management system
   - Category-specific templates

## Troubleshooting

### Build Errors

**Issue**: TypeScript errors about Supabase types
**Solution**: Ensure `blog_articles` table is added to `app/lib/supabase/types.ts`

**Issue**: React-Quill SSR errors
**Solution**: Ensure dynamic import with `ssr: false` flag

### Runtime Errors

**Issue**: 401 Unauthorized
**Solution**: Check `ADMIN_USER`, `ADMIN_PASS`, or `INTERNAL_API_SECRET` environment variables

**Issue**: 400 Invalid city/category
**Solution**: Verify city is lowercase and matches valid cities list

**Issue**: 409 Conflict on upsert
**Solution**: Check if article with same city+category+slug already exists

### UI Issues

**Issue**: Editor not loading
**Solution**: Check browser console for React-Quill errors, ensure client-side rendering

**Issue**: Filters not working
**Solution**: Check network tab for API errors, verify query parameters

## Testing

### Manual Testing Checklist

- [ ] Create new article with all fields
- [ ] Update existing article
- [ ] Delete article
- [ ] Filter by city
- [ ] Filter by category
- [ ] Filter by status
- [ ] Search by title
- [ ] Publish draft article
- [ ] Unpublish published article
- [ ] Test with Make.com API secret
- [ ] Test character counter for meta description
- [ ] Test mobile responsiveness

### API Testing with cURL

```bash
# List articles
curl -u admin:password http://localhost:3000/api/admin/blog-articles

# Create article
curl -u admin:password -X POST http://localhost:3000/api/admin/blog-articles \
  -H "Content-Type: application/json" \
  -d '{"city":"wien","category":"Live-Konzerte","title":"Test Article","content":"<p>Test</p>"}'

# Update article
curl -u admin:password -X PUT "http://localhost:3000/api/admin/blog-articles?id={id}" \
  -H "Content-Type: application/json" \
  -d '{"status":"published"}'

# Delete article
curl -u admin:password -X DELETE "http://localhost:3000/api/admin/blog-articles?id={id}"

# Create with API secret (Make.com)
curl -X POST http://localhost:3000/api/admin/blog-articles \
  -H "X-API-Secret: {secret}" \
  -H "Content-Type: application/json" \
  -d '{"city":"wien","category":"Live-Konzerte","title":"Test","content":"<p>Test</p>"}'
```

## Maintenance

### Regular Tasks

1. Monitor article creation rate
2. Review draft articles for publication
3. Update categories as event types evolve
4. Check for broken featured images
5. Verify Make.com integration status

### Database Maintenance

```sql
-- Check article count by city
SELECT city, COUNT(*) FROM blog_articles GROUP BY city;

-- Find old drafts
SELECT * FROM blog_articles 
WHERE status = 'draft' 
  AND updated_at < NOW() - INTERVAL '30 days';

-- Check most recent publications
SELECT title, city, category, published_at 
FROM blog_articles 
WHERE status = 'published' 
ORDER BY published_at DESC 
LIMIT 10;
```

## Environment Variables

Required environment variables:

```env
# Admin Authentication
ADMIN_USER=your_admin_username
ADMIN_PASS=your_admin_password

# Make.com Integration
INTERNAL_API_SECRET=your_secret_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Support

For issues or questions:
1. Check this documentation
2. Review existing code in `/app/admin/static-pages` for similar patterns
3. Check Supabase logs for database errors
4. Review browser console for frontend errors
5. Check Next.js build output for compilation errors
