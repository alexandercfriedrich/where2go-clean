/**
 * Minimal, safe logging utilities for the new backend system.
 * This module provides structured logging without exposing sensitive information.
 * 
 * @fileoverview Safe logging utilities for development and production.
 */

/**
 * Log levels for controlling output verbosity.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Structured log entry.
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel;
  
  /** Log message */
  message: string;
  
  /** Timestamp (ISO string) */
  timestamp: string;
  
  /** Optional context data (must be safe for logging) */
  context?: Record<string, any>;
  
  /** Optional component/module name */
  component?: string;
}

/**
 * Configuration for the logger.
 */
interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  
  /** Whether to include context in logs */
  includeContext: boolean;
  
  /** Maximum length for log messages */
  maxMessageLength: number;
  
  /** Maximum depth for context objects */
  maxContextDepth: number;
}

/**
 * Default logger configuration.
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  includeContext: process.env.NODE_ENV !== 'production',
  maxMessageLength: 1000,
  maxContextDepth: 3
};

/**
 * Current logger configuration.
 */
let currentConfig: LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * Update logger configuration.
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Sanitize context data for safe logging.
 * Removes sensitive information and limits object depth.
 */
function sanitizeContext(
  context: Record<string, any>,
  depth: number = 0
): Record<string, any> {
  if (depth >= currentConfig.maxContextDepth) {
    return { '[max_depth_reached]': true };
  }
  
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(context)) {
    // Skip sensitive keys
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Sanitize the value
    sanitized[key] = sanitizeValue(value, depth + 1);
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
    /session/i,
    /cookie/i
  ];
  
  return sensitivePatterns.some(pattern => pattern.test(key));
}

/**
 * Sanitize a value for safe logging.
 */
function sanitizeValue(value: any, depth: number): any {
  if (value === null || value === undefined) {
    return value;
  }
  
  if (typeof value === 'string') {
    // Limit string length
    return value.length > 200 ? value.substring(0, 200) + '...' : value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  
  if (Array.isArray(value)) {
    // Limit array length and recursively sanitize
    return value.slice(0, 5).map(item => sanitizeValue(item, depth + 1));
  }
  
  if (typeof value === 'object') {
    return sanitizeContext(value, depth);
  }
  
  // For other types, convert to string representation
  return String(value);
}

/**
 * Truncate message if it exceeds maximum length.
 */
function truncateMessage(message: string): string {
  if (message.length <= currentConfig.maxMessageLength) {
    return message;
  }
  
  return message.substring(0, currentConfig.maxMessageLength) + '...';
}

/**
 * Format a log entry for output.
 */
function formatLogEntry(entry: LogEntry): string {
  const levelName = LogLevel[entry.level].padEnd(5);
  const timestamp = entry.timestamp;
  const component = entry.component ? `[${entry.component}] ` : '';
  
  let output = `${timestamp} ${levelName} ${component}${entry.message}`;
  
  if (currentConfig.includeContext && entry.context) {
    const contextStr = JSON.stringify(entry.context, null, 2);
    output += `\n  Context: ${contextStr}`;
  }
  
  return output;
}

/**
 * Create a log entry.
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, any>,
  component?: string
): LogEntry {
  return {
    level,
    message: truncateMessage(message),
    timestamp: new Date().toISOString(),
    context: context ? sanitizeContext(context) : undefined,
    component
  };
}

/**
 * Output a log entry if it meets the minimum level requirement.
 */
function output(entry: LogEntry): void {
  if (entry.level < currentConfig.minLevel) {
    return;
  }
  
  const formatted = formatLogEntry(entry);
  
  // Use appropriate console method based on log level
  switch (entry.level) {
    case LogLevel.DEBUG:
    case LogLevel.INFO:
      console.log(formatted);
      break;
    case LogLevel.WARN:
      console.warn(formatted);
      break;
    case LogLevel.ERROR:
      console.error(formatted);
      break;
  }
}

/**
 * Debug level logging.
 */
export function debug(
  message: string,
  context?: Record<string, any>,
  component?: string
): void {
  const entry = createLogEntry(LogLevel.DEBUG, message, context, component);
  output(entry);
}

/**
 * Info level logging.
 */
export function info(
  message: string,
  context?: Record<string, any>,
  component?: string
): void {
  const entry = createLogEntry(LogLevel.INFO, message, context, component);
  output(entry);
}

/**
 * Warning level logging.
 */
export function warn(
  message: string,
  context?: Record<string, any>,
  component?: string
): void {
  const entry = createLogEntry(LogLevel.WARN, message, context, component);
  output(entry);
}

/**
 * Error level logging.
 */
export function error(
  message: string,
  context?: Record<string, any>,
  component?: string
): void {
  const entry = createLogEntry(LogLevel.ERROR, message, context, component);
  output(entry);
}

/**
 * Create a component-specific logger.
 * This is useful for tracking logs from specific modules.
 */
export function createComponentLogger(componentName: string) {
  return {
    debug: (message: string, context?: Record<string, any>) => 
      debug(message, context, componentName),
    info: (message: string, context?: Record<string, any>) => 
      info(message, context, componentName),
    warn: (message: string, context?: Record<string, any>) => 
      warn(message, context, componentName),
    error: (message: string, context?: Record<string, any>) => 
      error(message, context, componentName)
  };
}