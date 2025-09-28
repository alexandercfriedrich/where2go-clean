/**
 * Redis JSON serialization utilities
 * 
 * Provides safe JSON serialization/deserialization for Redis cache entries
 * with proper error handling and key normalization.
 */

import { Redis } from '@upstash/redis';

/**
 * Normalizes Redis keys by:
 * - Converting to lowercase
 * - Replacing problematic characters (/, \, :) with underscores
 * - Removing multiple consecutive underscores
 * - Trimming underscores from start/end
 */
export function normalizeRedisKey(key: string): string {
  if (!key) return '';
  
  return key
    .toLowerCase()
    .trim()
    .replace(/[\/\\:\s]+/g, '_')  // Replace slashes, colons, and spaces with underscores
    .replace(/_+/g, '_')          // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '');     // Remove leading/trailing underscores
}

/**
 * Safely serializes an object to JSON string for Redis storage
 */
export function safeJSONStringify(value: any): string {
  try {
    if (value === null || value === undefined) {
      return JSON.stringify(null);
    }
    
    // Handle Date objects by converting to ISO strings
    if (value instanceof Date) {
      return JSON.stringify(value.toISOString());
    }
    
    // Handle objects with Date properties
    if (typeof value === 'object' && value !== null) {
      const serialized = JSON.parse(JSON.stringify(value, (key, val) => {
        if (val instanceof Date) {
          return val.toISOString();
        }
        return val;
      }));
      return JSON.stringify(serialized);
    }
    
    return JSON.stringify(value);
  } catch (error) {
    console.error('Failed to serialize value for Redis:', error, 'Value:', value);
    throw new Error(`JSON serialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Safely parses JSON string from Redis with fallback handling
 */
export function safeJSONParse<T = any>(jsonString: any): T | null {
  // Handle null/undefined
  if (jsonString === null || jsonString === undefined) {
    return null;
  }
  
  // If already an object (not a string), return as-is
  if (typeof jsonString === 'object') {
    return jsonString as T;
  }
  
  // Convert to string if not already
  const str = String(jsonString);
  
  // Check for corrupted "[object Object]" patterns
  if (str === '[object Object]' || str.startsWith('[object Object]')) {
    console.warn('Detected corrupted cache entry with "[object Object]" pattern:', str);
    return null;
  }
  
  // Handle empty string
  if (str.trim() === '') {
    return null;
  }
  
  try {
    return JSON.parse(str) as T;
  } catch (error) {
    console.error('Failed to parse JSON from Redis:', error, 'Raw value:', str);
    return null;
  }
}

/**
 * Redis JSON helper class that provides safe get/set operations
 */
export class RedisJSON {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  /**
   * Set a JSON value in Redis with proper serialization
   */
  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const normalizedKey = normalizeRedisKey(key);
    const serialized = safeJSONStringify(value);
    
    try {
      if (ttlSeconds !== undefined) {
        await this.redis.setex(normalizedKey, ttlSeconds, serialized);
      } else {
        await this.redis.set(normalizedKey, serialized);
      }
    } catch (error) {
      console.error(`Failed to set JSON in Redis for key ${normalizedKey}:`, error);
      throw error;
    }
  }
  
  /**
   * Get and parse a JSON value from Redis with error handling
   */
  async getJSON<T = any>(key: string): Promise<T | null> {
    const normalizedKey = normalizeRedisKey(key);
    
    try {
      const raw = await this.redis.get(normalizedKey);
      const parsed = safeJSONParse<T>(raw);
      
      // If parsing failed due to corruption, delete the bad key
      if (raw !== null && raw !== undefined && parsed === null) {
        console.warn(`Deleting corrupted cache entry for key: ${normalizedKey}`);
        await this.redis.del(normalizedKey);
      }
      
      return parsed;
    } catch (error) {
      console.error(`Failed to get JSON from Redis for key ${normalizedKey}:`, error);
      
      // Try to delete potentially corrupted key
      try {
        await this.redis.del(normalizedKey);
      } catch (deleteError) {
        console.error(`Failed to delete corrupted key ${normalizedKey}:`, deleteError);
      }
      
      return null;
    }
  }
  
  /**
   * Delete a key from Redis
   */
  async deleteJSON(key: string): Promise<boolean> {
    const normalizedKey = normalizeRedisKey(key);
    
    try {
      const result = await this.redis.del(normalizedKey);
      return result > 0;
    } catch (error) {
      console.error(`Failed to delete key ${normalizedKey}:`, error);
      return false;
    }
  }
  
  /**
   * Check if a key exists in Redis
   */
  async hasJSON(key: string): Promise<boolean> {
    const normalizedKey = normalizeRedisKey(key);
    
    try {
      const result = await this.redis.exists(normalizedKey);
      return result > 0;
    } catch (error) {
      console.error(`Failed to check existence of key ${normalizedKey}:`, error);
      return false;
    }
  }
}

/**
 * Standalone utility functions for direct use with Redis instances
 */

/**
 * Set JSON value in Redis with safe serialization
 */
export async function setRedisJSON<T>(
  redis: Redis, 
  key: string, 
  value: T, 
  ttlSeconds?: number
): Promise<void> {
  const helper = new RedisJSON(redis);
  return helper.setJSON(key, value, ttlSeconds);
}

/**
 * Get JSON value from Redis with safe parsing
 */
export async function getRedisJSON<T = any>(
  redis: Redis, 
  key: string
): Promise<T | null> {
  const helper = new RedisJSON(redis);
  return helper.getJSON<T>(key);
}

/**
 * Delete JSON value from Redis
 */
export async function deleteRedisJSON(
  redis: Redis, 
  key: string
): Promise<boolean> {
  const helper = new RedisJSON(redis);
  return helper.deleteJSON(key);
}

/**
 * Check if JSON key exists in Redis
 */
export async function hasRedisJSON(
  redis: Redis, 
  key: string
): Promise<boolean> {
  const helper = new RedisJSON(redis);
  return helper.hasJSON(key);
}