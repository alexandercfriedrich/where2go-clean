#!/usr/bin/env tsx
/**
 * Redis Cache Cleanup Script
 * 
 * Cleans up legacy cache keys that may contain problematic patterns:
 * - Keys with raw slashes (/) that cause parsing issues
 * - Keys containing "[object Object]" corruption
 * - Keys with non-normalized category names
 * 
 * Usage:
 *   npx tsx scripts/cleanup-redis-cache.ts [--dry-run] [--pattern=<pattern>]
 * 
 * Examples:
 *   npx tsx scripts/cleanup-redis-cache.ts --dry-run
 *   npx tsx scripts/cleanup-redis-cache.ts --pattern="wien_2025-09-28_*"
 *   npx tsx scripts/cleanup-redis-cache.ts
 */

import { Redis } from '@upstash/redis';
import { normalizeRedisKey, safeJSONParse } from '../app/lib/redis-json';

interface CleanupOptions {
  dryRun: boolean;
  pattern?: string;
  verbose: boolean;
}

interface CleanupStats {
  scanned: number;
  corrupted: number;
  unnormalized: number;
  deleted: number;
  errors: number;
}

class RedisCacheCleanup {
  private redis: Redis;
  private stats: CleanupStats = {
    scanned: 0,
    corrupted: 0,
    unnormalized: 0,
    deleted: 0,
    errors: 0
  };

  constructor() {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      throw new Error('Redis credentials not found. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
    }

    this.redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }

  /**
   * Scan for keys matching a pattern
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    try {
      // Use SCAN to get all keys matching pattern
      // Note: Upstash Redis might have limitations on SCAN, so we use KEYS as fallback
      const keys = await this.redis.keys(pattern);
      return Array.isArray(keys) ? keys : [];
    } catch (error) {
      console.error('Error scanning keys:', error);
      return [];
    }
  }

  /**
   * Check if a key should be cleaned up
   */
  private async analyzeKey(key: string): Promise<{
    shouldDelete: boolean;
    reason: string;
    value?: any;
  }> {
    try {
      // Check if key has problematic characters
      const hasSlashes = key.includes('/') || key.includes('\\');
      const hasColons = key.includes(':') && !key.startsWith('events:') && !key.startsWith('job:') && !key.startsWith('debug:');
      
      if (hasSlashes || hasColons) {
        return {
          shouldDelete: true,
          reason: `Unnormalized key with problematic characters: ${hasSlashes ? 'slashes' : 'colons'}`
        };
      }

      // Get the value to check for corruption
      const rawValue = await this.redis.get(key);
      
      if (rawValue === null || rawValue === undefined) {
        return { shouldDelete: false, reason: 'Key does not exist' };
      }

      // Check for "[object Object]" corruption
      const valueStr = String(rawValue);
      if (valueStr === '[object Object]' || valueStr.startsWith('[object Object]')) {
        return {
          shouldDelete: true,
          reason: 'Corrupted value with "[object Object]" pattern',
          value: rawValue
        };
      }

      // Try to parse as JSON
      const parsed = safeJSONParse(rawValue);
      if (rawValue !== null && parsed === null && typeof rawValue === 'string' && rawValue.trim() !== '') {
        return {
          shouldDelete: true,
          reason: 'Invalid JSON that could not be parsed',
          value: rawValue
        };
      }

      return { shouldDelete: false, reason: 'Key looks healthy' };
    } catch (error) {
      return {
        shouldDelete: true,
        reason: `Error analyzing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        value: undefined
      };
    }
  }

  /**
   * Clean up a single key
   */
  private async cleanupKey(key: string, options: CleanupOptions): Promise<boolean> {
    try {
      const analysis = await this.analyzeKey(key);
      this.stats.scanned++;

      if (!analysis.shouldDelete) {
        if (options.verbose) {
          console.log(`✓ ${key}: ${analysis.reason}`);
        }
        return false;
      }

      // Track the type of issue
      if (analysis.reason.includes('Unnormalized')) {
        this.stats.unnormalized++;
      } else if (analysis.reason.includes('Corrupted') || analysis.reason.includes('Invalid JSON')) {
        this.stats.corrupted++;
      }

      console.log(`${options.dryRun ? '🔍' : '🗑️'} ${key}: ${analysis.reason}`);
      
      if (analysis.value && options.verbose) {
        console.log(`   Value: ${String(analysis.value).substring(0, 100)}${String(analysis.value).length > 100 ? '...' : ''}`);
      }

      if (!options.dryRun) {
        await this.redis.del(key);
        this.stats.deleted++;
        console.log(`   ✓ Deleted`);
      }

      return true;
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Error cleaning up key ${key}:`, error);
      return false;
    }
  }

  /**
   * Run the cleanup process
   */
  async cleanup(options: CleanupOptions): Promise<CleanupStats> {
    console.log('🚀 Starting Redis cache cleanup...');
    console.log(`Mode: ${options.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (keys will be deleted)'}`);
    console.log(`Pattern: ${options.pattern || '*'}`);
    console.log('');

    // Define patterns to scan for problematic keys
    const patterns = options.pattern ? [options.pattern] : [
      'events:*',     // Event cache keys
      'job:*',        // Job store keys  
      'debug:*',      // Debug keys
      'hot-cities',   // Hot cities key
      '*/*',          // Keys with slashes (problematic)
      '*\\*',         // Keys with backslashes (problematic)
    ];

    for (const pattern of patterns) {
      console.log(`🔍 Scanning pattern: ${pattern}`);
      const keys = await this.scanKeys(pattern);
      
      if (keys.length === 0) {
        console.log(`   No keys found for pattern ${pattern}`);
        continue;
      }

      console.log(`   Found ${keys.length} keys`);
      
      for (const key of keys) {
        await this.cleanupKey(key, options);
      }
    }

    return this.stats;
  }

  /**
   * Print cleanup statistics
   */
  printStats(): void {
    console.log('\n📊 Cleanup Statistics:');
    console.log(`   Keys scanned: ${this.stats.scanned}`);
    console.log(`   Corrupted keys found: ${this.stats.corrupted}`);
    console.log(`   Unnormalized keys found: ${this.stats.unnormalized}`);
    console.log(`   Keys deleted: ${this.stats.deleted}`);
    console.log(`   Errors encountered: ${this.stats.errors}`);
    
    if (this.stats.corrupted > 0 || this.stats.unnormalized > 0) {
      console.log('\n✅ Cleanup completed. Cache should now be healthier.');
    } else {
      console.log('\n✅ No problematic keys found. Cache looks healthy!');
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2);
  
  const options: CleanupOptions = {
    dryRun: false,
    verbose: false
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg.startsWith('--pattern=')) {
      options.pattern = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Redis Cache Cleanup Script

Usage: npx tsx scripts/cleanup-redis-cache.ts [options]

Options:
  --dry-run           Show what would be deleted without actually deleting
  --pattern=<pattern> Only scan keys matching this pattern (default: all)
  --verbose, -v       Show detailed output for all keys
  --help, -h          Show this help message

Examples:
  npx tsx scripts/cleanup-redis-cache.ts --dry-run
  npx tsx scripts/cleanup-redis-cache.ts --pattern="wien_*"
  npx tsx scripts/cleanup-redis-cache.ts --verbose
      `);
      process.exit(0);
    }
  }

  return options;
}

/**
 * Main execution
 */
async function main() {
  try {
    const options = parseArgs();
    const cleanup = new RedisCacheCleanup();
    
    await cleanup.cleanup(options);
    cleanup.printStats();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { RedisCacheCleanup };