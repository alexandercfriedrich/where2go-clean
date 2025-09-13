/**
 * Error handling utilities for the new backend system.
 * This module provides structured error objects without exposing stack traces.
 * 
 * @fileoverview Robust error handling with structured error objects.
 */

/**
 * Structured error object for consistent error handling.
 * Does not expose raw stack traces to clients for security.
 */
export interface AppError {
  /** Error code for programmatic handling */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Optional context data (safe for client exposure) */
  context?: Record<string, any>;
}

/**
 * Error codes used throughout the new backend system.
 */
export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Job errors
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  JOB_CREATION_FAILED = 'JOB_CREATION_FAILED',
  JOB_PROCESSING_FAILED = 'JOB_PROCESSING_FAILED',
  JOB_CANCELLED = 'JOB_CANCELLED',
  JOB_TIMEOUT = 'JOB_TIMEOUT',
  
  // Category errors
  CATEGORY_NORMALIZATION_FAILED = 'CATEGORY_NORMALIZATION_FAILED',
  CATEGORY_PROCESSING_FAILED = 'CATEGORY_PROCESSING_FAILED',
  
  // Redis/Storage errors
  REDIS_CONNECTION_FAILED = 'REDIS_CONNECTION_FAILED',
  REDIS_OPERATION_FAILED = 'REDIS_OPERATION_FAILED',
  CACHE_ERROR = 'CACHE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  
  // AI/External service errors
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  
  // Background processing errors
  BACKGROUND_PROCESSING_FAILED = 'BACKGROUND_PROCESSING_FAILED',
  AI_TIMEOUT = 'AI_TIMEOUT',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',
  AI_INVALID_RESPONSE = 'AI_INVALID_RESPONSE',
  
  // Network/HTTP errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Configuration errors
  CONFIG_ERROR = 'CONFIG_ERROR',
  MISSING_ENV_VAR = 'MISSING_ENV_VAR',
  
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Create a structured error object.
 * 
 * @param code - Error code for programmatic handling
 * @param message - Human-readable error message
 * @param context - Optional context data (must be safe for client exposure)
 * @returns Structured error object
 */
export function createError(
  code: ErrorCode,
  message: string,
  context?: Record<string, any>
): AppError {
  return {
    code,
    message,
    context: context ? sanitizeContext(context) : undefined
  };
}

/**
 * Sanitize context data to ensure it's safe for client exposure.
 * Removes sensitive information and limits object depth.
 */
function sanitizeContext(context: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(context)) {
    // Skip sensitive keys
    if (isSensitiveKey(key)) {
      continue;
    }
    
    // Sanitize the value
    sanitized[key] = sanitizeValue(value);
  }
  
  return sanitized;
}

/**
 * Check if a key contains sensitive information.
 */
function isSensitiveKey(key: string): boolean {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /key/i,
    /secret/i,
    /credential/i,
    /auth/i,
    /session/i
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(key));
}

/**
 * Sanitize a value for safe client exposure.
 */
function sanitizeValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (typeof value === 'string') {
    // Limit string length
    return value.length > 1000 ? value.substring(0, 1000) + '...' : value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  
  if (Array.isArray(value)) {
    // Limit array length and recursively sanitize
    return value.slice(0, 10).map(sanitizeValue);
  }
  
  if (typeof value === 'object') {
    // Prevent deep nesting and recursively sanitize
    const sanitized: Record<string, any> = {};
    let count = 0;
    
    for (const [k, v] of Object.entries(value)) {
      if (count >= 10) break; // Limit object size
      if (!isSensitiveKey(k)) {
        sanitized[k] = sanitizeValue(v);
      }
      count++;
    }
    
    return sanitized;
  }
  
  // For other types, convert to string representation
  return String(value);
}

/**
 * Convert a raw error (e.g., from try/catch) to a structured AppError.
 * This prevents stack traces from being exposed to clients.
 * 
 * @param error - The raw error object
 * @param fallbackCode - Error code to use if type cannot be determined
 * @param fallbackMessage - Message to use if error message is not available
 * @returns Structured error object
 */
export function fromError(
  error: unknown,
  fallbackCode: ErrorCode = ErrorCode.UNKNOWN_ERROR,
  fallbackMessage: string = 'An unexpected error occurred'
): AppError {
  if (isAppError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    // Determine error code based on error type/message
    const code = inferErrorCode(error);
    
    return createError(
      code,
      error.message || fallbackMessage,
      {
        errorType: error.constructor.name,
        // Don't include stack trace for security
      }
    );
  }
  
  if (typeof error === 'string') {
    return createError(fallbackCode, error);
  }
  
  // For unknown error types
  return createError(
    fallbackCode,
    fallbackMessage,
    { errorType: typeof error }
  );
}

/**
 * Check if an object is an AppError.
 */
export function isAppError(obj: unknown): obj is AppError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    typeof (obj as any).code === 'string' &&
    typeof (obj as any).message === 'string'
  );
}

/**
 * Infer error code from Error object characteristics.
 */
function inferErrorCode(error: Error): ErrorCode {
  const message = error.message.toLowerCase();
  
  if (message.includes('timeout')) {
    return ErrorCode.TIMEOUT_ERROR;
  }
  
  if (message.includes('network') || message.includes('connection')) {
    return ErrorCode.NETWORK_ERROR;
  }
  
  if (message.includes('redis')) {
    return ErrorCode.REDIS_OPERATION_FAILED;
  }
  
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorCode.VALIDATION_ERROR;
  }
  
  if (message.includes('not found')) {
    return ErrorCode.JOB_NOT_FOUND;
  }
  
  return ErrorCode.INTERNAL_ERROR;
}

/**
 * Create an HTTP response error object.
 * Useful for API endpoints to return consistent error responses.
 */
export function createHttpError(
  statusCode: number,
  error: AppError
): {
  status: number;
  error: AppError;
} {
  return {
    status: statusCode,
    error
  };
}