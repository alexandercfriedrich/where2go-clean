# Blog Articles Management - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Environment Setup

Add these variables to your `.env.local`:

```env
# Admin credentials for browser access
ADMIN_USER=your_admin_username
ADMIN_PASS=your_secure_password

# API secret for Make.com automation
INTERNAL_API_SECRET=your_secret_key_here

# Supabase (should already be configured)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Run Database Migration

```bash
# The migration file is already created at:
# supabase/migrations/009_create_blog_articles_table.sql

# If using Supabase CLI:
supabase db push

# Or apply manually via Supabase Dashboard:
# SQL Editor → New Query → Paste migration content → Run
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access Admin Interface

Open your browser and navigate to:
```
http://localhost:3000/admin/blog-articles
```

Login with your `ADMIN_USER` and `ADMIN_PASS` credentials.

## 📝 Create Your First Article

### Via Admin UI

1. Click **"+ New Article"** button
2. Fill in the form:
   - **Title**: "Die besten Konzerte in Wien im Dezember"
   - **City**: Wien
   - **Category**: Live-Konzerte
   - **Content**: Use the rich text editor to add your content
   - **Meta Description**: Brief SEO description (max 160 chars)
   - **SEO Keywords**: wien, konzerte, musik, events
3. Click **"Save Article"** (saved as draft)
4. Click **"Publish"** to make it live

### Via API (cURL)

```bash
# Create article with admin credentials
# Replace 'your_admin_username' and 'your_secure_password' with the values 
# from ADMIN_USER and ADMIN_PASS in your .env.local file
curl -u your_admin_username:your_secure_password -X POST http://localhost:3000/api/admin/blog-articles \
  -H "Content-Type: application/json" \
  -d '{
    "city": "wien",
    "category": "Live-Konzerte",
    "title": "Die besten Konzerte in Wien",
    "content": "<p>Here are the best concerts...</p>",
    "meta_description": "Discover the best concerts in Vienna this month",
    "seo_keywords": "wien, konzerte, musik, events"
  }'
```

### Via Make.com

```bash
# Create article with API secret
curl -X POST http://localhost:3000/api/admin/blog-articles \
  -H "X-API-Secret: your_secret_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "wien",
    "category": "Live-Konzerte",
    "title": "Die besten Konzerte in Wien",
    "content": "<p>Here are the best concerts...</p>",
    "meta_description": "Discover the best concerts in Vienna this month",
    "seo_keywords": "wien, konzerte, musik, events"
  }'
```

## 🎯 Common Tasks

**Note**: Replace `your_admin_username:your_secure_password` in the examples below with your actual ADMIN_USER and ADMIN_PASS values from .env.local

### List All Articles

```bash
curl -u your_admin_username:your_secure_password http://localhost:3000/api/admin/blog-articles
```

### Filter by City

```bash
curl -u your_admin_username:your_secure_password "http://localhost:3000/api/admin/blog-articles?city=wien"
```

### Filter by Category

```bash
curl -u your_admin_username:your_secure_password "http://localhost:3000/api/admin/blog-articles?category=Live-Konzerte"
```

### Filter by Status

```bash
# Get all published articles
curl -u your_admin_username:your_secure_password "http://localhost:3000/api/admin/blog-articles?status=published"

# Get all drafts
curl -u your_admin_username:your_secure_password "http://localhost:3000/api/admin/blog-articles?status=draft"
```

### Update Article Status

```bash
# Publish a draft
curl -u your_admin_username:your_secure_password -X PUT "http://localhost:3000/api/admin/blog-articles?id={article-id}" \
  -H "Content-Type: application/json" \
  -d '{"status": "published"}'
```

### Delete Article

```bash
curl -u your_admin_username:your_secure_password -X DELETE "http://localhost:3000/api/admin/blog-articles?id={article-id}"
```

## 🏗️ Valid Values Reference

### Cities
```
wien, berlin, linz, ibiza
```

### Categories (Event Types)
```
Clubs & Nachtleben
Live-Konzerte
Klassik & Oper
Theater & Comedy
Museen & Ausstellungen
Film & Kino
Open Air & Festivals
Kulinarik & Märkte
Sport & Fitness
Bildung & Workshops
Familie & Kinder
LGBTQ+
```

### Status Values
```
draft, published
```

## 🔧 Troubleshooting

### "Authentication required" error
- **Solution**: Check that `ADMIN_USER` and `ADMIN_PASS` are set correctly
- For Make.com: Check `INTERNAL_API_SECRET` is correct

### "Invalid city" error
- **Solution**: Ensure city is lowercase: `wien`, not `Wien`
- Valid cities: `wien`, `berlin`, `linz`, `ibiza`

### "Invalid category" error
- **Solution**: Use exact category names from the list above
- Case-sensitive: `Live-Konzerte`, not `live-konzerte`

### Editor not loading
- **Solution**: Check browser console for errors
- Ensure JavaScript is enabled
- Try hard refresh (Ctrl+Shift+R)

### Build errors
- **Solution**: Run `npm install` to ensure dependencies are installed
- Check that `react-quill-new` is in package.json

## 📖 More Information

For detailed documentation, see:
- **Full Documentation**: `BLOG_ARTICLES_IMPLEMENTATION.md`
- **Security Info**: `SECURITY_SUMMARY_BLOG_ARTICLES.md`

## 🤝 Need Help?

1. Check the troubleshooting section above
2. Review the full documentation
3. Check browser console for errors
4. Check server logs: `npm run dev` output
5. Verify database migration was applied successfully

## 🎉 Success!

If you can:
- ✅ Access the admin interface
- ✅ Create a new article
- ✅ See it in the list
- ✅ Edit and publish it

You're all set! The blog articles system is working correctly.

## 🚀 Next Steps

1. **Create more articles** via the admin UI or API
2. **Set up Make.com workflow** for automated content generation
3. **Build public blog pages** (optional - requires additional development)
4. **Add to sitemap** for SEO (optional - future enhancement)
5. **Implement caching** for better performance (optional - future enhancement)

---

**Quick Reference Card**

```
Admin URL: http://localhost:3000/admin/blog-articles
API Base: /api/admin/blog-articles

Methods:
  GET    - List articles (+ filters: ?city=wien&status=published)
  POST   - Create article
  PUT    - Update article (?id={id})
  DELETE - Delete article (?id={id})

Auth:
  Admin: Basic Auth (ADMIN_USER:ADMIN_PASS)
  API:   X-API-Secret header or Bearer token

Slug Format: {city}-{category}-{normalized-title}
Example: wien-live-konzerte-die-besten-konzerte-im-dezember
```
