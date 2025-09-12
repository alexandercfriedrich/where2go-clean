/**
 * Redis client configuration for the new backend system.
 * This module provides a centralized Redis connection with proper error handling.
 * 
 * @fileoverview Redis client setup with connection pooling and retry logic.
 */

import { createComponentLogger } from '../utils/log';
import { createError, ErrorCode, type AppError } from '../utils/errors';

const logger = createComponentLogger('RedisClient');

/**
 * Redis client interface for type safety.
 * Supports both Upstash Redis and Vercel KV.
 * Note: Blocking operations like blpop are not supported by HTTP-based Redis services.
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number; px?: number }): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  lpush(key: string, ...values: string[]): Promise<number>;
  lpop(key: string): Promise<string | null>;
  llen(key: string): Promise<number>;
  hget(key: string, field: string): Promise<string | null>;
  hset<TData>(key: string, kv: Record<string, TData>): Promise<number>;
  hdel(key: string, field: string): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  ping(): Promise<string>;
}

/**
 * Redis configuration.
 */
export interface RedisConfig {
  /** Connection retry attempts */
  maxRetries: number;
  
  /** Initial retry delay in milliseconds */
  retryDelay: number;
  
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  
  /** Operation timeout in milliseconds */
  operationTimeout: number;
}

/**
 * Default Redis configuration.
 */
const DEFAULT_CONFIG: RedisConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  connectionTimeout: 10000,
  operationTimeout: 5000
};

/**
 * Redis client wrapper with error handling and retry logic.
 */
class NewBackendRedisClient {
  private client: RedisClient | null = null;
  private config: RedisConfig;
  private connectionPromise: Promise<RedisClient> | null = null;
  private isConnecting = false;

  constructor(config: Partial<RedisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get or create Redis client connection.
   */
  async getClient(): Promise<RedisClient> {
    if (this.client) {
      return this.client;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connect();
    return this.connectionPromise;
  }

  /**
   * Establish Redis connection with retry logic.
   */
  private async connect(): Promise<RedisClient> {
    this.isConnecting = true;
    
    try {
      logger.info('Establishing Redis connection for new backend');
      
      const client = await this.createRedisClient();
      
      // Test connection
      await this.testConnection(client);
      
      this.client = client;
      this.isConnecting = false;
      
      logger.info('Redis connection established successfully');
      return client;
      
    } catch (error) {
      this.isConnecting = false;
      this.connectionPromise = null;
      
      const appError = createError(
        ErrorCode.REDIS_CONNECTION_FAILED,
        'Failed to establish Redis connection',
        { error: error instanceof Error ? error.message : String(error) }
      );
      
      logger.error('Redis connection failed', { error: appError });
      throw appError;
    }
  }

  /**
   * Create the appropriate Redis client based on environment.
   */
  private async createRedisClient(): Promise<RedisClient> {
    // Check for Upstash Redis configuration
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (upstashUrl && upstashToken) {
      logger.debug('Using Upstash Redis client');
      const { Redis } = await import('@upstash/redis');
      
      return new Redis({
        url: upstashUrl,
        token: upstashToken,
        retry: {
          retries: this.config.maxRetries,
          backoff: (retryCount: number) => 
            Math.min(this.config.retryDelay * Math.pow(2, retryCount), 10000)
        }
      }) as RedisClient;
    }
    
    throw createError(
      ErrorCode.CONFIG_ERROR,
      'No Redis configuration found. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables'
    );
  }

  /**
   * Test Redis connection with timeout.
   */
  private async testConnection(client: RedisClient): Promise<void> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(createError(
          ErrorCode.TIMEOUT_ERROR,
          `Redis connection test timed out after ${this.config.connectionTimeout}ms`
        ));
      }, this.config.connectionTimeout);
    });

    try {
      await Promise.race([
        client.ping(),
        timeoutPromise
      ]);
      
      logger.debug('Redis connection test successful');
    } catch (error) {
      throw createError(
        ErrorCode.REDIS_CONNECTION_FAILED,
        'Redis connection test failed',
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Execute a Redis operation with timeout and error handling.
   */
  async executeOperation<T>(
    operation: (client: RedisClient) => Promise<T>,
    operationName: string
  ): Promise<T> {
    const client = await this.getClient();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(createError(
          ErrorCode.TIMEOUT_ERROR,
          `Redis operation '${operationName}' timed out after ${this.config.operationTimeout}ms`
        ));
      }, this.config.operationTimeout);
    });

    try {
      const result = await Promise.race([
        operation(client),
        timeoutPromise
      ]);
      
      logger.debug(`Redis operation '${operationName}' completed successfully`);
      return result;
      
    } catch (error) {
      logger.error(`Redis operation '${operationName}' failed`, {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // If connection-related error, reset client for next attempt
      if (this.isConnectionError(error)) {
        this.client = null;
        this.connectionPromise = null;
      }
      
      if (error instanceof Error && 'code' in error) {
        throw error; // Re-throw AppError as-is
      }
      
      throw createError(
        ErrorCode.REDIS_OPERATION_FAILED,
        `Redis operation '${operationName}' failed`,
        { error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Check if error is connection-related.
   */
  private isConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    
    const message = error.message.toLowerCase();
    return message.includes('connection') || 
           message.includes('network') || 
           message.includes('timeout') ||
           message.includes('econnrefused');
  }

  /**
   * Close Redis connection.
   */
  async close(): Promise<void> {
    if (this.client) {
      logger.info('Closing Redis connection');
      // Note: Upstash Redis and Vercel KV don't require explicit close
      this.client = null;
      this.connectionPromise = null;
    }
  }

  /**
   * Get connection status.
   */
  isConnected(): boolean {
    return this.client !== null && !this.isConnecting;
  }
}

/**
 * Global Redis client instance for the new backend.
 */
let redisClient: NewBackendRedisClient | null = null;

/**
 * Get the global Redis client instance.
 */
export function getRedisClient(config?: Partial<RedisConfig>): NewBackendRedisClient {
  if (!redisClient) {
    redisClient = new NewBackendRedisClient(config);
  }
  return redisClient;
}

/**
 * Redis key prefixes for organized data storage.
 */
export const REDIS_KEYS = {
  /** Job data: jobs:{jobId} */
  JOB: (jobId: string) => `jobs:${jobId}`,
  
  /** Job signature index: jobs:idx:signature:{signature} */
  JOB_SIGNATURE_INDEX: (signature: string) => `jobs:idx:signature:${signature}`,
  
  /** Job queue: jobs:queue */
  JOB_QUEUE: 'jobs:queue',
  
  /** Event cache: events:{city}:{date}:{category} */
  EVENTS: (city: string, date: string, category: string) => 
    `events:${city.toLowerCase()}:${date}:${category}`,
  
  /** Event cache metadata: events:{city}:{date}:{category}:meta */
  EVENTS_META: (city: string, date: string, category: string) => 
    `events:${city.toLowerCase()}:${date}:${category}:meta`,
  
  /** Event cache lock: events:{city}:{date}:{category}:lock */
  EVENTS_LOCK: (city: string, date: string, category: string) => 
    `events:${city.toLowerCase()}:${date}:${category}:lock`
} as const;