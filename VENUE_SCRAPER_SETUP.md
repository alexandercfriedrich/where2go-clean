# Venue Scraper GitHub Actions Setup Guide

## Overview
The venue scraper button in the Admin UI now triggers a GitHub Actions workflow instead of trying to run Python locally. This solves the Python availability issue in Vercel's serverless environment.

## How It Works

1. **User Action**: Admin clicks "🎯 Venue Scraper" button
2. **API Call**: POST request to `/api/admin/venue-scrapers`
3. **GitHub Trigger**: API calls GitHub's repository_dispatch API
4. **Workflow Execution**: GitHub Actions runs the Python scrapers
5. **Data Storage**: Scraped events are stored in Supabase
6. **Monitoring**: User can view progress via the workflow URL

## Setup Instructions

### 1. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set a note: "Where2Go Venue Scrapers"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)

### 2. Add Environment Variables to Vercel

Add these environment variables in your Vercel project settings:

#### Required for API Endpoint:
```bash
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_REPOSITORY=alexandercfriedrich/where2go-clean  # Optional, defaults to this
```

#### Required for GitHub Actions (as Repository Secrets):

Go to GitHub Repository → Settings → Secrets and variables → Actions → New repository secret:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

These are likely already set if you have working cron jobs.

### 3. Test the Setup

#### Option A: Test via Admin UI
1. Navigate to `/admin` in your browser
2. Click the "🎯 Venue Scraper" button
3. Confirm the dialog
4. You should see: "✅ GitHub Actions workflow triggered successfully"
5. Click the "View workflow →" link to see the execution

#### Option B: Test via GitHub UI
1. Go to GitHub → Actions tab
2. Click "Venue Scrapers" workflow
3. Click "Run workflow" button
4. Optionally specify venues or enable dry-run
5. Click "Run workflow"

## Workflow Features

### Manual Triggers
- **From Admin UI**: Click the button
- **From GitHub UI**: Actions → Venue Scrapers → Run workflow
- **Via API**: POST to `/api/admin/venue-scrapers`

### Parameters
- `venues` (optional): Comma-separated list of venue keys (e.g., "grelle-forelle,flex")
- `dry_run` (optional): Boolean - if true, doesn't write to database

### Scheduled Execution (Optional)
Uncomment these lines in `.github/workflows/venue-scrapers.yml`:
```yaml
schedule:
  - cron: '0 3 * * *'  # Runs daily at 3 AM UTC
```

## Available Venues

All 25 Vienna venues are supported:
- grelle-forelle, flex, pratersauna, b72, das-werk, u4, volksgarten
- babenberger-passage, cabaret-fledermaus, camera-club, celeste, chelsea
- club-u, donau, flucc, o-der-klub, ponyhof, prater-dome
- praterstrasse, sass-music-club, tanzcafe-jenseits, the-loft
- vieipee, why-not, rhiz

## Monitoring & Logs

### View Workflow Execution
1. Click the workflow URL in the success message, OR
2. Go to GitHub → Actions → Venue Scrapers
3. Click on a specific workflow run
4. View the "run-scrapers" job logs

### Check Results
- The workflow displays a summary at the end
- Check the "Run venue scrapers" step for detailed output
- Events are stored in your Supabase database

## Troubleshooting

### "Failed to trigger venue scrapers"
**Cause**: Missing or invalid GITHUB_TOKEN
**Solution**: Verify the token is set in Vercel and has correct permissions

### "Workflow not appearing in Actions"
**Cause**: Workflow file not in main/master branch
**Solution**: Merge this PR to get the workflow file in the repository

### "Workflow fails immediately"
**Cause**: Missing Supabase secrets in GitHub
**Solution**: Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to repository secrets

### "Python dependencies not found"
**Cause**: Missing requirements.txt in website-scrapers/
**Solution**: Workflow falls back to common dependencies (requests, beautifulsoup4, lxml, python-dateutil)

## API Endpoint Documentation

### POST /api/admin/venue-scrapers

**Query Parameters:**
- `venues` (optional): Comma-separated venue keys
- `dryRun` (optional): Boolean for dry-run mode

**Response:**
```json
{
  "success": true,
  "triggered": true,
  "message": "GitHub Actions workflow triggered successfully",
  "venues": ["all"],
  "dryRun": false,
  "workflowUrl": "https://github.com/owner/repo/actions/workflows/venue-scrapers.yml",
  "note": "Scraper is running in GitHub Actions..."
}
```

**Authentication:**
- Basic Auth (ADMIN_USER/ADMIN_PASS) - via middleware
- Optional Bearer token (ADMIN_WARMUP_SECRET)

## Comparison with Wien.info Endpoints

| Feature | Wien.info Endpoints | Venue Scrapers |
|---------|-------------------|----------------|
| **Language** | TypeScript | Python |
| **Execution** | Vercel serverless | GitHub Actions |
| **Data Source** | Wien.info API | HTML scraping |
| **Duration** | 5 minutes | 30 minutes |
| **Dependencies** | Node.js only | Python + packages |
| **Trigger** | Direct execution | Workflow dispatch |

## Benefits of GitHub Actions Approach

✅ **Full Python Environment**: All Python dependencies available
✅ **Longer Execution**: 30-minute timeout vs 5 minutes
✅ **Better Logging**: Full GitHub Actions logs and history
✅ **Scalability**: Can run multiple scrapers in parallel
✅ **Reliability**: Isolated environment per execution
✅ **Visibility**: GitHub UI for monitoring and history
✅ **Flexibility**: Can be scheduled, manually triggered, or API-triggered

## Next Steps

1. ✅ Set up GITHUB_TOKEN in Vercel
2. ✅ Verify Supabase secrets in GitHub
3. ✅ Test the button in Admin UI
4. 📅 (Optional) Enable scheduled execution
5. 📊 Monitor first few executions

## Support

For issues or questions:
1. Check GitHub Actions logs for workflow failures
2. Check Vercel logs for API errors
3. Verify all environment variables are set correctly
4. Ensure GitHub token has correct permissions
