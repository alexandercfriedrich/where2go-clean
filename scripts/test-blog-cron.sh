#!/bin/bash

# Test script for blog article generation cron job
# This script simulates a Vercel Cron trigger by calling the endpoint with proper authentication

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Blog Article Generation Cron Job${NC}"
echo "=========================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo -e "${RED}Error: .env.local file not found${NC}"
  echo "Please create a .env.local file with the required environment variables:"
  echo "  CRON_SECRET=your_test_secret"
  echo "  MAKE_COM_WEBHOOK_URL=https://your-webhook-url.make.com"
  exit 1
fi

# Load environment variables safely
set -a
source .env.local
set +a

# Check required variables
if [ -z "$CRON_SECRET" ]; then
  echo -e "${RED}Error: CRON_SECRET not set in .env.local${NC}"
  exit 1
fi

if [ -z "$MAKE_COM_WEBHOOK_URL" ]; then
  echo -e "${YELLOW}Warning: MAKE_COM_WEBHOOK_URL not set${NC}"
  echo "The cron job will run but will return an error about missing webhook URL"
  echo ""
fi

# Check if server is running
SERVER_URL="${1:-http://localhost:3000}"
echo "Testing server at: $SERVER_URL"
echo ""

# Make the request
echo "Triggering cron job..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$SERVER_URL/api/cron/generate-blog-articles")

# Split response body and status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)

echo ""
echo "HTTP Status: $HTTP_CODE"
echo ""

# Pretty print JSON response
echo "Response:"
echo "$HTTP_BODY" | jq '.' 2>/dev/null || echo "$HTTP_BODY"
echo ""

# Check status
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 207 ]; then
  SUCCESS_COUNT=$(echo "$HTTP_BODY" | jq -r '.successCount // 0')
  FAILURE_COUNT=$(echo "$HTTP_BODY" | jq -r '.failureCount // 0')
  TOTAL=$(echo "$HTTP_BODY" | jq -r '.totalCategories // 0')
  
  echo -e "${GREEN}✓ Cron job executed successfully${NC}"
  echo "  Total categories: $TOTAL"
  echo "  Successful: $SUCCESS_COUNT"
  echo "  Failed: $FAILURE_COUNT"
  
  if [ "$FAILURE_COUNT" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Failed categories:${NC}"
    echo "$HTTP_BODY" | jq -r '.results[] | select(.success == false) | "  - \(.category): \(.error)"'
  fi
elif [ "$HTTP_CODE" -eq 401 ]; then
  echo -e "${RED}✗ Authentication failed${NC}"
  echo "Make sure CRON_SECRET in .env.local matches the one sent in the request"
elif [ "$HTTP_CODE" -eq 500 ]; then
  ERROR=$(echo "$HTTP_BODY" | jq -r '.error // "Unknown error"')
  echo -e "${RED}✗ Server error: $ERROR${NC}"
  
  if echo "$ERROR" | grep -q "MAKE_COM_WEBHOOK_URL"; then
    echo ""
    echo "Please set MAKE_COM_WEBHOOK_URL in your .env.local file"
  fi
else
  echo -e "${RED}✗ Unexpected status code: $HTTP_CODE${NC}"
fi

echo ""
echo "Done!"
