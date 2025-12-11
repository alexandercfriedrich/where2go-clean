# Blog Article Automation - Quick Reference Card

## ⚡ Quick Setup (5 Minutes)

### 1. Environment Variables (Vercel Dashboard)

```env
MAKE_COM_WEBHOOK_URL=https://hook.eu1.make.com/xxxxx
CRON_SECRET=auto_generated_by_vercel
INTERNAL_API_SECRET=your_secret_min_32_chars
```

### 2. Make.com Scenario

**Modules (in order):**
1. Webhooks → Custom webhook
2. OpenAI → Create completion OR HTTP → Anthropic API
3. JSON → Parse JSON
4. HTTP → POST to `/api/admin/blog-articles`

**Headers for Step 4:**
- `X-API-Secret`: Your `INTERNAL_API_SECRET`
- `Content-Type`: `application/json`

### 3. Deploy & Verify

```bash
# Check Vercel Dashboard → Cron Jobs
# Should see: /api/cron/generate-blog-articles

# Test locally
./scripts/test-blog-cron.sh
```

---

## 📋 Daily Execution Flow

```
6:15 AM UTC
    ↓
Vercel Cron
    ↓
/api/cron/generate-blog-articles
    ↓
12 × Webhooks to Make.com
    ↓
AI generates article (per category)
    ↓
POST to /api/admin/blog-articles
    ↓
Articles saved as drafts
    ↓
Admin reviews & publishes
```

---

## 🔧 Quick Commands

### Test Cron Job Locally
```bash
curl -X GET http://localhost:3000/api/cron/generate-blog-articles \
  -H "Authorization: Bearer $CRON_SECRET"
```

### Test Make.com Webhook
```bash
curl -X POST https://hook.eu1.make.com/xxxxx \
  -H "Content-Type: application/json" \
  -d '{"city":"wien","category":"Live-Konzerte","timestamp":"2024-12-10T06:00:00Z","source":"test"}'
```

### Test Blog Article API
```bash
curl -X POST https://your-domain.com/api/admin/blog-articles \
  -H "X-API-Secret: $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "wien",
    "category": "Live-Konzerte",
    "title": "Test Article",
    "content": "<p>Test content</p>",
    "meta_description": "Test description"
  }'
```

---

## 📊 12 Vienna Categories (Daily)

1. Clubs & Nachtleben
2. Live-Konzerte
3. Klassik & Oper
4. Theater & Comedy
5. Museen & Ausstellungen
6. Film & Kino
7. Open Air & Festivals
8. Kulinarik & Märkte
9. Sport & Fitness
10. Bildung & Workshops
11. Familie & Kinder
12. LGBTQ+

---

## 💰 Monthly Costs (Estimated)

| Service | Cost |
|---------|------|
| Make.com Core Plan | $9.00 |
| Claude 3.5 Sonnet API | $8.64 |
| **Total** | **$17.64** |

**Cost Optimization:**
- Use GPT-3.5-turbo: ~$10/month total
- Generate 6 categories: Cut costs in half
- Weekly schedule: Save 75%

---

## 🚨 Troubleshooting

| Issue | Quick Fix |
|-------|-----------|
| Cron not running | Check Vercel Dashboard → Cron Jobs |
| Webhook not working | Test with curl, check Make.com history |
| Articles not created | Verify `INTERNAL_API_SECRET`, check API response |
| Wrong format | Review AI prompt, use JSON parse module |

---

## 📍 Key URLs

| Resource | URL |
|----------|-----|
| Admin Panel | `/admin/blog-articles` |
| API Endpoint | `/api/admin/blog-articles` |
| Cron Endpoint | `/api/cron/generate-blog-articles` |
| Make.com Dashboard | https://www.make.com/en/scenarios |
| Vercel Cron Jobs | https://vercel.com/{project}/settings/cron-jobs |

---

## 📚 Documentation

- [Full Automation Guide](../BLOG_ARTICLE_AUTOMATION.md)
- [Make.com Scenario Example](./make-com-scenario-example.md)
- [Blog Articles API](../BLOG_ARTICLES_IMPLEMENTATION.md)
- [Quickstart Guide](../BLOG_ARTICLES_QUICKSTART.md)

---

## ✅ Deployment Checklist

- [ ] Set `MAKE_COM_WEBHOOK_URL` in Vercel
- [ ] Set `INTERNAL_API_SECRET` in Vercel
- [ ] Create Make.com scenario with 4 modules
- [ ] Test webhook manually
- [ ] Activate Make.com scenario
- [ ] Deploy to Vercel
- [ ] Verify cron job in Vercel Dashboard
- [ ] Wait for next 6 AM run or trigger manually
- [ ] Check admin panel for draft articles
- [ ] Review & publish first batch

---

## 🎯 Success Criteria

✓ Cron job runs daily at 6:15 AM UTC
✓ 12 webhooks triggered to Make.com
✓ 12 draft articles created in admin panel
✓ No errors in Vercel logs
✓ No errors in Make.com execution history
✓ Articles are high quality and relevant
✓ Costs stay within budget

---

## 🆘 Need Help?

1. Check [Troubleshooting](../BLOG_ARTICLE_AUTOMATION.md#troubleshooting)
2. Review Vercel logs: `vercel logs --follow`
3. Check Make.com execution history
4. Test each component individually
5. Verify all environment variables are set

---

**Last Updated**: December 2024
**Version**: 1.0
