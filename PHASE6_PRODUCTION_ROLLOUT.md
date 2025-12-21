# Phase 6: Production Rollout Guide

**Status:** Ready for Execution (after Phase 5)  
**Duration:** 1 hour  
**Prerequisites:** Phase 5 successful, stakeholder approval

---

## 📋 Overview

This phase deploys the SEO routes to production and submits the sitemap to search engines for indexing.

## ✅ Pre-Deployment Checklist

- [ ] Phase 5 staging deployment successful
- [ ] All staging tests passed
- [ ] Stakeholder approval obtained
- [ ] Backup/rollback plan ready
- [ ] Production deployment window scheduled
- [ ] Team notified of deployment

## 🚀 Production Deployment Steps

### Step 1: Final Pre-Flight Checks

```bash
# Verify you're on main branch with latest changes
git checkout main
git pull origin main

# Verify commit history
git log --oneline | head -10
# Should show Phase 4 commit at top

# Verify routes exist locally
find app -path "*/wien/*" -o -path "*/ibiza/*" | grep "page.tsx" | wc -l
# Should output: 102

# Run final build locally
npm run build
# Should complete successfully
```

### Step 2: Create Production Deployment Tag

```bash
# Tag for production deployment
git tag v1.0.0-seo-routes-$(date +%Y%m%d)
git push origin --tags

# Document the tag
echo "Production deployment tag: v1.0.0-seo-routes-$(date +%Y%m%d)" >> DEPLOYMENT_LOG.md
```

### Step 3: Deploy to Production

**Option A: Vercel Production**
```bash
# Deploy to production
vercel deploy --prod

# Wait for deployment to complete
# Note the production URL: https://www.where2go.at

# Verify deployment status
vercel ls
```

**Option B: GitHub Actions/CI-CD**
```bash
# Create production release
gh release create v1.0.0-seo-routes \
  --title "SEO Routes Production Release" \
  --notes "Deployment of 102 SEO-optimized routes for Wien and Ibiza"

# CI/CD pipeline will auto-deploy to production
# Monitor: https://github.com/alexandercfriedrich/where2go-clean/actions
```

**Option C: Manual Server Deployment**
```bash
# SSH to production server
ssh user@production-server

# Navigate to app directory
cd /var/www/where2go

# Create backup of current version
cp -r . ../where2go-backup-$(date +%Y%m%d-%H%M)

# Pull latest changes
git fetch origin
git checkout main
git pull origin main

# Install dependencies
npm ci --production

# Build application
npm run build

# Run production build test
npm run start &
sleep 5
curl -I http://localhost:3000 | grep "200"
kill %1

# Restart application with PM2
pm2 restart where2go

# Verify application is running
pm2 status
pm2 logs where2go --lines 50
```

### Step 4: Production Smoke Tests

**IMPORTANT:** Test immediately after deployment!

```bash
PROD_URL="https://www.where2go.at"

echo "🧪 Testing production routes..."

# Test 10 critical routes
routes=(
  "/wien"
  "/wien/heute"
  "/wien/morgen"
  "/wien/wochenende"
  "/wien/clubs-nachtleben"
  "/wien/clubs-nachtleben/heute"
  "/wien/live-konzerte"
  "/ibiza"
  "/ibiza/live-konzerte"
  "/ibiza/live-konzerte/morgen"
)

for route in "${routes[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" $PROD_URL$route)
  if [ $status -eq 200 ] || [ $status -eq 301 ]; then
    echo "✅ $route - Status: $status"
  else
    echo "❌ $route - Status: $status - FAILED!"
    exit 1
  fi
done

echo "✅ All critical routes accessible"
```

### Step 5: Verify Production Metadata

```bash
echo "🔍 Verifying production metadata..."

# Test category route title
title=$(curl -s $PROD_URL/wien/clubs-nachtleben | grep -o '<title>[^<]*</title>')
echo "Title: $title"
# Expected: <title>Clubs & Nachtleben in Wien | Where2Go</title>

# Test category+date route title
title=$(curl -s $PROD_URL/wien/clubs-nachtleben/heute | grep -o '<title>[^<]*</title>')
echo "Title: $title"
# Expected: <title>Clubs & Nachtleben in Wien heute | Where2Go</title>

# Test canonical URL
canonical=$(curl -s $PROD_URL/wien/clubs-nachtleben | grep -o '<link rel="canonical" href="[^"]*"')
echo "Canonical: $canonical"
# Expected: href="https://www.where2go.at/wien/clubs-nachtleben"

echo "✅ Metadata verified"
```

### Step 6: Verify Production Sitemap

```bash
echo "🗺️  Verifying production sitemap..."

# Check sitemap accessibility
curl -I $PROD_URL/sitemap.xml | grep "200"

# Download sitemap
curl -s $PROD_URL/sitemap.xml > /tmp/prod-sitemap.xml

# Count URLs
url_count=$(grep -c "<url>" /tmp/prod-sitemap.xml)
echo "Sitemap contains: $url_count URLs"
# Expected: ~110

# Verify key routes are present
grep -q "wien/clubs-nachtleben</loc>" /tmp/prod-sitemap.xml && echo "✅ Category route in sitemap"
grep -q "wien/clubs-nachtleben/heute</loc>" /tmp/prod-sitemap.xml && echo "✅ Category+date route in sitemap"
grep -q "wien/heute</loc>" /tmp/prod-sitemap.xml && echo "✅ Date route in sitemap"

echo "✅ Sitemap verified"
```

### Step 7: Submit Sitemap to Search Engines

**Google Search Console:**
```bash
# Option 1: Web Interface
# 1. Go to: https://search.google.com/search-console
# 2. Select property: www.where2go.at
# 3. Go to: Sitemaps (left sidebar)
# 4. Enter sitemap URL: https://www.where2go.at/sitemap.xml
# 5. Click "Submit"
# 6. Verify status: "Success"

# Option 2: API (if credentials available)
curl -X POST \
  "https://www.google.com/ping?sitemap=https://www.where2go.at/sitemap.xml"

echo "✅ Sitemap submitted to Google"
```

**Bing Webmaster Tools:**
```bash
# Option 1: Web Interface
# 1. Go to: https://www.bing.com/webmasters
# 2. Select site: www.where2go.at
# 3. Go to: Sitemaps
# 4. Enter sitemap URL: https://www.where2go.at/sitemap.xml
# 5. Click "Submit"

# Option 2: API (if credentials available)
curl "https://www.bing.com/ping?sitemap=https://www.where2go.at/sitemap.xml"

echo "✅ Sitemap submitted to Bing"
```

**Document Submissions:**
```bash
cat >> DEPLOYMENT_LOG.md <<EOF

## Sitemap Submissions

**Date:** $(date +%Y-%m-%d)

- Google Search Console: Submitted
- Bing Webmaster Tools: Submitted
- Sitemap URL: https://www.where2go.at/sitemap.xml
- Total URLs: $url_count

EOF
```

### Step 8: Monitor Application Health

```bash
echo "📊 Monitoring application health..."

# Check server response times
for i in {1..5}; do
  time curl -s -o /dev/null $PROD_URL/wien
  sleep 2
done

# Check for errors in logs (if access available)
# PM2 logs
pm2 logs where2go --lines 100 --nostream | grep -i error

# Or server logs
tail -n 100 /var/log/nginx/error.log | grep -i error
tail -n 100 /var/log/where2go/app.log | grep -i error

echo "✅ Health check complete"
```

### Step 9: Test in Browser

**Manual Browser Testing:**

Open production URL and verify:

- [ ] Homepage (https://www.where2go.at) loads correctly
- [ ] Wien page (/wien) displays events properly
- [ ] Date filter route (/wien/heute) works and shows filtered events
- [ ] Category route (/wien/clubs-nachtleben) works and shows category filter
- [ ] Category+date route (/wien/clubs-nachtleben/heute) shows both filters
- [ ] Dynamic H1 title shows proper German grammar
- [ ] Category selection works in UI
- [ ] Date filter works in UI
- [ ] Navigation between routes works smoothly
- [ ] No JavaScript errors in browser console (F12)
- [ ] Mobile responsive design works correctly
- [ ] Dark mode toggle works

**SEO Tools Testing:**

Test with these tools:

1. **Google Rich Results Test**
   - URL: https://search.google.com/test/rich-results
   - Test: https://www.where2go.at/wien/clubs-nachtleben
   - Verify: Schema.org markup is detected

2. **Google PageSpeed Insights**
   - URL: https://pagespeed.web.dev/
   - Test several routes
   - Target: Score > 80

3. **Lighthouse (Chrome DevTools)**
   - Open: Chrome DevTools > Lighthouse tab
   - Run audit on key routes
   - Check: SEO score, Performance, Accessibility

## ✅ Success Criteria

**All must be GREEN:**

- [ ] All 10 critical routes return 200 status code
- [ ] Metadata (titles, descriptions) are correct and unique
- [ ] Canonical URLs point to correct production URLs
- [ ] Sitemap contains ~110 URLs
- [ ] Sitemap submitted to Google and Bing successfully
- [ ] No 500 errors in server logs
- [ ] No JavaScript errors in browser console
- [ ] Page load times < 3 seconds
- [ ] Schema.org markup validates in Rich Results Test
- [ ] Application health metrics are normal
- [ ] No increase in error rates
- [ ] All manual browser tests pass

## 🚨 Emergency Rollback

If critical issues are detected after production deployment:

**Immediate Rollback (< 5 minutes):**

```bash
# Option 1: Vercel - Rollback to previous deployment
vercel rollback

# Option 2: Server - Switch to backup
ssh user@production-server
cd /var/www
mv where2go where2go-failed
mv where2go-backup-[timestamp] where2go
cd where2go
pm2 restart where2go

# Option 3: GitHub - Revert commits
git revert HEAD
git push origin main
# Trigger CI/CD to redeploy

# Verify rollback
curl -I https://www.where2go.at | grep "200"
```

**Post-Rollback Actions:**

1. Document the issue in DEPLOYMENT_LOG.md
2. Notify team via Slack/Email
3. Investigate root cause
4. Create hotfix branch if needed
5. Test fix in staging
6. Schedule new production deployment

## 📊 Post-Deployment Monitoring (First 24 Hours)

**Hour 1:** Monitor closely
```bash
# Check error rates every 5 minutes
watch -n 300 'curl -s https://www.where2go.at/api/health | jq'

# Monitor logs
pm2 logs where2go --lines 50
```

**Hours 2-4:** Check key metrics
- Server response times
- Error rates
- User traffic patterns
- Search console errors

**Hours 4-24:** Monitor periodically
- Check every 2-4 hours
- Review analytics
- Monitor user feedback

## 📈 Expected Results (Week 1)

**Google Search Console:**
- New URLs discovered: 102
- URLs indexed: 0-20 (week 1)
- Crawl requests: Increased by 50-100%

**Google Analytics:**
- Organic traffic: Baseline (no change yet)
- Direct traffic: Slight increase
- Page views: Slight increase

**Server Metrics:**
- Response time: No degradation
- Error rate: No increase
- CPU/Memory: Within normal range

## 📝 Deployment Documentation

After successful deployment, document:

```markdown
## Production Deployment - SEO Routes

**Date:** [Date]
**Time:** [Time] UTC
**Version:** v1.0.0-seo-routes
**Deployed By:** [Name]
**Deployment Method:** [Vercel/Manual/CI-CD]

### Changes Deployed:
- 102 SEO-optimized routes (51 Wien, 51 Ibiza)
- Category and date filter routes
- Schema.org structured data
- Optimized sitemap

### Deployment Duration:
- Preparation: [minutes]
- Deployment: [minutes]
- Testing: [minutes]
- Total: [minutes]

### Test Results:
- Smoke tests: ✅ PASS
- Metadata verification: ✅ PASS
- Sitemap verification: ✅ PASS
- Browser tests: ✅ PASS

### Sitemap Submissions:
- Google Search Console: ✅ Submitted
- Bing Webmaster Tools: ✅ Submitted

### Issues Encountered:
- [None / List issues]

### Rollback Plan:
- [Rollback procedure if needed]

### Next Steps:
- Monitor for 24 hours
- Begin Phase 7: Post-Launch Monitoring
```

## 🔜 Next Steps

After successful production deployment:

1. Begin Phase 7: Post-Launch Monitoring
2. Set up monitoring alerts
3. Schedule daily health checks for first week
4. Plan 4-week SEO impact review
5. Document lessons learned

---

**Phase 6 Status:** Ready for execution after Phase 5  
**Estimated Time:** 1 hour  
**Risk Level:** Medium (production deployment, but can rollback)  
**Rollback Time:** < 5 minutes
