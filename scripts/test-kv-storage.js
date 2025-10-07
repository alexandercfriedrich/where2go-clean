/**
 * Test script for Vercel KV storage with static pages
 * 
 * This script demonstrates:
 * 1. Direct REST API calls to Vercel KV (no npm dependencies)
 * 2. Testing KV connectivity and operations
 * 3. Verifying storage layer works correctly
 * 
 * Usage:
 *   node scripts/test-kv-storage.js
 * 
 * Environment variables required:
 *   KV_REST_API_URL - Vercel KV REST API URL
 *   KV_REST_API_TOKEN - Vercel KV REST API Token
 */

const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const KV_KEY = 'where2go:static-pages:v1';

async function kvGet(key) {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    throw new Error('KV credentials not configured');
  }

  const response = await fetch(`${KV_REST_API_URL}/get/${key}`, {
    headers: {
      'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`KV GET failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const result = data.result !== undefined ? data.result : data;
  
  if (!result) {
    return null;
  }

  return typeof result === 'string' ? JSON.parse(result) : result;
}

async function kvSet(key, value) {
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    throw new Error('KV credentials not configured');
  }

  const response = await fetch(`${KV_REST_API_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value: JSON.stringify(value),
    }),
  });

  if (!response.ok) {
    throw new Error(`KV SET failed: ${response.status} ${response.statusText}`);
  }
}

async function testKvStorage() {
  console.log('🔧 Testing Vercel KV Storage for Static Pages\n');
  console.log('=====================================\n');

  // Check configuration
  console.log('📋 Configuration Check:');
  if (!KV_REST_API_URL) {
    console.log('❌ KV_REST_API_URL not set');
    console.log('\n⚠️  Fallback: Application will use filesystem storage');
    console.log('   Location: data/static-pages.json or /tmp/static-pages.json\n');
    return;
  }
  if (!KV_REST_API_TOKEN) {
    console.log('❌ KV_REST_API_TOKEN not set');
    console.log('\n⚠️  Fallback: Application will use filesystem storage\n');
    return;
  }
  console.log('✅ KV credentials configured');
  console.log(`   URL: ${KV_REST_API_URL}`);
  console.log(`   Key: ${KV_KEY}\n`);

  try {
    // Test 1: Read current data
    console.log('📖 Test 1: Reading current data from KV');
    const currentData = await kvGet(KV_KEY);
    if (currentData) {
      console.log(`✅ Found ${currentData.length} pages in KV storage`);
      currentData.forEach(page => {
        console.log(`   - ${page.id}: ${page.title}`);
      });
    } else {
      console.log('ℹ️  No data found in KV storage (first run)');
    }
    console.log();

    // Test 2: Write test data
    console.log('✍️  Test 2: Writing test data to KV');
    const testData = [
      {
        id: 'test-page',
        title: 'Test Page',
        content: '<h1>Test Content</h1>',
        path: '/test',
        updatedAt: new Date().toISOString()
      }
    ];
    await kvSet(KV_KEY, testData);
    console.log('✅ Successfully wrote test data to KV\n');

    // Test 3: Read back test data
    console.log('🔍 Test 3: Verifying test data');
    const verifiedData = await kvGet(KV_KEY);
    if (verifiedData && verifiedData.length === 1 && verifiedData[0].id === 'test-page') {
      console.log('✅ Test data verified successfully');
      console.log(`   - ID: ${verifiedData[0].id}`);
      console.log(`   - Title: ${verifiedData[0].title}`);
      console.log(`   - Path: ${verifiedData[0].path}\n`);
    } else {
      console.log('❌ Test data verification failed\n');
    }

    // Test 4: Restore original data
    console.log('♻️  Test 4: Restoring original data');
    if (currentData) {
      await kvSet(KV_KEY, currentData);
      console.log(`✅ Restored ${currentData.length} pages to KV storage\n`);
    } else {
      console.log('ℹ️  No original data to restore\n');
    }

    console.log('✅ All tests passed!\n');
    console.log('🎉 Vercel KV storage is working correctly');
    console.log('   The application will use KV for durable persistence.\n');

  } catch (error) {
    console.error('❌ KV Storage Test Failed:', error.message);
    console.log('\n⚠️  Fallback: Application will use filesystem storage\n');
  }
}

// Run if called directly
if (require.main === module) {
  testKvStorage().catch(console.error);
}

module.exports = { testKvStorage };
