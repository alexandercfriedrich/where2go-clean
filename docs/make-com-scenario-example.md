# Make.com Scenario Example for Blog Article Generation

This document provides a step-by-step guide to create a Make.com scenario that receives webhook triggers from the Where2Go cron job and generates blog articles using AI.

## Overview

The workflow consists of:
1. **Webhook Trigger** - Receives city and category from Vercel cron
2. **OpenAI/Claude Module** - Generates article content
3. **HTTP Request** - Posts article back to Where2Go API
4. **Error Handler** - Logs failures

## Prerequisites

- Make.com account (Free or paid tier)
- OpenAI API key or Anthropic API key
- Where2Go API credentials (`INTERNAL_API_SECRET`)
- Basic understanding of Make.com scenarios

## Step-by-Step Setup

### Step 1: Create New Scenario

1. Log into [Make.com](https://www.make.com)
2. Click **"Create a new scenario"**
3. Name it: "Where2Go Blog Article Generator"

### Step 2: Add Webhook Trigger

1. Click the **+** button to add a module
2. Search for **"Webhooks"** and select it
3. Choose **"Custom webhook"**
4. Click **"Add"** to create a new webhook
5. Give it a name: "Blog Article Trigger"
6. Click **"Save"**
7. **Copy the webhook URL** (format: `https://hook.eu1.make.com/xxxxx`)
8. Keep this URL - you'll need it for the `MAKE_COM_WEBHOOK_URL` environment variable

### Step 3: Test Webhook Structure

Before building the rest of the scenario, test the webhook:

```bash
# Test webhook with sample data
curl -X POST https://hook.eu1.make.com/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -d '{
    "city": "wien",
    "category": "Live-Konzerte",
    "timestamp": "2024-12-10T06:00:00.000Z",
    "source": "vercel-cron"
  }'
```

1. Send the test request
2. In Make.com, click **"Determine data structure"**
3. Make.com will capture the test data
4. Verify you see: `city`, `category`, `timestamp`, `source`

### Step 4: Add OpenAI Module (Option A)

If using OpenAI (GPT-4, GPT-3.5):

1. Add a new module after the webhook
2. Search for **"OpenAI"**
3. Choose **"Create a Chat Completion"**
4. Create connection with your OpenAI API key
5. Configure settings:
   - **Model**: `gpt-4` or `gpt-3.5-turbo` (cheaper)
   - **Messages**: Add a **System** message and a **User** message

**System Message:**
```
You are an expert content writer for a Vienna events website. Create engaging, SEO-optimized blog articles in German about local events and activities.
```

**User Message:**
```
Schreibe einen informativen und ansprechenden Blog-Artikel über {{1.category}} Events in {{1.city}}.

Anforderungen:
1. Titel: Erstelle einen ansprechenden Titel (max 70 Zeichen)
2. Inhalt: 
   - Mindestens 500 Wörter
   - Verwende HTML-Formatierung (<p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>)
   - Inkludiere aktuelle und kommende Events
   - Lokale Tipps und Empfehlungen
   - Call-to-Action am Ende
3. Meta-Description: Kurze Zusammenfassung (max 155 Zeichen)
4. SEO-Keywords: 5-8 relevante Keywords (komma-getrennt)

Format deine Antwort als JSON:
{
  "title": "Artikel-Titel",
  "content": "<p>HTML-formatierter Inhalt...</p>",
  "meta_description": "Kurze Beschreibung",
  "seo_keywords": "keyword1, keyword2, keyword3"
}
```

### Step 4: Add Claude Module (Option B - Alternative)

If using Anthropic Claude:

1. Add a new module after the webhook
2. Search for **"HTTP"** → **"Make a request"**
3. Configure settings:
   - **URL**: `https://api.anthropic.com/v1/messages`
   - **Method**: `POST`
   - **Headers**:
     - `x-api-key`: Your Anthropic API key
     - `anthropic-version`: `2023-06-01`
     - `content-type`: `application/json`
   - **Body Type**: `Raw`
   - **Content Type**: `JSON (application/json)`

**Request Body:**
```json
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 4000,
  "messages": [
    {
      "role": "user",
      "content": "Schreibe einen informativen und ansprechenden Blog-Artikel über {{1.category}} Events in {{1.city}}.\n\nAnforderungen:\n1. Titel: Erstelle einen ansprechenden Titel (max 70 Zeichen)\n2. Inhalt: \n   - Mindestens 500 Wörter\n   - Verwende HTML-Formatierung (<p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>)\n   - Inkludiere aktuelle und kommende Events\n   - Lokale Tipps und Empfehlungen\n   - Call-to-Action am Ende\n3. Meta-Description: Kurze Zusammenfassung (max 155 Zeichen)\n4. SEO-Keywords: 5-8 relevante Keywords (komma-getrennt)\n\nFormat deine Antwort als JSON:\n{\n  \"title\": \"Artikel-Titel\",\n  \"content\": \"<p>HTML-formatierter Inhalt...</p>\",\n  \"meta_description\": \"Kurze Beschreibung\",\n  \"seo_keywords\": \"keyword1, keyword2, keyword3\"\n}"
    }
  ]
}
```

### Step 5: Parse AI Response

Add a **"JSON" → "Parse JSON"** module:

1. Add after OpenAI/Claude module
2. **JSON string**: 
   - For OpenAI: `{{2.choices[].message.content}}`
   - For Claude: `{{2.content[].text}}`

This will extract the structured fields from the AI response.

### Step 6: Post Article to Where2Go API

Add **"HTTP" → "Make a request"** module:

**Configuration:**
- **URL**: `https://your-domain.vercel.app/api/admin/blog-articles`
  - For testing: `http://localhost:3000/api/admin/blog-articles`
  - For production: Use your actual domain
- **Method**: `POST`
- **Headers**:
  - `X-API-Secret`: `{{your INTERNAL_API_SECRET}}`
  - `Content-Type`: `application/json`
- **Body Type**: `Raw`
- **Content Type**: `JSON (application/json)`

**Request Body:**
```json
{
  "city": "{{1.city}}",
  "category": "{{1.category}}",
  "title": "{{3.title}}",
  "content": "{{3.content}}",
  "meta_description": "{{3.meta_description}}",
  "seo_keywords": "{{3.seo_keywords}}"
}
```

> **Note**: Module numbers (1, 2, 3) may vary. Use the actual module numbers from your scenario.

### Step 7: Add Error Handler

1. Right-click the **HTTP Request** module
2. Choose **"Add error handler"**
3. Add **"Break"** directive
4. Configure:
   - **Continue execution**: `No`
   - **Log message**: `Failed to create article for {{1.category}}: {{4.statusCode}} - {{4.data.error}}`

### Step 8: Add Success Logger (Optional)

Add a **"Tools" → "Set variable"** module:

- **Variable name**: `success_log`
- **Variable value**: `Successfully created article: {{1.city}} - {{1.category}} - {{3.title}}`

## Testing the Complete Scenario

### Manual Test

1. In Make.com, click **"Run once"**
2. Send test webhook:

```bash
curl -X POST https://hook.eu1.make.com/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -d '{
    "city": "wien",
    "category": "Live-Konzerte",
    "timestamp": "2024-12-10T06:00:00.000Z",
    "source": "manual-test"
  }'
```

3. Watch the scenario execute in Make.com
4. Check each module's output
5. Verify article created in Where2Go admin panel

### Production Test

1. Set `MAKE_COM_WEBHOOK_URL` environment variable in Vercel
2. Manually trigger cron job:

```bash
# From your local machine
./scripts/test-blog-cron.sh https://your-domain.vercel.app
```

3. Monitor Make.com execution history
4. Verify articles in admin panel

## Activation

1. In Make.com scenario, toggle **"Scheduling"** to **ON**
2. The scenario will now run automatically when triggered by the cron job
3. Monitor the first few days to ensure everything works

## Scenario Settings

### Recommended Settings

- **Scheduling**: ON
- **Max number of cycles**: 1 (each webhook trigger is one execution)
- **Sequential processing**: ON (process one webhook at a time)
- **Data retention**: 30 days
- **Incomplete executions**: Save for 24 hours

### Error Notifications

Set up email notifications:
1. Scenario settings → **Notifications**
2. Enable **"Error notifications"**
3. Add your email address
4. You'll be notified if article generation fails

## Cost Estimation

### Make.com Operations

Each execution uses approximately:
- 1 operation: Webhook trigger
- 1 operation: OpenAI/Claude API call
- 1 operation: JSON parse
- 1 operation: HTTP request to Where2Go
- **Total**: ~4 operations per article

**Daily cost with 12 categories:**
- 12 articles × 4 operations = 48 operations/day
- Free tier: 1,000 operations/month = ~33 operations/day
- **Free tier is NOT sufficient**
- **Core Plan** ($9/month): 10,000 operations = sufficient

### AI API Costs

**OpenAI (GPT-4):**
- Input: ~500 tokens × $0.03/1K = $0.015
- Output: ~1500 tokens × $0.06/1K = $0.09
- **Per article**: ~$0.105
- **Daily (12 articles)**: $1.26
- **Monthly**: ~$37.80

**OpenAI (GPT-3.5-turbo):**
- Input: ~500 tokens × $0.001/1K = $0.0005
- Output: ~1500 tokens × $0.002/1K = $0.003
- **Per article**: ~$0.0035
- **Daily (12 articles)**: $0.042
- **Monthly**: ~$1.26

**Claude 3.5 Sonnet (Recommended):**
- Input: ~500 tokens × $0.003/1K = $0.0015
- Output: ~1500 tokens × $0.015/1K = $0.0225
- **Per article**: ~$0.024
- **Daily (12 articles)**: $0.288
- **Monthly**: ~$8.64

### Total Monthly Cost

- Make.com Core Plan: $9.00
- Claude 3.5 Sonnet API: $8.64
- **Total**: ~$17.64/month

**Cost Optimization:**
- Use GPT-3.5-turbo instead of GPT-4: Save ~$36/month
- Generate only high-priority categories: Reduce by 50-75%
- Weekly instead of daily: Save ~75%

## Advanced Configuration

### Selective Category Generation

Modify the scenario to only generate for specific categories:

1. Add **"Router"** module after webhook
2. Add filters for priority categories:
   - Route 1: `{{1.category}}` = "Live-Konzerte"
   - Route 2: `{{1.category}}` = "Clubs & Nachtleben"
   - Route 3: `{{1.category}}` = "Theater & Comedy"
   - Fallback: Break (skip article generation)

### Multi-Language Support

To generate articles in multiple languages:

1. Duplicate the OpenAI/Claude module
2. Modify prompt to specify language
3. Add router based on city:
   - Wien/Linz → German
   - Berlin → German or English
   - Ibiza → Spanish or English

### Featured Image Integration

Add **"HTTP" → "Make a request"** to Unsplash API:

1. Before Where2Go API call
2. Search for relevant image based on category
3. Include `featured_image` URL in blog article POST

## Troubleshooting

### Webhook not receiving data

**Check:**
- Webhook URL is correct in `MAKE_COM_WEBHOOK_URL`
- Vercel cron job is running (check logs)
- Make.com scenario is active

**Solution:**
```bash
# Test webhook directly
curl -X POST https://hook.eu1.make.com/YOUR_ID \
  -H "Content-Type: application/json" \
  -d '{"city":"wien","category":"Live-Konzerte","timestamp":"2024-12-10T06:00:00Z","source":"test"}'
```

### AI response not in correct format

**Check:**
- Prompt clearly specifies JSON format
- JSON parse module is configured correctly
- Review AI module output in execution history

**Solution:**
- Add more examples to the prompt
- Use a stronger model (GPT-4 instead of GPT-3.5)
- Add explicit JSON schema validation

### Article not created in Where2Go

**Check:**
- `INTERNAL_API_SECRET` is correct
- Where2Go API endpoint is reachable
- Request body matches API requirements
- City and category are valid

**Solution:**
```bash
# Test API directly
curl -X POST https://your-domain.com/api/admin/blog-articles \
  -H "X-API-Secret: your_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "wien",
    "category": "Live-Konzerte",
    "title": "Test",
    "content": "<p>Test</p>",
    "meta_description": "Test description"
  }'
```

### Rate limiting or quota errors

**Problem**: Too many AI API calls

**Solutions:**
1. Add **"Sleep"** module between calls (500ms delay)
2. Reduce number of categories generated daily
3. Upgrade AI API plan
4. Use cheaper model for drafts

## Monitoring & Maintenance

### Daily Checks

- Review Make.com execution history
- Check Where2Go admin panel for new drafts
- Monitor AI API usage
- Review error notifications

### Weekly Tasks

- Publish reviewed draft articles
- Analyze article quality
- Adjust prompts if needed
- Check costs vs budget

### Monthly Tasks

- Review Make.com operations usage
- Review AI API costs
- Optimize prompts for better quality
- Update category priorities

## Support Resources

- [Make.com Documentation](https://www.make.com/en/help)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Where2Go Blog Articles API](../BLOG_ARTICLES_IMPLEMENTATION.md)

## Conclusion

This Make.com scenario automates blog article generation, saving hours of manual content creation while maintaining quality through AI. The setup takes about 30-60 minutes initially but runs automatically thereafter.

For questions or issues, refer to:
- [Blog Article Automation Guide](../BLOG_ARTICLE_AUTOMATION.md)
- [Blog Articles Quickstart](../BLOG_ARTICLES_QUICKSTART.md)
