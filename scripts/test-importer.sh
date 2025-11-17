#!/bin/bash
# Manual Test Script for Wien.info Importer
# 
# This script tests the importer and API endpoint manually.
# Set ADMIN_WARMUP_SECRET environment variable before running API tests.

echo "=== Wien.info Importer Manual Tests ==="
echo ""

# Test 1: Dry-run via npm script
echo "Test 1: Dry-run via npm script (5 events)"
echo "-------------------------------------------"
echo "Running: npm run import:wien:dry-run"
echo ""
npm run import:wien:dry-run
echo ""
echo "✅ Test 1 complete!"
echo ""

# Test 2: API endpoint test (if secret is set)
if [ -n "$ADMIN_WARMUP_SECRET" ]; then
  echo "Test 2: API endpoint dry-run test"
  echo "----------------------------------"
  echo "Starting dev server in background..."
  npm run dev > /dev/null 2>&1 &
  DEV_PID=$!
  
  # Wait for server to start
  echo "Waiting for server to start..."
  sleep 10
  
  echo "Testing GET endpoint (documentation)..."
  curl -s http://localhost:3000/api/admin/cache-warmup | jq '.' || echo "Server not ready yet"
  echo ""
  
  echo "Testing POST endpoint with dry-run..."
  curl -X POST -s \
    "http://localhost:3000/api/admin/cache-warmup?dryRun=true&limit=5&fromDate=2025-11-17&toDate=2025-11-18" \
    -H "Authorization: Bearer $ADMIN_WARMUP_SECRET" \
    | jq '.' || echo "Server not ready yet"
  echo ""
  
  echo "Stopping dev server..."
  kill $DEV_PID 2>/dev/null || true
  
  echo "✅ Test 2 complete!"
  echo ""
else
  echo "Test 2: SKIPPED (set ADMIN_WARMUP_SECRET to test API endpoint)"
  echo ""
fi

# Test 3: Show usage examples
echo "=== Usage Examples ==="
echo ""
echo "1. Dry-run import (no database writes):"
echo "   npm run import:wien:dry-run"
echo ""
echo "2. Full import to Supabase:"
echo "   npm run import:wien"
echo ""
echo "3. API endpoint dry-run:"
echo "   curl -X POST 'http://localhost:3000/api/admin/cache-warmup?dryRun=true' \\"
echo "     -H 'Authorization: Bearer YOUR_SECRET'"
echo ""
echo "4. API endpoint with custom parameters:"
echo "   curl -X POST 'http://localhost:3000/api/admin/cache-warmup?fromDate=2025-12-01&toDate=2025-12-31&limit=1000' \\"
echo "     -H 'Authorization: Bearer YOUR_SECRET'"
echo ""
echo "5. Run all tests:"
echo "   npm test -- app/lib/__tests__/wienInfoImporter.test.ts app/lib/__tests__/admin-cache-warmup.test.ts"
echo ""
echo "=== All Manual Tests Complete ==="
