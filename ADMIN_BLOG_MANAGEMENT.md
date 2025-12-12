# Admin Blog Management - Feature Documentation

## Overview

The admin blog management system provides a centralized interface for managing blog articles and triggering automated article generation via Make.com webhooks.

## Features

### 1. Centralized Blog Management

All blog article management is now consolidated in the admin panel:

- **Access**: `/admin/blog-articles`
- **Authentication**: Basic Auth (same credentials as other admin routes)
- **Functionality**:
  - Create, edit, delete blog articles
  - Publish/unpublish articles
  - Filter by city, category, and status
  - Search articles by title, city, or category
  - Rich text editing with React-Quill editor

### 2. Admin Navigation

Blog articles are now accessible from the admin navigation menu:

- **Location**: Top navigation bar in all admin pages
- **Links**:
  - Dashboard (`/admin`)
  - Hot Cities (`/admin/hot-cities`)
  - **Blog Articles** (`/admin/blog-articles`) ← NEW
- **Visibility**: Only visible to authenticated admin users

### 3. Manual Blog Article Generation via Make.com

A new feature allows admins to manually trigger blog article generation through the Make.com webhook:

#### UI Components

**Location**: `/admin/blog-articles` page header

**Button**: "🚀 Artikel via Make erstellen"
- Toggles a collapsible form for triggering article generation
- Available at the top of the blog articles management page

**Form Fields**:
1. **City** (dropdown):
   - Wien
   - Berlin
   - Linz
   - Ibiza

2. **Category** (dropdown):
   - All 12 event categories from EVENT_CATEGORIES
   - Live-Konzerte, Clubs & Nachtleben, Klassik & Oper, etc.

3. **Action Buttons**:
   - "🚀 Trigger Generation" - Sends webhook request
   - "Cancel" - Closes the form

#### Workflow

1. Admin clicks "🚀 Artikel via Make erstellen" button
2. Form appears with city and category dropdowns
3. Admin selects desired city and category
4. Admin clicks "🚀 Trigger Generation"
5. System sends POST request to `/api/admin/trigger-blog-article`
6. API validates inputs and triggers Make.com webhook
7. Success/error message displayed
8. Article list auto-refreshes after 2 seconds to show newly created article

#### Status Feedback

- **Loading State**: Button shows "⏳ Triggering..." during request
- **Success Message**: "✅ Successfully triggered Make.com for {city} - {category}"
- **Error Message**: "❌ Error: {error details}"
- **Color Coding**: Green for success, red for errors

## API Endpoints

### POST /api/admin/trigger-blog-article

Manually triggers blog article generation via Make.com webhook.

**Authentication**: Basic Auth (via middleware)

**Request Body**:
```json
{
  "city": "wien",
  "category": "Live-Konzerte"
}
```

**Valid Cities**: `wien`, `berlin`, `linz`, `ibiza`

**Valid Categories**: All categories from `EVENT_CATEGORIES` constant

**Response (Success)**:
```json
{
  "success": true,
  "message": "Successfully triggered blog article generation for wien - Live-Konzerte",
  "city": "wien",
  "category": "Live-Konzerte",
  "timestamp": "2025-12-12T06:00:00.000Z"
}
```

**Response (Error)**:
```json
{
  "error": "Invalid city. Must be one of: wien, berlin, linz, ibiza"
}
```

**Status Codes**:
- `200` - Success
- `400` - Invalid request (missing fields, invalid city/category)
- `401` - Authentication required
- `500` - Server error (webhook URL not configured, webhook failed)

## Environment Variables

### Required Variables

```env
# Admin Basic Auth
ADMIN_USER=your_admin_username
ADMIN_PASS=your_secure_password

# Make.com Webhook URL
MAKE_COM_WEBHOOK_URL=https://hook.eu2.make.com/your-webhook-id

# Supabase (for database access)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cron Authentication
CRON_SECRET=your_cron_secret
```

### Optional Variables

```env
# Blog Generation Cities (defaults to 'wien')
BLOG_GENERATION_CITIES=wien,berlin,linz,ibiza
```

## Security

### Authentication & Authorization

1. **Admin Routes Protection**:
   - All `/admin/*` routes protected by Basic Auth via middleware
   - All `/api/admin/*` routes protected by Basic Auth via middleware
   - Exception: `/api/admin/events/process` uses Bearer token

2. **Trigger Endpoint Security**:
   - Protected by middleware Basic Auth
   - Input validation for city and category
   - Webhook URL stored securely in environment variables

3. **No Bypass Routes**:
   - No authentication bypass mechanisms created
   - All security maintained through existing middleware

### Input Validation

The trigger endpoint validates:
- Required fields: `city` and `category`
- City must be in allowed list: `wien`, `berlin`, `linz`, `ibiza`
- Category must be in `EVENT_CATEGORIES` list
- Sanitized error messages (limited to 200 characters)

## Make.com Integration

### Webhook Payload

When triggered, the following payload is sent to Make.com:

```json
{
  "city": "wien",
  "category": "Live-Konzerte",
  "timestamp": "2025-12-12T06:00:00.000Z",
  "source": "admin-manual-trigger"
}
```

**Source Values**:
- `admin-manual-trigger` - Manual trigger from admin UI
- `vercel-cron` - Automatic daily trigger from Vercel Cron

### Make.com Scenario Setup

Your Make.com scenario should:

1. **Watch for Webhook**: Listen for POST requests at the webhook URL
2. **Parse JSON**: Extract `city`, `category`, `timestamp`, and `source`
3. **Generate Article**: Use AI/LLM to generate blog article content
4. **Call API**: POST generated article to `/api/admin/blog-articles`
   - Include `X-API-Secret` header with `INTERNAL_API_SECRET` value
   - Or use Basic Auth credentials

Example Make.com HTTP request to create article:
```
POST https://your-domain.vercel.app/api/admin/blog-articles
Headers:
  X-API-Secret: your_internal_api_secret
  Content-Type: application/json
Body:
{
  "city": "wien",
  "category": "Live-Konzerte",
  "title": "Die besten Live-Konzerte in Wien diese Woche",
  "content": "<p>Generated HTML content...</p>",
  "meta_description": "Entdecken Sie die besten Live-Konzerte...",
  "seo_keywords": "wien, konzerte, live musik, events"
}
```

## Bug Fixes Included

### Cron Cache Warmup Authentication Fix

**Problem**: The `/api/cron/cache-warmup` endpoint was using an invalid `ADMIN_API_KEY` Bearer token that doesn't exist, causing HTML error pages to be parsed as JSON.

**Fix Applied**:
1. Changed authentication from Bearer token to Basic Auth
2. Added JSON response validation before parsing
3. Added comprehensive error logging
4. Uses `ADMIN_USER` and `ADMIN_PASS` environment variables

**Impact**: Vercel Cron jobs now properly authenticate and handle responses.

## Testing

### Manual Testing Steps

1. **Access Admin Panel**:
   ```
   Navigate to: http://localhost:3000/admin
   Login with: ADMIN_USER / ADMIN_PASS
   ```

2. **Navigate to Blog Articles**:
   - Click "Blog Articles" in the navigation menu
   - Verify page loads with existing articles

3. **Test Manual Trigger**:
   - Click "🚀 Artikel via Make erstellen" button
   - Select a city (e.g., "Wien")
   - Select a category (e.g., "Live-Konzerte")
   - Click "🚀 Trigger Generation"
   - Verify success message appears
   - Check Make.com scenario receives webhook

4. **Verify Article Creation**:
   - After Make.com processes the webhook
   - Article should appear in the admin list
   - Check article status, title, and content

### API Testing with cURL

```bash
# Test trigger endpoint (requires auth)
curl -u admin:password -X POST http://localhost:3000/api/admin/trigger-blog-article \
  -H "Content-Type: application/json" \
  -d '{"city":"wien","category":"Live-Konzerte"}'

# Test without auth (should fail with 401)
curl -X POST http://localhost:3000/api/admin/trigger-blog-article \
  -H "Content-Type: application/json" \
  -d '{"city":"wien","category":"Live-Konzerte"}'

# Test with invalid city (should fail with 400)
curl -u admin:password -X POST http://localhost:3000/api/admin/trigger-blog-article \
  -H "Content-Type: application/json" \
  -d '{"city":"invalid","category":"Live-Konzerte"}'
```

## Troubleshooting

### Common Issues

#### 1. "Make.com webhook URL not configured"

**Cause**: `MAKE_COM_WEBHOOK_URL` environment variable not set

**Solution**: Add to `.env.local` or Vercel environment variables:
```env
MAKE_COM_WEBHOOK_URL=https://hook.eu2.make.com/your-webhook-id
```

#### 2. "Authentication required" when accessing admin pages

**Cause**: `ADMIN_USER` or `ADMIN_PASS` not configured

**Solution**: Add to `.env.local`:
```env
ADMIN_USER=your_username
ADMIN_PASS=your_password
```

#### 3. Webhook triggers but no article appears

**Possible Causes**:
- Make.com scenario not configured
- Make.com webhook URL incorrect
- Make.com scenario doesn't call back to create article
- `INTERNAL_API_SECRET` mismatch

**Solution**: 
1. Check Make.com scenario execution logs
2. Verify webhook URL in environment variables
3. Ensure Make.com HTTP module calls `/api/admin/blog-articles`
4. Verify `X-API-Secret` header matches `INTERNAL_API_SECRET`

#### 4. Cron jobs failing with "SyntaxError: Unexpected token '<'"

**Cause**: This was the original issue - receiving HTML instead of JSON

**Solution**: Already fixed in this PR. Ensure you deploy the updated code.

## Migration Notes

### For Existing Installations

1. **No Database Changes Required**: Blog articles table already exists
2. **Environment Variables**: Ensure all required variables are set
3. **No Breaking Changes**: All existing functionality preserved
4. **Backward Compatible**: Existing blog articles work without changes

### Deployment Checklist

- [ ] Verify `ADMIN_USER` and `ADMIN_PASS` are set in production
- [ ] Verify `MAKE_COM_WEBHOOK_URL` is set in production
- [ ] Verify `CRON_SECRET` is set for Vercel Cron jobs
- [ ] Test admin login after deployment
- [ ] Test manual trigger functionality
- [ ] Test Vercel Cron jobs run successfully
- [ ] Verify Make.com scenario receives webhooks

## Future Enhancements

Possible improvements for future versions:

1. **Batch Triggering**: Trigger multiple city/category combinations at once
2. **Scheduled Triggers**: Schedule article generation for specific times
3. **Article Preview**: Preview generated articles before publishing
4. **Analytics**: Track trigger success rates and article performance
5. **Webhook History**: Log of all webhook triggers and their status
6. **Make.com Status**: Display Make.com scenario status in UI

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Make.com scenario logs
3. Check Vercel deployment logs
4. Review application logs for error messages

## References

- **Blog Articles Quickstart**: `BLOG_ARTICLES_QUICKSTART.md`
- **Blog Automation**: `BLOG_ARTICLE_AUTOMATION.md`
- **Make.com Example**: `docs/make-com-scenario-example.md`
- **Event Categories**: `app/lib/eventCategories.ts`
- **Middleware Security**: `middleware.ts`
