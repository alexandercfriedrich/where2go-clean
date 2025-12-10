# Blog Article Automation Flow Diagram

## Overview

This document provides visual diagrams of the blog article automation system.

## Daily Execution Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Daily at 6:00 AM UTC                        │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Vercel Cron Job     │
                    │  (Auto-triggered)     │
                    └───────────┬───────────┘
                                │
                                ▼
        ┌───────────────────────────────────────────────┐
        │  /api/cron/generate-blog-articles             │
        │                                               │
        │  1. Validates CRON_SECRET                     │
        │  2. Loads EVENT_CATEGORIES (12 categories)    │
        │  3. Gets MAKE_COM_WEBHOOK_URL                 │
        └───────────────────┬───────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────────┐
        │         For each category (12×):              │
        │                                               │
        │  ┌─────────────────────────────────────────┐  │
        │  │  POST to Make.com Webhook               │  │
        │  │                                         │  │
        │  │  Payload:                               │  │
        │  │  {                                      │  │
        │  │    "city": "wien",                      │  │
        │  │    "category": "Live-Konzerte",         │  │
        │  │    "timestamp": "2024-12-10T06:00:00Z", │  │
        │  │    "source": "vercel-cron"              │  │
        │  │  }                                      │  │
        │  └─────────────────────────────────────────┘  │
        │                                               │
        │  Wait 100ms (rate limiting)                   │
        └───────────────────┬───────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────────┐
        │  Returns Summary:                             │
        │                                               │
        │  {                                            │
        │    "success": true,                           │
        │    "city": "wien",                            │
        │    "totalCategories": 12,                     │
        │    "successCount": 12,                        │
        │    "failureCount": 0,                         │
        │    "results": [...]                           │
        │  }                                            │
        └───────────────────────────────────────────────┘
```

## Make.com Scenario Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Webhook Received from Cron                       │
│  {"city": "wien", "category": "Live-Konzerte", ...}                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
            ┌───────────────────────────────────┐
            │   Module 1: Custom Webhook        │
            │                                   │
            │   - Receives trigger              │
            │   - Extracts city & category      │
            │   - Passes to next module         │
            └───────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │   Module 2: OpenAI / Claude               │
        │                                           │
        │   System: "You are an expert writer..."  │
        │                                           │
        │   User: "Write article about              │
        │          {{1.category}} in {{1.city}}"    │
        │                                           │
        │   - Generates title                       │
        │   - Generates HTML content                │
        │   - Generates meta description            │
        │   - Generates SEO keywords                │
        │                                           │
        │   Response format: JSON                   │
        └───────────────┬───────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────┐
        │   Module 3: Parse JSON                    │
        │                                           │
        │   Extracts:                               │
        │   - title                                 │
        │   - content (HTML)                        │
        │   - meta_description                      │
        │   - seo_keywords                          │
        └───────────────┬───────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────┐
        │   Module 4: HTTP POST                     │
        │                                           │
        │   URL: /api/admin/blog-articles           │
        │   Headers:                                │
        │     X-API-Secret: {{INTERNAL_API_SECRET}} │
        │     Content-Type: application/json        │
        │                                           │
        │   Body:                                   │
        │   {                                       │
        │     "city": "{{1.city}}",                 │
        │     "category": "{{1.category}}",         │
        │     "title": "{{3.title}}",               │
        │     "content": "{{3.content}}",           │
        │     "meta_description": "{{3.meta...}}",  │
        │     "seo_keywords": "{{3.seo_keywords}}"  │
        │   }                                       │
        └───────────────┬───────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
    ┌───────────────┐      ┌──────────────┐
    │   Success     │      │   Error      │
    │               │      │              │
    │   Article     │      │   Log &      │
    │   Created     │      │   Retry      │
    │   as Draft    │      │              │
    └───────────────┘      └──────────────┘
```

## Database Flow

```
┌────────────────────────────────────────────────────────┐
│  POST /api/admin/blog-articles                         │
│  (Called by Make.com)                                  │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────────┐
    │  1. Validate Authentication            │
    │     - Check X-API-Secret header        │
    │     - Match INTERNAL_API_SECRET        │
    └────────────────┬───────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────────┐
    │  2. Validate Payload                   │
    │     - City in valid list               │
    │     - Category in EVENT_CATEGORIES     │
    │     - Required fields present          │
    └────────────────┬───────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────────┐
    │  3. Generate Slug                      │
    │     Format:                            │
    │     {city}-{category}-{title-slug}     │
    │     Example:                           │
    │     wien-live-konzerte-die-besten...   │
    └────────────────┬───────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────────┐
    │  4. Check for Existing Article         │
    │     - Query by: city, category, slug   │
    │     - If exists: UPDATE                │
    │     - If not: INSERT                   │
    └────────────────┬───────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────────┐
    │  5. Upsert to blog_articles Table      │
    │                                        │
    │  Fields:                               │
    │  - id (UUID, auto-generated)           │
    │  - city (wien)                         │
    │  - category (Live-Konzerte)            │
    │  - slug (generated)                    │
    │  - title                               │
    │  - content (HTML)                      │
    │  - seo_keywords                        │
    │  - meta_description                    │
    │  - status (draft)                      │
    │  - generated_by (manual/make.com)      │
    │  - generated_at (timestamp)            │
    │  - updated_at (auto-updated)           │
    └────────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Article Saved         │
        │  Status: draft         │
        │                        │
        │  Visible in:           │
        │  /admin/blog-articles  │
        └────────────────────────┘
```

## Admin Workflow

```
┌────────────────────────────────────────────────────────┐
│  Admin visits /admin/blog-articles                     │
└────────────────────┬───────────────────────────────────┘
                     │
                     ▼
    ┌────────────────────────────────────────┐
    │  View List of Articles                 │
    │                                        │
    │  Filters:                              │
    │  - City                                │
    │  - Category                            │
    │  - Status (draft/published)            │
    │                                        │
    │  Actions per article:                  │
    │  - Edit                                │
    │  - Publish/Unpublish                   │
    │  - Delete                              │
    └────────────────┬───────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌────────────────┐      ┌────────────────┐
│   Edit Draft   │      │   Publish      │
│                │      │                │
│  - Review      │      │  - Set status  │
│  - Modify      │      │    to          │
│  - Save        │      │    'published' │
│                │      │  - Auto-set    │
│                │      │    published_  │
│                │      │    at          │
└────────────────┘      └────────────────┘
```

## Error Handling Flow

```
┌────────────────────────────────────────────────────────┐
│  Error Occurs in Any Step                             │
└────────────────────┬───────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌────────────────┐      ┌────────────────┐
│  Cron Job      │      │  Make.com      │
│  Error         │      │  Error         │
│                │      │                │
│  - Logged to   │      │  - Logged in   │
│    Vercel      │      │    Make.com    │
│  - Returns     │      │    history     │
│    207 status  │      │  - Email       │
│  - Shows       │      │    notification│
│    failed      │      │  - Retryable   │
│    categories  │      │                │
└────────────────┘      └────────────────┘
```

## Monitoring Points

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Dashboard                     │
└─────────────────────────────────────────────────────────────┘

    ┌────────────────────┐
    │  Vercel Dashboard  │
    │                    │
    │  - Cron Jobs       │────► Check daily execution at 6 AM
    │  - Logs            │────► View detailed logs
    │  - Analytics       │────► Monitor performance
    └────────────────────┘

    ┌────────────────────┐
    │  Make.com          │
    │                    │
    │  - Execution       │────► View webhook processing
    │    History         │
    │  - Operations      │────► Track operations usage
    │    Usage           │
    │  - Notifications   │────► Receive error alerts
    └────────────────────┘

    ┌────────────────────┐
    │  OpenAI/Claude     │
    │  Dashboard         │
    │                    │
    │  - API Usage       │────► Monitor token consumption
    │  - Costs           │────► Track spending
    │  - Rate Limits     │────► Check quotas
    └────────────────────┘

    ┌────────────────────┐
    │  Admin Panel       │
    │  /admin/blog-      │
    │  articles          │
    │                    │
    │  - Draft Articles  │────► Review generated content
    │  - Published       │────► Track published articles
    │  - Stats           │────► View generation metrics
    └────────────────────┘
```

## Cost Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       Daily Costs                           │
└─────────────────────────────────────────────────────────────┘

    12 Categories × Daily
           │
           ▼
    ┌──────────────────┐
    │  Make.com        │
    │                  │
    │  48 operations   │───► $9/month (Core Plan)
    │  (4 per article) │     10,000 ops included
    └──────────────────┘

           +
           
    ┌──────────────────┐
    │  Claude API      │
    │                  │
    │  ~500 tokens in  │───► $8.64/month
    │  ~1500 tokens out│     (12 articles/day)
    │  × 12 articles   │
    └──────────────────┘

           =
           
    ┌──────────────────┐
    │  Total Monthly   │
    │                  │
    │   ~$17.64/month  │
    └──────────────────┘

    Cost Optimization Options:
    
    ┌──────────────────┐       ┌──────────────────┐
    │  Use GPT-3.5     │       │  Generate 6      │
    │                  │       │  categories      │
    │  Save ~$7/month  │       │  Save ~50%       │
    └──────────────────┘       └──────────────────┘
    
    ┌──────────────────┐       ┌──────────────────┐
    │  Weekly instead  │       │  Selective       │
    │  of daily        │       │  high-priority   │
    │  Save ~75%       │       │  only            │
    └──────────────────┘       └──────────────────┘
```

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Where2Go                            │
│                    (Next.js on Vercel)                      │
└─────────────────────────────────────────────────────────────┘
        │                                    ▲
        │ Webhook Trigger                   │ API Call
        │ (12× daily at 6 AM)               │ (12× daily)
        ▼                                    │
┌─────────────────────────────────────────────────────────────┐
│                         Make.com                            │
│                  (Webhook Orchestration)                    │
└─────────────────────────────────────────────────────────────┘
        │                                    ▲
        │ AI Request                        │ AI Response
        │ (12× daily)                       │ (12× daily)
        ▼                                    │
┌─────────────────────────────────────────────────────────────┐
│                   OpenAI / Anthropic                        │
│                    (AI Content Generation)                  │
└─────────────────────────────────────────────────────────────┘

        ┌───────────────────────────────────┐
        │        Supabase PostgreSQL        │
        │                                   │
        │  Table: blog_articles             │
        │  - Stores drafts                  │
        │  - Stores published articles      │
        │  - Tracks metadata                │
        └───────────────────────────────────┘
```

## Key Takeaways

1. **Separation of Concerns**: Cron job only triggers webhooks, Make.com handles AI and posting
2. **Asynchronous Processing**: Each category is processed independently
3. **Error Resilience**: Failures in one category don't affect others
4. **Cost Efficiency**: 100ms delays prevent rate limiting, structured payload minimizes processing
5. **Maintainability**: Clear separation makes debugging and modification easier
6. **Scalability**: Easy to add more cities or categories by modifying cron job
7. **Monitoring**: Multiple points for tracking success/failure at each stage
