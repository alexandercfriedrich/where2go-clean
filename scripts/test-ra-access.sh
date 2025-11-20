#!/bin/bash

# Test script to verify Resident Advisor (RA) accessibility
# Usage: ./scripts/test-ra-access.sh

echo "=================================================="
echo "Resident Advisor Accessibility Test"
echo "=================================================="
echo ""

echo "Test 1: RA Main Website"
echo "-----------------------"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://www.residentadvisor.net/" -H "User-Agent: Mozilla/5.0")
if [ "$STATUS" = "200" ]; then
    echo "✅ Main website accessible (HTTP $STATUS)"
else
    echo "❌ Main website not accessible (HTTP $STATUS)"
fi
echo ""

echo "Test 2: RA Berlin RSS Feed"
echo "-------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "https://ra.co/events/de/berlin/rss" -H "User-Agent: where2go-bot/1.0")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [ "$HTTP_CODE" = "200" ]; then
    ITEM_COUNT=$(echo "$RESPONSE" | grep -c "<item>")
    echo "✅ RSS feed accessible (HTTP $HTTP_CODE)"
    echo "   Items found: $ITEM_COUNT"
else
    echo "❌ RSS feed blocked (HTTP $HTTP_CODE)"
    echo "   This indicates bot protection is active"
fi
echo ""

echo "Test 3: RA Vienna RSS Feed"
echo "-------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "https://ra.co/events/at/vienna/rss" -H "User-Agent: where2go-bot/1.0")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
if [ "$HTTP_CODE" = "200" ]; then
    ITEM_COUNT=$(echo "$RESPONSE" | grep -c "<item>")
    echo "✅ RSS feed accessible (HTTP $HTTP_CODE)"
    echo "   Items found: $ITEM_COUNT"
else
    echo "❌ RSS feed blocked (HTTP $HTTP_CODE)"
    echo "   This indicates bot protection is active"
fi
echo ""

echo "Test 4: Check for Bot Protection Headers"
echo "---------------------------------------"
HEADERS=$(curl -s -I "https://ra.co/events/de/berlin/rss" -H "User-Agent: where2go-bot/1.0" 2>&1)
if echo "$HEADERS" | grep -q "datadome"; then
    echo "⚠️  DataDome bot protection detected"
    echo "   Header: $(echo "$HEADERS" | grep -i datadome | head -1)"
elif echo "$HEADERS" | grep -q "cloudflare"; then
    echo "⚠️  Cloudflare protection detected"
else
    echo "ℹ️  No obvious bot protection headers found"
fi
echo ""

echo "=================================================="
echo "Summary"
echo "=================================================="
echo ""
echo "Based on these tests:"
echo "• RA main website is accessible"
echo "• RA RSS feeds are protected by bot detection"
echo "• ra-scraper would face the same protection"
echo "• Current RSS-based approach is also blocked"
echo ""
echo "Recommendation: Remove RA integration or use"
echo "alternative approach (headless browser, manual curation)"
echo ""
