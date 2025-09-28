/**
 * Cache Metrics and Monitoring
 * 
 * Provides lightweight metrics and logging for cache health monitoring.
 * Tracks hit/miss ratios, cleanup operations, and key patterns.
 */

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  cleanups: number;
  errors: number;
  corrupted: number;
  lastReset: Date;
}

export interface CacheKeyMetrics {
  pattern: string;
  hits: number;
  misses: number;
  lastAccess: Date;
}

class CacheMetricsCollector {
  private metrics: CacheMetrics;
  private keyPatterns: Map<string, CacheKeyMetrics>;
  private readonly maxKeyPatterns = 100; // Limit memory usage

  constructor() {
    this.metrics = this.createEmptyMetrics();
    this.keyPatterns = new Map();
  }

  private createEmptyMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      cleanups: 0,
      errors: 0,
      corrupted: 0,
      lastReset: new Date()
    };
  }

  /**
   * Extract pattern from cache key for grouping
   */
  private extractPattern(key: string): string {
    // Extract city_date_category pattern
    const match = key.match(/^([^_]+_\d{4}-\d{2}-\d{2})_(.+)$/);
    if (match) {
      const [, cityDate, category] = match;
      // Group similar categories
      const categoryPattern = category.replace(/[^a-z_]/g, '_').replace(/_+/g, '_');
      return `${cityDate}_${categoryPattern}`;
    }
    
    // For other keys, use first part before colon
    const colonIndex = key.indexOf(':');
    if (colonIndex > 0) {
      return key.substring(0, colonIndex) + ':*';
    }
    
    return 'other';
  }

  /**
   * Record a cache hit
   */
  recordHit(key: string): void {
    this.metrics.hits++;
    this.updateKeyPattern(key, 'hit');
  }

  /**
   * Record a cache miss
   */
  recordMiss(key: string): void {
    this.metrics.misses++;
    this.updateKeyPattern(key, 'miss');
  }

  /**
   * Record a cache set operation
   */
  recordSet(key: string): void {
    this.metrics.sets++;
  }

  /**
   * Record a cache delete operation
   */
  recordDelete(key: string): void {
    this.metrics.deletes++;
  }

  /**
   * Record a cleanup operation
   */
  recordCleanup(): void {
    this.metrics.cleanups++;
  }

  /**
   * Record a cache error
   */
  recordError(key: string, error: Error): void {
    this.metrics.errors++;
    console.error(`Cache error for key ${key}:`, error.message);
  }

  /**
   * Record a corrupted cache entry
   */
  recordCorrupted(key: string, reason: string): void {
    this.metrics.corrupted++;
    console.warn(`Corrupted cache entry detected for key ${key}: ${reason}`);
  }

  /**
   * Update key pattern metrics
   */
  private updateKeyPattern(key: string, operation: 'hit' | 'miss'): void {
    const pattern = this.extractPattern(key);
    
    let keyMetrics = this.keyPatterns.get(pattern);
    if (!keyMetrics) {
      // Limit memory usage by removing oldest entries
      if (this.keyPatterns.size >= this.maxKeyPatterns) {
        const oldestPattern = Array.from(this.keyPatterns.entries())
          .sort(([, a], [, b]) => a.lastAccess.getTime() - b.lastAccess.getTime())[0][0];
        this.keyPatterns.delete(oldestPattern);
      }
      
      keyMetrics = {
        pattern,
        hits: 0,
        misses: 0,
        lastAccess: new Date()
      };
      this.keyPatterns.set(pattern, keyMetrics);
    }

    if (operation === 'hit') {
      keyMetrics.hits++;
    } else {
      keyMetrics.misses++;
    }
    keyMetrics.lastAccess = new Date();
  }

  /**
   * Get current metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get key pattern metrics
   */
  getKeyPatternMetrics(): CacheKeyMetrics[] {
    return Array.from(this.keyPatterns.values())
      .sort((a, b) => (b.hits + b.misses) - (a.hits + a.misses));
  }

  /**
   * Get cache hit rate as percentage
   */
  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    hitRate: number;
    totalOperations: number;
    errorRate: number;
    corruptionRate: number;
    topPatterns: Array<CacheKeyMetrics & { hitRate: number }>;
  } {
    const totalOperations = this.metrics.hits + this.metrics.misses;
    const hitRate = this.getHitRate();
    const errorRate = totalOperations > 0 ? (this.metrics.errors / totalOperations) * 100 : 0;
    const corruptionRate = totalOperations > 0 ? (this.metrics.corrupted / totalOperations) * 100 : 0;

    const topPatterns = this.getKeyPatternMetrics()
      .slice(0, 10)
      .map(pattern => ({
        ...pattern,
        hitRate: pattern.hits + pattern.misses > 0 
          ? (pattern.hits / (pattern.hits + pattern.misses)) * 100 
          : 0
      }));

    return {
      hitRate,
      totalOperations,
      errorRate,
      corruptionRate,
      topPatterns
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = this.createEmptyMetrics();
    this.keyPatterns.clear();
  }

  /**
   * Log current metrics summary
   */
  logSummary(): void {
    const summary = this.getSummary();
    
    console.log('📊 Cache Metrics Summary:');
    console.log(`   Hit Rate: ${summary.hitRate.toFixed(1)}%`);
    console.log(`   Total Operations: ${summary.totalOperations}`);
    console.log(`   Error Rate: ${summary.errorRate.toFixed(2)}%`);
    console.log(`   Corruption Rate: ${summary.corruptionRate.toFixed(2)}%`);
    
    if (summary.topPatterns.length > 0) {
      console.log('\n🔥 Top Cache Patterns:');
      summary.topPatterns.forEach((pattern, index) => {
        console.log(`   ${index + 1}. ${pattern.pattern}: ${pattern.hitRate.toFixed(1)}% hit rate (${pattern.hits + pattern.misses} ops)`);
      });
    }
  }
}

// Global metrics collector instance
const globalMetrics = new CacheMetricsCollector();

/**
 * Instrumented cache wrapper that automatically collects metrics
 */
export class InstrumentedCache {
  constructor(private cache: any) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.cache.get<T>(key);
      if (result !== null) {
        globalMetrics.recordHit(key);
      } else {
        globalMetrics.recordMiss(key);
      }
      return result;
    } catch (error) {
      globalMetrics.recordError(key, error as Error);
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      await this.cache.set(key, value, ttlSeconds);
      globalMetrics.recordSet(key);
    } catch (error) {
      globalMetrics.recordError(key, error as Error);
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.cache.delete(key);
      globalMetrics.recordDelete(key);
      return result;
    } catch (error) {
      globalMetrics.recordError(key, error as Error);
      throw error;
    }
  }

  async getEventsByCategories(city: string, date: string, categories: string[]): Promise<any> {
    const result = await this.cache.getEventsByCategories(city, date, categories);
    
    // Record metrics for each category
    for (const category of categories) {
      const key = `${city}_${date}_${category}`;
      if (result.cacheInfo[category]?.fromCache) {
        globalMetrics.recordHit(key);
      } else {
        globalMetrics.recordMiss(key);
      }
    }
    
    return result;
  }

  async setEventsByCategory(city: string, date: string, category: string, events: any[], ttlSeconds?: number): Promise<void> {
    const key = `${city}_${date}_${category}`;
    try {
      await this.cache.setEventsByCategory(city, date, category, events, ttlSeconds);
      globalMetrics.recordSet(key);
    } catch (error) {
      globalMetrics.recordError(key, error as Error);
      throw error;
    }
  }

  // Delegate other methods
  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async cleanup(): Promise<void> {
    await this.cache.cleanup();
    globalMetrics.recordCleanup();
  }

  async size(): Promise<number> {
    return this.cache.size();
  }

  async clear(): Promise<void> {
    return this.cache.clear();
  }
}

/**
 * Get global cache metrics
 */
export function getCacheMetrics(): CacheMetrics {
  return globalMetrics.getMetrics();
}

/**
 * Get cache metrics summary
 */
export function getCacheMetricsSummary() {
  return globalMetrics.getSummary();
}

/**
 * Log cache metrics summary
 */
export function logCacheMetrics(): void {
  globalMetrics.logSummary();
}

/**
 * Reset global cache metrics
 */
export function resetCacheMetrics(): void {
  globalMetrics.reset();
}

/**
 * Record a corrupted cache entry for monitoring
 */
export function recordCorruptedCacheEntry(key: string, reason: string): void {
  globalMetrics.recordCorrupted(key, reason);
}

/**
 * Periodic metrics logging
 */
let metricsInterval: NodeJS.Timeout | null = null;

export function startMetricsLogging(intervalMinutes: number = 60): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
  }
  
  metricsInterval = setInterval(() => {
    const summary = globalMetrics.getSummary();
    if (summary.totalOperations > 0) {
      globalMetrics.logSummary();
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopMetricsLogging(): void {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
}