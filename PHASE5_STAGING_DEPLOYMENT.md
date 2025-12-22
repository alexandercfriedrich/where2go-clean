# Phase 5: Staging Deployment Guide

**Status:** Ready for Execution  
**Duration:** 1 hour  
**Prerequisites:** Phase 4 complete, all builds passing

---

## 📋 Overview

This phase deploys the SEO routes to a staging environment for final testing before production rollout.

## ✅ Pre-Deployment Checklist

- [ ] Phase 4 code review fixes complete
- [ ] All 102 routes generated
- [ ] Build successful with zero errors
- [ ] Git changes committed and pushed
- [ ] Staging environment available

## 🚀 Deployment Steps

### Step 1: Prepare Staging Environment

```bash
# Ensure you're on the correct branch
git checkout main
git pull origin main

# Verify all changes are merged
git log --oneline | head -5
# Should show Phase 4 commit

# Verify routes exist
find app -path "*/wien/*" -o -path "*/ibiza/*" | grep "page.tsx" | wc -l
# Should output: 102
```

### Step 2: Build for Staging

```bash
# Clean previous builds
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies (if needed)
npm ci

# Build the application
npm run build

# Verify build success
echo $?
# Should output: 0 (success)
```

### Step 3: Deploy to Staging

**Option A: Vercel Staging**
```bash
# Deploy to staging preview
vercel deploy

# Or deploy to specific staging environment
vercel deploy --target staging

# Note the deployment URL (e.g., https://where2go-staging.vercel.app)
```

**Option B: GitHub Actions/CI-CD**
```bash
# Tag for staging deployment
git tag staging-$(date +%Y%m%d-%H%M)
git push origin --tags

# CI/CD pipeline should auto-deploy to staging
# Monitor: https://github.com/alexandercfriedrich/where2go-clean/actions
```

**Option C: Manual Server Deployment**
```bash
# SSH to staging server
ssh user@staging-server

# Navigate to app directory
cd /var/www/where2go

# Pull latest changes
git pull origin main

# Install dependencies
npm ci

# Build application
npm run build

# Restart application
pm2 restart where2go
# or
npm run start

# Verify process is running
pm2 status
# or
ps aux | grep node
```

### Step 4: Smoke Tests on Staging

Set your staging URL:
```bash
# Replace with your actual staging URL
STAGING_URL="https://where2go-staging.vercel.app"
# or
STAGING_URL="https://staging.where2go.at"
```

**Test Key Routes:**
```bash
echo "🧪 Testing staging routes..."

# Test city pages
curl -I $STAGING_URL/wien | grep "200\|301"
curl -I $STAGING_URL/ibiza | grep "200\|301"

# Test date routes
curl -I $STAGING_URL/wien/heute | grep "200\|301"
curl -I $STAGING_URL/wien/morgen | grep "200\|301"
curl -I $STAGING_URL/wien/wochenende | grep "200\|301"

# Test category routes
curl -I $STAGING_URL/wien/clubs-nachtleben | grep "200\|301"
curl -I $STAGING_URL/wien/live-konzerte | grep "200\|301"

# Test category+date routes
curl -I $STAGING_URL/wien/clubs-nachtleben/heute | grep "200\|301"
curl -I $STAGING_URL/ibiza/live-konzerte/morgen | grep "200\|301"

echo "✅ All routes accessible"
```

### Step 5: Verify Metadata

**Check Title Tags:**
```bash
echo "🔍 Verifying metadata..."

# Category route
curl -s $STAGING_URL/wien/clubs-nachtleben | grep -o '<title>[^<]*</title>'
# Expected: <title>Clubs & Nachtleben in Wien | Where2Go</title>

# Category+Date route
curl -s $STAGING_URL/wien/clubs-nachtleben/heute | grep -o '<title>[^<]*</title>'
# Expected: <title>Clubs & Nachtleben in Wien heute | Where2Go</title>

# Date route
curl -s $STAGING_URL/wien/heute | grep -o '<title>[^<]*</title>'
# Expected: <title>Events in Wien heute | Where2Go</title>

echo "✅ Metadata verified"
```

**Check Meta Descriptions:**
```bash
# Check description meta tag
curl -s $STAGING_URL/wien/clubs-nachtleben | grep -o '<meta name="description" content="[^"]*"' | head -1
# Should contain "Clubs & Nachtleben in Wien"

curl -s $STAGING_URL/wien/clubs-nachtleben/heute | grep -o '<meta name="description" content="[^"]*"' | head -1
# Should contain "Clubs & Nachtleben in Wien heute"
```

**Check Canonical URLs:**
```bash
# Check canonical link
curl -s $STAGING_URL/wien/clubs-nachtleben | grep -o '<link rel="canonical" href="[^"]*"'
# Expected: <link rel="canonical" href="https://www.where2go.at/wien/clubs-nachtleben"

# Note: Canonical should point to production, not staging
```

### Step 6: Verify Schema.org Markup

```bash
echo "🔍 Verifying Schema.org markup..."

# Check for JSON-LD script in category routes
curl -s $STAGING_URL/wien/clubs-nachtleben | grep -o '<script type="application/ld+json">' | head -1
# Should output: <script type="application/ld+json">

# Check for EventList schema
curl -s $STAGING_URL/wien/clubs-nachtleben | grep '"@type":"ItemList"'
# Should find ItemList schema

echo "✅ Schema.org markup present"
```

### Step 7: Verify Sitemap

```bash
echo "🗺️  Verifying sitemap..."

# Check sitemap is accessible
curl -I $STAGING_URL/sitemap.xml | grep "200"

# Download sitemap
curl -s $STAGING_URL/sitemap.xml > /tmp/staging-sitemap.xml

# Count URLs in sitemap
grep -c "<url>" /tmp/staging-sitemap.xml
# Expected: ~110 (2 cities + 102 routes + static pages)

# Check for key routes in sitemap
grep "wien/clubs-nachtleben" /tmp/staging-sitemap.xml
grep "wien/clubs-nachtleben/heute" /tmp/staging-sitemap.xml
grep "ibiza/live-konzerte" /tmp/staging-sitemap.xml

echo "✅ Sitemap verified"
```

### Step 8: Performance Tests

```bash
echo "⚡ Running performance tests..."

# Test page load times (using curl)
for route in "/wien" "/wien/heute" "/wien/clubs-nachtleben" "/wien/clubs-nachtleben/heute"; do
  echo "Testing: $route"
  time curl -s -o /dev/null $STAGING_URL$route
done

echo "✅ Performance tests complete"
```

### Step 9: Manual Testing Checklist

Open staging URL in browser and manually verify:

- [ ] Homepage loads correctly
- [ ] City pages (/wien, /ibiza) load and display events
- [ ] Date filter routes (/wien/heute) show correct filtered events
- [ ] Category routes (/wien/clubs-nachtleben) show category-filtered events
- [ ] Category+Date routes (/wien/clubs-nachtleben/heute) show both filters
- [ ] Dynamic H1 titles display correct German grammar
- [ ] Category selection works in UI
- [ ] Date filter selection works in UI
- [ ] Search functionality still works
- [ ] Mobile responsive design works
- [ ] Dark mode works
- [ ] No console errors in browser

## ✅ Go/No-Go Decision Criteria

**GO if ALL are true:**
- [ ] All 10 smoke test routes return 200 status
- [ ] Metadata (title, description) is correct on all tested routes
- [ ] Schema.org JSON-LD is present on category routes
- [ ] Sitemap contains ~110 URLs
- [ ] No TypeScript/JavaScript errors in browser console
- [ ] All manual tests pass
- [ ] Page load times are acceptable (<3 seconds)
- [ ] No broken links or 404 errors

**NO-GO if ANY are true:**
- [ ] Any route returns 500 error
- [ ] Metadata is missing or incorrect
- [ ] Sitemap is empty or malformed
- [ ] Critical JavaScript errors in console
- [ ] Pages fail to load or render
- [ ] Performance is significantly degraded

## 🚫 Rollback Procedure

If staging deployment fails:

```bash
# Option 1: Revert to previous deployment
vercel rollback

# Option 2: Revert git commits
git revert HEAD
git push origin main

# Option 3: Redeploy previous version
vercel deploy --prod [previous-deployment-url]

# Option 4: Manual server rollback
ssh user@staging-server
cd /var/www/where2go
git reset --hard [previous-commit-sha]
npm ci
npm run build
pm2 restart where2go
```

## 📊 Success Metrics

After successful staging deployment:

**Technical Metrics:**
- All 102 routes accessible (100% success rate)
- Average page load time: <2 seconds
- Build time: <5 minutes
- Zero TypeScript errors
- Zero runtime errors

**SEO Metrics:**
- Sitemap contains 110 URLs
- All pages have unique titles
- All pages have unique descriptions
- All category routes have Schema.org markup
- Canonical URLs point to production

## 📝 Documentation

After staging deployment, document:

1. **Staging URL:** [Insert staging URL here]
2. **Deployment Method:** [Vercel/GitHub Actions/Manual]
3. **Deployment Time:** [Date and time]
4. **Deployment Duration:** [Minutes]
5. **Test Results:** [Pass/Fail with details]
6. **Issues Found:** [List any issues]
7. **Go/No-Go Decision:** [GO or NO-GO with reasoning]

## 🔜 Next Steps

If staging deployment is successful:
- Proceed to Phase 6: Production Rollout
- Schedule production deployment
- Notify stakeholders

If staging deployment has issues:
- Document all issues
- Fix critical issues
- Redeploy to staging
- Re-run tests

---

**Phase 5 Status:** Ready for execution  
**Estimated Time:** 1 hour  
**Risk Level:** Low (staging environment, can rollback easily)
